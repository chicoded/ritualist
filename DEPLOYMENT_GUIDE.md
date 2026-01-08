# Deployment Guide for Ritual Quiz (Namecheap cPanel)

This guide helps you deploy the Ritual Quiz application to your Namecheap hosting (`ritualgame.xyz`).

## Prerequisites
- You have cPanel access (`https://business177.web-hosting.com/cpanel`).
- You have SSH or Terminal access enabled in cPanel.

## 1. Database Setup
1. Log in to cPanel.
2. Go to **MySQL® Databases**.
3. **Create New Database**: Name it `ritusogq_ritualquiz`.
4. **Create New User**: 
   - Username: `ritusogq_admin` (or similar).
   - Password: Generate a strong password (save it!).
5. **Add User to Database**:
   - Select User: `ritusogq_admin`
   - Select Database: `ritusogq_ritualquiz`
   - Click **Add**.
   - Check **ALL PRIVILEGES**.
   - Click **Make Changes**.

## 2. Backend Deployment (Node.js)
1. In cPanel, find **Setup Node.js App**.
2. Click **Create Application**.
   - **Node.js Version**: Select **18.x** or **20.x**.
   - **Application Mode**: **Production**.
   - **Application Root**: `ritualQuiz/backend`.
   - **Application URL**: `api.ritualgame.xyz` (or `ritualgame.xyz/api` if using a subdirectory). 
     *Recommended: Create a subdomain `api.ritualgame.xyz` first in "Subdomains" section.*
   - **Startup File**: `dist/index.js` (We will generate this shortly).
   - Click **Create**.

3. **Clone the Code**:
   - Go to **Terminal** in cPanel (or use SSH).
   - Run:
     ```bash
     git clone https://github.com/chicoded/ritualist.git ritualQuiz
     cd ritualQuiz/backend
     ```

4. **Install & Build**:
   - Run:
     ```bash
     npm install
     npm run build
     ```
     *(This compiles the TypeScript code to JavaScript in the `dist` folder).*

5. **Configure Environment**:
   - Create a `.env` file in `ritualQuiz/backend`:
     ```bash
     nano .env
     ```
   - Paste the following (update password):
     ```env
     PORT=5000
     DB_HOST=localhost
     DB_USER=ritusogq_admin
     DB_PASSWORD=YOUR_DB_PASSWORD_HERE
     DB_NAME=ritusogq_ritualquiz
     JWT_SECRET=your_super_secret_key
     ```
   - Save (Ctrl+O, Enter) and Exit (Ctrl+X).

6. **Initialize Database**:
   - Run:
     ```bash
     npm run db:init
     ```

7. **Restart App**:
   - Go back to **Setup Node.js App** in cPanel.
   - Click **Restart Application**.

## 3. Frontend Deployment (React)
1. **Build Locally** (On your computer):
   - Open your local terminal in `frontend` folder.
   - Run:
     ```bash
     npm run build
     ```
   - This creates a `dist` folder.

2. **Upload to cPanel**:
   - Go to **File Manager** in cPanel.
   - Navigate to `public_html` (or the folder for `ritualgame.xyz`).
   - **Delete** existing default files.
   - **Upload** the **contents** of your local `dist` folder (index.html, assets, etc.) to this folder.

## 4. Final Check
- Visit `https://ritualgame.xyz`. You should see the app.
- Try to login/register to verify backend connection.

**Note**: Ensure your frontend `.env` (or VITE_API_ORIGIN) points to your backend URL (`https://api.ritualgame.xyz` or `https://ritualgame.xyz` if using a proxy).
