# Frontend (React + Tailwind)

## Local Development

1. Install Node.js 18+
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm start
   ```

## Tailwind Setup
- Tailwind is pre-configured in this template.

## API Integration
- The app calls the FastAPI backend at `/health` and `/api/greet`.
- Update API URLs in `src/App.js` if needed.

## Production Build
- Build with:
  ```bash
  npm run build
  ```
- Copy the `build/` folder to the backend's static directory for deployment.

## AWS Deployment
- See root README for full deployment steps.
