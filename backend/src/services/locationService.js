const prisma = require('../models/prisma');

/**
 * 存放位置服務
 */
class LocationService {
  /**
   * 查詢位置列表（樹狀結構）
   */
  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { status: 'active' };

    const locations = await prisma.location.findMany({
      where,
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return this.buildTree(locations);
  }

  /**
   * 查詢位置列表（扁平）
   */
  async findAllFlat({ level, includeInactive = false } = {}) {
    const where = { ...(includeInactive ? {} : { status: 'active' }) };
    
    if (level) {
      where.level = level;
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        parent: true,
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return locations.map(this.formatLocation);
  }

  /**
   * 查詢單一位置
   */
  async findById(id) {
    const location = await prisma.location.findUnique({
      where: { id: BigInt(id) },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!location) {
      throw new Error('位置不存在');
    }

    return this.formatLocation(location);
  }

  /**
   * 建立位置
   */
  async create(data) {
    // 檢查代碼是否存在
    const existing = await prisma.location.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('位置代碼已存在');
    }

    // 計算層級
    let level = 1;
    if (data.parentId) {
      const parent = await prisma.location.findUnique({
        where: { id: BigInt(data.parentId) },
      });
      if (!parent) {
        throw new Error('上層位置不存在');
      }
      level = parent.level + 1;
      if (level > 3) {
        throw new Error('位置最多三層（廠區/大樓 → 樓層 → 區域）');
      }
    }

    const location = await prisma.location.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? BigInt(data.parentId) : null,
        level,
        sortOrder: data.sortOrder || 0,
        status: data.status || 'active',
      },
      include: {
        parent: true,
      },
    });

    return this.formatLocation(location);
  }

  /**
   * 更新位置
   */
  async update(id, data) {
    const locId = BigInt(id);

    const existing = await prisma.location.findUnique({
      where: { id: locId },
    });

    if (!existing) {
      throw new Error('位置不存在');
    }

    // 檢查代碼是否重複
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.location.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw new Error('位置代碼已存在');
      }
    }

    // 計算層級
    let level = existing.level;
    if (data.parentId !== undefined) {
      if (data.parentId) {
        if (BigInt(data.parentId) === locId) {
          throw new Error('不能將自己設為上層位置');
        }
        const parent = await prisma.location.findUnique({
          where: { id: BigInt(data.parentId) },
        });
        if (!parent) {
          throw new Error('上層位置不存在');
        }
        level = parent.level + 1;
        if (level > 3) {
          throw new Error('位置最多三層');
        }
      } else {
        level = 1;
      }
    }

    const location = await prisma.location.update({
      where: { id: locId },
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? BigInt(data.parentId) : null,
        level,
        sortOrder: data.sortOrder,
        status: data.status,
      },
      include: {
        parent: true,
      },
    });

    return this.formatLocation(location);
  }

  /**
   * 刪除位置（停用）
   */
  async delete(id) {
    const locId = BigInt(id);

    // 檢查是否有子位置
    const children = await prisma.location.count({
      where: { parentId: locId, status: 'active' },
    });

    if (children > 0) {
      throw new Error('此位置有子位置，無法刪除');
    }

    // 檢查是否有資產使用此位置
    const assets = await prisma.asset.count({
      where: { locationId: locId },
    });

    if (assets > 0) {
      throw new Error('此位置有資產使用，無法刪除');
    }

    await prisma.location.update({
      where: { id: locId },
      data: { status: 'inactive' },
    });
  }

  /**
   * 建立樹狀結構
   */
  buildTree(locations) {
    const map = new Map();
    const roots = [];

    locations.forEach((loc) => {
      map.set(loc.id.toString(), {
        ...this.formatLocation(loc),
        children: [],
      });
    });

    locations.forEach((loc) => {
      const node = map.get(loc.id.toString());
      if (loc.parentId) {
        const parent = map.get(loc.parentId.toString());
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * 格式化位置資料
   */
  formatLocation(loc) {
    return {
      id: loc.id.toString(),
      code: loc.code,
      name: loc.name,
      parentId: loc.parentId?.toString() || null,
      parent: loc.parent
        ? {
            id: loc.parent.id.toString(),
            code: loc.parent.code,
            name: loc.parent.name,
          }
        : null,
      level: loc.level,
      levelName: ['', '廠區/大樓', '樓層', '區域'][loc.level] || '',
      sortOrder: loc.sortOrder,
      status: loc.status,
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    };
  }
}

module.exports = new LocationService();
