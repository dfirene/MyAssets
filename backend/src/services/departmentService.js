const prisma = require('../models/prisma');

/**
 * 部門服務
 */
class DepartmentService {
  /**
   * 查詢部門列表（樹狀結構）
   */
  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { status: 'active' };

    const departments = await prisma.department.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // 建立樹狀結構
    return this.buildTree(departments);
  }

  /**
   * 查詢部門列表（扁平）
   */
  async findAllFlat({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { status: 'active' };

    const departments = await prisma.department.findMany({
      where,
      include: {
        parent: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return departments.map(this.formatDepartment);
  }

  /**
   * 查詢單一部門
   */
  async findById(id) {
    const department = await prisma.department.findUnique({
      where: { id: BigInt(id) },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!department) {
      throw new Error('部門不存在');
    }

    return this.formatDepartment(department);
  }

  /**
   * 建立部門
   */
  async create(data) {
    // 檢查代碼是否存在
    const existing = await prisma.department.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('部門代碼已存在');
    }

    const department = await prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? BigInt(data.parentId) : null,
        managerId: data.managerId ? BigInt(data.managerId) : null,
        sortOrder: data.sortOrder || 0,
        status: data.status || 'active',
      },
      include: {
        parent: true,
      },
    });

    return this.formatDepartment(department);
  }

  /**
   * 更新部門
   */
  async update(id, data) {
    const deptId = BigInt(id);

    const existing = await prisma.department.findUnique({
      where: { id: deptId },
    });

    if (!existing) {
      throw new Error('部門不存在');
    }

    // 檢查代碼是否重複
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.department.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw new Error('部門代碼已存在');
      }
    }

    // 防止設定自己為上層
    if (data.parentId && BigInt(data.parentId) === deptId) {
      throw new Error('不能將自己設為上層部門');
    }

    const department = await prisma.department.update({
      where: { id: deptId },
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? BigInt(data.parentId) : null,
        managerId: data.managerId ? BigInt(data.managerId) : null,
        sortOrder: data.sortOrder,
        status: data.status,
      },
      include: {
        parent: true,
      },
    });

    return this.formatDepartment(department);
  }

  /**
   * 刪除部門（停用）
   */
  async delete(id) {
    const deptId = BigInt(id);

    // 檢查是否有子部門
    const children = await prisma.department.count({
      where: { parentId: deptId, status: 'active' },
    });

    if (children > 0) {
      throw new Error('此部門有子部門，無法刪除');
    }

    // 檢查是否有使用者
    const users = await prisma.user.count({
      where: { departmentId: deptId, status: 'active' },
    });

    if (users > 0) {
      throw new Error('此部門有使用者，無法刪除');
    }

    await prisma.department.update({
      where: { id: deptId },
      data: { status: 'inactive' },
    });
  }

  /**
   * 建立樹狀結構
   */
  buildTree(departments) {
    const map = new Map();
    const roots = [];

    // 建立 map
    departments.forEach((dept) => {
      map.set(dept.id.toString(), {
        ...this.formatDepartment(dept),
        children: [],
      });
    });

    // 建立樹
    departments.forEach((dept) => {
      const node = map.get(dept.id.toString());
      if (dept.parentId) {
        const parent = map.get(dept.parentId.toString());
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
   * 格式化部門資料
   */
  formatDepartment(dept) {
    return {
      id: dept.id.toString(),
      code: dept.code,
      name: dept.name,
      parentId: dept.parentId?.toString() || null,
      parent: dept.parent
        ? {
            id: dept.parent.id.toString(),
            code: dept.parent.code,
            name: dept.parent.name,
          }
        : null,
      managerId: dept.managerId?.toString() || null,
      sortOrder: dept.sortOrder,
      status: dept.status,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    };
  }
}

module.exports = new DepartmentService();
