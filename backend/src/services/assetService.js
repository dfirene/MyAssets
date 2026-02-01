const prisma = require('../models/prisma');

/**
 * 資產服務
 */
class AssetService {
  /**
   * 查詢資產列表
   */
  async findAll({
    page = 1,
    pageSize = 20,
    search,
    categoryId,
    departmentId,
    locationId,
    status,
    custodianId,
    acquireDateFrom,
    acquireDateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const where = {};

    // 搜尋條件
    if (search) {
      where.OR = [
        { assetNo: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { specModel: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = BigInt(categoryId);
    }

    if (departmentId) {
      where.departmentId = BigInt(departmentId);
    }

    if (locationId) {
      where.locationId = BigInt(locationId);
    }

    if (status) {
      where.status = status;
    }

    if (custodianId) {
      where.custodianId = BigInt(custodianId);
    }

    if (acquireDateFrom || acquireDateTo) {
      where.acquireDate = {};
      if (acquireDateFrom) {
        where.acquireDate.gte = new Date(acquireDateFrom);
      }
      if (acquireDateTo) {
        where.acquireDate.lte = new Date(acquireDateTo);
      }
    }

    // 排序
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        include: {
          category: true,
          department: true,
          custodian: {
            select: { id: true, name: true, account: true },
          },
          location: true,
          supplier: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
    ]);

    return {
      data: assets.map(this.formatAsset),
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 查詢單一資產
   */
  async findById(id) {
    const asset = await prisma.asset.findUnique({
      where: { id: BigInt(id) },
      include: {
        category: {
          include: { parent: true },
        },
        department: true,
        custodian: {
          select: { id: true, name: true, account: true, email: true },
        },
        location: {
          include: { parent: { include: { parent: true } } },
        },
        supplier: true,
        attachments: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        createdByUser: {
          select: { id: true, name: true },
        },
        updatedByUser: {
          select: { id: true, name: true },
        },
      },
    });

    if (!asset) {
      throw new Error('資產不存在');
    }

    return this.formatAssetDetail(asset);
  }

  /**
   * 根據資產編號查詢
   */
  async findByAssetNo(assetNo) {
    const asset = await prisma.asset.findUnique({
      where: { assetNo },
      include: {
        category: true,
        department: true,
        custodian: {
          select: { id: true, name: true },
        },
        location: true,
      },
    });

    if (!asset) {
      return null;
    }

    return this.formatAsset(asset);
  }

  /**
   * 建立資產
   */
  async create(data, userId) {
    // 檢查資產編號是否存在
    if (data.assetNo) {
      const existing = await prisma.asset.findUnique({
        where: { assetNo: data.assetNo },
      });
      if (existing) {
        throw new Error('資產編號已存在');
      }
    }

    // 自動產生資產編號（如果沒有提供）
    let assetNo = data.assetNo;
    if (!assetNo) {
      assetNo = await this.generateAssetNo();
    }

    const asset = await prisma.asset.create({
      data: {
        assetNo,
        categoryId: BigInt(data.categoryId),
        name: data.name,
        specModel: data.specModel,
        serialNo: data.serialNo,
        acquireDate: new Date(data.acquireDate),
        acquireAmount: data.acquireAmount ? parseFloat(data.acquireAmount) : null,
        supplierId: data.supplierId ? BigInt(data.supplierId) : null,
        purchaseNo: data.purchaseNo,
        departmentId: BigInt(data.departmentId),
        custodianId: BigInt(data.custodianId),
        locationId: data.locationId ? BigInt(data.locationId) : null,
        status: data.status || 'in_use',
        warrantyDate: data.warrantyDate ? new Date(data.warrantyDate) : null,
        remark: data.remark,
        createdBy: BigInt(userId),
        updatedBy: BigInt(userId),
      },
      include: {
        category: true,
        department: true,
        custodian: {
          select: { id: true, name: true },
        },
        location: true,
      },
    });

    return this.formatAsset(asset);
  }

  /**
   * 更新資產
   */
  async update(id, data, userId) {
    const assetId = BigInt(id);

    const existing = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!existing) {
      throw new Error('資產不存在');
    }

    // 如果更改資產編號，檢查是否重複
    if (data.assetNo && data.assetNo !== existing.assetNo) {
      const duplicate = await prisma.asset.findUnique({
        where: { assetNo: data.assetNo },
      });
      if (duplicate) {
        throw new Error('資產編號已存在');
      }
    }

    const updateData = {
      updatedBy: BigInt(userId),
    };

    // 只更新有提供的欄位
    if (data.assetNo !== undefined) updateData.assetNo = data.assetNo;
    if (data.categoryId !== undefined) updateData.categoryId = BigInt(data.categoryId);
    if (data.name !== undefined) updateData.name = data.name;
    if (data.specModel !== undefined) updateData.specModel = data.specModel;
    if (data.serialNo !== undefined) updateData.serialNo = data.serialNo;
    if (data.acquireDate !== undefined) updateData.acquireDate = new Date(data.acquireDate);
    if (data.acquireAmount !== undefined) updateData.acquireAmount = data.acquireAmount ? parseFloat(data.acquireAmount) : null;
    if (data.supplierId !== undefined) updateData.supplierId = data.supplierId ? BigInt(data.supplierId) : null;
    if (data.purchaseNo !== undefined) updateData.purchaseNo = data.purchaseNo;
    if (data.departmentId !== undefined) updateData.departmentId = BigInt(data.departmentId);
    if (data.custodianId !== undefined) updateData.custodianId = BigInt(data.custodianId);
    if (data.locationId !== undefined) updateData.locationId = data.locationId ? BigInt(data.locationId) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.warrantyDate !== undefined) updateData.warrantyDate = data.warrantyDate ? new Date(data.warrantyDate) : null;
    if (data.remark !== undefined) updateData.remark = data.remark;

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        category: true,
        department: true,
        custodian: {
          select: { id: true, name: true },
        },
        location: true,
      },
    });

    return this.formatAsset(asset);
  }

