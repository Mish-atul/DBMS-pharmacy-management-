const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Tesseract = require('tesseract.js');
const { GoogleGenAI } = require("@google/genai");

// Set the environment variable for the SDK to pick up
process.env.GEMINI_API_KEY = "AIzaSyBXVvTTeMGdzlprFybAgMywtKRFQALofvs";
const ai = new GoogleGenAI({});

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('uploads')); // Serve uploaded images

// Database Connection
const dbPath = path.join(__dirname, 'pharmacy.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database " + dbPath + ": " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Multer Setup for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// --- API Routes ---

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }
    // In production, hash password with bcrypt
    const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(sql, [username, password], function (err) {
        if (err) {
            return res.status(400).json({ error: "Username already exists" });
        }
        res.json({ message: "User registered successfully", userId: this.lastID });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ message: "Login successful", user: { id: row.user_id, username: row.username } });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    });
});

// 2. Medicines List
app.get('/api/medicines', (req, res) => {
    const search = req.query.search;
    let sql = `SELECT * FROM medicines`;
    let params = [];

    if (search) {
        sql += ` WHERE name LIKE ? OR composition LIKE ? OR uses LIKE ?`;
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    // Limit results for performance if no specific search
    if (!search) {
        sql += ` LIMIT 100`;
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ medicines: rows });
    });
});

// 3. Prescription Upload + OCR
app.post('/api/upload-prescription', upload.single('prescription'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const imagePath = req.file.path;

    // Tesseract OCR
    try {
        console.log(`Processing OCR for ${imagePath}...`);
        const { data: { text } } = await Tesseract.recognize(
            imagePath,
            'eng'
        );
        res.json({
            message: "File processed",
            extractedText: text,
            filePath: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        console.error("OCR Error:", error);
        res.status(500).json({ error: "Failed to process image" });
    }
});

// 4. Chatbot Stub - Updated to use Gemini 2.5 Flash via @google/genai
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Say something!" });

    try {
        const prompt = `You are a helpful pharmacy assistant. The user asks: "${message}". 
        Suggest medicines based on their symptoms if applicable, but always advise consulting a doctor. 
        Keep the response concise (max 3 sentences).`;

        // Using gemini-2.5-flash as requested
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        res.json({ reply: response.text });
    } catch (error) {
        console.error("Gemini API Error:", JSON.stringify(error, null, 2));
        res.status(500).json({ reply: "Sorry, I'm having trouble connecting to the AI right now." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Gemini integration initialized with model: gemini-2.5-flash`);
});
