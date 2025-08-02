// routes/orders.js
const express = require('express');
const pool = require('../config/db');          // your MySQL pool
const authMiddleware = require('../utils/authMiddleware');  // auth middleware

const router = express.Router();

/**
 * GET /api/orders
 * Fetch all purchases for the current user
 */
router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  console.log(userId);
  try {
    const [orders] = await pool.query(
      `SELECT
         uj.id         AS order_id,
         u.id          AS user_id,
         u.name        AS user_name,
         j.id          AS job_id,
         j.title       AS job_title,
         uj.status     AS status
       FROM user_jobs uj
       JOIN users u   ON uj.user_id = u.id
       JOIN linkedin_jobs j    ON uj.job_id  = j.id
      
       ORDER BY uj.purchased_at DESC`,
      [userId]
    );
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, error: 'Failed to load orders.' });
  }
});

/**
 * PUT /api/orders/:id/status
 * Update a purchase's status (e.g. mark as "applied")
 */
router.put('/orders/:id/status', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;
  const { status } = req.body;

  // Only allow setting to "applied"
  if (status !== 'applied') {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE user_jobs
       SET status = ?
       WHERE id = ?`,
      [status, orderId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Order not found or not owned by you.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: 'Failed to update status.' });
  }
});

module.exports = router;
