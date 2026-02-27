# İMAR Kanban — Jira-like Project Management Tool

A full-stack Jira-inspired Kanban board built with NestJS, Next.js (React), and PostgreSQL. Supports multi-user real-time collaboration with polling-based sync.

![Kanban Board]
<img width="2000" height="983" alt="image" src="https://github.com/user-attachments/assets/7182676d-a985-4d21-8ea6-c9ff952a0c20" />


---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS · TypeScript · Prisma ORM |
| **Database** | PostgreSQL |
| **Frontend** | React 19 · Vite · TypeScript |
| **UI** | Ant Design 5 |
| **State** | Zustand |
| **File Storage** | MinIO (S3-compatible) |
| **Auth** | JWT (access + refresh tokens) |
| **Containerization** | Docker · Docker Compose |

---

## Features

- **Kanban Board** — Drag & drop cards between columns, WIP limit enforcement
- **Epics & Stories** — Epic → Story → Task hierarchy with progress tracking
- **Issue Detail Drawer** — Edit title, description, status, assignee, priority, type, epic, story, parent — all saved with a single **Kaydet** button
- **Multi-user Sync** — Changes reflect across browser sessions via polling + focus/visibility refresh
- **Issue Types** — Task, Bug, Story, Epic, Subtask with custom icons
- **Labels & Sprints** — Tag issues with colored labels, assign to sprints
- **File Attachments** — Upload images and documents (stored in MinIO)
- **Comments & Activity** — Per-issue comment thread
- **List View** — Filterable, groupable, Excel-exportable issue list
- **Project Members** — Assign issues to project members

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Docker Compose v2+

### Run with Docker Compose

```bash
git clone https://github.com/muradkck98/jira-kanban.git
cd jira-kanban

# Copy and configure environment variables
cp backend/.env.example backend/.env

# Start all services (PostgreSQL + MinIO + Backend + Frontend)
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:3001/api/v1 |
| Swagger Docs | http://localhost:3001/api/docs |
| MinIO Console | http://localhost:9001 |

### Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@kanban-postgres:5432/kanban
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
MINIO_ENDPOINT=kanban-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=kanban
CORS_ORIGIN=http://localhost
PORT=3001
```

---

## Project Structure

```
jira-kanban/
├── backend/                # NestJS API
│   ├── src/
│   │   ├── auth/           # JWT authentication
│   │   ├── boards/         # Board & column management
│   │   ├── epics/          # Epic CRUD
│   │   ├── issues/         # Issue CRUD, move, attachments
│   │   ├── projects/       # Project & member management
│   │   ├── sprints/        # Sprint management
│   │   ├── labels/         # Label management
│   │   └── uploads/        # MinIO file upload service
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── frontend/               # React + Vite SPA
│   ├── src/
│   │   ├── api/            # Axios client + API modules
│   │   ├── components/     # Shared UI components
│   │   ├── pages/          # Route pages
│   │   │   ├── board/      # Kanban board
│   │   │   ├── epics/      # Epics & stories
│   │   │   ├── list/       # Issue list view
│   │   │   └── backlog/    # Backlog management
│   │   └── stores/         # Zustand state stores
│
└── docker-compose.yml
```

---

## Development

### Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## License

MIT
