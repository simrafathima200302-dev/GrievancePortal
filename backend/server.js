require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health check ───
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── 404 handler ───
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Error handler ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   UniGrieve Backend Server         ║
  ║   Running on http://localhost:${PORT} ║
  ╚════════════════════════════════════╝
  `);
});
