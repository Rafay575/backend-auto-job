// controllers/jobController.js
const pool = require("../config/db");

// Get all jobs
async function getAllJobs(req, res) {
  try {
    const [rows] = await pool.execute("SELECT * FROM linkedin_jobs ORDER BY published_at DESC");
    res.json(rows); // Return all jobs as JSON array
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching jobs." });
  }
}

// Get a single job by ID
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM linkedin_jobs WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Job not found." });
    }
    res.json(rows[0]); // Return the single job object
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching job." });
  }
}
// controllers/userJobsController.js


async function getPurchasedJobs(req, res) {
  try {
    // assume you have set req.user = { id: … } in your auth middleware
    const userId = req.user.id;

    // join user_jobs → jobs, fetch purchased_at too
    const [rows] = await pool.query(
      `SELECT
         j.id,
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

    res.json({ success: true, jobs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  // ...other exports
  getAllJobs,
  getJobById,
  getPurchasedJobs
};
