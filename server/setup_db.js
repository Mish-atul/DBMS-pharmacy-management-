const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const dbPath = path.join(__dirname, 'pharmacy.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Connected to SQLite database.");

    // Create Users Table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    // Create Medicines Table
    db.run(`
        CREATE TABLE IF NOT EXISTS medicines (
            medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            composition TEXT,
            uses TEXT,
            side_effects TEXT,
            image_url TEXT,
            manufacturer TEXT,
            excellent_review_pct REAL,
            average_review_pct REAL,
            poor_review_pct REAL
        )
    `, (err) => {
        if (err) {
            console.error("Error creating medicines table:", err);
            return;
        }
        console.log("Tables created.");
        checkAndSeed();
    });
});

function checkAndSeed() {
    db.get("SELECT COUNT(*) as count FROM medicines", (err, row) => {
        if (err) {
            console.error(err);
            return;
        }
        if (row.count > 0) {
            console.log("Medicines table already has data. Skipping seed.");
            db.close();
        } else {
            console.log("Seeding medicines from CSV...");
            seedMedicines();
        }
    });
}

function seedMedicines() {
    const results = [];
    const csvPath = path.join(__dirname, 'Medicine_Details.csv');

    if (!fs.existsSync(csvPath)) {
        console.error("CSV file not found at:", csvPath);
        db.close();
        return;
    }

    fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => {
            // CSV fields: Medicine Name, Composition, Uses, Side_effects, Image URL, Manufacturer, Excellent Review %, Average Review %, Poor Review %
            results.push([
                data['Medicine Name'],
                data['Composition'],
                data['Uses'],
                data['Side_effects'],
                data['Image URL'],
                data['Manufacturer'],
                parseFloat(data['Excellent Review %']) || 0,
                parseFloat(data['Average Review %']) || 0,
                parseFloat(data['Poor Review %']) || 0
            ]);
        })
        .on('end', () => {
            const stmt = db.prepare(`INSERT INTO medicines (name, composition, uses, side_effects, image_url, manufacturer, excellent_review_pct, average_review_pct, poor_review_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                results.forEach(row => {
                    stmt.run(row);
                });
                db.run("COMMIT", () => {
                    console.log(`Seeding completed. Inserted ${results.length} rows.`);
                    stmt.finalize();
                    db.close();
                });
            });
        });
}
