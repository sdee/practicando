# FastAPI Backend

## Local Development

1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies (using uv and pyproject.toml):
   ```bash
   uv pip install -r pyproject.toml
   ```
3. Copy `.env.example` to `.env` and update DB credentials if needed.
4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints
- `/health` — Health check (returns API and DB status)
- `/api/greet` — Sample endpoint

## Database
- Uses Postgres. Update `DATABASE_URL` in `.env`.

## AWS Deployment (Elastic Beanstalk)
1. Build frontend and copy static files to backend (see root README).
2. Zip backend folder (including static files, pyproject.toml, main.py, .ebextensions if needed).
3. Deploy zip to Elastic Beanstalk Python environment.
4. Set environment variables (e.g., `DATABASE_URL`) in AWS console.

## Testing
- Run tests with:
  ```bash
  pytest
  ```
