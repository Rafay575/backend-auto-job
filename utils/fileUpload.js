// utils/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
['./uploads/profile_images', './uploads/cvs'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Profile Image
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/profile_images/'),
  filename: (req, file, cb) =>
    cb(null, `user_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`)
});
const imageFilter = (req, file, cb) => {
  if (/^image\/(jpeg|jpg|png)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, JPEG, PNG allowed.'), false);
};
const uploadImage = multer({ storage: imageStorage, fileFilter: imageFilter });

// CV PDF
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/cvs/'),
  filename: (req, file, cb) =>
    cb(null, `user_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`)
});
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF allowed.'), false);
};
const uploadPDF = multer({ storage: pdfStorage, fileFilter: pdfFilter });

module.exports = {
  uploadImage,
  uploadPDF
};
