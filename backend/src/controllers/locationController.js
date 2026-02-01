const { validationResult } = require('express-validator');
const locationService = require('../services/locationService');
const { success, errors } = require('../utils/response');

/**
 * 存放位置控制器
 */
const locationController = {
  /**
   * 查詢位置列表（樹狀）
   * GET /api/v1/locations
   */
  async list(req, res, next) {
    try {
      const { flat, level, includeInactive } = req.query;
      
      if (flat === 'true') {
        const locations = await locationService.findAllFlat({
          level: level ? parseInt(level) : undefined,
          includeInactive: includeInactive === 'true',
        });
        return success(res, locations);
      }

      const locations = await locationService.findAll({
        includeInactive: includeInactive === 'true',
      });
      return success(res, locations);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一位置
   * GET /api/v1/locations/:id
   */
  async get(req, res, next) {
    try {
      const location = await locationService.findById(req.params.id);
      return success(res, location);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立位置
   * POST /api/v1/locations
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const location = await locationService.create(req.body);
      return success(res, location, '位置建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      if (error.message.includes('不存在') || error.message.includes('最多')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新位置
   * PUT /api/v1/locations/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const location = await locationService.update(req.params.id, req.body);
      return success(res, location, '位置更新成功');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('已存在') || error.message.includes('不能') || error.message.includes('最多')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 刪除位置
   * DELETE /api/v1/locations/:id
   */
  async delete(req, res, next) {
    try {
      await locationService.delete(req.params.id);
      return success(res, null, '位置已停用');
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

module.exports = locationController;
