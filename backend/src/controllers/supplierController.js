const { validationResult } = require('express-validator');
const supplierService = require('../services/supplierService');
const { success, paginated, errors } = require('../utils/response');

/**
 * 供應商控制器
 */
const supplierController = {
  /**
   * 查詢供應商列表
   * GET /api/v1/suppliers
   */
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 20, search, status, select } = req.query;
      
      // 下拉選單用
      if (select === 'true') {
        const suppliers = await supplierService.findAllForSelect();
        return success(res, suppliers);
      }

      const result = await supplierService.findAll({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        status,
      });

      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一供應商
   * GET /api/v1/suppliers/:id
   */
  async get(req, res, next) {
    try {
      const supplier = await supplierService.findById(req.params.id);
      return success(res, supplier);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立供應商
   * POST /api/v1/suppliers
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const supplier = await supplierService.create(req.body);
      return success(res, supplier, '供應商建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新供應商
   * PUT /api/v1/suppliers/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const supplier = await supplierService.update(req.params.id, req.body);
      return success(res, supplier, '供應商更新成功');
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
   * 刪除供應商
   * DELETE /api/v1/suppliers/:id
   */
  async delete(req, res, next) {
    try {
      await supplierService.delete(req.params.id);
      return success(res, null, '供應商已停用');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('無法刪除')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },
};

module.exports = supplierController;
