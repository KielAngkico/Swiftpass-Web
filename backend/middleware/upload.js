const multer = require("multer");
const path = require("path");
const fs = require("fs");

 
const uploadDir = path.join(__dirname, "..", "..", "public","uploads", "members");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
  const uniqueName = `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
  cb(null, uniqueName);
}, 
});

 
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

 
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  
  fileFilter,
});

module.exports = upload;
