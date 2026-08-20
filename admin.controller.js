const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function stats(req, res, next) {
  try {
    const [[{ total_students }]] = await pool.query(
      `SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'`
    );
    const [[{ inside_count }]] = await pool.query(
      `SELECT COUNT(*) AS inside_count FROM users WHERE role = 'student' AND status = 'Inside'`
    );
    const [[{ pending_count }]] = await pool.query(
      `SELECT COUNT(*) AS pending_count FROM leave_requests WHERE status = 'pending'`
    );
    const [[{ total_logs }]] = await pool.query(`SELECT COUNT(*) AS total_logs FROM entry_exit_logs`);

    res.json({
      totalStudents: total_students,
      insideCount: inside_count,
      outsideCount: total_students - inside_count,
      pendingRequests: pending_count,
      totalLogs: total_logs,
    });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.is_active, r.room_number
       FROM users u LEFT JOIN rooms r ON u.room_id = r.id
       ORDER BY u.role, u.name`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
}

// Admin-only creation of any account, including students (self-registration is disabled).
async function createStaff(req, res, next) {
  try {
    const { name, email, password, role, roomNumber } = req.body;
    if (!['student', 'guard', 'warden', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be student, guard, warden, or admin' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'An account with that email already exists.' });

    let roomId = null;
    if (role === 'student' && roomNumber) {
      const [rooms] = await pool.query('SELECT id FROM rooms WHERE room_number = ?', [roomNumber]);
      if (rooms.length) {
        roomId = rooms[0].id;
      } else {
        const [insertedRoom] = await pool.query(
          'INSERT INTO rooms (room_number, capacity) VALUES (?, ?)',
          [roomNumber, 2]
        );
        roomId = insertedRoom.insertId;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, room_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, roomId, 'Inside']
    );
    res.status(201).json({ id: result.insertId, name, email, role, roomNumber: roomNumber || null });
  } catch (err) {
    next(err);
  }
}

async function setUserActive(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function listRooms(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT rm.id, rm.room_number, rm.capacity, COUNT(u.id) AS occupants
       FROM rooms rm LEFT JOIN users u ON u.room_id = rm.id
       GROUP BY rm.id ORDER BY rm.room_number`
    );
    res.json({ rooms: rows });
  } catch (err) {
    next(err);
  }
}

async function createRoom(req, res, next) {
  try {
    const { roomNumber, capacity } = req.body;
    const [result] = await pool.query(
      'INSERT INTO rooms (room_number, capacity) VALUES (?, ?)',
      [roomNumber, capacity || 2]
    );
    res.status(201).json({ id: result.insertId, roomNumber, capacity: capacity || 2 });
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, listUsers, createStaff, setUserActive, listRooms, createRoom };
