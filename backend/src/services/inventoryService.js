const prisma = require('../models/prisma');

/**
 * 盤點服務
 */
class InventoryService {
  /**
   * 查詢盤點計畫列表
   */
  async findAllPlans({ page = 1, pageSize = 20, status } = {}) {
    const where = {};
    if (status) {
      where.status = status;
    }

    const [total, plans] = await Promise.all([
      prisma.inventoryPlan.count({ where }),
      prisma.inventoryPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // 計算每個計畫的進度
    const plansWithProgress = await Promise.all(
      plans.map(async (plan) => {
        const progress = await this.getPlanProgress(plan.id);
        return {
          ...this.formatPlan(plan),
          progress,
        };
      })
    );

    return {
      data: plansWithProgress,
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 查詢單一盤點計畫
   */
  async findPlanById(id) {
    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: BigInt(id) },
    });

    if (!plan) {
      throw new Error('盤點計畫不存在');
    }

    const progress = await this.getPlanProgress(plan.id);
    return {
      ...this.formatPlan(plan),
      progress,
    };
  }

  /**
   * 建立盤點計畫
   */
  async createPlan(data, userId) {
    const plan = await prisma.inventoryPlan.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'draft',
        scopeType: data.scopeType || 'all',
        scopeIds: data.scopeIds ? JSON.stringify(data.scopeIds) : null,
        createdBy: BigInt(userId),
      },
    });

    return this.formatPlan(plan);
  }

  /**
   * 更新盤點計畫
   */
  async updatePlan(id, data) {
    const planId = BigInt(id);

    const existing = await prisma.inventoryPlan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      throw new Error('盤點計畫不存在');
    }

    if (existing.status === 'closed') {
      throw new Error('已結案的計畫無法修改');
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.scopeType !== undefined) updateData.scopeType = data.scopeType;
    if (data.scopeIds !== undefined) updateData.scopeIds = JSON.stringify(data.scopeIds);
    if (data.status !== undefined) updateData.status = data.status;

    const plan = await prisma.inventoryPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return this.formatPlan(plan);
  }

  /**
   * 刪除盤點計畫
   */
  async deletePlan(id) {
    const planId = BigInt(id);

    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('盤點計畫不存在');
    }

    if (plan.status !== 'draft') {
      throw new Error('只有草稿狀態的計畫可以刪除');
    }

    await prisma.inventoryPlan.delete({
      where: { id: planId },
    });
  }

  /**
   * 開始盤點
   */
  async startPlan(id) {
    const planId = BigInt(id);

    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('盤點計畫不存在');
    }

    if (plan.status !== 'draft') {
      throw new Error('只有草稿狀態的計畫可以開始');
    }

    const updated = await prisma.inventoryPlan.update({
      where: { id: planId },
      data: { status: 'in_progress' },
    });

    return this.formatPlan(updated);
  }

  /**
   * 完成盤點
   */
  async completePlan(id) {
    const planId = BigInt(id);

    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('盤點計畫不存在');
    }

    if (plan.status !== 'in_progress') {
      throw new Error('只有進行中的計畫可以完成');
    }

    const updated = await prisma.inventoryPlan.update({
      where: { id: planId },
      data: { status: 'completed' },
    });

    return this.formatPlan(updated);
  }

  /**
   * 結案盤點
   */
  async closePlan(id) {
    const planId = BigInt(id);

    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('盤點計畫不存在');
    }

    if (plan.status !== 'completed') {
      throw new Error('只有已完成的計畫可以結案');
    }

    const updated = await prisma.inventoryPlan.update({
      where: { id: planId },
      data: { status: 'closed' },
    });

    return this.formatPlan(updated);
  }

  /**
   * 取得盤點進度
   */
  async getPlanProgress(planId) {
    // 取得計畫範圍內的資產數量
    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: BigInt(planId) },
    });

    if (!plan) return null;

    let assetWhere = {};
    if (plan.scopeType !== 'all' && plan.scopeIds) {
      const scopeIds = JSON.parse(plan.scopeIds).map(id => BigInt(id));
      switch (plan.scopeType) {
        case 'department':
          assetWhere.departmentId = { in: scopeIds };
          break;
        case 'location':
          assetWhere.locationId = { in: scopeIds };
          break;
        case 'category':
          assetWhere.categoryId = { in: scopeIds };
          break;
      }
    }

    // 只統計使用中的資產
    assetWhere.status = { in: ['in_use', 'idle'] };

    const [totalAssets, scannedRecords, matchedCount, unmatchedCount, discrepancyCount] = await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.inventoryRecord.count({ where: { planId: BigInt(planId) } }),
      prisma.inventoryRecord.count({ where: { planId: BigInt(planId), matchStatus: 'matched' } }),
      prisma.inventoryRecord.count({ where: { planId: BigInt(planId), matchStatus: 'unmatched' } }),
      prisma.inventoryRecord.count({ where: { planId: BigInt(planId), matchStatus: 'discrepancy' } }),
    ]);

    return {
      totalAssets,
      scannedCount: scannedRecords,
      matchedCount,
      unmatchedCount,
      discrepancyCount,
      percentage: totalAssets > 0 ? Math.round((matchedCount / totalAssets) * 100) : 0,
    };
  }

  /**
   * 取得待盤資產清單
   */
  async getPendingAssets(planId, { page = 1, pageSize = 50 } = {}) {
    const plan = await prisma.inventoryPlan.findUnique({
      where: { id: BigInt(planId) },
    });

    if (!plan) {
      throw new Error('盤點計畫不存在');
    }

    // 已盤點的資產編號
    const scannedRecords = await prisma.inventoryRecord.findMany({
      where: { planId: BigInt(planId), matchStatus: 'matched' },
      select: { matchAssetId: true },
    });
    const scannedAssetIds = scannedRecords
      .filter(r => r.matchAssetId)
      .map(r => r.matchAssetId);

    // 建立資產查詢條件
    let assetWhere = {
      status: { in: ['in_use', 'idle'] },
    };

    if (scannedAssetIds.length > 0) {
      assetWhere.id = { notIn: scannedAssetIds };
    }

    if (plan.scopeType !== 'all' && plan.scopeIds) {
      const scopeIds = JSON.parse(plan.scopeIds).map(id => BigInt(id));
      switch (plan.scopeType) {
        case 'department':
          assetWhere.departmentId = { in: scopeIds };
          break;
        case 'location':
          assetWhere.locationId = { in: scopeIds };
          break;
        case 'category':
          assetWhere.categoryId = { in: scopeIds };
          break;
      }
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.findMany({
        where: assetWhere,
        include: {
          category: true,
          department: true,
          location: true,
          custodian: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { assetNo: 'asc' },
      }),
    ]);

    return {
      data: assets.map(a => ({
        id: a.id.toString(),
        assetNo: a.assetNo,
        name: a.name,
        category: a.category?.name,
        department: a.department?.name,
        location: a.location?.name,
        custodian: a.custodian?.name,
      })),
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 取得盤點紀錄
   */
  async getRecords(planId, { page = 1, pageSize = 50, matchStatus } = {}) {
    const where = { planId: BigInt(planId) };
    if (matchStatus) {
      where.matchStatus = matchStatus;
    }

    const [total, records] = await Promise.all([
      prisma.inventoryRecord.count({ where }),
      prisma.inventoryRecord.findMany({
        where,
        include: {
          asset: {
            select: { id: true, assetNo: true, name: true },
          },
          scannedByUser: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scannedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: records.map(this.formatRecord),
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 格式化盤點計畫
   */
  formatPlan(plan) {
    const statusNames = {
      draft: '草稿',
      in_progress: '進行中',
      completed: '已完成',
      closed: '已結案',
    };

    return {
      id: plan.id.toString(),
      name: plan.name,
      description: plan.description,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: plan.status,
      statusName: statusNames[plan.status] || plan.status,
      scopeType: plan.scopeType,
      scopeIds: plan.scopeIds ? JSON.parse(plan.scopeIds) : [],
      createdBy: plan.createdBy?.toString(),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /**
   * 格式化盤點紀錄
   */
  formatRecord(record) {
    const statusNames = {
      matched: '已匹配',
      unmatched: '盤盈',
      discrepancy: '差異',
    };

    return {
      id: record.id.toString(),
      planId: record.planId.toString(),
      assetNo: record.assetNo,
      ocrRawText: record.ocrRawText,
      ocrCategory: record.ocrCategory,
      ocrName: record.ocrName,
      ocrDate: record.ocrDate,
      imagePath: record.imagePath,
      matchStatus: record.matchStatus,
      matchStatusName: statusNames[record.matchStatus] || record.matchStatus,
      matchAsset: record.asset ? {
        id: record.asset.id.toString(),
        assetNo: record.asset.assetNo,
        name: record.asset.name,
      } : null,
      discrepancyNote: record.discrepancyNote,
      scannedBy: record.scannedByUser ? {
        id: record.scannedByUser.id.toString(),
        name: record.scannedByUser.name,
      } : null,
      scannedAt: record.scannedAt,
      gpsLatitude: record.gpsLatitude ? parseFloat(record.gpsLatitude) : null,
      gpsLongitude: record.gpsLongitude ? parseFloat(record.gpsLongitude) : null,
      createdAt: record.createdAt,
    };
  }
}

module.exports = new InventoryService();
