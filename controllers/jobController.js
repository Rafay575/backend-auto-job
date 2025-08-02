// controllers/jobController.js
const Apify = require("apify");
const pool = require("../config/db");

// Check if job exists
async function jobExists(title, publishedAt) {
  const [rows] = await pool.execute(
    "SELECT 1 FROM linkedin_jobs WHERE title = ? AND published_at = ? LIMIT 1",
    [title, publishedAt]
  );
  return rows.length > 0;
}

// Insert job
async function insertJob(job) {
  await pool.execute(
    `INSERT INTO linkedin_jobs (
      title, location, posted_time, published_at, job_url, company_name, company_url, description,
      applications_count, contract_type, experience_level, work_type, sector, salary,
      poster_full_name, poster_profile_url, company_id, apply_url, apply_type, benefits
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.title ?? null,
      job.location ?? null,
      job.posted_time ?? null,
      job.published_at ?? null,
      job.job_url ?? null,
      job.company_name ?? null,
      job.company_url ?? null,
      job.description ?? null,
      job.applications_count ?? null,
      job.contract_type ?? null,
      job.experience_level ?? null,
      job.work_type ?? null,
      job.sector ?? null,
      job.salary ?? null,
      job.poster_full_name ?? null,
      job.poster_profile_url ?? null,
      job.company_id ?? null,
      job.apply_url ?? null,
      job.apply_type ?? null,
      job.benefits ?? null,
    ]
  );
}

// Main Apify scraping function
async function scrapeAndSaveJobs(req, res) {
  try {
    const client = new Apify.ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
  const run = await client.actor("bebity/linkedin-jobs-scraper").call({
  location: "United Kingdom",
  maxResults: 1000, // if available
  pages: 100, // if available
  // other options if mentioned in docs
});


    // Get dataset items
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    let newJobs = 0;
    for (const job of items) {
      // Map Apify actor fields to your DB fields
      const mappedJob = {
        title: job.title ?? null,
        location: job.location ?? null,
        posted_time: job.postedTime ?? null, // NOTICE: postedTime (API) -> posted_time (DB)
        published_at: job.publishedAt ?? null,
        job_url: job.jobUrl ?? null,
        company_name: job.companyName ?? null,
        company_url: job.companyUrl ?? null,
        description: job.description ?? null,
        applications_count: job.applicationsCount ?? null,
        contract_type: job.contractType ?? null,
        experience_level: job.experienceLevel ?? null,
        work_type: job.workType ?? null,
        sector: job.sector ?? null,
        salary: job.salary ?? null,
        poster_full_name: job.posterFullName ?? null,
        poster_profile_url: job.posterProfileUrl ?? null,
        company_id: job.companyId ?? null,
        apply_url: job.applyUrl ?? null,
        apply_type: job.applyType ?? null,
        benefits: job.benefits ?? null,
      };

      if (!(await jobExists(mappedJob.title, mappedJob.published_at))) {
        console.log("JOB DATA:", Object.values(mappedJob)); // see mapped fields
        await insertJob(mappedJob);
        newJobs++;
      }
    }

    // For direct test
    if (res) {
      res.json({ message: `Scraping complete. Added ${newJobs} new jobs.` });
    }
  } catch (err) {
    if (res) {
      res.status(500).json({ error: err.message });
    } else {
      console.error(err);
    }
  }
}

module.exports = { scrapeAndSaveJobs };
