const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始初始化資料...');

  // 清理舊資料
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();

  // ========== 建立部門 ==========
  console.log('📝 建立部門...');
  const itDept = await prisma.department.create({
    data: {
      code: 'IT',
      name: '資訊部',
      status: 'active',
    },
  });
  console.log('✅ 建立部門');

  // ========== 建立預設角色 ==========
  console.log('📝 建立角色...');
  
  const adminRole = await prisma.role.create({
    data: {
      code: 'admin',
      name: '系統管理員',
      description: '擁有所有系統權限',
      isSystem: true,
    },
  });

  const assetManagerRole = await prisma.role.create({
    data: {
      code: 'asset_manager',
      name: '資產管理員',
      description: '管理資產相關功能',
      isSystem: true,
    },
  });

  const inventoryStaffRole = await prisma.role.create({
    data: {
      code: 'inventory_staff',
      name: '盤點人員',
      description: '執行盤點作業',
      isSystem: true,
    },
  });

  const userRole = await prisma.role.create({
    data: {
      code: 'user',
      name: '一般使用者',
      description: '基本查詢權限',
      isSystem: true,
    },
  });

  console.log('✅ 建立 4 個角色');

  // ========== 建立管理員帳號 ==========
  console.log('📝 建立管理員帳號...');
  
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      account: 'admin@myassets.local',
      password: adminPassword,
      name: '系統管理員',
      email: 'admin@myassets.local',
      departmentId: itDept.id,
      status: 'active',
    },
  });

  // 指派管理員角色
  await prisma.userRole.create({
    data: {
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
    await prisma.assetStatus.create({
      data: status,
    }).catch(() => {
      // 忽略重複錯誤
    });
  }

  console.log(`✅ 建立 ${statuses.length} 個資產狀態`);

  // ========== 建立資產分類 ==========
  console.log('📝 建立資產分類...');

  const mainCategories = [
    { code: 'IT', name: '資訊設備', level: 1 },
    { code: 'NET', name: '網路設備', level: 1 },
    { code: 'PERIPH', name: '週邊設備', level: 1 },
    { code: 'SW', name: '軟體授權', level: 1 },
    { code: 'OTHER', name: '其他', level: 1 },
  ];

  const categoryMap = {};
  for (const cat of mainCategories) {
    const created = await prisma.category.create({
      data: cat,
    }).catch(() => null);
    if (created) categoryMap[cat.code] = created;
  }

  // 子分類
  const itCategory = categoryMap['IT'];
  if (itCategory) {
    const subCategories = [
      { code: 'IT-PC', name: '桌上型電腦', parentId: itCategory.id, level: 2, depreciationYears: 5 },
      { code: 'IT-NB', name: '筆記型電腦', parentId: itCategory.id, level: 2, depreciationYears: 3 },
      { code: 'IT-SERVER', name: '伺服器', parentId: itCategory.id, level: 2, depreciationYears: 5 },
      { code: 'IT-MONITOR', name: '螢幕', parentId: itCategory.id, level: 2, depreciationYears: 5 },
    ];

    for (const cat of subCategories) {
      await prisma.category.create({
        data: cat,
      }).catch(() => {
        // 忽略重複錯誤
      });
    }
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
    console.error('❌ 初始化失敗:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
