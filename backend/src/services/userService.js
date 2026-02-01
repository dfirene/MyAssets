const bcrypt = require('bcryptjs');
const config = require('../config');
const prisma = require('../models/prisma');

/**
 * 使用者服務
 */
class UserService {
  /**
   * 查詢使用者列表
   */
  async findAll({ page = 1, pageSize = 20, search, departmentId, status }) {
    const where = {};

    if (search) {
      where.OR = [
        { account: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      where.departmentId = BigInt(departmentId);
    }

    if (status) {
      where.status = status;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          department: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: users.map(this.formatUser),
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 查詢單一使用者
   */
  async findById(id) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('使用者不存在');
    }

    return this.formatUser(user);
  }

  /**
   * 建立使用者
   */
  async create(data) {
    // 檢查帳號是否存在
    const existing = await prisma.user.findUnique({
      where: { account: data.account },
    });

    if (existing) {
      throw new Error('帳號已存在');
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(
      data.password || 'Password@123',
      config.password.saltRounds
    );

    const user = await prisma.user.create({
      data: {
        account: data.account,
        password: hashedPassword,
        name: data.name,
        email: data.email,
        departmentId: data.departmentId ? BigInt(data.departmentId) : null,
        status: data.status || 'active',
        roles: data.roleIds?.length
          ? {
              create: data.roleIds.map((roleId) => ({
                roleId: BigInt(roleId),
              })),
            }
          : undefined,
      },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.formatUser(user);
  }

  /**
   * 更新使用者
   */
  async update(id, data) {
    const userId = BigInt(id);

    // 檢查使用者是否存在
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new Error('使用者不存在');
    }

    // 如果要更新帳號，檢查是否重複
    if (data.account && data.account !== existing.account) {
      const duplicate = await prisma.user.findUnique({
        where: { account: data.account },
      });
      if (duplicate) {
        throw new Error('帳號已存在');
      }
    }

    // 更新角色（如果有提供）
    if (data.roleIds) {
      // 刪除舊角色
      await prisma.userRole.deleteMany({
        where: { userId },
      });
      // 新增新角色
      if (data.roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: data.roleIds.map((roleId) => ({
            userId,
            roleId: BigInt(roleId),
          })),
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        account: data.account,
        name: data.name,
        email: data.email,
        departmentId: data.departmentId ? BigInt(data.departmentId) : null,
        status: data.status,
      },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.formatUser(user);
  }

  /**
   * 刪除使用者（停用）
   */
  async delete(id) {
    const userId = BigInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('使用者不存在');
    }

    // 軟刪除：改為停用
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'inactive' },
    });
  }

  /**
   * 重設密碼
   */
  async resetPassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, config.password.saltRounds);

    await prisma.user.update({
      where: { id: BigInt(id) },
      data: { password: hashedPassword },
    });
  }

  /**
   * 格式化使用者資料
   */
  formatUser(user) {
    return {
      id: user.id.toString(),
      account: user.account,
      name: user.name,
      email: user.email,
      department: user.department
        ? {
            id: user.department.id.toString(),
            code: user.department.code,
            name: user.department.name,
          }
        : null,
      roles: user.roles?.map((ur) => ({
        id: ur.role.id.toString(),
        code: ur.role.code,
        name: ur.role.name,
      })) || [],
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

module.exports = new UserService();
