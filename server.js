const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ DB Connection
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
    console.error("❌ DB failed:", err);
    return;
  }
  
  console.log("✅ Connected to DB");

  db.query(`
    CREATE TABLE IF NOT EXISTS iccids (
      id INT AUTO_INCREMENT PRIMARY KEY,
      iccid VARCHAR(25) UNIQUE,
      location VARCHAR(50),
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
 db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      password VARCHAR(255),
      role VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});


// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("API Working ✅");
});


// 🔒 AUTH
const verifyToken = (req, res, next) => {
  const header = req.headers["authorization"];

 if (!header) {
    return res.status(403).json({ error: "No token" });
  }
  
  const token = header.split(" ")[1];
  
  jwt.verify(token, "secretkey", (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
	
	  req.user = user;
    next();
  });
};


// 👤 REGISTER
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  const hash = await bcrypt.hash(password, 10);
  
  db.query(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    [username, hash, role],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
	  
	    res.json({ message: "✅ User created" });
    }
  );
});


// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
	 if (results.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const user = results[0];
	  
	    const valid = await bcrypt.compare(password, user.password);

     if (!valid) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        "secretkey",
        { expiresIn: "1d" }
      );

      res.json({ token });
    }
  );
});


// 📦 ADD ICCID
app.post("/add-iccid", verifyToken, (req, res) => {
  const { iccid, location } = req.body;

  db.query(
    "INSERT INTO iccids (iccid, location, status) VALUES (?, ?, 'available')",
    [iccid, location],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "✅ Added" });
    }
  );
});


// 📊 GET ICCIDS
app.get("/iccids", verifyToken, (req, res) => {
  db.query("SELECT * FROM iccids", (err, results) => {
    res.json(results);
  });
});


// 🔄 MOVE STOCK
app.put("/move", verifyToken, (req, res) => {
  const { iccid, newLocation } = req.body;
  
  db.query(
    "UPDATE iccids SET location = ? WHERE iccid = ?",
    [newLocation, iccid],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "✅ Moved" });
    }
  );
});


// ✅ START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("✅ Server running");
});
``
