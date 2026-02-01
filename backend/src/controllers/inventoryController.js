const { validationResult } = require('express-validator');
const inventoryService = require('../services/inventoryService');
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
      const { page = 1, pageSize = 20, status, search } = req.query;

      const result = await inventoryService.findAllPlans({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        status,
        search,
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
      const plan = await inventoryService.updatePlan(req.params.id, req.body, req.user.id);
      return success(res, plan, '盤點計畫更新成功');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('無法修改')) {
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
      if (error.message.includes('無法') || error.message.includes('只有')) {
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
   * 關閉盤點（結案）
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
   * 取得盤點計畫的資產清單
   * GET /api/v1/inventory/plans/:id/assets
   */
  async getPlanAssets(req, res, next) {
    try {
      const { page = 1, pageSize = 50, status } = req.query;

      const result = await inventoryService.getPlanAssets(req.params.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        status,
      });

      return success(res, result);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 掃描資產（盤點）
   * POST /api/v1/inventory/plans/:id/scan
   */
  async scanAsset(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const result = await inventoryService.scanAsset(req.params.id, req.body, req.user.id);
      
      const message = result.isUpdate ? '盤點記錄已更新' : '盤點成功';
      return success(res, result, message);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('不在進行中')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 查詢盤點記錄
   * GET /api/v1/inventory/plans/:id/records
   */
  async getRecords(req, res, next) {
    try {
      const { page = 1, pageSize = 50, matchStatus, search } = req.query;

      const result = await inventoryService.findRecords(req.params.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        matchStatus,
        search,
      });

      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 取得盤點差異報表
   * GET /api/v1/inventory/plans/:id/discrepancy-report
   */
  async getDiscrepancyReport(req, res, next) {
    try {
      const report = await inventoryService.getDiscrepancyReport(req.params.id);
      return success(res, report);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新盤點記錄
   * PUT /api/v1/inventory/records/:id
   */
  async updateRecord(req, res, next) {
    try {
      const record = await inventoryService.updateRecord(req.params.id, req.body, req.user.id);
      return success(res, record, '記錄已更新');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('無法修改')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },
};

module.exports = inventoryController;
