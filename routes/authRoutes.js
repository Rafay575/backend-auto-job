const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../utils/authMiddleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.get('/auth/verify', authController.verifyToken);

router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password',authMiddleware, authController.changePassword);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
