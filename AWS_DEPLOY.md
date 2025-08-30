
# AWS Elastic Beanstalk Deployment Guide

This guide will help you deploy your FastAPI + React + Postgres app to AWS Elastic Beanstalk (EB) with a managed Postgres database (RDS).

---

## 1. Prerequisites
- AWS account
- AWS CLI installed and configured (`aws configure`)
- Elastic Beanstalk CLI installed (`pip install awsebcli`)
- Node.js, Python, and Postgres installed locally

---

## 2. Prepare the Backend
1. Build the React frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Copy the build output to the backend static directory:
   ```bash
   cp -r build ../backend/static
   ```
3. Ensure your backend `requirements.txt` is up to date.
4. In `backend`, copy `.env.example` to `.env` and update with your production DB credentials (see RDS setup below).

---

## 3. Set Up Postgres on AWS RDS
1. Go to AWS RDS console and create a new Postgres instance.
2. Note the host, port, database name, username, and password.
3. Update your `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<dbname>
   ```

---

## 4. Deploy to Elastic Beanstalk
1. Initialize EB in the backend directory:
   ```bash
   cd backend
   eb init -p python-3.11 fastapi-react-app
   # Choose region and set up SSH if prompted
   ```
2. Create an environment:
   ```bash
   eb create fastapi-react-env
   ```
3. Set environment variables in EB:
   ```bash
   eb setenv DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<dbname>
   ```
4. Deploy:
   ```bash
   eb deploy
   ```
5. Open your app:
   ```bash
   eb open
   ```

---

## 5. (Optional) Configure Static Files
- If you want to serve React from a subpath, adjust the `StaticFiles` mount in `main.py`.

---

## 6. Troubleshooting
- Check logs with `eb logs`.
- Make sure security groups allow traffic between EB and RDS.
- If you see DB errors, check your RDS credentials and network settings.

---

## 7. Updating Your App
- Rebuild frontend and copy to backend/static as above.
- Run `eb deploy` again.

---

## 8. Cleaning Up
- Terminate the EB environment and RDS instance to avoid charges when done.

---

For more details, see the AWS Elastic Beanstalk and RDS documentation.
