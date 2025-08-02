const express = require('express');
const router = express.Router();
const { scrapeAndSaveJobs } = require('../controllers/jobController');
const { getAllJobs,getJobById } = require('../controllers/jobController1');
const { getPurchasedJobs } = require('../controllers/jobController1');
const authMiddleware = require('../utils/authMiddleware');


router.post('/scrape-jobs', scrapeAndSaveJobs);

router.get("/all", getAllJobs);
router.get('/:id', getJobById);


// change this line from router.get → router.post
router.post('/my-jobs', authMiddleware, getPurchasedJobs);
module.exports = router;
