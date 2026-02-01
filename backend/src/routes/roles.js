const express = require('express');
const { body } = require('express-validator');
const roleController = require('../controllers/roleController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/roles/permissions
 * @desc    查詢所有權限
 * @access  Private (roles:read)
 */
router.get('/permissions', authorize('roles', 'read'), roleController.permissions);

/**
 * @route   GET /api/v1/roles
 * @desc    查詢角色列表
 * @access  Private (roles:read)
 */
router.get('/', authorize('roles', 'read'), roleController.list);

/**
 * @route   GET /api/v1/roles/:id
 * @desc    查詢單一角色
 * @access  Private (roles:read)
 */
router.get('/:id', authorize('roles', 'read'), roleController.get);

/**
 * @route   POST /api/v1/roles
 * @desc    建立角色
 * @access  Private (roles:create)
 */
router.post(
  '/',
  authorize('roles', 'create'),
  [
    body('code').notEmpty().withMessage('角色代碼為必填'),
    body('name').notEmpty().withMessage('角色名稱為必填'),
  ],
  roleController.create
);

/**
 * @route   PUT /api/v1/roles/:id
 * @desc    更新角色
 * @access  Private (roles:update)
 */
router.put(
  '/:id',
  authorize('roles', 'update'),
  roleController.update
);

/**
 * @route   DELETE /api/v1/roles/:id
 * @desc    刪除角色
 * @access  Private (roles:delete)
 */
router.delete('/:id', authorize('roles', 'delete'), roleController.delete);

module.exports = router;
