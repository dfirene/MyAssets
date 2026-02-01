const express = require('express');
const authRoutes = require('./auth');

const router = express.Router();

// 認證路由
router.use('/auth', authRoutes);

// API 首頁
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: '資訊資產管理系統 API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        assets: '/api/v1/assets',
        inventory: '/api/v1/inventory',
        reports: '/api/v1/reports',
      },
    },
  });
});

module.exports = router;
