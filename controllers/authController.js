const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { sendOtpEmail } = require('../utils/mailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Prevent manually setting user_type
    if (req.body.user_type !== undefined) {
      return res.status(403).json({ message: 'You are not allowed to set user_type' });
    }

    // Check if user already exists
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with user_type = 0 (user), is_verified = true
    await db.query(
      'INSERT INTO users (name, email, password, is_verified, user_type) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, true, 0]
    );
    console.log("true")
    console.log("true")
    res.status(200).json({ message: 'Signup successful. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password, remember_me } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Token expiry based on remember_me
    const tokenExpiry = remember_me ? '7d' : '1h';

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type,profile_image_url:user.profile_image_url },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    // Remove sensitive fields before sending
    delete user.password;
    delete user.reset_token;
    delete user.verification_token;

    res.status(200).json({
      message: 'Login successful',
      token,
      expiresIn: tokenExpiry,
      user // complete safe user object
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // 10 min

    await db.query(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?',
      [otp, expiry, email]
    );

    // ✅ Send OTP using utility
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  console.log(email, otp)
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()',
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP valid, generate temporary reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    await db.query(
      'UPDATE users SET reset_token = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
      [resetToken, email]
    );

    res.status(200).json({
      message: 'OTP verified',
      reset_token: resetToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { reset_token, new_password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE reset_token = ?', [reset_token]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL WHERE reset_token = ?',
      [hashedPassword, reset_token]
    );

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user.id;
    // 1. Get current user's email
    const [[currentUser]] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Check if email is being changed
    if (email !== currentUser.email) {
      const [[existingEmail]] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
      }
    }

    // 3. Update profile
    await db.query(
      'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, userId]
    );

    // 4. Fetch the updated user
    const [[updatedUser]] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};



exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const [[user]] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [[user]] = await db.query(
      'SELECT name, email, phone FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.verifyToken = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ success: true, message: 'Token is valid', user: decoded });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};