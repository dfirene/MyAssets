const prisma = require('../models/prisma');

/**
 * 角色服務
 */
class RoleService {
  /**
   * 查詢角色列表
   */
  async findAll() {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map(this.formatRole);
  }

  /**
   * 查詢角色列表（下拉選單用）
   */
  async findAllForSelect() {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id.toString(),
      code: r.code,
      name: r.name,
    }));
  }

  /**
   * 查詢單一角色
   */
  async findById(id) {
    const role = await prisma.role.findUnique({
      where: { id: BigInt(id) },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error('角色不存在');
    }

    return this.formatRole(role);
  }

  /**
   * 建立角色
   */
  async create(data) {
    // 檢查代碼是否存在
    const existing = await prisma.role.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('角色代碼已存在');
    }

    const role = await prisma.role.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        isSystem: false,
        permissions: data.permissionIds?.length
          ? {
              create: data.permissionIds.map((permId) => ({
                permissionId: BigInt(permId),
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return this.formatRole(role);
  }

  /**
   * 更新角色
   */
  async update(id, data) {
    const roleId = BigInt(id);

    const existing = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existing) {
      throw new Error('角色不存在');
    }

    if (existing.isSystem) {
      throw new Error('系統預設角色不可修改');
    }

    // 檢查代碼是否重複
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.role.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw new Error('角色代碼已存在');
      }
    }

    // 更新權限
    if (data.permissionIds) {
      await prisma.rolePermission.deleteMany({
        where: { roleId },
      });

      if (data.permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: data.permissionIds.map((permId) => ({
            roleId,
            permissionId: BigInt(permId),
          })),
        });
      }
    }

    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return this.formatRole(role);
  }

  /**
   * 刪除角色
   */
  async delete(id) {
    const roleId = BigInt(id);

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('角色不存在');
    }

    if (role.isSystem) {
      throw new Error('系統預設角色不可刪除');
    }

    // 檢查是否有使用者使用此角色
    const users = await prisma.userRole.count({
      where: { roleId },
    });

    if (users > 0) {
      throw new Error('此角色有使用者使用，無法刪除');
    }

    // 刪除角色權限
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // 刪除角色
    await prisma.role.delete({
      where: { id: roleId },
    });
  }

  /**
   * 查詢所有權限
   */
  async findAllPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // 按模組分組
    const grouped = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push({
        id: perm.id.toString(),
        module: perm.module,
        action: perm.action,
        name: perm.name,
        description: perm.description,
      });
    });

    return grouped;
  }

  /**
   * 格式化角色資料
   */
  formatRole(role) {
    return {
      id: role.id.toString(),
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count?.users || 0,
      permissions: role.permissions?.map((rp) => ({
        id: rp.permission.id.toString(),
        module: rp.permission.module,
        action: rp.permission.action,
        name: rp.permission.name,
      })) || [],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

module.exports = new RoleService();
