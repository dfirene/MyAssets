const { validationResult } = require('express-validator');
const roleService = require('../services/roleService');
const { success, errors } = require('../utils/response');

/**
 * 角色控制器
 */
const roleController = {
  /**
   * 查詢角色列表
   * GET /api/v1/roles
   */
  async list(req, res, next) {
    try {
      const { select } = req.query;
      
      // 下拉選單用
      if (select === 'true') {
        const roles = await roleService.findAllForSelect();
        return success(res, roles);
      }

      const roles = await roleService.findAll();
      return success(res, roles);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 查詢單一角色
   * GET /api/v1/roles/:id
   */
  async get(req, res, next) {
    try {
      const role = await roleService.findById(req.params.id);
      return success(res, role);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 建立角色
   * POST /api/v1/roles
   */
  async create(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const role = await roleService.create(req.body);
      return success(res, role, '角色建立成功', 201);
    } catch (error) {
      if (error.message.includes('已存在')) {
        return errors.conflict(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 更新角色
   * PUT /api/v1/roles/:id
   */
  async update(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const role = await roleService.update(req.params.id, req.body);
      return success(res, role, '角色更新成功');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('已存在') || error.message.includes('不可修改')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 刪除角色
   * DELETE /api/v1/roles/:id
   */
  async delete(req, res, next) {
    try {
      await roleService.delete(req.params.id);
      return success(res, null, '角色已刪除');
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      if (error.message.includes('不可刪除') || error.message.includes('無法刪除')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 查詢所有權限
   * GET /api/v1/roles/permissions
   */
  async permissions(req, res, next) {
    try {
      const permissions = await roleService.findAllPermissions();
      return success(res, permissions);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = roleController;
