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
 * @route   GET /api/v1/inventory/plans/:id
 * @desc    查詢單一盤點計畫
 * @access  Private (inventory:read)
 */
router.get('/plans/:id', authorize('inventory', 'read'), inventoryController.getPlan);

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
  ],
  inventoryController.createPlan
);

/**
 * @route   PUT /api/v1/inventory/plans/:id
 * @desc    更新盤點計畫
 * @access  Private (inventory:update)
 */
router.put('/plans/:id', authorize('inventory', 'update'), inventoryController.updatePlan);

/**
 * @route   DELETE /api/v1/inventory/plans/:id
 * @desc    刪除盤點計畫
 * @access  Private (inventory:update)
 */
router.delete('/plans/:id', authorize('inventory', 'update'), inventoryController.deletePlan);

/**
 * @route   POST /api/v1/inventory/plans/:id/start
 * @desc    開始盤點
 * @access  Private (inventory:execute)
 */
router.post('/plans/:id/start', authorize('inventory', 'execute'), inventoryController.startPlan);

/**
 * @route   POST /api/v1/inventory/plans/:id/complete
 * @desc    完成盤點
 * @access  Private (inventory:execute)
 */
router.post('/plans/:id/complete', authorize('inventory', 'execute'), inventoryController.completePlan);

/**
 * @route   POST /api/v1/inventory/plans/:id/close
 * @desc    結案盤點
 * @access  Private (inventory:close)
 */
router.post('/plans/:id/close', authorize('inventory', 'close'), inventoryController.closePlan);

/**
 * @route   GET /api/v1/inventory/plans/:id/progress
 * @desc    取得盤點進度
 * @access  Private (inventory:read)
 */
router.get('/plans/:id/progress', authorize('inventory', 'read'), inventoryController.getProgress);

/**
 * @route   GET /api/v1/inventory/plans/:id/pending-assets
 * @desc    取得待盤資產清單
 * @access  Private (inventory:read)
 */
router.get('/plans/:id/pending-assets', authorize('inventory', 'read'), inventoryController.getPendingAssets);

/**
 * @route   GET /api/v1/inventory/plans/:id/records
 * @desc    取得盤點紀錄
 * @access  Private (inventory:read)
 */
router.get('/plans/:id/records', authorize('inventory', 'read'), inventoryController.getRecords);

// ========== 盤點執行 ==========

/**
 * @route   POST /api/v1/inventory/ocr
 * @desc    OCR 辨識盤點
 * @access  Private (inventory:execute)
 */
router.post(
  '/ocr',
  authorize('inventory', 'execute'),
  [
    body('planId').notEmpty().withMessage('盤點計畫 ID 為必填'),
    body('ocrText').notEmpty().withMessage('OCR 文字為必填'),
  ],
  inventoryController.ocrScan
);

/**
 * @route   POST /api/v1/inventory/manual-scan
 * @desc    手動盤點
 * @access  Private (inventory:execute)
 */
router.post(
  '/manual-scan',
  authorize('inventory', 'execute'),
  [
    body('planId').notEmpty().withMessage('盤點計畫 ID 為必填'),
    body('assetNo').notEmpty().withMessage('資產編號為必填'),
  ],
  inventoryController.manualScan
);

module.exports = router;