  /**
   * 刪除資產
   */
  async delete(id) {
    const assetId = BigInt(id);

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error('資產不存在');
    }

    // 軟刪除：改為報廢狀態
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'scrapped' },
    });
  }

  /**
   * 產生資產編號
   */
  async generateAssetNo() {
    const today = new Date();
    const prefix = `A${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // 查詢今天最後一筆
    const lastAsset = await prisma.asset.findFirst({
      where: {
        assetNo: { startsWith: prefix },
      },
      orderBy: { assetNo: 'desc' },
    });

    let seq = 1;
    if (lastAsset) {
      const lastSeq = parseInt(lastAsset.assetNo.slice(-4));
      seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * 資產統計
   */
  async getStatistics() {
    const [total, byStatus, byCategory, byDepartment] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.asset.groupBy({
        by: ['categoryId'],
        _count: { categoryId: true },
        _sum: { acquireAmount: true },
      }),
      prisma.asset.groupBy({
        by: ['departmentId'],
        _count: { departmentId: true },
      }),
    ]);

    // 取得分類和部門名稱
    const categoryIds = byCategory.map(c => c.categoryId);
    const departmentIds = byDepartment.map(d => d.departmentId);

    const [categories, departments] = await Promise.all([
      prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      }),
      prisma.department.findMany({
        where: { id: { in: departmentIds } },
        select: { id: true, name: true },
      }),
    ]);

    const categoryMap = new Map(categories.map(c => [c.id.toString(), c.name]));
    const departmentMap = new Map(departments.map(d => [d.id.toString(), d.name]));

    return {
      total,
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count.status,
      })),
      byCategory: byCategory.map(c => ({
        categoryId: c.categoryId.toString(),
        categoryName: categoryMap.get(c.categoryId.toString()) || '未分類',
        count: c._count.categoryId,
        totalAmount: c._sum.acquireAmount || 0,
      })),
      byDepartment: byDepartment.map(d => ({
        departmentId: d.departmentId.toString(),
        departmentName: departmentMap.get(d.departmentId.toString()) || '未指定',
        count: d._count.departmentId,
      })),
    };
  }

  /**
   * 格式化資產資料（列表用）
   */
  formatAsset(asset) {
    return {
      id: asset.id.toString(),
      assetNo: asset.assetNo,
      name: asset.name,
      specModel: asset.specModel,
      serialNo: asset.serialNo,
      category: asset.category ? {
        id: asset.category.id.toString(),
        code: asset.category.code,
        name: asset.category.name,
      } : null,
      department: asset.department ? {
        id: asset.department.id.toString(),
        code: asset.department.code,
        name: asset.department.name,
      } : null,
      custodian: asset.custodian ? {
        id: asset.custodian.id.toString(),
        name: asset.custodian.name,
      } : null,
      location: asset.location ? {
        id: asset.location.id.toString(),
        code: asset.location.code,
        name: asset.location.name,
      } : null,
      supplier: asset.supplier ? {
        id: asset.supplier.id.toString(),
        name: asset.supplier.name,
      } : null,
      acquireDate: asset.acquireDate,
      acquireAmount: asset.acquireAmount ? parseFloat(asset.acquireAmount) : null,
      status: asset.status,
      warrantyDate: asset.warrantyDate,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  /**
   * 格式化資產詳情
   */
  formatAssetDetail(asset) {
    const base = this.formatAsset(asset);
    
    // 建立完整位置路徑
    let locationPath = '';
    if (asset.location) {
      const parts = [asset.location.name];
      if (asset.location.parent) {
        parts.unshift(asset.location.parent.name);
        if (asset.location.parent.parent) {
          parts.unshift(asset.location.parent.parent.name);
        }
      }
      locationPath = parts.join(' > ');
    }

    // 建立完整分類路徑
    let categoryPath = '';
    if (asset.category) {
      if (asset.category.parent) {
        categoryPath = `${asset.category.parent.name} > ${asset.category.name}`;
      } else {
        categoryPath = asset.category.name;
      }
    }

    return {
      ...base,
      purchaseNo: asset.purchaseNo,
      remark: asset.remark,
      categoryPath,
      locationPath,
      custodian: asset.custodian ? {
        id: asset.custodian.id.toString(),
        name: asset.custodian.name,
        account: asset.custodian.account,
        email: asset.custodian.email,
      } : null,
      attachments: asset.attachments?.map(a => ({
        id: a.id.toString(),
        fileName: a.fileName,
        filePath: a.filePath,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        createdAt: a.createdAt,
      })) || [],
      movements: asset.movements?.map(m => ({
        id: m.id.toString(),
        movementType: m.movementType,
        reason: m.reason,
        status: m.status,
        createdAt: m.createdAt,
      })) || [],
      createdBy: asset.createdByUser ? {
        id: asset.createdByUser.id.toString(),
        name: asset.createdByUser.name,
      } : null,
      updatedBy: asset.updatedByUser ? {
        id: asset.updatedByUser.id.toString(),
        name: asset.updatedByUser.name,
      } : null,
      erpSyncTime: asset.erpSyncTime,
    };
  }
}

module.exports = new AssetService();
