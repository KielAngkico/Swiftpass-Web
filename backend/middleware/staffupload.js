const multer = require("multer");
const path = require("path");
const fs = require("fs");


const staffDir = path.join(__dirname, "..","..", "uploads", "staff");
if (!fs.existsSync(staffDir)) {
  fs.mkdirSync(staffDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, staffDir),
  filename: (req, file, cb) => {

    const staffId = req.body.staff_id || 'new';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `staff_${staffId}_${timestamp}${extension}`;
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

const staffUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter,
});

module.exports = staffUpload;