const express = require('express');
const { body } = require('express-validator');
const locationController = require('../controllers/locationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/locations
 * @desc    查詢位置列表
 * @access  Private (locations:read)
 */
router.get('/', authorize('locations', 'read'), locationController.list);

/**
 * @route   GET /api/v1/locations/:id
 * @desc    查詢單一位置
 * @access  Private (locations:read)
 */
router.get('/:id', authorize('locations', 'read'), locationController.get);

/**
 * @route   POST /api/v1/locations
 * @desc    建立位置
 * @access  Private (locations:create)
 */
router.post(
  '/',
  authorize('locations', 'create'),
  [
    body('code').notEmpty().withMessage('位置代碼為必填'),
    body('name').notEmpty().withMessage('位置名稱為必填'),
  ],
  locationController.create
);

/**
 * @route   PUT /api/v1/locations/:id
 * @desc    更新位置
 * @access  Private (locations:update)
 */
router.put(
  '/:id',
  authorize('locations', 'update'),
  locationController.update
);

/**
 * @route   DELETE /api/v1/locations/:id
 * @desc    刪除位置（停用）
 * @access  Private (locations:delete)
 */
router.delete('/:id', authorize('locations', 'delete'), locationController.delete);

module.exports = router;
