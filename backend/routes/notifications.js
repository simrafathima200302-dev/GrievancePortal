const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      result = await pool.query(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
      );
    } else if (req.user.role === 'department') {
      result = await pool.query(
        `SELECT * FROM notifications WHERE (for_role='department' AND for_id=$1) OR for_role='hod' ORDER BY created_at DESC LIMIT 50`,
        [req.user.dept]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM notifications WHERE for_role='student' AND for_id=$1 ORDER BY created_at DESC LIMIT 30`,
        [String(req.user.id)]
      );
    }
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH mark all read
router.patch('/read', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'hod') {
      await pool.query('UPDATE notifications SET is_read=true');
    } else if (req.user.role === 'department') {
      await pool.query(
        `UPDATE notifications SET is_read=true WHERE for_role='department' AND for_id=$1`,
        [req.user.dept]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read=true WHERE for_role='student' AND for_id=$1`,
        [String(req.user.id)]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
