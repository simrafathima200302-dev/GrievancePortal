const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Generate complaint ID
const genId = async () => {
  const result = await pool.query('SELECT COUNT(*) FROM complaints');
  const count = parseInt(result.rows[0].count) + 1;
  return `GR-${String(count).padStart(3, '0')}`;
};

// Add notification helper
const addNotification = async (forRole, forId, message) => {
  await pool.query(
    'INSERT INTO notifications (for_role, for_id, message) VALUES ($1,$2,$3)',
    [forRole, String(forId), message]
  );
};

// ─── GET all complaints (filtered by role) ───
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
    // admin and hod get all

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST submit complaint (student) ───
router.post('/', authMiddleware, requireRole('student'), async (req, res) => {
  const { title, description, dept } = req.body;
  if (!title || !description || !dept) {
    return res.status(400).json({ error: 'Title, description and department are required' });
  }

  try {
    const id = await genId();
    const result = await pool.query(
      `INSERT INTO complaints (id, title, description, student_id, student_name, department, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending',CURRENT_DATE,CURRENT_DATE) RETURNING *`,
      [id, title, description, req.user.id, req.user.name, dept]
    );

    await addNotification('admin', 'all', `New complaint "${title}" submitted by ${req.user.name}`);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH assign complaint (admin) ───
router.patch('/:id/assign', authMiddleware, requireRole('admin'), async (req, res) => {
  const { dept } = req.body;
  if (!dept) return res.status(400).json({ error: 'Department required' });

  try {
    const result = await pool.query(
      `UPDATE complaints SET department=$1, assigned_by=$2, updated_at=CURRENT_DATE WHERE id=$3 RETURNING *`,
      [dept, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Complaint not found' });

    const c = result.rows[0];
    await addNotification('department', dept, `Complaint ${c.id} assigned to your department`);
    await addNotification('student', c.student_id, `Your complaint "${c.title}" assigned to ${dept}`);
    return res.json(c);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH update status (department) ───
router.patch('/:id/status', authMiddleware, requireRole('department', 'admin', 'hod'), async (req, res) => {
  const { status, remarks } = req.body;
  const validStatuses = ['Pending', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const result = await pool.query(
      `UPDATE complaints SET status=$1, remarks=$2, updated_at=CURRENT_DATE WHERE id=$3 RETURNING *`,
      [status, remarks || '', req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Complaint not found' });

    const c = result.rows[0];
    await addNotification('student', c.student_id, `Your complaint "${c.title}" status updated to "${status}"`);
    return res.json(c);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET single complaint ───
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM complaints WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
