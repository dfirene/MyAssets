const express = require('express');
const { body } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/categories
 * @desc    查詢分類列表
 * @access  Private (categories:read)
 */
router.get('/', authorize('categories', 'read'), categoryController.list);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    查詢單一分類
 * @access  Private (categories:read)
 */
router.get('/:id', authorize('categories', 'read'), categoryController.get);

/**
 * @route   POST /api/v1/categories
 * @desc    建立分類
 * @access  Private (categories:create)
 */
router.post(
  '/',
  authorize('categories', 'create'),
  [
    body('code').notEmpty().withMessage('分類代碼為必填'),
    body('name').notEmpty().withMessage('分類名稱為必填'),
  ],
  categoryController.create
);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    更新分類
 * @access  Private (categories:update)
 */
router.put(
  '/:id',
  authorize('categories', 'update'),
  categoryController.update
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    刪除分類（停用）
 * @access  Private (categories:delete)
 */
router.delete('/:id', authorize('categories', 'delete'), categoryController.delete);

module.exports = router;
