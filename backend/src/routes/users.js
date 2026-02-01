const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/users
 * @desc    查詢使用者列表
 * @access  Private (users:read)
 */
router.get('/', authorize('users', 'read'), userController.list);

/**
 * @route   GET /api/v1/users/:id
 * @desc    查詢單一使用者
 * @access  Private (users:read)
 */
router.get('/:id', authorize('users', 'read'), userController.get);

/**
 * @route   POST /api/v1/users
 * @desc    建立使用者
 * @access  Private (users:create)
 */
router.post(
  '/',
  authorize('users', 'create'),
  [
    body('account').isEmail().withMessage('帳號格式須為 Email'),
    body('name').notEmpty().withMessage('姓名為必填'),
    body('email').isEmail().withMessage('Email 格式錯誤'),
  ],
  userController.create
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    更新使用者
 * @access  Private (users:update)
 */
router.put(
  '/:id',
  authorize('users', 'update'),
  [
    body('account').optional().isEmail().withMessage('帳號格式須為 Email'),
    body('email').optional().isEmail().withMessage('Email 格式錯誤'),
  ],
  userController.update
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    刪除使用者（停用）
 * @access  Private (users:delete)
 */
router.delete('/:id', authorize('users', 'delete'), userController.delete);

/**
 * @route   POST /api/v1/users/:id/reset-password
 * @desc    重設密碼
 * @access  Private (users:update)
 */
router.post(
  '/:id/reset-password',
  authorize('users', 'update'),
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('密碼至少 8 字元')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密碼須包含大小寫字母及數字'),
  ],
  userController.resetPassword
);

module.exports = router;
