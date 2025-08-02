const express = require('express');
const router = express.Router();
const { uploadImage, uploadPDF } = require('../utils/fileUpload');
const db = require('../config/db');

// Profile Image Upload
router.post('/users/:id/profile-image', uploadImage.single('image'), async (req, res) => {
  const userId = req.params.id;
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });

  const url = `/uploads/profile_images/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET profile_image_url = ? WHERE id = ?', [url, userId]);
    return res.json({ success: true, url });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error saving profile image.' });
  }
});

// CV PDF Upload
router.post('/users/:id/cv', uploadPDF.single('pdf'), async (req, res) => {
  const userId = req.params.id;
  if (!req.file) return res.status(400).json({ success: false, message: 'No PDF uploaded.' });

  const url = `/uploads/cvs/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET cv_pdf_url = ? WHERE id = ?', [url, userId]);
    return res.json({ success: true, url });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error saving CV.' });
  }
});

module.exports = router;
