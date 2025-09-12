const mysql = require("mysql2");

const dbSuperAdmin = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SUPERADMIN,
});


dbSuperAdmin.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to SuperAdmin database:", err.message);
  } else {
    console.log("✅ Connected to SuperAdmin database");
  }
});

module.exports = dbSuperAdmin;
