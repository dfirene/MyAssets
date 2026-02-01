const logger = require('../utils/logger');
const { errors } = require('../utils/response');

/**
 * 全域錯誤處理 Middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Prisma 錯誤處理
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        // 唯一鍵重複
        return errors.conflict(res, '資料已存在（重複的唯一值）');
      case 'P2025':
        // 找不到紀錄
        return errors.notFound(res, '找不到指定資料');
      case 'P2003':
        // 外鍵約束失敗
        return errors.badRequest(res, '關聯資料不存在');
    }
  }

  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    return errors.unauthorized(res, '無效的認證 Token');
  }
  if (err.name === 'TokenExpiredError') {
    return errors.unauthorized(res, '認證 Token 已過期');
  }

  // 驗證錯誤
  if (err.name === 'ValidationError') {
    return errors.validation(res, err.errors);
  }

  // 預設錯誤
  return errors.internal(res);
};

module.exports = errorHandler;
