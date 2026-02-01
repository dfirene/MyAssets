const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { success, errors } = require('../utils/response');

/**
 * 認證控制器
 */
const authController = {
  /**
   * 登入
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const { account, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await authService.login(account, password, ipAddress, userAgent);
      
      return success(res, result, '登入成功');
    } catch (error) {
      if (error.message.includes('帳號') || error.message.includes('密碼') || error.message.includes('停用')) {
        return errors.unauthorized(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 登出
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    // JWT 是無狀態的，登出只需要客戶端刪除 Token
    // 如果需要實作 Token 黑名單，可以在這裡加入
    return success(res, null, '登出成功');
  },

  /**
   * 更新 Token
   * POST /api/v1/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errors.badRequest(res, '請提供 Refresh Token');
      }

      const result = await authService.refreshToken(refreshToken);
      
      return success(res, result, 'Token 更新成功');
    } catch (error) {
      return errors.unauthorized(res, error.message);
    }
  },

  /**
   * 取得當前使用者資訊
   * GET /api/v1/auth/me
   */
  async me(req, res) {
    return success(res, req.user, '取得成功');
  },

  /**
   * 變更密碼
   * POST /api/v1/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return errors.validation(res, validationErrors.array());
      }

      const { oldPassword, newPassword } = req.body;

      await authService.changePassword(req.user.id, oldPassword, newPassword);
      
      return success(res, null, '密碼變更成功');
    } catch (error) {
      if (error.message.includes('密碼')) {
        return errors.badRequest(res, error.message);
      }
      next(error);
    }
  },
};

module.exports = authController;
