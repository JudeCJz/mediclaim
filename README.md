# 🛡️ Mediclaim Management System

A high-performance, mobile-optimized insurance enrollment and management platform built for educational institutions. Designed with a premium "glassmorphism" aesthetic and powered by a robust Firebase-Vite architecture.

## ✨ Key Features

-   **Unified Login System**: Automatic role detection for Administrators, Department Heads (HOD), and Faculty.
-   **HOD Dashboard**: Real-time enrollment tracking, department-wide personnel management, and automated email confirmation dispatch.
-   **Admin Control Center**: Financial Year (Cycle) management, coverage tier configuration, and secure faculty account bulk registration.
-   **Mobile-First Design**: Optimized for Android and high-density displays with responsive tables and touch-friendly controls.
-   **Firebase Integration**: Secure authentication and real-time Firestore database with resilient long-polling for restricted network environments.

## 🚀 Deployment Guide (Netlify)

This project is pre-configured for seamless deployment to **Netlify**.

### 🛠️ Prerequisites
1.  **Authorized Domain**: After deployment, add your Netlify URL to the **Authorized Domains** list in the Firebase Console (Authentication > Settings).
2.  **Environment Variables**: It is recommended to move the configuration in `src/firebase.js` to Netlify environment variables if working in a public repository.

### 📦 Build Settings
-   **Build command**: `npm run build`
-   **Publish directory**: `dist`
-   **Redirects**: Local `_redirects` file is pre-configured to handle React Router navigation.

## 🛠️ Technology Stack

-   **Frontend**: React (Vite)
-   **Icons**: Lucide React
-   **Styling**: Vanilla CSS (Custom Glassmorphism Design System)
-   **Backend**: Firebase (Auth, Firestore)

## 📄 Configuration

See `src/firebase.js` for the core infrastructure setup. The system utilizes `experimentalForceLongPolling` to ensure database stability in high-security network environments.

---

*Designed and refined for maximum administrative efficiency.*
