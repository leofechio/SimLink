import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { io } from 'socket.io-client';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Smartphone, Globe, QrCode, MessageSquare, Battery, Activity } from 'lucide-react-native';

// Constants
const SERVER_URL = 'http://31.97.157.146:3005';

export default function App() {
    const [role, setRole] = useState<'AGENT' | 'CLIENT' | null>(null);
    const [deviceId, setDeviceId] = useState('');
    const [socket, setSocket] = useState<any>(null);
    const [status, setStatus] = useState('DISCONNECTED');
    const [messages, setMessages] = useState<any[]>([]);
    const [pairingCode, setPairingCode] = useState('');

    useEffect(() => {
        initDevice();
    }, []);

    const initDevice = async () => {
        let id = await AsyncStorage.getItem('deviceId');
        if (!id) {
            id = Math.random().toString(36).substring(2, 12).toUpperCase();
            await AsyncStorage.setItem('deviceId', id);
        }
        setDeviceId(id);

        // Load saved role if exists
        const savedRole = await AsyncStorage.getItem('userRole');
        if (savedRole) setRole(savedRole as any);
    };

    const connectServer = (selectedRole: 'AGENT' | 'CLIENT') => {
        const s = io(SERVER_URL);
        setSocket(s);

        s.on('connect', () => {
            setStatus('ONLINE');
            s.emit('register', { deviceId, role: selectedRole });
        });

        s.on('pairing_code_generated', (data: { code: string }) => {
            setPairingCode(data.code);
        });

        s.on('new_sms', (msg: any) => {
            setMessages(prev => [msg, ...prev]);
        });

        s.on('pairing_success', (data: { peerId: string }) => {
            Alert.alert('Sucesso', 'Dispositivo pareado!');
            setStatus('PAIRED');
        });

        return s;
    };

    const selectRole = async (selectedRole: 'AGENT' | 'CLIENT') => {
        setRole(selectedRole);
        await AsyncStorage.setItem('userRole', selectedRole);
        connectServer(selectedRole);
    };

    if (!role) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>SimLink</Text>
                <Text style={styles.subtitle}>Como você usará este dispositivo?</Text>

                <TouchableOpacity style={[styles.card, styles.agentCard]} onPress={() => selectRole('AGENT')}>
                    <Smartphone color="#fff" size={48} />
                    <Text style={styles.cardTitle}>Vou deixar no Brasil</Text>
                    <Text style={styles.cardText}>Este celular enviará os SMS que receber.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, styles.clientCard]} onPress={() => selectRole('CLIENT')}>
                    <Globe color="#fff" size={48} />
                    <Text style={styles.cardTitle}>Estou no Exterior</Text>
                    <Text style={styles.cardText}>Este celular receberá os SMS do Brasil.</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.appContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>SimLink {role === 'AGENT' ? '(Brasil)' : '(Exterior)'}</Text>
                <View style={styles.statusBadge}>
                    <Activity size={12} color={status === 'PAIRED' ? '#4ade80' : '#fbbf24'} />
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {role === 'CLIENT' ? (
                    <>
                        <TouchableOpacity style={styles.actionButton} onPress={() => socket.emit('generate_pairing_code', { deviceId })}>
                            <QrCode color="#fff" size={20} />
                            <Text style={styles.actionButtonText}>Geral Código de Pareamento</Text>
                        </TouchableOpacity>

                        {pairingCode ? (
                            <View style={styles.codeContainer}>
                                <Text style={styles.codeLabel}>Mande este código para quem está no Brasil:</Text>
                                <Text style={styles.codeValue}>{pairingCode}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.sectionTitle}>Mensagens Recebidas</Text>
                        {messages.length === 0 ? (
                            <Text style={styles.emptyText}>Nenhum SMS recebido ainda.</Text>
                        ) : (
                            messages.map((m, i) => (
                                <View key={i} style={styles.msgBox}>
                                    <Text style={styles.msgFrom}>{m.from}</Text>
                                    <Text style={styles.msgBody}>{m.content}</Text>
                                    <Text style={styles.msgTime}>{new Date(m.timestamp).toLocaleTimeString()}</Text>
                                </View>
                            ))
                        )}
                    </>
                ) : (
                    <View style={styles.agentStatus}>
                        <Smartphone size={80} color="#34d399" />
                        <Text style={styles.agentMainText}>Servidor Ativo</Text>
                        <Text style={styles.agentSubText}>Este celular está pronto para encaminhar SMS.</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <MessageSquare size={20} color="#666" />
                                <Text style={styles.statValue}>14</Text>
                                <Text style={styles.statLabel}>Enviados</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Battery size={20} color="#666" />
                                <Text style={styles.statValue}>88%</Text>
                                <Text style={styles.statLabel}>Bateria</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.resetBtn} onPress={() => { AsyncStorage.clear(); setRole(null); }}>
                <Text style={styles.resetBtnText}>Trocar de Modo</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20, justifyContent: 'center' },
    appContainer: { flex: 1, backgroundColor: '#f3f4f6' },
    title: { fontSize: 42, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 18, color: '#4b5563', textAlign: 'center', marginBottom: 40 },
    card: { padding: 30, borderRadius: 24, marginBottom: 20, alignItems: 'center' },
    agentCard: { backgroundColor: '#10b981' },
    clientCard: { backgroundColor: '#3b82f6' },
    cardTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 15 },
    cardText: { color: '#e5e7eb', textAlign: 'center', marginTop: 5 },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 6, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '600', marginLeft: 4, color: '#4b5563' },
    content: { padding: 20 },
    actionButton: { backgroundColor: '#111827', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    actionButtonText: { color: '#fff', fontWeight: '700', marginLeft: 10 },
    codeContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 30, borderStyle: 'dashed', borderWidth: 2, borderColor: '#d1d5db' },
    codeLabel: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
    codeValue: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
    msgBox: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    msgFrom: { fontWeight: '700', color: '#3b82f6', marginBottom: 2 },
    msgBody: { fontSize: 15, color: '#374151' },
    msgTime: { fontSize: 11, color: '#9ca3af', alignSelf: 'flex-end', marginTop: 5 },
    emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 20 },
    agentStatus: { alignItems: 'center', marginTop: 40 },
    agentMainText: { fontSize: 24, fontWeight: '800', marginTop: 20 },
    agentSubText: { color: '#6b7280', textAlign: 'center', marginTop: 10 },
    statsRow: { flexDirection: 'row', marginTop: 40, width: '100%', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '700', marginTop: 5 },
    statLabel: { fontSize: 12, color: '#9ca3af' },
    resetBtn: { margin: 20, padding: 15, alignItems: 'center' },
    resetBtnText: { color: '#9ca3af', fontWeight: '500' }
});
