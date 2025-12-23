const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Tesseract = require('tesseract.js');
const { GoogleGenAI } = require("@google/genai");

// Set the environment variable for the SDK to pick up
process.env.GEMINI_API_KEY = "AIzaSyBe0xpUiFfZ4qS6PwdsmXjN2GQiDibDLN0";
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

// --- Helper Functions for RAG ---

// Helper to query DB for medicines
function searchMedicinesInDB(keyword) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT name, composition, uses, side_effects, manufacturer 
            FROM medicines 
            WHERE uses LIKE ? OR name LIKE ? OR composition LIKE ?
            LIMIT 5
        `;
        const term = `%${keyword}%`;
        db.all(sql, [term, term, term], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Robust generation function with fallback
async function generateCheck(prompt) {
    try {
        // Try Gemini 2.5 Flash first
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (err_25) {
        console.warn("Gemini 2.5 failed, trying 1.5...", err_25.message || err_25);
        try {
            // Fallback to Gemini 1.5 Flash
            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt,
            });
            return response.text;
        } catch (err_15) {
            console.error("Gemini 1.5 also failed.");
            throw err_15;
        }
    }
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

// 4. Chatbot (RAG Implemented with Fallback)
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ reply: "Say something!" });

    try {
        console.log("Chat request received:", message);

        // Step 1: Extract Keyword
        const extractionPrompt = `
            Extract the single most important medical symptom or medicine name from this user query for a database search.
            User Query: "${message}"
            Output ONLY the keyword (e.g., "fever", "paracetamol", "headache"). If none, output "general".
        `;

        let extractedText = "general";
        try {
            extractedText = await generateCheck(extractionPrompt);
        } catch (e) {
            console.error("Extraction failed, using general.");
        }

        let keyword = (extractedText || "general").trim().replace(/['"]/g, '');
        console.log(`RAG Keyword extracted: ${keyword}`);

        let contextMedicines = [];
        if (keyword.toLowerCase() !== 'general') {
            // Step 2: Retrieve relevant documents (medicines) from SQLite
            contextMedicines = await searchMedicinesInDB(keyword);
        }

        // Prepare context string
        let contextText = "";
        if (contextMedicines.length > 0) {
            contextText = "Here are some medicines available in our inventory:\n" +
                contextMedicines.map(m => `- ${m.name} (Comp: ${m.composition}): Uses: ${m.uses}. Side Effects: ${m.side_effects}`).join("\n");
        } else {
            contextText = "No specific medicines found in inventory matching the symptoms.";
        }

        // Step 3: Generate Final Response with Context
        const finalPrompt = `
            You are a helpful pharmacy assistant. 
            User Query: "${message}"
            
            Inventory Context:
            ${contextText}

            Instructions:
            1. Suggest medicines ONLY from the Inventory Context if they match the symptoms.
            2. If the context has relevant medicines, mention their names and composition.
            3. If no relevant medicines are in the context, give general advice but state we might not have stock.
            4. Keep it concise (max 3-4 sentences).
            5. Always start with a disclaimer to consult a doctor.
        `;

        const replyText = await generateCheck(finalPrompt);

        // Robust check
        const safeReply = replyText ? replyText : "I couldn't generate a response. Please try again.";
        res.json({ reply: safeReply });

    } catch (error) {
        console.error("Gemini RAG API Error:", JSON.stringify(error, null, 2));
        if (error.response) {
            console.error("Error Response Body:", JSON.stringify(error.response, null, 2));
        }
        res.status(500).json({ reply: "Sorry, I'm having trouble connecting to the AI right now. Check server logs." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Gemini RAG integration initialized (With 1.5 Flash Fallback)`);
});
