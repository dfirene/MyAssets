/**
 * 統一回應格式工具
 */

// 成功回應
const success = (res, data = null, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

// 分頁回應
const paginated = (res, data, pagination, message = '查詢成功') => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
    },
    message,
  });
};

// 錯誤回應
const error = (res, code, message, statusCode = 400, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return res.status(statusCode).json(response);
};

// 常用錯誤
const errors = {
  badRequest: (res, message = '請求格式錯誤', details = null) =>
    error(res, 'BAD_REQUEST', message, 400, details),
    
  unauthorized: (res, message = '未授權存取') =>
    error(res, 'UNAUTHORIZED', message, 401),
    
  forbidden: (res, message = '權限不足') =>
    error(res, 'FORBIDDEN', message, 403),
    
  notFound: (res, message = '找不到此資源') =>
    error(res, 'NOT_FOUND', message, 404),
    
  conflict: (res, message = '資料衝突') =>
    error(res, 'CONFLICT', message, 409),
    
  validation: (res, errors) =>
    error(res, 'VALIDATION_ERROR', '資料驗證失敗', 422, errors),
    
  internal: (res, message = '系統錯誤，請稍後再試') =>
    error(res, 'INTERNAL_ERROR', message, 500),
};

module.exports = {
  success,
  paginated,
  error,
  errors,
};
