import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('<h1>SimLink Backend is LIVE 🚀</h1><p>Socket.io connection ready.</p>');
});

let db: Database;

async function initDb() {
    db = await open({
        filename: './simlink.db',
        driver: sqlite3.Database
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      pairingCode TEXT UNIQUE,
      role TEXT DEFAULT 'AGENT',
      peerId TEXT,
      status TEXT DEFAULT 'DISCONNECTED',
      lastHeartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId TEXT,
      senderFrom TEXT,
      content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(deviceId) REFERENCES devices(id)
    );
  `);
    console.log('Database initialized.');
}

const socketMap = new Map<string, string>(); // socketId -> deviceId

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('register', async (data: { deviceId: string, role: 'AGENT' | 'CLIENT' }) => {
        socketMap.set(socket.id, data.deviceId);

        await db.run(
            `INSERT INTO devices (id, role, status, lastHeartbeat) 
       VALUES (?, ?, 'ONLINE', datetime('now'))
       ON CONFLICT(id) DO UPDATE SET status='ONLINE', lastHeartbeat=datetime('now')`,
            [data.deviceId, data.role]
        );

        socket.join(data.deviceId);
        console.log(`Device ${data.deviceId} (${data.role}) registered.`);
    });

    socket.on('generate_pairing_code', async (data: { deviceId: string }) => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.run(`UPDATE devices SET pairingCode = ? WHERE id = ?`, [code, data.deviceId]);
        socket.emit('pairing_code_generated', { code });
    });

    socket.on('pair_with_code', async (data: { deviceId: string, code: string }) => {
        const targetDevice = await db.get(`SELECT id FROM devices WHERE pairingCode = ?`, [data.code]);

        if (targetDevice && targetDevice.id !== data.deviceId) {
            await db.run(`UPDATE devices SET peerId = ?, status = 'PAIRED' WHERE id = ?`, [targetDevice.id, data.deviceId]);
            await db.run(`UPDATE devices SET peerId = ?, status = 'PAIRED', pairingCode = NULL WHERE id = ?`, [data.deviceId, targetDevice.id]);

            io.to(data.deviceId).emit('pairing_success', { peerId: targetDevice.id });
            io.to(targetDevice.id).emit('pairing_success', { peerId: data.deviceId });
            console.log(`Paired ${data.deviceId} with ${targetDevice.id}`);
        } else {
            socket.emit('pairing_error', { message: 'Invalid or expired code' });
        }
    });

    socket.on('forward_sms', async (data: { from: string, content: string }) => {
        const deviceId = socketMap.get(socket.id);
        if (!deviceId) return;

        const device = await db.get(`SELECT peerId FROM devices WHERE id = ?`, [deviceId]);

        if (device && device.peerId) {
            await db.run(
                `INSERT INTO messages (deviceId, senderFrom, content) VALUES (?, ?, ?)`,
                [deviceId, data.from, data.content]
            );

            io.to(device.peerId).emit('new_sms', {
                from: data.from,
                content: data.content,
                timestamp: new Date()
            });
            console.log(`Forwarded SMS from ${deviceId} to ${device.peerId}`);
        }
    });

    socket.on('disconnect', async () => {
        const deviceId = socketMap.get(socket.id);
        if (deviceId) {
            await db.run(`UPDATE devices SET status = 'OFFLINE' WHERE id = ?`, [deviceId]);
            socketMap.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = 3005;
initDb().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`SimLink Backend listening on port ${PORT}`);
    });
});
