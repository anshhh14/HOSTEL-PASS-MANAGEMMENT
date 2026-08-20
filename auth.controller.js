const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');

// Self-registration is disabled — all accounts (including students) are created
// by an admin from the Admin → Manage Users screen. This endpoint is kept so the
// route doesn't 404 unexpectedly, but it always refuses.
async function register(req, res) {
  res.status(403).json({ error: 'Self-registration is disabled. Ask your hostel admin to create your account.' });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, u.is_active, r.room_number
       FROM users u LEFT JOIN rooms r ON u.room_id = r.id
       WHERE u.email = ?`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        roomNumber: user.room_number,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, r.room_number
       FROM users u LEFT JOIN rooms r ON u.room_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
