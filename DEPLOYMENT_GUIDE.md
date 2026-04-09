# Mediclaim Deployment Checklist

This repository is prepared for a split deployment:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

## Required Environment Variables

### Frontend

- `VITE_API_BASE_URL=https://your-backend.example.com/api`

### Backend

- `MONGO_URI=your-mongodb-connection-string`
- `JWT_SECRET=your-long-random-secret`
- `CLIENT_ORIGIN=https://your-frontend.example.com`
- `PUBLIC_SERVER_URL=https://your-backend.example.com`
- `UPLOADS_DIR=/path/to/persistent/uploads`

### Optional Email Settings

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Deployment Notes

- [vercel.json](/D:/VS/PROJECTS/MediclaimSystem/vercel.json) enables SPA route rewrites so URLs like `/login` work after refresh.
- The backend returns absolute upload URLs, which is required when frontend and backend are hosted on different domains.
- For production uploads, use persistent storage. On Render, mount a persistent disk and point `UPLOADS_DIR` at that disk path.
- Rotate any previously exposed MongoDB, JWT, or email secrets before redeploying.
