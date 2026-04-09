# Mediclaim Management System

A mobile-friendly insurance enrollment and management platform for educational institutions, built with React, Express, and MongoDB.

## Key Features

- Unified login for administrators, HODs, and faculty
- Financial year management and enrollment controls
- Faculty enrollment with dependent and document support
- Audit logs and mail-dispatch workflows
- MongoDB-backed persistence with Mongoose

## Local Setup

### Prerequisites

- Node.js
- MongoDB

### Backend

```bash
cd server
npm install
copy .env.example .env
npm start
```

### Frontend

```bash
npm install
copy .env.example .env
npm run dev
```

## Production Notes

- Set `VITE_API_BASE_URL` to your deployed backend API, for example `https://your-backend.example.com/api`.
- Set backend `CLIENT_ORIGIN` to your deployed frontend origin.
- Set backend `PUBLIC_SERVER_URL` to your deployed backend origin so uploaded file URLs are absolute.
- Route refreshes on Vercel are handled by [vercel.json](/D:/VS/PROJECTS/MediclaimSystem/vercel.json).
- For production uploads, point `UPLOADS_DIR` to persistent storage instead of ephemeral local disk.

## Stack

- Frontend: React with Vite
- Backend: Node.js and Express
- Database: MongoDB with Mongoose
- Real-time updates: Socket.IO
