require("dotenv").config();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const nodemailer = require("nodemailer");

if (process.env.STATUS !== "deployed") {
  process.exit(0);
}

const {
  DB_HOST, DB_PORT = "3306", DB_USER, DB_PASSWORD, DB_NAME,
  BACKUP_ENCRYPTION_KEY,
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME, R2_RETENTION_DAYS = "30",
  NOTIFY_EMAIL,
} = process.env;

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const today = new Date().toISOString().slice(0, 10);
const tmpDir = path.join(__dirname, "../../tmp");
const sqlFile = path.join(tmpDir, `swiftpass_${today}.sql`);
const encFile = `${sqlFile}.enc`;
const r2Key = `backups/swiftpass_${today}.sql.enc`;

function sh(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

async function sendEmail(subject, body) {
  if (!NOTIFY_EMAIL) return;
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: NOTIFY_EMAIL,
    subject,
    text: body,
  });
}

function encryptFile(inputPath, outputPath, key) {
  return new Promise((resolve, reject) => {
    const keyBuf = crypto.createHash("sha256").update(key).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", keyBuf, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    output.write(iv);
    input.pipe(cipher).pipe(output);
    output.on("finish", resolve);
    output.on("error", reject);
    cipher.on("error", reject);
  });
}

async function deleteOldBackups() {
  const retentionMs = Number(R2_RETENTION_DAYS) * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - retentionMs);
  const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: "backups/" }));
  const toDelete = (list.Contents || []).filter((obj) => new Date(obj.LastModified) < cutoff);
  for (const obj of toDelete) {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: obj.Key }));
  }
  return toDelete.length;
}

(async () => {
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    await sh(`mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${sqlFile}`);
    await encryptFile(sqlFile, encFile, BACKUP_ENCRYPTION_KEY);

    const fileStream = fs.createReadStream(encFile);
    const fileSize = fs.statSync(encFile).size;
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: fileStream,
      ContentLength: fileSize,
      ContentType: "application/octet-stream",
      Metadata: { database: DB_NAME, date: today, encrypted: "aes-256-cbc" },
    }));

    fs.unlinkSync(sqlFile);
    fs.unlinkSync(encFile);
    await deleteOldBackups();

    await sendEmail(
      `SwiftPass Backup Done — ${today}`,
      `Backup completed successfully.\n\nDate: ${today}\nFile: ${r2Key}\nSize: ${(fileSize / 1024).toFixed(1)} KB\nRetention: ${R2_RETENTION_DAYS} days`
    );
  } catch (err) {
    try {
      if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
      if (fs.existsSync(encFile)) fs.unlinkSync(encFile);
    } catch (_) {}
    await sendEmail(
      `SwiftPass Backup FAILED — ${today}`,
      `Backup failed on ${today}.\n\nError: ${err.message}`
    ).catch(() => {});
    process.exit(1);
  }
})();