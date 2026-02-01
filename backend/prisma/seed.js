const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始初始化資料...');

  // ========== 建立預設角色 ==========
  console.log('📝 建立角色...');
  
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: {
        code: 'admin',
        name: '系統管理員',
        description: '擁有所有系統權限',
        isSystem: true,
      },
    }),
    prisma.role.upsert({
      where: { code: 'asset_manager' },
      update: {},
      create: {
        code: 'asset_manager',
        name: '資產管理員',
        description: '管理資產相關功能',
        isSystem: true,
      },
    }),
    prisma.role.upsert({
      where: { code: 'inventory_staff' },
      update: {},
      create: {
        code: 'inventory_staff',
        name: '盤點人員',
        description: '執行盤點作業',
        isSystem: true,
      },
    }),
    prisma.role.upsert({
      where: { code: 'user' },
      update: {},
      create: {
        code: 'user',
        name: '一般使用者',
        description: '基本查詢權限',
        isSystem: true,
      },
    }),
  ]);

  console.log(`✅ 建立 ${roles.length} 個角色`);

  // ========== 建立權限 ==========
  console.log('📝 建立權限...');

  const permissionData = [
    // 系統管理
    { module: 'users', action: 'create', name: '新增使用者' },
    { module: 'users', action: 'read', name: '查詢使用者' },
    { module: 'users', action: 'update', name: '修改使用者' },
    { module: 'users', action: 'delete', name: '刪除使用者' },
    { module: 'roles', action: 'create', name: '新增角色' },
    { module: 'roles', action: 'read', name: '查詢角色' },
    { module: 'roles', action: 'update', name: '修改角色' },
    { module: 'roles', action: 'delete', name: '刪除角色' },
    { module: 'departments', action: 'create', name: '新增部門' },
    { module: 'departments', action: 'read', name: '查詢部門' },
    { module: 'departments', action: 'update', name: '修改部門' },
    { module: 'departments', action: 'delete', name: '刪除部門' },
    // 基礎資料
    { module: 'categories', action: 'create', name: '新增分類' },
    { module: 'categories', action: 'read', name: '查詢分類' },
    { module: 'categories', action: 'update', name: '修改分類' },
    { module: 'categories', action: 'delete', name: '刪除分類' },
    { module: 'locations', action: 'create', name: '新增位置' },
    { module: 'locations', action: 'read', name: '查詢位置' },
    { module: 'locations', action: 'update', name: '修改位置' },
    { module: 'locations', action: 'delete', name: '刪除位置' },
    { module: 'suppliers', action: 'create', name: '新增供應商' },
    { module: 'suppliers', action: 'read', name: '查詢供應商' },
    { module: 'suppliers', action: 'update', name: '修改供應商' },
    { module: 'suppliers', action: 'delete', name: '刪除供應商' },
    // 資產管理
    { module: 'assets', action: 'create', name: '新增資產' },
    { module: 'assets', action: 'read', name: '查詢資產' },
    { module: 'assets', action: 'update', name: '修改資產' },
    { module: 'assets', action: 'delete', name: '刪除資產' },
    { module: 'assets', action: 'import', name: '匯入資產' },
    { module: 'assets', action: 'export', name: '匯出資產' },
    { module: 'movements', action: 'create', name: '建立異動' },
    { module: 'movements', action: 'read', name: '查詢異動' },
    { module: 'movements', action: 'approve', name: '審核異動' },
    // 盤點管理
    { module: 'inventory', action: 'create', name: '建立盤點計畫' },
    { module: 'inventory', action: 'read', name: '查詢盤點' },
    { module: 'inventory', action: 'update', name: '修改盤點計畫' },
    { module: 'inventory', action: 'execute', name: '執行盤點' },
    { module: 'inventory', action: 'close', name: '結案盤點' },
    // 報表
    { module: 'reports', action: 'asset', name: '資產報表' },
    { module: 'reports', action: 'inventory', name: '盤點報表' },
    { module: 'reports', action: 'movement', name: '異動報表' },
    // ERP 同步
    { module: 'erp', action: 'sync', name: 'ERP 同步' },
    { module: 'erp', action: 'logs', name: '同步紀錄' },
    // 系統設定
    { module: 'system', action: 'settings', name: '系統設定' },
    { module: 'system', action: 'audit', name: '稽核日誌' },
  ];

  for (const perm of permissionData) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module: perm.module,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ 建立 ${permissionData.length} 個權限`);

  // ========== 建立預設部門 ==========
  console.log('📝 建立部門...');

  const itDept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      code: 'IT',
      name: '資訊部',
      status: 'active',
    },
  });

  console.log('✅ 建立預設部門');

  // ========== 建立管理員帳號 ==========
  console.log('📝 建立管理員帳號...');

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { account: 'admin@myassets.local' },
    update: {},
    create: {
      account: 'admin@myassets.local',
      password: adminPassword,
      name: '系統管理員',
      email: 'admin@myassets.local',
      departmentId: itDept.id,
      status: 'active',
    },
  });

  // 指派管理員角色
  const adminRole = roles.find((r) => r.code === 'admin');
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ 建立管理員帳號: admin@myassets.local / Admin@123');

  // ========== 建立資產狀態 ==========
  console.log('📝 建立資產狀態...');

  const statuses = [
    { code: 'in_use', name: '使用中', color: '#52c41a', sortOrder: 1 },
    { code: 'idle', name: '閒置', color: '#faad14', sortOrder: 2 },
    { code: 'repair', name: '維修中', color: '#1890ff', sortOrder: 3 },
    { code: 'pending_scrap', name: '待報廢', color: '#ff7a45', sortOrder: 4 },
    { code: 'scrapped', name: '已報廢', color: '#8c8c8c', sortOrder: 5 },
    { code: 'lost', name: '遺失', color: '#f5222d', sortOrder: 6 },
  ];

  for (const status of statuses) {
    await prisma.assetStatus.upsert({
      where: { code: status.code },
      update: {},
      create: status,
    });
  }

  console.log(`✅ 建立 ${statuses.length} 個資產狀態`);

  // ========== 建立資產分類範例 ==========
  console.log('📝 建立資產分類...');

  const mainCategories = [
    { code: 'IT', name: '資訊設備', level: 1 },
    { code: 'NET', name: '網路設備', level: 1 },
    { code: 'PERIPH', name: '週邊設備', level: 1 },
    { code: 'SW', name: '軟體授權', level: 1 },
    { code: 'OTHER', name: '其他', level: 1 },
  ];

  for (const cat of mainCategories) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  // 子分類
  const itCategory = await prisma.category.findUnique({ where: { code: 'IT' } });
  
  const subCategories = [
    { code: 'IT-PC', name: '桌上型電腦', parentId: itCategory.id, level: 2, depreciationYears: 5 },
    { code: 'IT-NB', name: '筆記型電腦', parentId: itCategory.id, level: 2, depreciationYears: 3 },
    { code: 'IT-SERVER', name: '伺服器', parentId: itCategory.id, level: 2, depreciationYears: 5 },
    { code: 'IT-MONITOR', name: '螢幕', parentId: itCategory.id, level: 2, depreciationYears: 5 },
  ];

  for (const cat of subCategories) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  console.log('✅ 建立資產分類');

  console.log('\n🎉 初始化完成！');
  console.log('================================');
  console.log('預設管理員帳號：admin@myassets.local');
  console.log('預設密碼：Admin@123');
  console.log('================================');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
