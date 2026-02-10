# SimLink - Professional Link-in-Bio SaaS Platform
## Implementation Plan

### 1. Technology Stack (Optimized for Performance & VPS Constraints)
- **Core Framework**: Next.js 14/15 (App Router)
  - *Why*: Server-Side Rendering (SEO), robust routing, built-in API.
- **Language**: TypeScript
  - *Why*: Type safety, professional standard, fewer runtime bugs.
- **Database**: SQLite + Prisma ORM
  - *Why*: Zero-latency, relational integrity with Prisma, extremely low RAM usage (unlike Postgres/MySQL), file-based backups. Perfect for a VPS with limited resources.
- **Styling**: Vanilla CSS (Modular)
  - *Why*: Lightweight, total control, modern CSS variables/flexbox/grid.
- **Authentication**: KeyAuth (Simple Token/Password) or NextAuth (if needed later).
  - *Why*: We'll start with a robust custom auth or NextAuth for security.
- **Containerization**: Docker + Docker Compose
  - *Why*: One-command deployment, isolation, restart policies.

### 2. Architecture & Structure
```
SimLink/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Login/Register routes
│   │   ├── (dashboard)/     # User Dashboard (Manage links)
│   │   ├── [username]/      # Public Bio Page (e.g. simlink.com/leo)
│   │   └── api/             # Backend Endpoints
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Buttons, Inputs)
│   │   ├── forms/           # Link management forms
│   │   └── preview/         # Mobile preview component
│   ├── lib/
│   │   ├── db.ts            # Prisma Client singleton
│   │   └── auth.ts          # Authentication logic
│   └── styles/              # Global variables & mixins
├── prisma/
│   └── schema.prisma        # Database Schema
├── docker/
│   └── Dockerfile           # Production Multi-stage build
├── compose.yaml             # Orchestration with volumes
└── public/                  # Static assets
```

### 3. Core Features (MVP)
1.  **User System**: Registration, Login, Secure Password Hashing (Argon2/Bcrypt).
2.  **Dashboard**:
    -   Add/Edit/Delete Links.
    -   Drag-and-drop reordering (Simulated with simple up/down first).
    -   Customize Appearance (Background color, Text color, Button style).
    -   Live Preview of the Bio Page.
3.  **Public Page**:
    -   Fast-loading profile page.
    -   Responsive design (Mobile-first).
    -   Click tracking (Basic counter).
4.  **Infrastructure**:
    -   Database volume persistence.
    -   Automatic restarts.
    -   Nginx Proxy integration ready.

### 4. Database Schema (Draft)
- **User**: id, email, password_hash, username (unique), created_at.
- **Profile**: user_id, display_name, bio, avatar_url, theme_config (JSON).
- **Link**: id, user_id, title, url, icon, order, clicks, is_active.

### 5. Next Steps
1.  Initialize Next.js Project with TypeScript.
2.  Setup Prisma & SQLite.
3.  Build Docker infrastructure.
4.  Develop Auth & Dashboard.
