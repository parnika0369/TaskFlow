# Local Development Setup (Without Docker)

---

## 1. PostgreSQL Setup

Install PostgreSQL 16:
```bash
brew install postgresql@16
brew services start postgresql@16
```

Create DB and user:
```bash
psql postgres
```

```sql
CREATE USER taskflow WITH PASSWORD 'taskflow_secret';
CREATE DATABASE taskflow OWNER taskflow;
\q
```

Verify connection:
```bash
psql -U taskflow -d taskflow
```

---

## 2. Run Backend

Requires Python 3.12+.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Or without activating the venv:
```bash
cd backend
rm -rf venv
python3 -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/uvicorn app.main:app --reload --port 8080
```

- Tables created automatically on startup
- Seed data created on first run (`test@example.com` / `password123`)
- Swagger UI: http://localhost:8080/docs

---

## 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:3000

Vite proxies `/auth`, `/projects`, `/tasks`, `/users` to `localhost:8080`.

---

## 4. Testing

### Test Credentials

```
Email:    test@example.com
Password: password123
```

### curl
```bash
# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# List projects (replace <token> with token from login response)
curl http://localhost:8080/projects \
  -H "Authorization: Bearer <token>"
```

### Browser
Open http://localhost:3000 — login with `test@example.com` / `password123`.
