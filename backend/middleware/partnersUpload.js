const multer = require("multer");
const path = require("path");
const fs = require("fs");

const partnersDir = path.join(__dirname, "..", "..", "uploads", "partners");
if (!fs.existsSync(partnersDir)) {
  fs.mkdirSync(partnersDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, partnersDir),
  filename: (req, file, cb) => {
    const partnerId = req.body.partner_id || "new";
    const timestamp = Date.now();
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `partner_${partnerId}_${timestamp}${extension}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const partnerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter,
});

module.exports = partnerUpload;
