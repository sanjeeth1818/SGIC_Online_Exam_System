# 🚀 SGIC Online Exam System - Quick Setup Guide

Welcome to the **SGIC Online Exam System**! This guide will help you get the system up and running on a fresh computer in no time.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **☕ Java Development Kit (JDK):** Version 17 or higher
*   **🟢 Node.js:** Version 18 or higher (includes npm)
*   **🐬 MySQL Server:** Version 8.0 or higher
*   **🏗️ Build Tools:** Maven (for backend)

---

## 💾 1. Database Configuration

1.  Open your MySQL terminal or a GUI like **MySQL Workbench**.
2.  Create a new database named `sgic_exam`:
    ```sql
    CREATE DATABASE sgic_exam;
    ```
3.  The backend is configured to use the following credentials by default:
    *   **Username:** `root`
    *   **Password:** *(Empty)*
    > [!TIP]
    > If your MySQL credentials are different, update them in `backend/src/main/resources/application.properties`.

---

## ⚙️ 2. Backend Setup (Spring Boot)

1.  Open your terminal and navigate to the project root.
2.  Move into the backend directory:
    ```bash
    cd backend
    ```
3.  Run the application using Maven:
    ```bash
    mvn spring-boot:run
    ```
    *   The backend server will start on: `http://localhost:8080`
    *   Database tables will be created automatically on the first run.

---

## 🎨 3. Frontend Setup (React + Vite)

1.  Open a **new** terminal window and navigate to the project root.
2.  Install the necessary dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    *   The frontend will be available at: `http://localhost:5173` (or the port shown in your terminal).

---

## 🏁 4. Accessing the System

Once both servers are running:
*   **Admin Dashboard:** `http://localhost:5173/admin`
*   **Student Portal:** `http://localhost:5173/student` (Check individual exam routes)

---

## 🛠️ Troubleshooting

*   **Database connection fails?** Ensure MySQL service is running and credentials match in `application.properties`.
*   **Port already in use?** If 8080 or 5173 are taken, you can change them in `application.properties` (backend) or `vite.config.js` (frontend).
*   **Dependency errors?** Try deleting `node_modules` and running `npm install` again.

---

> [!IMPORTANT]
> Always ensure the backend is running before performing any actions in the frontend to avoid connection errors!

Happy Coding! ✨
