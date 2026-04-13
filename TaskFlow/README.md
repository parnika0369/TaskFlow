# TaskFlow

A task management system with authentication, projects, and tasks. Users can register, log in, create projects, add tasks, assign them to team members, and manage work on a drag-and-drop kanban board.

---

## 1. Overview

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12+) |
| Auth | PyJWT + bcrypt |
| ORM | SQLAlchemy 2 (sync) |
| Migrations | Alembic |
| Database | PostgreSQL 16 |
| Validation | Pydantic v2 |
| Frontend | React 19 + TypeScript, Vite, TanStack Query, Radix UI + Tailwind CSS 4 |
| Drag & Drop | @dnd-kit/core |
| Router | React Router v7 |
| Container | Docker + Docker Compose |

### Features

- Register / login with JWT auth (bcrypt cost 12, 24h expiry)
- Create and manage projects
- Kanban board with drag-and-drop to move tasks between columns
- Create and edit tasks with title, description, priority, assignee, due date
- Filter tasks by status and assignee
- Project stats (task counts by status and priority)
- Dark mode with persistent preference
- Optimistic UI — status changes apply instantly, revert on error

---

## 2. Architecture Decisions

### Backend

**FastAPI** — Route decorators (`@router.get`) map directly to REST verbs. `Depends(...)` handles dependency injection (DB session, current user). Pydantic v2 validates request bodies automatically. Auto-generates Swagger UI at `/docs` with no extra configuration.

**SQLAlchemy (sync) + Alembic** — Sync SQLAlchemy over async for simplicity. Models map to DB tables, sessions are injected via `Depends(get_db)`. Alembic owns all schema changes (`alembic/versions/`) — tables are never auto-created in production.

**bcrypt directly, no passlib** — `passlib` 1.7.4 is unmaintained and breaks with bcrypt ≥ 4.x. Using `bcrypt` directly: `bcrypt.hashpw` / `bcrypt.checkpw`. Fewer dependencies, no wrapper layer.

**psycopg3 (`psycopg[binary]`)** — psycopg2 has no prebuilt wheels for Python 3.13+. psycopg3 is the modern replacement. SQLAlchemy dialect: `postgresql+psycopg://`.

**Stateless JWT auth** — No session storage. Every request carries a signed JWT validated in `get_current_user` (a FastAPI dependency). 24-hour expiry. `HTTPBearer` extracts the token from the `Authorization` header.

**`creator_id` on tasks** — Added beyond the spec. Required to enforce "delete task: project owner or task creator only" — without storing who created the task, that check is impossible.

**`clearAssignee` flag on PATCH /tasks/:id** — JSON cannot distinguish a missing field from an explicit `null`. Without a flag, there is no way to tell "leave assignee unchanged" from "remove the assignee". `clearAssignee: true` is the explicit signal to unset it.

### Frontend

**TanStack Query for server state** — all API data lives in React Query cache. Components never manage fetch/loading/error state manually. Cache is invalidated on mutations.

**Optimistic updates on task status** — status changes apply to the cache immediately and revert on error. Makes the UI feel instant without waiting for the server. Drag-and-drop uses the same optimistic mutation.

**@dnd-kit for drag-and-drop** — `useDraggable` on task cards, `useDroppable` on columns, `DragOverlay` for the ghost card. Activation constraint of 8px distance prevents accidental drags when clicking edit/delete buttons inside cards.

**Zustand for auth + theme state** — both persisted to `localStorage` via `zustand/middleware`. Token and dark mode preference survive page refresh.

**Vite proxy in dev** — `/auth`, `/projects`, `/tasks`, `/users` proxied to `localhost:8080`. No CORS issues in dev, no hardcoded API URL in the app. In production (Docker), nginx handles the same proxying.

**Radix UI primitives + Tailwind CSS 4** — Radix handles accessibility (focus traps, ARIA) for modals. Tailwind CSS 4 with `@custom-variant dark` for class-based dark mode.

### What was intentionally left out

- **Pagination** — list endpoints return all results. Easy to add with `Pageable` but not needed for the scope.
- **Refresh tokens** — single 24-hour access token keeps auth simple. Production would need refresh token rotation.
- **Role-based access control** — ownership checks (project owner, task creator) are done in service layer, not Spring Security roles. Sufficient for this scope.
- **Tests** — no tests written. Integration tests against a real DB would use Testcontainers.

---

## 3. Running with Docker

Requires: Docker and Docker Compose. Nothing else.

```bash
git clone https://github.com/morrowleap/taskflow
cd taskflow
docker compose up --build   # first run — builds images
docker compose up           # subsequent runs — reuses cached images
```

- Frontend: http://localhost:3000
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/docs

All environment variables have sensible defaults — no `.env` file needed. To override, copy `.env.example` to `.env`.

### Rebuilding after code changes

```bash
docker compose down -v && docker compose up --build
```

- `down -v` — stops containers and wipes the database volume (fresh seed data on next start)
- `--build` — rebuilds images with latest code

> Omit `-v` to keep existing data.

---

## 4. Test Credentials

Created automatically on first startup:

```
Email:    test@example.com   (Alice Johnson — project owner)
Password: password123
```

All seed users share the same password (`password123`):

