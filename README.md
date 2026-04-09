# 🛡️ Mediclaim Management System

A high-performance, mobile-optimized insurance enrollment and management platform built for educational institutions. Designed with a premium "glassmorphism" aesthetic and powered by a robust Node.js, Express, and MongoDB backend.

## ✨ Key Features

-   **Unified Login System**: Automatic role detection for Administrators, Department Heads (HOD), and Faculty.
-   **HOD Dashboard**: Real-time enrollment tracking, department-wide personnel management, and automated email confirmation dispatch.
-   **Admin Control Center**: Financial Year (Cycle) management, coverage tier configuration, and secure faculty account bulk registration.
-   **Mobile-First Design**: Optimized for Android and high-density displays with responsive tables and touch-friendly controls.
-   **MongoDB Integration**: Secure data persistence with Mongoose for efficient querying and management.

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- MongoDB installed and running

### Installation

1.  **Backend Setup**:
    ```bash
    cd server
    npm install
    cp .env.example .env # Update with your MONGO_URI
    npm start
    ```

2.  **Frontend Setup**:
    ```bash
    npm install
    npm run dev
    ```

## 🛠️ Technology Stack

-   **Frontend**: React (Vite)
-   **Backend**: Node.js, Express
-   **Database**: MongoDB (Mongoose)
-   **Icons**: Lucide React
-   **Styling**: Vanilla CSS (Custom Glassmorphism Design System)

---

*Designed and refined for maximum administrative efficiency.*
