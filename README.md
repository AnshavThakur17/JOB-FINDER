# Job Finder (Demo)

This is a minimal Job Finder project (backend + frontend) built with Node.js, Express, MongoDB (Mongoose), and a vanilla JS frontend.

## How to run

1. Install Node.js and MongoDB (or use MongoDB Atlas).
2. In `backend/`:
   - run `npm install`
   - copy `.env.example` to `.env` and edit values (MONGO_URI, JWT_SECRET)
   - run `npm run dev` (or `npm start`)
3. Open `frontend/index.html` in your browser (or serve it with a simple static server).

Seed script: `node seed.js` in backend to create sample company/candidate and a job.

