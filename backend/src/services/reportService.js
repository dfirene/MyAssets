const prisma = require('../models/prisma');
const XLSX = require('xlsx');

/**
 * 報表服務
 */

/**
 * 轉換 BigInt 為字串
 */
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

/**
 * Dashboard 統計
 */
async function getDashboardStats() {
  // 資產統計
  const assetStats = await prisma.asset.groupBy({
    by: ['status'],
    _count: true,
  });

  const assetsByStatus = assetStats.reduce((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {});

  const totalAssets = Object.values(assetsByStatus).reduce((a, b) => a + b, 0);

  // 本月新增資產
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newAssetsThisMonth = await prisma.asset.count({
    where: {
      createdAt: { gte: startOfMonth },
    },
  });

  // 即將過保資產（30天內）
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringWarranty = await prisma.asset.count({
    where: {
      warrantyDate: {
        gte: now,
        lte: thirtyDaysLater,
      },
      status: { not: 'scrapped' },
    },
  });

  // 依分類統計
  const byCategory = await prisma.asset.groupBy({
    by: ['categoryId'],
    where: { status: { not: 'scrapped' } },
    _count: true,
    _sum: { acquireAmount: true },
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: byCategory.map(b => b.categoryId) } },
    select: { id: true, name: true },
  });

  const categoryMap = new Map(categories.map(c => [c.id.toString(), c.name]));

  const assetsByCategory = byCategory.map(b => ({
    categoryId: b.categoryId.toString(),
    categoryName: categoryMap.get(b.categoryId.toString()) || '未分類',
    count: b._count,
    totalValue: b._sum.acquireAmount ? Number(b._sum.acquireAmount) : 0,
  })).sort((a, b) => b.count - a.count);

  // 依部門統計
  const byDepartment = await prisma.asset.groupBy({
    by: ['departmentId'],
    where: { status: { not: 'scrapped' } },
    _count: true,
    _sum: { acquireAmount: true },
  });

  const departments = await prisma.department.findMany({
    where: { id: { in: byDepartment.map(b => b.departmentId) } },
    select: { id: true, name: true },
  });

  const deptMap = new Map(departments.map(d => [d.id.toString(), d.name]));

  const assetsByDepartment = byDepartment.map(b => ({
    departmentId: b.departmentId.toString(),
    departmentName: deptMap.get(b.departmentId.toString()) || '未分配',
    count: b._count,
    totalValue: b._sum.acquireAmount ? Number(b._sum.acquireAmount) : 0,
  })).sort((a, b) => b.count - a.count);

  // 總資產價值
  const totalValue = await prisma.asset.aggregate({
    where: { status: { not: 'scrapped' } },
    _sum: { acquireAmount: true },
  });

  // 近期盤點
  const recentInventory = await prisma.inventoryPlan.findFirst({
    where: { status: { in: ['in_progress', 'completed'] } },
    orderBy: { createdAt: 'desc' },
  });

  // 近期異動
  const recentMovements = await prisma.assetMovement.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      asset: { select: { assetNo: true, name: true } },
    },
  });

  return serializeBigInt({
    summary: {
      totalAssets,
      activeAssets: (assetsByStatus.in_use || 0) + (assetsByStatus.idle || 0),
      inUse: assetsByStatus.in_use || 0,
      idle: assetsByStatus.idle || 0,
      repair: assetsByStatus.repair || 0,
      scrapped: assetsByStatus.scrapped || 0,
      totalValue: totalValue._sum.acquireAmount ? Number(totalValue._sum.acquireAmount) : 0,
      newThisMonth: newAssetsThisMonth,
      expiringWarranty,
    },
    assetsByStatus,
    assetsByCategory: assetsByCategory.slice(0, 10),
    assetsByDepartment: assetsByDepartment.slice(0, 10),
    recentInventory: recentInventory ? {
      id: recentInventory.id,
      name: recentInventory.name,
      status: recentInventory.status,
      startDate: recentInventory.startDate,
      endDate: recentInventory.endDate,
    } : null,
    recentMovements: recentMovements.map(m => ({
      id: m.id,
      assetNo: m.asset.assetNo,
      assetName: m.asset.name,
      movementType: m.movementType,
      createdAt: m.createdAt,
    })),
  });
}

/**
 * 資產統計報表
 */
