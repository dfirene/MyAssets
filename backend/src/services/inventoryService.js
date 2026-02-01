const prisma = require('../models/prisma');

/**
 * 盤點服務
 */

/**
 * 轉換 BigInt 為字串（JSON 序列化用）
 */
function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

/**
 * 查詢盤點計畫列表
 */
async function findAllPlans({ page = 1, pageSize = 20, status, search }) {
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.inventoryPlan.count({ where }),
    prisma.inventoryPlan.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // 為每個計畫取得統計
  const plansWithStats = await Promise.all(
    data.map(async (plan) => {
      const stats = await prisma.inventoryRecord.groupBy({
        by: ['matchStatus'],
        where: { planId: plan.id },
        _count: true,
      });

      const statsMap = stats.reduce((acc, s) => {
        acc[s.matchStatus] = s._count;
        return acc;
      }, {});

      return {
        ...plan,
        stats: {
          total: Object.values(statsMap).reduce((a, b) => a + b, 0),
          matched: statsMap.matched || 0,
          unmatched: statsMap.unmatched || 0,
          discrepancy: statsMap.discrepancy || 0,
        },
      };
    })
  );

  return {
    data: serializeBigInt(plansWithStats),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 查詢單一盤點計畫
 */
async function findPlanById(id) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(id) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  // 取得統計
  const stats = await prisma.inventoryRecord.groupBy({
    by: ['matchStatus'],
    where: { planId: plan.id },
    _count: true,
  });

  const statsMap = stats.reduce((acc, s) => {
    acc[s.matchStatus] = s._count;
    return acc;
  }, {});

  // 取得範圍內的資產數量
  const scopeWhere = buildScopeWhere(plan);
  const totalAssets = await prisma.asset.count({
    where: { ...scopeWhere, status: { not: 'scrapped' } },
  });

  return serializeBigInt({
    ...plan,
    scopeIds: plan.scopeIds ? JSON.parse(plan.scopeIds) : [],
    stats: {
      totalAssets,
      scanned: Object.values(statsMap).reduce((a, b) => a + b, 0),
      matched: statsMap.matched || 0,
      unmatched: statsMap.unmatched || 0,
      discrepancy: statsMap.discrepancy || 0,
    },
  });
}

/**
 * 建立盤點計畫
 */
async function createPlan(data, userId) {
  const plan = await prisma.inventoryPlan.create({
    data: {
      name: data.name,
      description: data.description || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'draft',
      scopeType: data.scopeType || 'all',
      scopeIds: data.scopeIds ? JSON.stringify(data.scopeIds) : null,
      createdBy: BigInt(userId),
    },
  });

  return serializeBigInt(plan);
}

/**
 * 更新盤點計畫
 */
async function updatePlan(id, data, userId) {
  const existing = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existing) {
    throw new Error('盤點計畫不存在');
  }

  if (existing.status === 'completed' || existing.status === 'closed') {
    throw new Error('已完成或關閉的盤點計畫無法修改');
  }

  const plan = await prisma.inventoryPlan.update({
    where: { id: BigInt(id) },
    data: {
      name: data.name,
      description: data.description || null,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      scopeType: data.scopeType,
      scopeIds: data.scopeIds ? JSON.stringify(data.scopeIds) : null,
    },
  });

  return serializeBigInt(plan);
}

/**
 * 開始盤點
 */
async function startPlan(id) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(id) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  if (plan.status !== 'draft') {
    throw new Error('只有草稿狀態的計畫可以開始');
  }

  const updated = await prisma.inventoryPlan.update({
    where: { id: BigInt(id) },
    data: { status: 'in_progress' },
  });

  return serializeBigInt(updated);
}

/**
 * 完成盤點
 */
async function completePlan(id) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(id) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  if (plan.status !== 'in_progress') {
    throw new Error('只有進行中的計畫可以完成');
  }

  const updated = await prisma.inventoryPlan.update({
    where: { id: BigInt(id) },
    data: { status: 'completed' },
  });

  return serializeBigInt(updated);
}

/**
 * 關閉盤點（結案）
 */
async function closePlan(id) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(id) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  if (plan.status !== 'completed') {
    throw new Error('只有已完成的計畫可以關閉');
  }

  const updated = await prisma.inventoryPlan.update({
    where: { id: BigInt(id) },
    data: { status: 'closed' },
  });

  return serializeBigInt(updated);
}

/**
 * 刪除盤點計畫
 */
