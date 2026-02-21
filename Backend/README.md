# SendStone Backend — FastAPI + Supabase (PostgreSQL)

## Prerequisites

- Python 3.11+
- A Supabase project (free tier works)

## Setup

1. **Create & activate a virtual environment**

   ```bash
   cd SendStone/Backend
   python -m venv venv && source venv/bin/activate
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Create a `.env` file** in the `Backend/` folder with your Supabase credentials:

   ```
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_KEY=<your-service-key>
   DEBUG=true
   ```

## Run the Server

```bash
python main.py
```

The API starts at **http://127.0.0.1:8000**. You can also run it with uvicorn directly:

```bash
uvicorn main:app --reload --port 8000
```

## Verify It's Running

- Health check: [http://127.0.0.1:8000/](http://127.0.0.1:8000/) → `{"status": "ok"}`
- API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Swagger UI)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routes` | Browse routes (supports `page`, `limit`, `search`, `difficulty`) |
| POST | `/routes` | Create a new route |
| GET | `/health` | Detailed health check |