const express = require('express');
const { body } = require('express-validator');
const departmentController = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/departments
 * @desc    查詢部門列表
 * @access  Private (departments:read)
 */
router.get('/', authorize('departments', 'read'), departmentController.list);

/**
 * @route   GET /api/v1/departments/:id
 * @desc    查詢單一部門
 * @access  Private (departments:read)
 */
router.get('/:id', authorize('departments', 'read'), departmentController.get);

/**
 * @route   POST /api/v1/departments
 * @desc    建立部門
 * @access  Private (departments:create)
 */
router.post(
  '/',
  authorize('departments', 'create'),
  [
    body('code').notEmpty().withMessage('部門代碼為必填'),
    body('name').notEmpty().withMessage('部門名稱為必填'),
  ],
  departmentController.create
);

/**
 * @route   PUT /api/v1/departments/:id
 * @desc    更新部門
 * @access  Private (departments:update)
 */
router.put(
  '/:id',
  authorize('departments', 'update'),
  departmentController.update
);

/**
 * @route   DELETE /api/v1/departments/:id
 * @desc    刪除部門（停用）
 * @access  Private (departments:delete)
 */
router.delete('/:id', authorize('departments', 'delete'), departmentController.delete);

module.exports = router;
