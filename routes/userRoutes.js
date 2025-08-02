// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getAllUsers ,getUserJobs } = require('../controllers/userController');
const verifyToken = require('../utils/authMiddleware');

router.get('/users', verifyToken, getAllUsers);
router.get('/:id/jobs', getUserJobs);

module.exports = router;
