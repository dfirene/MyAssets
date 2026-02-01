const { validationResult } = require('express-validator');
const categoryService = require('../services/categoryService');
const { success, errors } = require('../utils/response');

/**
 * 資產分類控制器
 */
const categoryController = {
  /**
   * 查詢分類列表（樹狀）
   * GET /api/v1/categories
   */
  async list(req, res, next) {
    try {
      const { flat, level, includeInactive } = req.query;
      
      if (flat === 'true') {
        const categories = await categoryService.findAllFlat({
          level: level ? parseInt(level) : undefined,
          includeInactive: includeInactive === 'true',
        });
        return success(res, categories);
      }

      const categories = await categoryService.findAll({
        includeInactive: includeInactive === 'true',
      });
      return success(res, categories);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一分類
   * GET /api/v1/categories/:id
   */
  async get(req, res, next) {
    try {
      const category = await categoryService.findById(req.params.id);
      return success(res, category);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立分類
   * POST /api/v1/categories
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const category = await categoryService.create(req.body);
      return success(res, category, '分類建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      if (error.message.includes('不存在')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新分類
   * PUT /api/v1/categories/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const category = await categoryService.update(req.params.id, req.body);
      return success(res, category, '分類更新成功');
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
   * 刪除分類
   * DELETE /api/v1/categories/:id
   */
  async delete(req, res, next) {
    try {
      await categoryService.delete(req.params.id);
      return success(res, null, '分類已停用');
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

module.exports = categoryController;
