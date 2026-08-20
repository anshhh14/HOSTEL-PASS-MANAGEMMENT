const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.post(
  '/users',
  [
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['student', 'guard', 'warden', 'admin']),
    body('roomNumber').optional({ nullable: true }).trim().isLength({ max: 20 }),
  ],
  validate,
  ctrl.createStaff
);
router.patch('/users/:id/active', [body('isActive').isBoolean()], validate, ctrl.setUserActive);

router.get('/rooms', ctrl.listRooms);
router.post(
  '/rooms',
  [body('roomNumber').trim().notEmpty(), body('capacity').optional().isInt({ min: 1, max: 20 })],
  validate,
  ctrl.createRoom
);

module.exports = router;
