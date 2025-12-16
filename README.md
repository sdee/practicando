**Practicando** provides a fun, customizable way to master Spanish verb conjugations. Other language learning apps repeat a limited set of flashcards while Practicando dynamically generates an unlimited number of practice questions based on the filters you set. 

Practicando dynamically generates flashcards by chosing a pronoun, verb, and tenses. It provides immediate feedback of whether you answered a question correctly. If you answer wrong, it reveals the answer and gives you feedback on what mistake you made. 

## Demo

https://github.com/user-attachments/assets/b6d228b5-c7a5-4ce2-a3ff-14f84b17b5fe

## Features
- Infinite practice: instead of learning to the test, a limitless set of flashcards provides you with ample practice with core verb conjugation skills.
- Customizability: Using the filters, you can customize the verbs, verb tenses, and pronouns you want to practice based on your learning goals.
- Track progress: The metrics page and history allows you to see your progress and review areas for improvement.
- Seamlessness: Allows you to fluidly go through flashcards without lifting your hands from the keyboard.

## Screenshots

Filters for customizing lesson

<img width="400" height="290" alt="filters" src="https://github.com/user-attachments/assets/a9dac7aa-0fca-4fb7-a456-61ae18f780ea" /><br/>

See past questions 

<img width="400" height="189" alt="history" src="https://github.com/user-attachments/assets/53bb1786-a225-40af-a04a-5ee60939e476" /><br/>

Metrics for optimizing learning

<img width="400" height="362" alt="metrics" src="https://github.com/user-attachments/assets/0d0be003-d092-44d3-980e-b86e350b6205" /><br/>

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

# FastAPI + React + Postgres Template (All-in-One, AWS-Ready)

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
