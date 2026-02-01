const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/reports/dashboard
 * @desc    Dashboard 統計
 * @access  Private (reports:read)
 */
router.get('/dashboard', authorize('reports', 'read'), reportController.dashboard);

/**
 * @route   GET /api/v1/reports/assets
 * @desc    資產統計報表
 * @access  Private (reports:read)
 */
router.get('/assets', authorize('reports', 'read'), reportController.assetReport);

/**
 * @route   GET /api/v1/reports/assets/export
 * @desc    匯出資產清冊
 * @access  Private (reports:read)
 */
router.get('/assets/export', authorize('reports', 'read'), reportController.exportAssetList);

/**
 * @route   GET /api/v1/reports/inventory/:planId/export
 * @desc    匯出盤點報表
 * @access  Private (reports:read)
 */
router.get('/inventory/:planId/export', authorize('reports', 'read'), reportController.exportInventoryReport);

module.exports = router;
