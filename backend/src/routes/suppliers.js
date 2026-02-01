const express = require('express');
const { body } = require('express-validator');
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/suppliers
 * @desc    查詢供應商列表
 * @access  Private (suppliers:read)
 */
router.get('/', authorize('suppliers', 'read'), supplierController.list);

/**
 * @route   GET /api/v1/suppliers/:id
 * @desc    查詢單一供應商
 * @access  Private (suppliers:read)
 */
router.get('/:id', authorize('suppliers', 'read'), supplierController.get);

/**
 * @route   POST /api/v1/suppliers
 * @desc    建立供應商
 * @access  Private (suppliers:create)
 */
router.post(
  '/',
  authorize('suppliers', 'create'),
  [
    body('code').notEmpty().withMessage('供應商代碼為必填'),
    body('name').notEmpty().withMessage('供應商名稱為必填'),
  ],
  supplierController.create
);

/**
 * @route   PUT /api/v1/suppliers/:id
 * @desc    更新供應商
 * @access  Private (suppliers:update)
 */
router.put(
  '/:id',
  authorize('suppliers', 'update'),
  supplierController.update
);

/**
 * @route   DELETE /api/v1/suppliers/:id
 * @desc    刪除供應商（停用）
 * @access  Private (suppliers:delete)
 */
router.delete('/:id', authorize('suppliers', 'delete'), supplierController.delete);

module.exports = router;
