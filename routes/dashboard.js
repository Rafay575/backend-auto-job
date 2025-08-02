// routes/dashboard.js
const express = require('express');
const pool = require('../config/db');                   // your MySQL pool
const authMiddleware = require('../utils/authMiddleware');    // your auth middleware

const router = express.Router();

router.get('/dashboard', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  console.log(userId);

  try {
    // 1) Fetch all purchased jobs (with status)
    const [jobs] = await pool.query(
      `SELECT
         uj.id            AS user_job_id,
         j.id             AS job_id,
         j.title,
         j.company_name,
         j.location,
         j.salary,
         uj.purchased_at,
         uj.status
       FROM user_jobs uj
       JOIN linkedin_jobs j ON uj.job_id = j.id
       WHERE uj.user_id = ?
       ORDER BY uj.purchased_at DESC`,
      [userId]
    );

    // 2) Fetch recent payments
    const [payments] = await pool.query(
      `SELECT
         id,
         amount,
         currency,
         status,
         created_at
       FROM payments
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // 3) Compute summary stats
    const totalJobs     = jobs.length;
    const pendingCount  = jobs.filter(j => j.status === 'pending').length;
    const appliedCount  = totalJobs - pendingCount;
    const totalSpending = payments
      .reduce((sum, p) => sum + parseFloat(p.amount), 0)
      .toFixed(2);

    res.json({
      success: true,
      data: {
        stats: {
          totalJobs,
          pendingCount,
          appliedCount,
          totalSpending,
        },
        jobs,
        payments,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, error: 'Dashboard load failed.' });
  }
});
router.get('/admin/dashboard',
  authMiddleware,      // verifies JWT / session, sets req.user
// checks req.user.isAdmin, 403 if not
  async (req, res) => {
    try {
      // 1) All purchased jobs
      const [jobs] = await pool.query(
        `SELECT
           uj.id            AS user_job_id,
           uj.user_id       AS user_id,
           j.id             AS job_id,
           j.title,
           j.company_name,
           j.location,
           j.salary,
           uj.purchased_at,
           uj.status
         FROM user_jobs uj
         JOIN linkedin_jobs j ON uj.job_id = j.id
         ORDER BY uj.purchased_at DESC`
      );

      // 2) All payments
      const [payments] = await pool.query(
        `SELECT
           id,
           user_id,
           amount,
           currency,
           status,
           created_at
         FROM payments
         ORDER BY created_at DESC`
      );

      // 3) Global stats
      const totalJobs     = jobs.length;
      const pendingCount  = jobs.filter(j => j.status === 'pending').length;
      const appliedCount  = totalJobs - pendingCount;
      const totalSpending = payments
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)
        .toFixed(2);

      return res.json({
        success: true,
        data: {
          stats: {
            totalJobs,
            pendingCount,
            appliedCount,
            totalSpending,
          },
          jobs,
          payments,
        },
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Admin dashboard load failed.' });
    }
  }
);
module.exports = router;