async function getAssetReport(filters = {}) {
  const where = { status: { not: 'scrapped' } };

  if (filters.categoryId) {
    where.categoryId = BigInt(filters.categoryId);
  }
  if (filters.departmentId) {
    where.departmentId = BigInt(filters.departmentId);
  }
  if (filters.dateFrom) {
    where.acquireDate = { ...where.acquireDate, gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.acquireDate = { ...where.acquireDate, lte: new Date(filters.dateTo) };
  }

  // 依月份統計新增資產
  const assets = await prisma.asset.findMany({
    where,
    select: {
      acquireDate: true,
      acquireAmount: true,
      categoryId: true,
      departmentId: true,
    },
  });

  // 按月統計
  const byMonth = {};
  assets.forEach(a => {
    const month = a.acquireDate.toISOString().slice(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { count: 0, value: 0 };
    }
    byMonth[month].count++;
    byMonth[month].value += Number(a.acquireAmount || 0);
  });

  const monthlyTrend = Object.entries(byMonth)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // 依分類統計
  const byCategory = await prisma.asset.groupBy({
    by: ['categoryId'],
    where,
    _count: true,
    _sum: { acquireAmount: true },
  });

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map(c => [c.id.toString(), c.name]));

  // 依部門統計
  const byDepartment = await prisma.asset.groupBy({
    by: ['departmentId'],
    where,
    _count: true,
    _sum: { acquireAmount: true },
  });

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  const deptMap = new Map(departments.map(d => [d.id.toString(), d.name]));

  // 依狀態統計
  const byStatus = await prisma.asset.groupBy({
    by: ['status'],
    where: filters.categoryId || filters.departmentId ? where : {},
    _count: true,
  });

  return serializeBigInt({
    total: assets.length,
    totalValue: assets.reduce((sum, a) => sum + Number(a.acquireAmount || 0), 0),
    monthlyTrend,
    byCategory: byCategory.map(b => ({
      name: categoryMap.get(b.categoryId.toString()) || '未分類',
      count: b._count,
      value: Number(b._sum.acquireAmount || 0),
    })),
    byDepartment: byDepartment.map(b => ({
      name: deptMap.get(b.departmentId.toString()) || '未分配',
      count: b._count,
      value: Number(b._sum.acquireAmount || 0),
    })),
    byStatus: byStatus.map(b => ({
      status: b.status,
      count: b._count,
    })),
  });
}

/**
 * 盤點報表匯出
 */
