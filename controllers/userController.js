// controllers/userController.js
const db = require('../config/db');

exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.user_type !== 1) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const offset = (page - 1) * limit;

    const [users] = await db.query(`
      SELECT id, name AS username, email, phone, created_at, user_type
      FROM users
      WHERE name LIKE ? OR email LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [`%${search}%`, `%${search}%`, limit, offset]);

    const [[{ count }]] = await db.query(`
      SELECT COUNT(*) AS count FROM users
      WHERE name LIKE ? OR email LIKE ?
    `, [`%${search}%`, `%${search}%`]);

    res.json({ success: true, data: users, total: count });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.getUserJobs = async (req, res) => {
  const user_id = req.params.id;
  try {
    const [jobs] = await pool.execute(
      `SELECT j.* FROM jobs j
       JOIN user_jobs uj ON j.id = uj.job_id
       WHERE uj.user_id = ?`, [user_id]
    );
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
