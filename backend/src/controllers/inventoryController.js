const { validationResult } = require('express-validator');
const inventoryService = require('../services/inventoryService');
const ocrService = require('../services/ocrService');
const { success, paginated, errors } = require('../utils/response');

/**
 * 盤點控制器
 */
const inventoryController = {
  /**
   * 查詢盤點計畫列表
   * GET /api/v1/inventory/plans
   */
  async listPlans(req, res, next) {
    try {
      const { page = 1, pageSize = 20, status } = req.query;

      const result = await inventoryService.findAllPlans({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        status,
      });

      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一盤點計畫
   * GET /api/v1/inventory/plans/:id
   */
  async getPlan(req, res, next) {
    try {
      const plan = await inventoryService.findPlanById(req.params.id);
      return success(res, plan);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立盤點計畫
   * POST /api/v1/inventory/plans
   */
  async createPlan(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const plan = await inventoryService.createPlan(req.body, req.user.id);
      return success(res, plan, '盤點計畫建立成功', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 更新盤點計畫
   * PUT /api/v1/inventory/plans/:id
   */
  async updatePlan(req, res, next) {
    try {
      const plan = await inventoryService.updatePlan(req.params.id, req.body);
      return success(res, plan, '盤點計畫更新成功');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('無法')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 刪除盤點計畫
   * DELETE /api/v1/inventory/plans/:id
   */
  async deletePlan(req, res, next) {
    try {
      await inventoryService.deletePlan(req.params.id);
      return success(res, null, '盤點計畫已刪除');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('只有')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 開始盤點
   * POST /api/v1/inventory/plans/:id/start
   */
  async startPlan(req, res, next) {
    try {
      const plan = await inventoryService.startPlan(req.params.id);
      return success(res, plan, '盤點已開始');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('只有')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 完成盤點
   * POST /api/v1/inventory/plans/:id/complete
   */
  async completePlan(req, res, next) {
    try {
      const plan = await inventoryService.completePlan(req.params.id);
      return success(res, plan, '盤點已完成');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('只有')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 結案盤點
   * POST /api/v1/inventory/plans/:id/close
   */
  async closePlan(req, res, next) {
    try {
      const plan = await inventoryService.closePlan(req.params.id);
      return success(res, plan, '盤點已結案');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('只有')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 取得盤點進度
   * GET /api/v1/inventory/plans/:id/progress
   */
  async getProgress(req, res, next) {
    try {
      const progress = await inventoryService.getPlanProgress(req.params.id);
      if (!progress) {
        return errors.notFound(res, '盤點計畫不存在');
      }
      return success(res, progress);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 取得待盤資產清單
   * GET /api/v1/inventory/plans/:id/pending-assets
   */
  async getPendingAssets(req, res, next) {
    try {
      const { page = 1, pageSize = 50 } = req.query;
      const result = await inventoryService.getPendingAssets(req.params.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });
      return paginated(res, result.data, result.pagination);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 取得盤點紀錄
   * GET /api/v1/inventory/plans/:id/records
   */
  async getRecords(req, res, next) {
    try {
      const { page = 1, pageSize = 50, matchStatus } = req.query;
      const result = await inventoryService.getRecords(req.params.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        matchStatus,
      });
      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * OCR 辨識盤點
   * POST /api/v1/inventory/ocr
   */
  async ocrScan(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const result = await ocrService.processOcr(req.body, req.user.id);
      return success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 手動盤點
   * POST /api/v1/inventory/manual-scan
   */
  async manualScan(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const result = await ocrService.manualScan(req.body, req.user.id);
      return success(res, result, result.message);
    } catch (error) {
      if (error.message.includes('不存在') || error.message.includes('已盤點')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },
};

module.exports = inventoryController;
