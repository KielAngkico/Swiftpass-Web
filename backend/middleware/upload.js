const multer = require("multer");
const path = require("path");
const fs = require("fs");

 
const uploadDir = path.join(__dirname, "..", "uploads", "members");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);  
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