async function deletePlan(id) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(id) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  if (plan.status !== 'draft') {
    throw new Error('只有草稿狀態的計畫可以刪除');
  }

  await prisma.inventoryPlan.delete({
    where: { id: BigInt(id) },
  });
}

/**
 * 建立盤點範圍查詢條件
 */
function buildScopeWhere(plan) {
  const where = {};
  
  if (plan.scopeType === 'all') {
    return where;
  }

  const scopeIds = plan.scopeIds ? JSON.parse(plan.scopeIds) : [];
  if (scopeIds.length === 0) {
    return where;
  }

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

/**
 * 查詢盤點計畫的資產清單（待盤點）
 */
async function getPlanAssets(planId, { page = 1, pageSize = 50, status }) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(planId) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  const scopeWhere = buildScopeWhere(plan);
  const where = { ...scopeWhere, status: { not: 'scrapped' } };

  // 取得已盤點的資產編號
  const scannedRecords = await prisma.inventoryRecord.findMany({
    where: { planId: plan.id },
    select: { assetNo: true },
  });
  const scannedAssetNos = new Set(scannedRecords.map(r => r.assetNo));

  const [total, assets] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
        location: { select: { name: true } },
        custodian: { select: { name: true } },
      },
      orderBy: { assetNo: 'asc' },
    }),
  ]);

  // 標記是否已盤點
  const assetsWithStatus = assets.map(asset => ({
    ...asset,
    isScanned: scannedAssetNos.has(asset.assetNo),
  }));

  // 若指定過濾狀態
  let filteredAssets = assetsWithStatus;
  if (status === 'scanned') {
    filteredAssets = assetsWithStatus.filter(a => a.isScanned);
  } else if (status === 'pending') {
    filteredAssets = assetsWithStatus.filter(a => !a.isScanned);
  }

  return {
    data: serializeBigInt(filteredAssets),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    summary: {
      total,
      scanned: scannedAssetNos.size,
      pending: total - scannedAssetNos.size,
    },
  };
}

/**
 * 掃描資產（盤點）
 */
