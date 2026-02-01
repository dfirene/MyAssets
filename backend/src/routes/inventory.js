const express = require('express');
const { body } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

// ========== 盤點計畫 ==========

/**
 * @route   GET /api/v1/inventory/plans
 * @desc    查詢盤點計畫列表
 * @access  Private (inventory:read)
 */
router.get('/plans', authorize('inventory', 'read'), inventoryController.listPlans);

/**
 * @route   POST /api/v1/inventory/plans
 * @desc    建立盤點計畫
 * @access  Private (inventory:create)
 */
router.post(
  '/plans',
  authorize('inventory', 'create'),
  [
    body('name').notEmpty().withMessage('計畫名稱為必填'),
    body('startDate').notEmpty().withMessage('開始日期為必填'),
    body('endDate').notEmpty().withMessage('結束日期為必填'),
    body('scopeType')
      .optional()
      .isIn(['all', 'department', 'location', 'category'])
      .withMessage('範圍類型錯誤'),
  ],
  inventoryController.createPlan
);

/**
 * @route   GET /api/v1/inventory/plans/:id
 * @desc    查詢單一盤點計畫
 * @access  Private (inventory:read)
 */
router.get('/plans/:id', authorize('inventory', 'read'), inventoryController.getPlan);

/**
 * @route   PUT /api/v1/inventory/plans/:id
 * @desc    更新盤點計畫
 * @access  Private (inventory:update)
 */
router.put('/plans/:id', authorize('inventory', 'update'), inventoryController.updatePlan);

/**
 * @route   DELETE /api/v1/inventory/plans/:id
 * @desc    刪除盤點計畫
 * @access  Private (inventory:delete)
 */
router.delete('/plans/:id', authorize('inventory', 'delete'), inventoryController.deletePlan);

/**
 * @route   POST /api/v1/inventory/plans/:id/start
 * @desc    開始盤點
 * @access  Private (inventory:update)
 */
router.post('/plans/:id/start', authorize('inventory', 'update'), inventoryController.startPlan);

/**
 * @route   POST /api/v1/inventory/plans/:id/complete
 * @desc    完成盤點
 * @access  Private (inventory:update)
 */
router.post('/plans/:id/complete', authorize('inventory', 'update'), inventoryController.completePlan);

/**
 * @route   POST /api/v1/inventory/plans/:id/close
 * @desc    關閉盤點（結案）
 * @access  Private (inventory:update)
 */
router.post('/plans/:id/close', authorize('inventory', 'update'), inventoryController.closePlan);

/**
 * @route   GET /api/v1/inventory/plans/:id/assets
 * @desc    取得盤點計畫的資產清單
 * @access  Private (inventory:read)
 */
router.get('/plans/:id/assets', authorize('inventory', 'read'), inventoryController.getPlanAssets);

/**
 * @route   POST /api/v1/inventory/plans/:id/scan
 * @desc    掃描資產（盤點）
 * @access  Private (inventory:create)
 */
router.post(
  '/plans/:id/scan',
  authorize('inventory', 'create'),
  [
    body('assetNo').notEmpty().withMessage('資產編號為必填'),
  ],
  inventoryController.scanAsset
);

/**
 * @route   GET /api/v1/inventory/plans/:id/records
 * @desc    查詢盤點記錄
 * @access  Private (inventory:read)
 */
router.get('/plans/:id/records', authorize('inventory', 'read'), inventoryController.getRecords);

/**
 * @route   GET /api/v1/inventory/plans/:id/discrepancy-report
 * @desc    取得盤點差異報表
 * @access  Private (inventory:read)
 */
router.get('/plans/:id/discrepancy-report', authorize('inventory', 'read'), inventoryController.getDiscrepancyReport);

// ========== 盤點記錄 ==========

/**
 * @route   PUT /api/v1/inventory/records/:id
 * @desc    更新盤點記錄
 * @access  Private (inventory:update)
 */
router.put('/records/:id', authorize('inventory', 'update'), inventoryController.updateRecord);

module.exports = router;
