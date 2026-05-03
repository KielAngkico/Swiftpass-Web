require("dotenv").config();
const cron = require("node-cron");
const { exec } = require("child_process");
const path = require("path");

if (process.env.STATUS === "deployed") {
  cron.schedule("59 23 * * *", () => {
    const backupScript = path.join(__dirname, "backup.js");
    exec(`node ${backupScript}`, (err, stdout, stderr) => {
      if (err) console.error("[Backup] Failed:", err.message);
    });
  });
}

module.exports = {};