const prisma = require('../models/prisma');

/**
 * 供應商服務
 */
class SupplierService {
  /**
   * 查詢供應商列表
   */
  async findAll({ page = 1, pageSize = 20, search, status } = {}) {
    const where = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      data: suppliers.map(this.formatSupplier),
      pagination: { page, pageSize, total },
    };
  }

  /**
   * 查詢所有供應商（下拉選單用）
   */
  async findAllForSelect() {
    const suppliers = await prisma.supplier.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return suppliers.map((s) => ({
      id: s.id.toString(),
      code: s.code,
      name: s.name,
    }));
  }

  /**
   * 查詢單一供應商
   */
  async findById(id) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: BigInt(id) },
    });

    if (!supplier) {
      throw new Error('供應商不存在');
    }

    return this.formatSupplier(supplier);
  }

  /**
   * 建立供應商
   */
  async create(data) {
    // 檢查代碼是否存在
    const existing = await prisma.supplier.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('供應商代碼已存在');
    }

    const supplier = await prisma.supplier.create({
      data: {
        code: data.code,
        name: data.name,
        taxId: data.taxId,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        serviceItems: data.serviceItems,
        status: data.status || 'active',
      },
    });

    return this.formatSupplier(supplier);
  }

  /**
   * 更新供應商
   */
  async update(id, data) {
    const supplierId = BigInt(id);

    const existing = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!existing) {
      throw new Error('供應商不存在');
    }

    // 檢查代碼是否重複
    if (data.code && data.code !== existing.code) {
      const duplicate = await prisma.supplier.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        throw new Error('供應商代碼已存在');
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        code: data.code,
        name: data.name,
        taxId: data.taxId,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        serviceItems: data.serviceItems,
        status: data.status,
      },
    });

    return this.formatSupplier(supplier);
  }

  /**
   * 刪除供應商（停用）
   */
  async delete(id) {
    const supplierId = BigInt(id);

    // 檢查是否有資產使用此供應商
    const assets = await prisma.asset.count({
      where: { supplierId },
    });

    if (assets > 0) {
      throw new Error('此供應商有資產使用，無法刪除');
    }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: { status: 'inactive' },
    });
  }

  /**
   * 格式化供應商資料
   */
  formatSupplier(supplier) {
    return {
      id: supplier.id.toString(),
      code: supplier.code,
      name: supplier.name,
      taxId: supplier.taxId,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      serviceItems: supplier.serviceItems,
      status: supplier.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}

module.exports = new SupplierService();
