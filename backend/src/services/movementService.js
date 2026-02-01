const prisma = require('../models/prisma');

/**
 * 資產異動服務
 */
class MovementService {
  /**
   * 查詢異動紀錄
   */
  async findByAssetId(assetId, { page = 1, pageSize = 20 } = {}) {
    const where = { assetId: BigInt(assetId) };

    const [total, movements] = await Promise.all([
      prisma.assetMovement.count({ where }),
      prisma.assetMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: movements.map(this.formatMovement),
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 建立異動紀錄
   */
  async create(data, userId) {
    const assetId = BigInt(data.assetId);

    // 取得資產目前狀態
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error('資產不存在');
    }

    // 建立異動紀錄
    const movement = await prisma.assetMovement.create({
      data: {
        assetId,
        movementType: data.movementType,
        fromDeptId: asset.departmentId,
        toDeptId: data.toDeptId ? BigInt(data.toDeptId) : null,
        fromLocationId: asset.locationId,
        toLocationId: data.toLocationId ? BigInt(data.toLocationId) : null,
        fromCustodianId: asset.custodianId,
        toCustodianId: data.toCustodianId ? BigInt(data.toCustodianId) : null,
        reason: data.reason,
        remark: data.remark,
        status: 'completed', // 簡化流程，直接完成
        createdBy: BigInt(userId),
        approvedBy: BigInt(userId),
        approvedAt: new Date(),
      },
    });

    // 更新資產狀態
    const assetUpdate = {
      updatedBy: BigInt(userId),
    };

    switch (data.movementType) {
      case 'transfer': // 調撥
        if (data.toDeptId) assetUpdate.departmentId = BigInt(data.toDeptId);
        if (data.toLocationId) assetUpdate.locationId = BigInt(data.toLocationId);
        if (data.toCustodianId) assetUpdate.custodianId = BigInt(data.toCustodianId);
        break;
      case 'borrow': // 借用
        assetUpdate.status = 'in_use';
        if (data.toCustodianId) assetUpdate.custodianId = BigInt(data.toCustodianId);
        break;
      case 'return': // 歸還
        assetUpdate.status = 'in_use';
        break;
      case 'repair': // 送修
        assetUpdate.status = 'repair';
        break;
      case 'repair_done': // 維修完成
        assetUpdate.status = 'in_use';
        break;
      case 'scrap': // 報廢
        assetUpdate.status = 'scrapped';
        break;
      case 'idle': // 閒置
        assetUpdate.status = 'idle';
        break;
    }

    await prisma.asset.update({
      where: { id: assetId },
      data: assetUpdate,
    });

    return this.formatMovement(movement);
  }

  /**
   * 批次調撥
   */
  async batchTransfer(assetIds, data, userId) {
    const results = [];
    
    for (const assetId of assetIds) {
      try {
        const movement = await this.create({
          assetId,
          movementType: 'transfer',
          ...data,
        }, userId);
        results.push({ assetId, success: true, movement });
      } catch (error) {
        results.push({ assetId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 格式化異動紀錄
   */
  formatMovement(movement) {
    const typeNames = {
      transfer: '調撥',
      borrow: '借用',
      return: '歸還',
      repair: '送修',
      repair_done: '維修完成',
      scrap: '報廢',
      idle: '閒置',
    };

    return {
      id: movement.id.toString(),
      assetId: movement.assetId.toString(),
      movementType: movement.movementType,
      movementTypeName: typeNames[movement.movementType] || movement.movementType,
      fromDeptId: movement.fromDeptId?.toString(),
      toDeptId: movement.toDeptId?.toString(),
      fromLocationId: movement.fromLocationId?.toString(),
      toLocationId: movement.toLocationId?.toString(),
      fromCustodianId: movement.fromCustodianId?.toString(),
      toCustodianId: movement.toCustodianId?.toString(),
      reason: movement.reason,
      remark: movement.remark,
      status: movement.status,
      createdBy: movement.createdBy?.toString(),
      createdAt: movement.createdAt,
      approvedBy: movement.approvedBy?.toString(),
      approvedAt: movement.approvedAt,
    };
  }
}

module.exports = new MovementService();
