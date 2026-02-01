const jwt = require('jsonwebtoken');
const config = require('../config');
const { errors } = require('../utils/response');
const prisma = require('../models/prisma');

/**
 * JWT 認證 Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // 取得 Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errors.unauthorized(res, '請提供認證 Token');
    }

    const token = authHeader.split(' ')[1];

    // 驗證 Token
    const decoded = jwt.verify(token, config.jwt.secret);

    // 查詢使用者
    const user = await prisma.user.findUnique({
      where: { id: BigInt(decoded.userId) },
      include: {
        department: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      return errors.unauthorized(res, '使用者不存在或已停用');
    }

    // 整理權限列表
    const permissions = new Set();
    user.roles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        permissions.add(`${rp.permission.module}:${rp.permission.action}`);
      });
    });

    // 附加到 request
    req.user = {
      id: user.id,
      account: user.account,
      name: user.name,
      email: user.email,
      departmentId: user.departmentId,
      department: user.department,
      roles: user.roles.map((ur) => ur.role.code),
      permissions: Array.from(permissions),
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return errors.unauthorized(res, error.message);
    }
    next(error);
  }
};

/**
 * 權限檢查 Middleware
 * @param {string} module - 模組名稱
 * @param {string} action - 操作名稱
 */
const authorize = (module, action) => {
  return (req, res, next) => {
    const permission = `${module}:${action}`;
    
    // 系統管理員擁有所有權限
    if (req.user.roles.includes('admin')) {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return errors.forbidden(res, `權限不足：需要 ${permission} 權限`);
    }

    next();
  };
};

/**
 * 角色檢查 Middleware
 * @param  {...string} roles - 允許的角色
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    const hasRequiredRole = roles.some((role) => req.user.roles.includes(role));
    
    if (!hasRequiredRole) {
      return errors.forbidden(res, `需要以下角色之一：${roles.join(', ')}`);
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  hasRole,
};
