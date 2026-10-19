// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Safe filename: strip anything except alnum + . - _
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 60);
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `flood_${unique}_${safeBase}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const name = file.originalname;

  // Reject names with multiple extensions (e.g. "photo.jpg.exe")
  if ((name.match(/\./g) || []).length > 1) {
    return cb(new Error('Invalid filename (multiple extensions not allowed).'));
  }
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new Error('Only jpg, jpeg, png, gif, webp images are allowed.'));
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Invalid image MIME type.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,                    // only one file per request
    fields: 20,                  // defensive upper bound
    fieldNameSize: 100
  },
  fileFilter
});

module.exports = upload;