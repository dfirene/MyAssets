const { validationResult } = require('express-validator');
const assetService = require('../services/assetService');
const movementService = require('../services/movementService');
const excelService = require('../services/excelService');
const { success, paginated, errors } = require('../utils/response');

/**
 * 資產控制器
 */
const assetController = {
  /**
   * 查詢資產列表
   * GET /api/v1/assets
   */
  async list(req, res, next) {
    try {
      const {
        page = 1,
        pageSize = 20,
        search,
        categoryId,
        departmentId,
        locationId,
        status,
        custodianId,
        acquireDateFrom,
        acquireDateTo,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await assetService.findAll({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        categoryId,
        departmentId,
        locationId,
        status,
        custodianId,
        acquireDateFrom,
        acquireDateTo,
        sortBy,
        sortOrder,
      });

      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一資產
   * GET /api/v1/assets/:id
   */
  async get(req, res, next) {
    try {
      const asset = await assetService.findById(req.params.id);
      return success(res, asset);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 根據資產編號查詢
   * GET /api/v1/assets/by-no/:assetNo
   */
  async getByAssetNo(req, res, next) {
    try {
      const asset = await assetService.findByAssetNo(req.params.assetNo);
      if (!asset) {
        return errors.notFound(res, '找不到此資產編號');
      }
      return success(res, asset);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 建立資產
   * POST /api/v1/assets
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const asset = await assetService.create(req.body, req.user.id);
      return success(res, asset, '資產建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新資產
   * PUT /api/v1/assets/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const asset = await assetService.update(req.params.id, req.body, req.user.id);
      return success(res, asset, '資產更新成功');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 刪除資產（報廢）
   * DELETE /api/v1/assets/:id
   */
  async delete(req, res, next) {
    try {
      await assetService.delete(req.params.id);
      return success(res, null, '資產已報廢');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 資產統計
   * GET /api/v1/assets/statistics
   */
  async statistics(req, res, next) {
    try {
      const stats = await assetService.getStatistics();
      return success(res, stats);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢資產異動紀錄
   * GET /api/v1/assets/:id/movements
   */
  async movements(req, res, next) {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const result = await movementService.findByAssetId(req.params.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });
      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 建立資產異動
   * POST /api/v1/assets/:id/movements
   */
  async createMovement(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const movement = await movementService.create(
        { ...req.body, assetId: req.params.id },
        req.user.id
      );
      return success(res, movement, '異動建立成功', 201);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 批次調撥
   * POST /api/v1/assets/batch-transfer
   */
  async batchTransfer(req, res, next) {
    try {
      const { assetIds, ...transferData } = req.body;

      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return errors.badRequest(res, '請選擇要調撥的資產');
      }

      const results = await movementService.batchTransfer(assetIds, transferData, req.user.id);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return success(res, {
        results,
        summary: { total: assetIds.length, success: successCount, failed: failCount },
      }, `批次調撥完成：成功 ${successCount} 筆，失敗 ${failCount} 筆`);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 匯出資產 Excel
   * GET /api/v1/assets/export
   */
  async exportExcel(req, res, next) {
    try {
      const { categoryId, departmentId, locationId, status, keyword } = req.query;
      
      const buffer = await excelService.exportAssets({
        categoryId,
        departmentId,
        locationId,
        status,
        keyword,
      });

      const filename = `assets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 下載匯入範本
   * GET /api/v1/assets/import-template
   */
  async importTemplate(req, res, next) {
    try {
      const buffer = excelService.getImportTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="asset_import_template.xlsx"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 匯入資產
   * POST /api/v1/assets/import
   */
  async importExcel(req, res, next) {
    try {
      if (!req.file) {
        return errors.badRequest(res, '請上傳 Excel 檔案');
      }

      const result = await excelService.importAssets(req.file.buffer, req.user.id);
      
      const message = `匯入完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆`;
      return success(res, result, message);
    } catch (error) {
      if (error.message.includes('沒有資料')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },
};

module.exports = assetController;