async function scanAsset(planId, data, userId) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(planId) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  if (plan.status !== 'in_progress') {
    throw new Error('盤點計畫不在進行中');
  }

  // 查詢資產
  const asset = await prisma.asset.findUnique({
    where: { assetNo: data.assetNo },
    include: {
      category: { select: { name: true } },
      department: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  // 判斷比對狀態
  let matchStatus = 'unmatched';
  let matchAssetId = null;
  let discrepancyNote = null;

  if (asset) {
    matchAssetId = asset.id;
    
    // 檢查是否在盤點範圍內
    const scopeWhere = buildScopeWhere(plan);
    const inScope = await checkAssetInScope(asset, scopeWhere);
    
    if (inScope) {
      // 檢查是否有差異（位置、部門等）
      const discrepancies = [];
      
      if (data.locationId && asset.locationId && BigInt(data.locationId) !== asset.locationId) {
        discrepancies.push('位置不符');
      }
      
      if (data.departmentId && asset.departmentId && BigInt(data.departmentId) !== asset.departmentId) {
        discrepancies.push('部門不符');
      }

      if (discrepancies.length > 0) {
        matchStatus = 'discrepancy';
        discrepancyNote = discrepancies.join('、');
      } else {
        matchStatus = 'matched';
      }
    } else {
      matchStatus = 'discrepancy';
      discrepancyNote = '資產不在盤點範圍內';
    }
  }

  // 檢查是否已掃描
  const existingRecord = await prisma.inventoryRecord.findFirst({
    where: {
      planId: plan.id,
      assetNo: data.assetNo,
    },
  });

  if (existingRecord) {
    // 更新現有記錄
    const record = await prisma.inventoryRecord.update({
      where: { id: existingRecord.id },
      data: {
        matchStatus,
        matchAssetId,
        discrepancyNote: data.discrepancyNote || discrepancyNote,
        imagePath: data.imagePath || null,
        gpsLatitude: data.latitude ? parseFloat(data.latitude) : null,
        gpsLongitude: data.longitude ? parseFloat(data.longitude) : null,
        scannedBy: BigInt(userId),
        scannedAt: new Date(),
      },
    });

    return serializeBigInt({
      ...record,
      asset: asset ? serializeBigInt(asset) : null,
      isUpdate: true,
    });
  }

  // 建立新記錄
  const record = await prisma.inventoryRecord.create({
    data: {
      planId: plan.id,
      assetNo: data.assetNo,
      matchStatus,
      matchAssetId,
      discrepancyNote: data.discrepancyNote || discrepancyNote,
      imagePath: data.imagePath || null,
      gpsLatitude: data.latitude ? parseFloat(data.latitude) : null,
      gpsLongitude: data.longitude ? parseFloat(data.longitude) : null,
      scannedBy: BigInt(userId),
      scannedAt: new Date(),
    },
  });

  return serializeBigInt({
    ...record,
    asset: asset ? serializeBigInt(asset) : null,
    isUpdate: false,
  });
}

/**
 * 檢查資產是否在範圍內
 */
async function checkAssetInScope(asset, scopeWhere) {
  if (Object.keys(scopeWhere).length === 0) {
    return true;
  }

  if (scopeWhere.departmentId && !scopeWhere.departmentId.in.includes(asset.departmentId)) {
    return false;
  }

  if (scopeWhere.locationId && (!asset.locationId || !scopeWhere.locationId.in.includes(asset.locationId))) {
    return false;
  }

  if (scopeWhere.categoryId && !scopeWhere.categoryId.in.includes(asset.categoryId)) {
    return false;
  }

  return true;
}

/**
 * 查詢盤點記錄
 */
async function findRecords(planId, { page = 1, pageSize = 50, matchStatus, search }) {
  const where = { planId: BigInt(planId) };

  if (matchStatus) {
    where.matchStatus = matchStatus;
  }

  if (search) {
    where.assetNo = { contains: search, mode: 'insensitive' };
  }

  const [total, records] = await Promise.all([
    prisma.inventoryRecord.count({ where }),
    prisma.inventoryRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        asset: {
          include: {
            category: { select: { name: true } },
            department: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
        scannedByUser: { select: { name: true } },
      },
      orderBy: { scannedAt: 'desc' },
    }),
  ]);

  return {
    data: serializeBigInt(records),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 取得盤點差異報表
 */
async function getDiscrepancyReport(planId) {
  const plan = await prisma.inventoryPlan.findUnique({
    where: { id: BigInt(planId) },
  });

  if (!plan) {
    throw new Error('盤點計畫不存在');
  }

  // 取得所有差異和未比對記錄
  const discrepancies = await prisma.inventoryRecord.findMany({
    where: {
      planId: plan.id,
      matchStatus: { in: ['discrepancy', 'unmatched'] },
    },
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

  // 取得未盤點的資產
  const scopeWhere = buildScopeWhere(plan);
  const scannedAssetNos = await prisma.inventoryRecord.findMany({
    where: { planId: plan.id },
    select: { assetNo: true },
  });
  const scannedSet = new Set(scannedAssetNos.map(r => r.assetNo));

  const notScanned = await prisma.asset.findMany({
    where: {
      ...scopeWhere,
      status: { not: 'scrapped' },
      assetNo: { notIn: Array.from(scannedSet) },
    },
    include: {
      category: { select: { name: true } },
      department: { select: { name: true } },
      location: { select: { name: true } },
      custodian: { select: { name: true } },
    },
    orderBy: { assetNo: 'asc' },
  });

  return serializeBigInt({
    plan: {
      id: plan.id,
      name: plan.name,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: plan.status,
    },
    discrepancies: discrepancies.map(r => ({
      ...r,
      type: r.matchStatus === 'unmatched' ? '系統無此資產' : '資料差異',
    })),
    notScanned,
    summary: {
      discrepancyCount: discrepancies.filter(r => r.matchStatus === 'discrepancy').length,
      unmatchedCount: discrepancies.filter(r => r.matchStatus === 'unmatched').length,
      notScannedCount: notScanned.length,
    },
  });
}

/**
 * 更新盤點記錄（處理差異）
 */
async function updateRecord(recordId, data, userId) {
  const record = await prisma.inventoryRecord.findUnique({
    where: { id: BigInt(recordId) },
    include: { plan: true },
  });

  if (!record) {
    throw new Error('盤點記錄不存在');
  }

  if (record.plan.status === 'closed') {
    throw new Error('盤點計畫已關閉，無法修改');
  }

  const updated = await prisma.inventoryRecord.update({
    where: { id: BigInt(recordId) },
    data: {
      matchStatus: data.matchStatus || record.matchStatus,
      discrepancyNote: data.discrepancyNote,
    },
  });

  return serializeBigInt(updated);
}

module.exports = {
  findAllPlans,
  findPlanById,
  createPlan,
  updatePlan,
  startPlan,
  completePlan,
  closePlan,
  deletePlan,
  getPlanAssets,
  scanAsset,
  findRecords,
  getDiscrepancyReport,
  updateRecord,
};
