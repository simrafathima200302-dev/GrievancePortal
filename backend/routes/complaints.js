const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // make sure this uses DATABASE_URL
const { authMiddleware, requireRole } = require('../middleware/auth');

// ✅ Generate complaint ID (better approach)
const genId = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM complaints');
    const count = parseInt(result.rows[0].count) + 1;
    return `GR-${String(count).padStart(3, '0')}`;
  } catch (err) {
    console.error("Error generating ID:", err);
    throw err;
  }
};

// ✅ Add notification helper
const addNotification = async (forRole, forId, message) => {
  try {
    await pool.query(
      'INSERT INTO notifications (for_role, for_id, message) VALUES ($1,$2,$3)',
      [forRole, String(forId), message]
    );
  } catch (err) {
    console.error("Notification error:", err);
  }
};

// ─── GET all complaints ───
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = 'SELECT * FROM complaints ORDER BY created_at DESC';
    let params = [];

    if (req.user.role === 'student') {
      query = 'SELECT * FROM complaints WHERE student_id = $1 ORDER BY created_at DESC';
      params = [req.user.id];
    } else if (req.user.role === 'department') {
      query = 'SELECT * FROM complaints WHERE department = $1 ORDER BY created_at DESC';
      params = [req.user.dept];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error("GET complaints error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST submit complaint ───
router.post('/', authMiddleware, requireRole('student'), async (req, res) => {
  const { title, description, dept } = req.body;

  if (!title || !description || !dept) {
    return res.status(400).json({ error: 'Title, description and department are required' });
  }

  try {
    const id = await genId();

    const result = await pool.query(
      `INSERT INTO complaints 
      (id, title, description, student_id, student_name, department, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'Pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *`,
      [id, title, description, req.user.id, req.user.name, dept]
    );

    await addNotification(
      'admin',
      'all',
      `New complaint "${title}" submitted by ${req.user.name}`
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("POST complaint error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH assign complaint ───
router.patch('/:id/assign', authMiddleware, requireRole('admin'), async (req, res) => {
  const { dept } = req.body;

  if (!dept) {
    return res.status(400).json({ error: 'Department required' });
  }

  try {
    const result = await pool.query(
      `UPDATE complaints 
       SET department=$1, assigned_by=$2, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$3 
       RETURNING *`,
      [dept, req.user.id, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const c = result.rows[0];

    await addNotification('department', dept, `Complaint ${c.id} assigned to your department`);
    await addNotification('student', c.student_id, `Your complaint "${c.title}" assigned to ${dept}`);

    res.json(c);

  } catch (err) {
    console.error("Assign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH update status ───
router.patch('/:id/status', authMiddleware, requireRole('department', 'admin', 'hod'), async (req, res) => {
  const { status, remarks } = req.body;

  const validStatuses = ['Pending', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await pool.query(
      `UPDATE complaints 
       SET status=$1, remarks=$2, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$3 
       RETURNING *`,
      [status, remarks || '', req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const c = result.rows[0];

    await addNotification(
      'student',
      c.student_id,
      `Your complaint "${c.title}" status updated to "${status}"`
    );

    res.json(c);

  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET single complaint ───
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM complaints WHERE id=$1',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("GET single complaint error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;