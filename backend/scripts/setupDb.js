const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const schema = `
-- Drop existing tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'department', 'hod')),
  department VARCHAR(100),
  roll_no VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Complaints table
CREATE TABLE complaints (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  student_id INTEGER REFERENCES users(id),
  student_name VARCHAR(100),
  department VARCHAR(100),
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
  remarks TEXT DEFAULT '',
  assigned_by INTEGER REFERENCES users(id),
  created_at DATE DEFAULT CURRENT_DATE,
  updated_at DATE DEFAULT CURRENT_DATE
);

-- Notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  for_role VARCHAR(20),
  for_id VARCHAR(50),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_complaints_student ON complaints(student_id);
CREATE INDEX idx_complaints_dept ON complaints(department);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_notifications_for ON notifications(for_role, for_id);
`;

const seedData = async () => {
  const salt = await bcrypt.genSalt(10);

  const users = [
    { name: 'Admin User', email: 'admin@university.edu', password: 'admin@2026', role: 'admin', dept: null },
    { name: 'HOD', email: 'hod@university.edu', password: 'hod@2026', role: 'hod', dept: null },
    { name: 'Academics Dept', email: 'academics@university.edu', password: 'acad@2026', role: 'department', dept: 'Academics' },
    { name: 'Facilities Dept', email: 'facilities@university.edu', password: 'facil@2026', role: 'department', dept: 'Facilities' },
    { name: 'Hostel Dept', email: 'hostel@university.edu', password: 'hostel@2026', role: 'department', dept: 'Hostel' },
    { name: 'Faculty Dept', email: 'faculty@university.edu', password: 'faculty@2026', role: 'department', dept: 'Faculty' },
    { name: 'Administration Dept', email: 'admin-dept@university.edu', password: 'admindept@2026', role: 'department', dept: 'Administration' },
    { name: 'Examination Dept', email: 'exam@university.edu', password: 'exam@2026', role: 'department', dept: 'Examination Branch' },
    { name: 'Sports Dept', email: 'sports@university.edu', password: 'sports@2026', role: 'department', dept: 'Sports' },
    // Sample students
    { name: 'Rahul Sharma', email: 'rahul@student.edu', password: 'student123', role: 'student', dept: null, roll_no: '21CS001' },
    { name: 'Priya Patel', email: 'priya@student.edu', password: 'student123', role: 'student', dept: null, roll_no: '21CS002' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, salt);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, roll_no) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role, u.dept, u.roll_no || null]
    );
  }

  // Sample complaints
  const rahul = await pool.query(`SELECT id FROM users WHERE email='rahul@student.edu'`);
  const priya = await pool.query(`SELECT id FROM users WHERE email='priya@student.edu'`);
  const admin = await pool.query(`SELECT id FROM users WHERE email='admin@university.edu'`);

  if (rahul.rows.length) {
    await pool.query(`
      INSERT INTO complaints (id, title, description, student_id, student_name, department, status, remarks, assigned_by, created_at, updated_at)
      VALUES 
        ('GR-001','Canteen food quality issues','The canteen food quality has degraded significantly.',$1,'Rahul Sharma','Facilities','Resolved','Canteen vendor has been warned and hygiene improved.',$2,'2026-03-10','2026-03-15'),
        ('GR-002','Library timings too short','The library closes at 6 PM which is insufficient.',$1,'Rahul Sharma','Academics','In Progress','Proposal submitted for extended hours.',$2,'2026-03-12','2026-03-14')
      ON CONFLICT (id) DO NOTHING
    `, [rahul.rows[0].id, admin.rows[0]?.id]);
  }

  if (priya.rows.length) {
    await pool.query(`
      INSERT INTO complaints (id, title, description, student_id, student_name, department, status, created_at, updated_at)
      VALUES ('GR-003','Hostel water supply issue','No water supply in Block C hostel after 9 PM.',$1,'Priya Patel','Hostel','Pending','2026-03-16','2026-03-16')
      ON CONFLICT (id) DO NOTHING
    `, [priya.rows[0].id]);
  }

  console.log('✅ Database seeded successfully!');
};

const run = async () => {
  try {
    console.log('📦 Setting up database schema...');
    await pool.query(schema);
    console.log('✅ Schema created!');
    console.log('🌱 Seeding data...');
    await seedData();
    console.log('🎉 Database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  }
};

run();
