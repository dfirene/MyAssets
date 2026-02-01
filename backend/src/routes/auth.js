const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    使用者登入
 * @access  Public
 */
router.post(
  '/login',
  [
    body('account').notEmpty().withMessage('帳號為必填'),
    body('password').notEmpty().withMessage('密碼為必填'),
  ],
  authController.login
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    使用者登出
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    更新 Token
 * @access  Public
 */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh Token 為必填')],
  authController.refresh
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    取得當前使用者資訊
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    變更密碼
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('舊密碼為必填'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('新密碼至少 8 字元')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密碼須包含大小寫字母及數字'),
  ],
  authController.changePassword
);

module.exports = router;
