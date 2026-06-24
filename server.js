const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

app.get("/", (req, res) => {
  res.send("API Working ✅");
});

// Example: get all ICCIDs
app.get("/iccids", (req, res) => {
  db.query("SELECT * FROM iccids LIMIT 100", (err, results) => {
    res.json(results);
  });
});

app.listen(5000, () => {
  console.log("Server running ✅");
});