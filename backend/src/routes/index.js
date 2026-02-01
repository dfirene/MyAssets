const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const roleRoutes = require('./roles');
const departmentRoutes = require('./departments');
const categoryRoutes = require('./categories');
const locationRoutes = require('./locations');
const supplierRoutes = require('./suppliers');
const assetRoutes = require('./assets');
const inventoryRoutes = require('./inventory');

const router = express.Router();

// 認證路由
router.use('/auth', authRoutes);

// 使用者管理
router.use('/users', userRoutes);

// 角色管理
router.use('/roles', roleRoutes);

// 部門管理
router.use('/departments', departmentRoutes);

// 資產分類
router.use('/categories', categoryRoutes);

// 存放位置
router.use('/locations', locationRoutes);

// 供應商
router.use('/suppliers', supplierRoutes);

// 資產管理
router.use('/assets', assetRoutes);

// 盤點管理
router.use('/inventory', inventoryRoutes);

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
        roles: '/api/v1/roles',
        departments: '/api/v1/departments',
        categories: '/api/v1/categories',
        locations: '/api/v1/locations',
        suppliers: '/api/v1/suppliers',
        assets: '/api/v1/assets',
        inventory: '/api/v1/inventory',
        reports: '/api/v1/reports (coming soon)',
      },
    },
  });
});

module.exports = router;
