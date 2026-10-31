# PostgreSQL migration guide

## 1. Start PostgreSQL
Use Docker Compose from the project root:

```bash
docker compose up -d postgres
```

## 2. Configure the backend
Set the database URL in the backend environment:

```env
DATABASE_URL=postgresql://vaultic_user:secure_password_change_me@localhost:5432/vaultic_db
```

## 3. Initialize the database
Run the backend startup or the database initialization script.

```bash
cd fintechbackend
python database_new.py
```

## 4. Migrate existing SQLite data
If you already have local SQLite data, use the migration helper.

```bash
cd fintechbackend
python migrate.py
```

## 5. Verify the app
Start the backend and frontend:

```bash
docker compose up --build
```

## Render preview database

The root `render.yaml` Blueprint creates a free PostgreSQL database in Oregon
and injects its private connection string into the backend as `DATABASE_URL`.
Keep the database and backend in the same region. Free database service limits
and retention are intended for previews only; use a paid managed database with
backups enabled before storing production data. Do not copy the connection
string into source control.
