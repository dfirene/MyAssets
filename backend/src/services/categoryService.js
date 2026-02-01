const prisma = require('../models/prisma');

/**
 * 資產分類服務
 */
class CategoryService {
  /**
   * 查詢分類列表（樹狀結構）
   */
  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { status: 'active' };

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return this.buildTree(categories);
  }

  /**
   * 查詢分類列表（扁平）
   */
  async findAllFlat({ level, includeInactive = false } = {}) {
    const where = { ...(includeInactive ? {} : { status: 'active' }) };
    
    if (level) {
      where.level = level;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: true,
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map(this.formatCategory);
  }

  /**
   * 查詢單一分類
   */
  async findById(id) {
    const category = await prisma.category.findUnique({
      where: { id: BigInt(id) },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new Error('分類不存在');
    }

    return this.formatCategory(category);
  }

  /**
   * 建立分類
   */
  async create(data) {
    // 檢查代碼是否存在
    const existing = await prisma.category.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('分類代碼已存在');
    }

    // 如果有上層，檢查上層是否存在
    let level = 1;
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: BigInt(data.parentId) },
      });
      if (!parent) {
        throw new Error('上層分類不存在');
      }
      level = parent.level + 1;
    }

    const category = await prisma.category.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? BigInt(data.parentId) : null,
        level,
        depreciationYears: data.depreciationYears,
        description: data.description,
        sortOrder: data.sortOrder || 0,
        status: data.status || 'active',
      },
      include: {
        parent: true,
      },
    });

    return this.formatCategory(category);
  }

  /**
   * 更新分類
   */
  async update(id, data) {
    const catId = BigInt(id);

    const existing = await prisma.category.findUnique({
      where: { id: catId },
    });

    if (!existing) {
      throw new Error('分類不存在');
    }

    // 檢查代碼是否重複
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.category.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw new Error('分類代碼已存在');
      }
    }

    // 計算層級
    let level = existing.level;
    if (data.parentId !== undefined) {
      if (data.parentId) {
        if (BigInt(data.parentId) === catId) {
          throw new Error('不能將自己設為上層分類');
        }
        const parent = await prisma.category.findUnique({
          where: { id: BigInt(data.parentId) },
        });
        if (!parent) {
          throw new Error('上層分類不存在');
        }
        level = parent.level + 1;
      } else {
        level = 1;
      }
    }

    const category = await prisma.category.update({
      where: { id: catId },
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? BigInt(data.parentId) : null,
        level,
        depreciationYears: data.depreciationYears,
        description: data.description,
        sortOrder: data.sortOrder,
        status: data.status,
      },
      include: {
        parent: true,
      },
    });

    return this.formatCategory(category);
  }

  /**
   * 刪除分類（停用）
   */
  async delete(id) {
    const catId = BigInt(id);

    // 檢查是否有子分類
    const children = await prisma.category.count({
      where: { parentId: catId, status: 'active' },
    });

    if (children > 0) {
      throw new Error('此分類有子分類，無法刪除');
    }

    // 檢查是否有資產使用此分類
    const assets = await prisma.asset.count({
      where: { categoryId: catId },
    });

    if (assets > 0) {
      throw new Error('此分類有資產使用，無法刪除');
    }

    await prisma.category.update({
      where: { id: catId },
      data: { status: 'inactive' },
    });
  }

  /**
   * 建立樹狀結構
   */
  buildTree(categories) {
    const map = new Map();
    const roots = [];

    categories.forEach((cat) => {
      map.set(cat.id.toString(), {
        ...this.formatCategory(cat),
        children: [],
      });
    });

    categories.forEach((cat) => {
      const node = map.get(cat.id.toString());
      if (cat.parentId) {
        const parent = map.get(cat.parentId.toString());
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
   * 格式化分類資料
   */
  formatCategory(cat) {
    return {
      id: cat.id.toString(),
      code: cat.code,
      name: cat.name,
      parentId: cat.parentId?.toString() || null,
      parent: cat.parent
        ? {
            id: cat.parent.id.toString(),
            code: cat.parent.code,
            name: cat.parent.name,
          }
        : null,
      level: cat.level,
      depreciationYears: cat.depreciationYears,
      description: cat.description,
      sortOrder: cat.sortOrder,
      status: cat.status,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    };
  }
}

module.exports = new CategoryService();
