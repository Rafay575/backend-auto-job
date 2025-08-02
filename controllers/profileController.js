const db = require('../config/db');

// GET full profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get main profile data
    const [[profile]] = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
    const [education] = await db.query('SELECT * FROM user_education WHERE user_id = ?', [userId]);
    const [experiences] = await db.query('SELECT * FROM user_experiences WHERE user_id = ?', [userId]);
    const [certifications] = await db.query('SELECT * FROM user_certifications WHERE user_id = ?', [userId]);
    const [skills] = await db.query('SELECT * FROM user_skills WHERE user_id = ?', [userId]);
    const [languages] = await db.query('SELECT * FROM user_languages WHERE user_id = ?', [userId]);

    // Get user name/email/phone
   const [[user]] = await db.query(
  'SELECT name, email, phone, profile_image_url, cv_pdf_url FROM users WHERE id = ?', [userId]
);


    // Add responsibilities to experiences
    for (let exp of experiences) {
      const [responsibilities] = await db.query(
        'SELECT responsibility FROM user_responsibilities WHERE experience_id = ?',
        [exp.id]
      );
      exp.responsibilities = responsibilities.map(r => r.responsibility);
    }

    // Merge user info with profile
    const fullProfile = profile
      ? { ...profile, ...user }
      : user || {};

    res.json({
      success: true,
      data: {
        profile: fullProfile,
        education,
        experiences,
        certifications,
        skills,
        languages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// POST: Save or update full user profile
exports.saveUserProfile = async (req, res) => {
  const { userId } = req.params;
  let { profile, education, experiences, certifications, skills, languages } = req.body;

  // Remove empty entries
  education = (education || []).filter(
    edu => edu && (edu.degree || edu.institution || edu.year) && Object.values(edu).some(val => String(val || '').trim() !== '')
  );

  // Experience: allow at least one field or responsibility
  experiences = (experiences || []).filter(
    exp =>
      exp &&
      (exp.role || exp.company || exp.duration || (exp.responsibilities && exp.responsibilities.length > 0)) &&
      Object.values(exp).some(val => {
        if (Array.isArray(val)) return val.length > 0;
        return String(val || '').trim() !== '';
      })
  );

  certifications = (certifications || []).filter(
    cert => cert && (cert.certification && String(cert.certification).trim() !== '')
  );

  skills = (skills || []).filter(
    skill => skill && (skill.skill && String(skill.skill).trim() !== '')
  );

  languages = (languages || []).filter(
    lang => lang && (lang.language && String(lang.language).trim() !== '')
  );

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Upsert profile
    const [[existing]] = await conn.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
    if (existing) {
      await conn.query('UPDATE user_profiles SET ? WHERE user_id = ?', [profile, userId]);
    } else {
      await conn.query('INSERT INTO user_profiles SET ?', { ...profile, user_id: userId });
    }

    // Delete and Insert Education
    await conn.query('DELETE FROM user_education WHERE user_id = ?', [userId]);
    for (let edu of education) {
      await conn.query('INSERT INTO user_education SET ?', { ...edu, user_id: userId });
    }

    // Delete old experiences and responsibilities
    const [oldExps] = await conn.query('SELECT id FROM user_experiences WHERE user_id = ?', [userId]);
    for (let exp of oldExps) {
      await conn.query('DELETE FROM user_responsibilities WHERE experience_id = ?', [exp.id]);
    }
    await conn.query('DELETE FROM user_experiences WHERE user_id = ?', [userId]);

    // Insert new experiences (and their responsibilities)
    for (let exp of experiences || []) {
      // Destructure to separate responsibilities from main exp data
      const { responsibilities, ...expData } = exp;
      const [result] = await conn.query('INSERT INTO user_experiences SET ?', { ...expData, user_id: userId });
      const experience_id = result.insertId;
      // Insert responsibilities (if any)
      for (let r of (responsibilities || [])) {
        if (r && String(r).trim() !== '') {
          await conn.query('INSERT INTO user_responsibilities SET ?', {
            experience_id,
            responsibility: r
          });
        }
      }
    }

    // Certifications
    await conn.query('DELETE FROM user_certifications WHERE user_id = ?', [userId]);
    for (let cert of certifications) {
      await conn.query('INSERT INTO user_certifications SET ?', { ...cert, user_id: userId });
    }

    // Skills
    await conn.query('DELETE FROM user_skills WHERE user_id = ?', [userId]);
    for (let skill of skills) {
      await conn.query('INSERT INTO user_skills SET ?', { ...skill, user_id: userId });
    }

    // Languages
    await conn.query('DELETE FROM user_languages WHERE user_id = ?', [userId]);
    for (let lang of languages) {
      await conn.query('INSERT INTO user_languages SET ?', { ...lang, user_id: userId });
    }

    // Count each section
    const [[eduCount]] = await conn.query('SELECT COUNT(*) AS count FROM user_education WHERE user_id = ?', [userId]);
    const [[expCount]] = await conn.query('SELECT COUNT(*) AS count FROM user_experiences WHERE user_id = ?', [userId]);
    const [[certCount]] = await conn.query('SELECT COUNT(*) AS count FROM user_certifications WHERE user_id = ?', [userId]);
    const [[skillCount]] = await conn.query('SELECT COUNT(*) AS count FROM user_skills WHERE user_id = ?', [userId]);
    const [[langCount]] = await conn.query('SELECT COUNT(*) AS count FROM user_languages WHERE user_id = ?', [userId]);

    const allFilled = [eduCount.count, expCount.count, certCount.count, skillCount.count, langCount.count]
      .every(count => Number(count) > 0);

    if (allFilled) {
      await conn.query('UPDATE users SET profile_completed = 1 WHERE id = ?', [userId]);
    }

    await conn.commit();
    res.json({ success: true, message: 'User profile saved successfully.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};
