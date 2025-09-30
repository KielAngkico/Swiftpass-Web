const mysql = require("mysql2");

const dbSuperAdmin = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SUPERADMIN,
  waitForConnections: true,
  connectionLimit: 10,  // number of concurrent connections
  queueLimit: 0         // unlimited queued queries
});

// Test a connection once when starting
dbSuperAdmin.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error connecting to SuperAdmin database:", err.message);
  } else {
    console.log("✅ Connected to SuperAdmin database (pool)");
    connection.release();
  }
});

module.exports = dbSuperAdmin;
