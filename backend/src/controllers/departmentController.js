const { validationResult } = require('express-validator');
const departmentService = require('../services/departmentService');
const { success, errors } = require('../utils/response');

/**
 * 部門控制器
 */
const departmentController = {
  /**
   * 查詢部門列表（樹狀）
   * GET /api/v1/departments
   */
  async list(req, res, next) {
    try {
      const { flat, includeInactive } = req.query;
      
      if (flat === 'true') {
        const departments = await departmentService.findAllFlat({
          includeInactive: includeInactive === 'true',
        });
        return success(res, departments);
      }

      const departments = await departmentService.findAll({
        includeInactive: includeInactive === 'true',
      });
      return success(res, departments);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一部門
   * GET /api/v1/departments/:id
   */
  async get(req, res, next) {
    try {
      const department = await departmentService.findById(req.params.id);
      return success(res, department);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立部門
   * POST /api/v1/departments
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const department = await departmentService.create(req.body);
      return success(res, department, '部門建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新部門
   * PUT /api/v1/departments/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const department = await departmentService.update(req.params.id, req.body);
      return success(res, department, '部門更新成功');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('已存在') || error.message.includes('不能')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 刪除部門
   * DELETE /api/v1/departments/:id
   */
  async delete(req, res, next) {
    try {
      await departmentService.delete(req.params.id);
      return success(res, null, '部門已停用');
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

module.exports = departmentController;
