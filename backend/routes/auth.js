const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ─── LOGIN ───
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // ✅ Compare hashed password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        dept: user.department
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dept: user.department,
        rollNo: user.roll_no
      }
    });

  } catch (err) {
    console.error('🔥 Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// ─── REGISTER (STUDENT) ───
router.post('/register', async (req, res) => {
  const { name, email, password, rollNo } = req.body;

  if (!name || !email || !password || !rollNo) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // ✅ Check existing user
    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert user
    const result = await pool.query(
      `INSERT INTO users 
      (name, email, password_hash, role, roll_no) 
      VALUES ($1,$2,$3,$4,$5) 
      RETURNING id, name, email, role`,
      [name, cleanEmail, hashedPassword, 'student', rollNo]
    );

    return res.status(201).json({
      message: 'Registration successful',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('🔥 Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;