async function exportInventoryReport(planId) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(planId) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  // 取得所有記錄
  const records = await prisma.inventoryRecord.findMany({
    where: { planId: plan.id },
    include: {
      asset: {
        include: {
          category: { select: { name: true } },
          department: { select: { name: true } },
          location: { select: { name: true } },
          custodian: { select: { name: true } },
        },
      },
      scannedByUser: { select: { name: true } },
    },
    orderBy: { assetNo: 'asc' },
  });

  // 取得未盤點資產
  const scannedNos = new Set(records.map(r => r.assetNo));
  const scopeWhere = buildScopeWhere(plan);
  
  const notScanned = await prisma.asset.findMany({
    where: {
      ...scopeWhere,
      status: { not: 'scrapped' },
      assetNo: { notIn: Array.from(scannedNos) },
    },
    include: {
      category: { select: { name: true } },
      department: { select: { name: true } },
      location: { select: { name: true } },
      custodian: { select: { name: true } },
    },
    orderBy: { assetNo: 'asc' },
  });

  // 建立 Excel
  const wb = XLSX.utils.book_new();

  // 摘要頁
  const summaryData = [
    ['盤點計畫名稱', plan.name],
    ['盤點期間', `${formatDate(plan.startDate)} ~ ${formatDate(plan.endDate)}`],
    ['狀態', getStatusLabel(plan.status)],
    [''],
    ['統計項目', '數量'],
    ['已盤點', records.length],
    ['相符', records.filter(r => r.matchStatus === 'matched').length],
    ['差異', records.filter(r => r.matchStatus === 'discrepancy').length],
    ['系統無此資產', records.filter(r => r.matchStatus === 'unmatched').length],
    ['未盤點', notScanned.length],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, '摘要');

  // 盤點記錄頁
  const recordsData = records.map(r => ({
    '資產編號': r.assetNo,
    '資產名稱': r.asset?.name || '-',
    '分類': r.asset?.category?.name || '-',
    '部門': r.asset?.department?.name || '-',
    '位置': r.asset?.location?.name || '-',
    '保管人': r.asset?.custodian?.name || '-',
    '盤點結果': getMatchStatusLabel(r.matchStatus),
    '差異說明': r.discrepancyNote || '',
    '盤點時間': formatDateTime(r.scannedAt),
    '盤點人': r.scannedByUser?.name || '',
  }));
  const wsRecords = XLSX.utils.json_to_sheet(recordsData);
  XLSX.utils.book_append_sheet(wb, wsRecords, '盤點記錄');

  // 未盤點資產頁
  if (notScanned.length > 0) {
    const notScannedData = notScanned.map(a => ({
      '資產編號': a.assetNo,
      '資產名稱': a.name,
      '分類': a.category?.name || '-',
      '部門': a.department?.name || '-',
      '位置': a.location?.name || '-',
      '保管人': a.custodian?.name || '-',
      '狀態': getAssetStatusLabel(a.status),
    }));
    const wsNotScanned = XLSX.utils.json_to_sheet(notScannedData);
    XLSX.utils.book_append_sheet(wb, wsNotScanned, '未盤點資產');
  }

  // 差異資產頁
  const discrepancies = records.filter(r => r.matchStatus !== 'matched');
  if (discrepancies.length > 0) {
    const discrepancyData = discrepancies.map(r => ({
      '資產編號': r.assetNo,
      '資產名稱': r.asset?.name || '-',
      '問題類型': r.matchStatus === 'unmatched' ? '系統無此資產' : '資料差異',
      '差異說明': r.discrepancyNote || '',
      '部門': r.asset?.department?.name || '-',
      '位置': r.asset?.location?.name || '-',
      '盤點時間': formatDateTime(r.scannedAt),
    }));
    const wsDiscrepancy = XLSX.utils.json_to_sheet(discrepancyData);
    XLSX.utils.book_append_sheet(wb, wsDiscrepancy, '異常資產');
  }

  return {
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
    filename: `inventory_report_${plan.id}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

/**
 * 資產清冊匯出
 */
async function exportAssetList(filters = {}) {
  const where = { status: { not: 'scrapped' } };

  if (filters.categoryId) {
    where.categoryId = BigInt(filters.categoryId);
  }
  if (filters.departmentId) {
    where.departmentId = BigInt(filters.departmentId);
  }
  if (filters.locationId) {
    where.locationId = BigInt(filters.locationId);
  }
  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  }

  const assets = await prisma.asset.findMany({
    where,
    include: {
      category: { select: { name: true } },
      department: { select: { name: true } },
      location: { select: { name: true } },
      supplier: { select: { name: true } },
      custodian: { select: { name: true } },
    },
    orderBy: { assetNo: 'asc' },
  });

  const data = assets.map(a => ({
    '資產編號': a.assetNo,
    '資產名稱': a.name,
    '分類': a.category?.name || '',
    '規格型號': a.specModel || '',
    '序號': a.serialNo || '',
    '取得日期': formatDate(a.acquireDate),
    '取得金額': a.acquireAmount ? Number(a.acquireAmount) : '',
    '供應商': a.supplier?.name || '',
    '使用部門': a.department?.name || '',
    '保管人': a.custodian?.name || '',
    '存放位置': a.location?.name || '',
    '狀態': getAssetStatusLabel(a.status),
    '保固到期': a.warrantyDate ? formatDate(a.warrantyDate) : '',
    '備註': a.remark || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '資產清冊');

  return {
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
    filename: `asset_list_${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

// Helper functions
function buildScopeWhere(plan) {
  const where = {};
  if (plan.scopeType === 'all') return where;

  const scopeIds = plan.scopeIds ? JSON.parse(plan.scopeIds) : [];
  if (scopeIds.length === 0) return where;

  const bigIntIds = scopeIds.map(id => BigInt(id));

  switch (plan.scopeType) {
    case 'department':
      where.departmentId = { in: bigIntIds };
      break;
    case 'location':
      where.locationId = { in: bigIntIds };
      break;
    case 'category':
      where.categoryId = { in: bigIntIds };
      break;
  }
  return where;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-TW');
}

function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-TW');
}

function getStatusLabel(status) {
  const labels = {
    draft: '草稿',
    in_progress: '進行中',
    completed: '已完成',
    closed: '已結案',
  };
  return labels[status] || status;
}

function getMatchStatusLabel(status) {
  const labels = {
    matched: '相符',
    unmatched: '系統無此資產',
    discrepancy: '差異',
  };
  return labels[status] || status;
}

function getAssetStatusLabel(status) {
  const labels = {
    in_use: '使用中',
    idle: '閒置',
    repair: '維修中',
    pending_scrap: '待報廢',
    scrapped: '已報廢',
    lost: '遺失',
  };
  return labels[status] || status;
}

module.exports = {
  getDashboardStats,
  getAssetReport,
  exportInventoryReport,
  exportAssetList,
};
