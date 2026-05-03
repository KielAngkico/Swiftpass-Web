require("dotenv").config();
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { exec } = require("child_process");

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME, BACKUP_ENCRYPTION_KEY,
  DB_HOST, DB_PORT = "3306", DB_USER, DB_PASSWORD, DB_NAME,
} = process.env;

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const targetDate = process.argv[2] || new Date().toISOString().slice(0, 10);
const r2Key = `backups/swiftpass_${targetDate}.sql.enc`;
const tmpDir = path.join(__dirname, "../../tmp");
const encFile = path.join(tmpDir, `swiftpass_${targetDate}.sql.enc`);
const sqlFile = path.join(tmpDir, `swiftpass_${targetDate}.sql`);

function streamToFile(stream, filePath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filePath);
    stream.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
  });
}

function decryptFile(inputPath, outputPath, key) {
  return new Promise((resolve, reject) => {
    const keyBuf = crypto.createHash("sha256").update(key).digest();
    const input = fs.createReadStream(inputPath);
    const chunks = [];
    input.on("data", (chunk) => chunks.push(chunk));
    input.on("end", () => {
      const buf = Buffer.concat(chunks);
      const iv = buf.slice(0, 16);
      const encrypted = buf.slice(16);
      const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuf, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      fs.writeFileSync(outputPath, decrypted);
      resolve();
    });
    input.on("error", reject);
  });
}

function sh(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

(async () => {
  const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: "backups/" }));
  const backups = (list.Contents || []).map((obj) => ({
    date: obj.Key.replace("backups/swiftpass_", "").replace(".sql.enc", ""),
    size: `${(obj.Size / 1024).toFixed(1)} KB`,
  }));

  const exists = backups.find((b) => b.date === targetDate);
  if (!exists) {
    console.error(`No backup found for ${targetDate}. Available: ${backups.map(b => b.date).join(", ")}`);
    process.exit(1);
  }

  fs.mkdirSync(tmpDir, { recursive: true });

  const response = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }));
  await streamToFile(response.Body, encFile);
  await decryptFile(encFile, sqlFile, BACKUP_ENCRYPTION_KEY);

  const snapshotFile = path.join(tmpDir, `swiftpass_pre_restore_snapshot_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.sql`);
  await sh(`mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${snapshotFile}`);

  console.log(`Restoring '${DB_NAME}' to ${targetDate}. Current state saved at:\n   ${snapshotFile}\n   Press Ctrl+C within 5 seconds to cancel...`);
  await new Promise((r) => setTimeout(r, 5000));

  await sh(`mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < ${sqlFile}`);

  fs.unlinkSync(encFile);
  fs.unlinkSync(sqlFile);
  console.log(`Restore complete.`);
})().catch((err) => {
  console.error("Restore failed:", err.message);
  process.exit(1);
});