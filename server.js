const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// ✅ Connect + Create Tables
db.connect((err) => {
  if (err) {
    console.error("❌ DB connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL");

  // ✅ ICCID table
  const iccidTable = `
    CREATE TABLE IF NOT EXISTS iccids (
      id INT AUTO_INCREMENT PRIMARY KEY,
      iccid VARCHAR(25) UNIQUE,
      location VARCHAR(50),
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(iccidTable, (err) => {
    if (err) console.error("❌ ICCID table error:", err);
    else console.log("✅ ICCID table ready");
  });

  // ✅ Users table
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(usersTable, (err) => {
    if (err) console.error("❌ Users table error:", err);
    else console.log("✅ Users table ready");
  });
});

// ✅ Root Test
app.get("/", (req, res) => {
  res.send("API Working ✅");
});


// 🔒 ✅ AUTH MIDDLEWARE
const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];

  if (!bearerHeader) {
    return res.status(403).json({ error: "No token provided" });
  }

  const token = bearerHeader.split(" ")[1];

  jwt.verify(token, "secretkey", (err, authData) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = authData;
    next();
  });
};


// 👤 ✅ REGISTER USER
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashedPassword, role],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "✅ User created" });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 🔐 ✅ LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        "secretkey",
        { expiresIn: "1d" }
      );

      res.json({
        message: "✅ Login successful",
        token,
        user: {
          username: user.username,
          role: user.role
        }
      });
    }
  );
});


// 📦 ✅ ADD ICCID
app.post("/add-iccid", verifyToken, (req, res) => {
  const { iccid, location } = req.body;

  if (!iccid || !location) {
    return res.status(400).json({ error: "ICCID and location required" });
  }

  db.query(
    "INSERT INTO iccids (iccid, location, status) VALUES (?, ?, 'available')",
    [iccid, location],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "✅ ICCID added" });
    }
  );
});


// 📊 ✅ GET ICCIDS
app.get("/iccids", verifyToken, (req, res) => {
  db.query("SELECT * FROM iccids ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(results);
  });
});


// 🔄 ✅ MOVE STOCK
app.put("/move", verifyToken, (req, res) => {
  const { iccid, newLocation } = req.body;

  if (!iccid || !newLocation) {
    return res.status(400).json({ error: "ICCID and new location required" });
  }

  db.query(
    "UPDATE iccids SET location = ? WHERE iccid = ?",
    [newLocation, iccid],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "ICCID not found" });
      }

      res.json({ message: "✅ Stock moved" });
    }
  );
});


// ✅ SERVER START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
