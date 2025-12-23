# Pharmacy Management System Demo 💊

A full-stack web application for managing pharmacy operations, featuring an AI-powered inventory assistant (RAG) and Prescription OCR.

## 🚀 Features

### 1. **Smart Inventory Management**
- **Database**: Powered by **SQLite** (`pharmacy.db`), pre-seeded with 11,000+ real medicine records.
- **Search**: Fast filtering by medicine name, composition, or usage.

### 2. **AI Chatbot with RAG (Retrieval-Augmented Generation)**
- **Intelligent**: Uses **Google Gemini 2.5 Flash** (with auto-fallback to 1.5 Flash) to understand natural language queries.
- **Context-Aware**: The bot extracts symptoms from your query, searches the local inventory database, and suggests *only* medicines that are actually in stock.
- **Tech**: Built using the official `@google/genai` SDK.

### 3. **Prescription Digitization (OCR)**
- Upload prescription images to extract text automatically using **Tesseract.js**.

### 4. **User Authentication**
- Simple Register/Login system (stored in SQLite users table).

## 🛠️ Tech Stack

- **Frontend**: React.js (Vite), CSS Modules.
- **Backend**: Node.js, Express.js.
- **Database**: SQLite3.
- **AI/ML**: Google Gemini API, Tesseract.js.

## 📂 Project Structure

```
/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.jsx         # Main UI Logic
│   │   └── App.css         # Styling
│   └── ...
├── server/                 # Node.js Backend
│   ├── server.js           # API Server (Express + RAG Logic)
│   ├── setup_db.js         # Database Seeding Script
│   ├── pharmacy.db         # SQLite Database
│   ├── uploads/            # Uploaded Rx Images
│   └── ...
└── Medicine_Details.csv    # Source Dataset
```

## ⚡ parameters & Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- Google Gemini API Key

### 2. Install Dependencies

**Server:**
```bash
cd server
npm install
```
*(Dependencies: express, sqlite3, cors, multer, tesseract.js, @google/genai)*

**Client:**
```bash
cd client
npm install
```

### 3. Database Setup (Already Done)
The `server/server.js` automatically connects to `pharmacy.db`. If you need to reset the data, delete `pharmacy.db` and run:
```bash
node setup_db.js
```

### 4. API Key Configuration
The project uses a hardcoded API key in `server.js` for demo purposes.
To change it, edit `server/server.js`:
```javascript
process.env.GEMINI_API_KEY = "YOUR_NEW_API_KEY";
```

## 🏃‍♂️ How to Run

**Step 1: Start the Backend**
Open a terminal in the `server` folder:
```bash
cd server
node server.js
```
*Server runs on: `http://localhost:3000`*

**Step 2: Start the Frontend**
Open a **new** terminal in the `client` folder:
```bash
cd client
npm run dev
```
*Frontend runs on: `http://localhost:5173` (or similar)*

**Step 3: Usage**
1. Open the Frontend URL.
2. Register/Login.
3. Go to **Medicines** to browse stock.
4. Go to **AI Chat** to ask health questions (e.g., "I have a headache, what do you have?").
5. Go to **Upload Rx** to test OCR.

## 📸 Screenshots
*(Add screenshots here)*
