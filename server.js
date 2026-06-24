const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// ✅ Connect + Create Table
db.connect((err) => {
  if (err) {
    console.error("❌ DB connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS iccids (
      id INT AUTO_INCREMENT PRIMARY KEY,
      iccid VARCHAR(25) UNIQUE,
      location VARCHAR(50),
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableQuery, (err) => {
    if (err) {
      console.error("❌ Table creation error:", err);
    } else {
      console.log("✅ Table ready");
    }
  });
});

// ✅ Root route
app.get("/", (req, res) => {
  res.send("API Working ✅");
});

// ✅ Get all ICCIDs
app.get("/iccids", (req, res) => {
  db.query("SELECT * FROM iccids ORDER BY created_at DESC", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ✅ Add ICCID
app.post("/add-iccid", (req, res) => {
  const { iccid, location } = req.body;

  if (!iccid || !location) {
    return res.status(400).json({ error: "ICCID and location required" });
  }

  db.query(
    "INSERT INTO iccids (iccid, location, status) VALUES (?, ?, 'available')",
    [iccid, location],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "✅ ICCID added successfully" });
    }
  );
});

// ✅ Move stock (change location)
app.put("/move", (req, res) => {
  const { iccid, newLocation } = req.body;

  if (!iccid || !newLocation) {
    return res.status(400).json({ error: "ICCID and new location required" });
  }

  db.query(
    "UPDATE iccids SET location = ? WHERE iccid = ?",
    [newLocation, iccid],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "ICCID not found" });
      }

      res.json({ message: "✅ Stock moved successfully" });
    }
  );
});

// ✅ Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
