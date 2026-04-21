# Mediclaim Management System

A mobile-friendly insurance enrollment and management platform for educational institutions, built with React, Express, and MongoDB.

## Key Features

- Unified login for administrators, HODs, and faculty
- Financial year management and enrollment controls
- Faculty enrollment with dependent and document support
- Audit logs and mail-dispatch workflows
- MongoDB-backed persistence with Mongoose

## Local Setup

### 🚀 Quick Start (Recommended)

To start everything (Database, Backend, and Frontend) with one command:

```powershell
npm run start:all
```

*Note: This requires MongoDB to be installed on your system.*

### Manual Setup (Step-by-Step)

#### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)

#### 2. Install Dependencies
```powershell
npm install
cd server
npm install
cd ..
```

#### 3. Environment Setup
Create a `.env` file in the root and in the `/server` directory using the provided examples.

#### 4. Run Locally
- **Start Database**: `npm run db`
- **Start Backend**: `npm run backend` (in a new terminal)
- **Start Frontend**: `npm run dev` (in a new terminal)

### 🛠️ Troubleshooting

#### 'mongod' is not recognized
If you see this error, MongoDB is likely not in your system's PATH. You can:
1.  **Add it to PATH**: Add `C:\Program Files\MongoDB\Server\<version>\bin` to your Environment Variables.
2.  **Update package.json**: Change the `db` script to use the full path, for example:
    `"db": "\"C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe\" --dbpath ./mongodb_data"`

#### Port in use (5000 or 5173)
Close any other terminals running the project or use `Task Manager` to kill any hanging `node` processes.


## 🌐 Cloud Deployment Guide

Follow these steps to move from local development to a live production environment.

### 1. MongoDB Atlas Setup
Instead of running a local `mongod`, use a cloud-hosted database.
1. Sign up for a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account.
2. Create a new **Free Tier (M0)** Cluster.
3. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere) or your server's IP.
4. Under **Database Access**, create a user with a secure password.
5. Click **Connect** → **Drivers** and copy your **Connection String (URI)**.

### 2. Backend Deployment (e.g., Render / Railway)
1. Link your GitHub repository to your hosting provider.
2. Set the **Build Command**: `cd server && npm install`
3. Set the **Start Command**: `cd server && npm start`
4. Add the following **Environment Variables**:
   - `MONGO_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: A long random string.
   - `PORT`: `5000` (or the provider's default).
   - `CLIENT_ORIGIN`: Your Frontend URL (e.g., `https://mediclaim.vercel.app`).
   - `PUBLIC_SERVER_URL`: Your Backend URL (e.g., `https://mediclaim-api.onrender.com`).
   - `NODE_ENV`: `production`

### 3. Frontend Deployment (e.g., Vercel / Netlify)
1. Link the root of your repository to Vercel/Netlify.
2. Set the **Build Command**: `npm run build`
3. Set the **Output Directory**: `dist`
4. Add the following **Environment Variable**:
   - `VITE_API_BASE_URL`: Your Backend API URL (e.g., `https://mediclaim-api.onrender.com/api`).

---

## 📧 Email Setup (SMTP)
To enable automated email alerts, you must configure a mail provider.
1. Create a Gmail **App Password** (Settings → Security → 2-Step Verification → App Passwords).
2. In your Backend environment variables, add:
   - `MAIL_USER`: your-email@gmail.com
   - `MAIL_PASS`: your-16-character-app-password

---

## 🛠️ Stack & Architecture

- **Frontend**: React (Vite), Axios, Socket.IO Client.
- **Backend**: Node.js, Express, Mongoose, Socket.IO.
- **Database**: MongoDB (NoSQL) for high-performance claim storage.
- **Styling**: Vanilla CSS for premium, responsive layouts.
- **Reporting**: `jsPDF` and `XLSX` for document generation.

---

## 📄 License
Internal use for educational research purposes.