| Name | Email |
|---|---|
| Alice Johnson | test@example.com |
| Bob Smith | bob@example.com |
| Carol White | carol@example.com |
| Dan Brown | dan@example.com |
| Eve Davis | eve@example.com |

Seed also creates one project ("Website Redesign") with 6 tasks across all statuses — 5 assigned to different team members and 1 unassigned.

---

## 5. Running Migrations

In Docker or local dev, tables are created automatically on startup via SQLAlchemy (`Base.metadata.create_all`).

To run Alembic migrations manually:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

Migration files: `backend/alembic/versions/`

| File | Description |
|---|---|
| `001_initial.py` | users, projects, tasks tables |

---

## 6. API Reference

**Swagger UI**: http://localhost:8080/docs — available automatically, no setup needed. Try endpoints directly from the browser.

Base URL: `http://localhost:8080`

All protected endpoints require: `Authorization: Bearer <token>`

All error responses follow:
```json
{ "error": "message" }
// or for validation errors:
{ "error": "validation failed", "fields": { "fieldName": "reason" } }
```

---

### Users

#### GET `/users`
Returns all registered users. Used to populate assignee dropdowns.
```json
// Response 200
{
  "users": [
    { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "createdAt": "..." }
  ]
}
```

---

### Auth

#### POST `/auth/register`
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// Response 201
{
  "token": "<jwt>",
  "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "createdAt": "..." }
}
```

#### POST `/auth/login`
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{
  "token": "<jwt>",
  "user": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com", "createdAt": "..." }
}
```

---

### Projects

#### GET `/projects`
Returns projects the current user owns or has tasks assigned in.
```json
// Response 200
{
  "projects": [
    { "id": "uuid", "name": "Website Redesign", "description": "...", "ownerId": "uuid", "createdAt": "..." }
  ]
}
```

#### POST `/projects`
```json
// Request
{ "name": "New Project", "description": "Optional" }

// Response 201 — project object
```

#### GET `/projects/:id`
```json
// Response 200
{
  "id": "uuid", "name": "...", "description": "...", "ownerId": "uuid", "createdAt": "...",
  "tasks": [ /* task objects */ ]
}
```

#### PATCH `/projects/:id`
Owner only. Partial update — omit fields to leave them unchanged.
```json
// Request
{ "name": "Updated Name" }
// Response 200 — updated project object
```

#### DELETE `/projects/:id`
Owner only. Cascades to all tasks.
```
Response 204 No Content
```

#### GET `/projects/:id/stats`
Returns task counts by status and priority.
```json
// Response 200
{
  "total": 6,
  "byStatus": { "todo": 2, "in_progress": 2, "done": 2 },
  "byPriority": { "low": 1, "medium": 3, "high": 2 }
}
```

---

### Tasks

#### GET `/projects/:id/tasks`
Supports optional filters: `?status=todo` and `?assignee=<uuid>`
```json
// Response 200
{ "tasks": [ /* task objects */ ] }
```

Task object shape:
```json
{
  "id": "uuid",
  "title": "Design homepage",
  "description": "...",
  "status": "todo",
  "priority": "high",
  "projectId": "uuid",
  "assigneeId": "uuid or null",
  "creatorId": "uuid",
  "dueDate": "2026-04-20",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Status values: `todo` | `in_progress` | `done`
Priority values: `low` | `medium` | `high`

#### POST `/projects/:id/tasks`
```json
// Request
{ "title": "Design homepage", "description": "...", "priority": "high", "assigneeId": "uuid", "dueDate": "2026-04-20" }

// Response 201 — task object
```

#### PATCH `/tasks/:id`
Project owner, task creator, or current assignee can update. All fields optional.
```json
// Request
{ "status": "in_progress", "priority": "low", "assigneeId": "uuid" }

// To clear the assignee:
{ "clearAssignee": true }

// Response 200 — updated task object
```

#### DELETE `/tasks/:id`
Project owner or task creator only.
```
Response 204 No Content
```

---

## 7. What I'd Do With More Time

**Structured request logging** — Currently logging errors and startup events only. Would add a servlet filter to log method, path, status, and duration for every request using MDC for correlation IDs.

**Broader test coverage** — Integration tests cover auth and task endpoints via Testcontainers. Missing: service-layer unit tests, project endpoint edge cases, and frontend component tests.

**Refresh token rotation** — Current auth is a single 24-hour JWT. Production would need short-lived access tokens (15 min) plus a rotating refresh token stored in an httpOnly cookie.

**Role-based access** — Ownership checks live in service methods. For anything larger this would move into Spring Security's method-level annotations (`@PreAuthorize`) or a proper permission table.

**Select/Textarea components** — The same inline Tailwind className string is repeated across TaskModal, ProjectsPage, and ProjectDetailPage. Should be extracted into shared `<Select>` and `<Textarea>` components.

**Toast notifications** — No success feedback after creating/updating/deleting. Would add a lightweight toast (e.g. Sonner) so users know mutations succeeded without inferring from UI changes.

**Confirmation modal for destructive actions** — Delete project uses the browser's native `confirm()`. Should be a proper modal that shows the project name and requires explicit confirmation.

**Date formatting** — Due dates display as raw ISO strings. Would format them as relative ("3 days left", "overdue") using `date-fns`.
