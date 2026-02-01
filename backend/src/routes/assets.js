const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const assetController = require('../controllers/assetController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Multer 設定 - 使用記憶體儲存
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 Excel 檔案 (.xlsx, .xls)'));
    }
  },
});

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/assets/statistics
 * @desc    資產統計
 * @access  Private (assets:read)
 */
router.get('/statistics', authorize('assets', 'read'), assetController.statistics);

/**
 * @route   GET /api/v1/assets/export
 * @desc    匯出資產 Excel
 * @access  Private (assets:read)
 */
router.get('/export', authorize('assets', 'read'), assetController.exportExcel);

/**
 * @route   GET /api/v1/assets/import-template
 * @desc    下載匯入範本
 * @access  Private (assets:create)
 */
router.get('/import-template', authorize('assets', 'create'), assetController.importTemplate);

/**
 * @route   POST /api/v1/assets/import
 * @desc    匯入資產
 * @access  Private (assets:create)
 */
router.post('/import', authorize('assets', 'create'), upload.single('file'), assetController.importExcel);

/**
 * @route   GET /api/v1/assets/by-no/:assetNo
 * @desc    根據資產編號查詢
 * @access  Private (assets:read)
 */
router.get('/by-no/:assetNo', authorize('assets', 'read'), assetController.getByAssetNo);

/**
 * @route   POST /api/v1/assets/batch-transfer
 * @desc    批次調撥
 * @access  Private (movements:create)
 */
router.post(
  '/batch-transfer',
  authorize('movements', 'create'),
  [
    body('assetIds').isArray().withMessage('資產 ID 清單格式錯誤'),
  ],
  assetController.batchTransfer
);

/**
 * @route   GET /api/v1/assets
 * @desc    查詢資產列表
 * @access  Private (assets:read)
 */
router.get('/', authorize('assets', 'read'), assetController.list);

/**
 * @route   GET /api/v1/assets/:id
 * @desc    查詢單一資產
 * @access  Private (assets:read)
 */
router.get('/:id', authorize('assets', 'read'), assetController.get);

/**
 * @route   POST /api/v1/assets
 * @desc    建立資產
 * @access  Private (assets:create)
 */
router.post(
  '/',
  authorize('assets', 'create'),
  [
    body('name').notEmpty().withMessage('資產名稱為必填'),
    body('categoryId').notEmpty().withMessage('分類為必填'),
    body('departmentId').notEmpty().withMessage('使用部門為必填'),
    body('custodianId').notEmpty().withMessage('保管人為必填'),
    body('acquireDate').notEmpty().withMessage('取得日期為必填'),
  ],
  assetController.create
);

/**
 * @route   PUT /api/v1/assets/:id
 * @desc    更新資產
 * @access  Private (assets:update)
 */
router.put('/:id', authorize('assets', 'update'), assetController.update);

/**
 * @route   DELETE /api/v1/assets/:id
 * @desc    刪除資產（報廢）
 * @access  Private (assets:delete)
 */
router.delete('/:id', authorize('assets', 'delete'), assetController.delete);

/**
 * @route   GET /api/v1/assets/:id/movements
 * @desc    查詢資產異動紀錄
 * @access  Private (movements:read)
 */
router.get('/:id/movements', authorize('movements', 'read'), assetController.movements);

/**
 * @route   POST /api/v1/assets/:id/movements
 * @desc    建立資產異動
 * @access  Private (movements:create)
 */
router.post(
  '/:id/movements',
  authorize('movements', 'create'),
  [
    body('movementType')
      .notEmpty()
      .withMessage('異動類型為必填')
      .isIn(['transfer', 'borrow', 'return', 'repair', 'repair_done', 'scrap', 'idle'])
      .withMessage('異動類型錯誤'),
  ],
  assetController.createMovement
);

module.exports = router;
