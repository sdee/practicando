# FastAPI + React + Postgres Template (All-in-One, AWS-Ready)

## Project Structure

- `backend/` — FastAPI app (Python)
- `frontend/` — React app (with Tailwind)
- `README.md` — Setup and deployment instructions

## Features
- Health check endpoint in FastAPI
- React UI with API integration demo
- Postgres database (local and AWS RDS)
- Easy local dev and AWS deployment (Elastic Beanstalk or EC2)

---

## Local Development

### 1. Backend (FastAPI)
- Install Python 3.9+
- `cd backend`
- Create a virtualenv: `python3 -m venv venv && source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`
- Copy `.env.example` to `.env` and set DB connection
- Run: `uvicorn main:app --reload`

### 2. Frontend (React)
- Install Node.js 18+
- `cd frontend`
- `npm install`
- `npm start`

### 3. Database (Postgres)
- Install Postgres locally, or use Docker
- Update DB connection string in backend `.env`

---

## AWS Deployment (Elastic Beanstalk)

1. Create a Postgres DB on AWS RDS.
2. Set up an Elastic Beanstalk Python environment.
3. Build React app: `cd frontend && npm run build`
4. Copy `frontend/build` to `backend/static` (or similar).
5. Zip backend folder (with static files) and deploy to Elastic Beanstalk.
6. Set environment variables (DB connection, etc) in Elastic Beanstalk console.

---

## Health Check
- FastAPI: `/health` endpoint returns status.
- React: UI page shows API health status.

---

## Next Steps
- See `backend/README.md` and `frontend/README.md` for more details.
