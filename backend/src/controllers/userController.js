const { validationResult } = require('express-validator');
const userService = require('../services/userService');
const { success, paginated, errors } = require('../utils/response');

/**
 * 使用者控制器
 */
const userController = {
  /**
   * 查詢使用者列表
   * GET /api/v1/users
   */
  async list(req, res, next) {
    try {
      const { page = 1, pageSize = 20, search, departmentId, status } = req.query;
      
      const result = await userService.findAll({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search,
        departmentId,
        status,
      });

      return paginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一使用者
   * GET /api/v1/users/:id
   */
  async get(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      return success(res, user);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立使用者
   * POST /api/v1/users
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const user = await userService.create(req.body);
      return success(res, user, '使用者建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新使用者
   * PUT /api/v1/users/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const user = await userService.update(req.params.id, req.body);
      return success(res, user, '使用者更新成功');
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
   * 刪除使用者
   * DELETE /api/v1/users/:id
   */
  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id);
      return success(res, null, '使用者已停用');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 重設密碼
   * POST /api/v1/users/:id/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      await userService.resetPassword(req.params.id, req.body.password);
      return success(res, null, '密碼重設成功');
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;
