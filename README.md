# Pharmacy Management System Demo

This is a demo project for a Pharmacy Management System, consisting of a Node.js/Express server and a React (Vite) client.

## structure

- `client/`: React frontend application.
- `server/`: Node.js backend server with SQLite database.

## Prerequisites

- Node.js installed on your machine.

## Setup and Running

### Backend (Server)

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
   The server runs on port 5000 (default).

### Frontend (Client)

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at the URL provided by Vite (usually http://localhost:5173).

## Features

- Medicine search and listing.
- Prescription upload (OCR integration).
- Chatbot stub.
- SQLite database integration.
