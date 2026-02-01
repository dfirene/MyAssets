const XLSX = require('xlsx');
const prisma = require('../models/prisma');

/**
 * Excel 匯入匯出服務
 */

// 資產狀態對應表
const statusMap = {
  in_use: '使用中',
  idle: '閒置',
  repair: '維修中',
  pending_scrap: '待報廢',
  scrapped: '已報廢',
  lost: '遺失'
};

const statusReverseMap = Object.entries(statusMap).reduce((acc, [k, v]) => {
  acc[v] = k;
  return acc;
}, {});

/**
 * 匯出資產清單到 Excel
 */
async function exportAssets(filters = {}) {
  // 構建查詢條件
  const where = { status: { not: 'scrapped' } };
  
  if (filters.categoryId) {
    where.categoryId = BigInt(filters.categoryId);
  }
  if (filters.departmentId) {
    where.departmentId = BigInt(filters.departmentId);
  }
  if (filters.locationId) {
    where.locationId = BigInt(filters.locationId);
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.keyword) {
    where.OR = [
      { assetNumber: { contains: filters.keyword, mode: 'insensitive' } },
      { name: { contains: filters.keyword, mode: 'insensitive' } },
      { serialNumber: { contains: filters.keyword, mode: 'insensitive' } }
    ];
  }

  const assets = await prisma.asset.findMany({
    where,
    include: {
      category: true,
      department: true,
      location: true,
      supplier: true,
      user: true
    },
    orderBy: { assetNumber: 'asc' }
  });

  // 轉換為 Excel 格式
  const data = assets.map(asset => ({
    '資產編號': asset.assetNumber,
    '資產名稱': asset.name,
    '分類': asset.category?.name || '',
    '規格型號': asset.specification || '',
    '序號': asset.serialNumber || '',
    '部門': asset.department?.name || '',
    '存放位置': asset.location?.name || '',
    '使用人': asset.user?.name || '',
    '供應商': asset.supplier?.name || '',
    '購入日期': asset.purchaseDate ? formatDate(asset.purchaseDate) : '',
    '購入金額': asset.purchasePrice ? Number(asset.purchasePrice) : '',
    '保固到期': asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : '',
    '狀態': statusMap[asset.status] || asset.status,
    '備註': asset.note || ''
  }));

  // 創建工作簿
  const ws = XLSX.utils.json_to_sheet(data);
  
  // 設定欄寬
  ws['!cols'] = [
    { wch: 15 }, // 資產編號
    { wch: 25 }, // 資產名稱
    { wch: 15 }, // 分類
    { wch: 20 }, // 規格型號
    { wch: 20 }, // 序號
    { wch: 15 }, // 部門
    { wch: 15 }, // 存放位置
    { wch: 12 }, // 使用人
    { wch: 15 }, // 供應商
    { wch: 12 }, // 購入日期
    { wch: 12 }, // 購入金額
    { wch: 12 }, // 保固到期
    { wch: 10 }, // 狀態
    { wch: 30 }  // 備註
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '資產清單');

  // 返回 buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 取得匯入範本
 */
function getImportTemplate() {
  const templateData = [
    {
      '資產名稱*': '範例：Dell 筆記型電腦',
      '分類代碼*': '分類的代碼（必填）',
      '規格型號': 'Latitude 5520',
      '序號': 'SN123456789',
      '部門代碼': '部門的代碼',
      '位置代碼': '位置的代碼',
      '使用人工號': '使用人的員工編號',
      '供應商代碼': '供應商的代碼',
      '購入日期': '2026-01-15',
      '購入金額': '35000',
      '保固到期': '2029-01-15',
      '狀態': '使用中/閒置/維修中',
      '備註': ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  
  ws['!cols'] = [
    { wch: 25 }, // 資產名稱
    { wch: 20 }, // 分類代碼
    { wch: 20 }, // 規格型號
    { wch: 20 }, // 序號
    { wch: 15 }, // 部門代碼
    { wch: 15 }, // 位置代碼
    { wch: 15 }, // 使用人工號
    { wch: 15 }, // 供應商代碼
    { wch: 12 }, // 購入日期
    { wch: 12 }, // 購入金額
    { wch: 12 }, // 保固到期
    { wch: 15 }, // 狀態
    { wch: 30 }  // 備註
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '匯入範本');

  // 新增說明頁
  const instructionData = [
    { '欄位說明': '欄位名稱', '必填': '是否必填', '說明': '欄位說明' },
    { '欄位說明': '資產名稱*', '必填': '是', '說明': '資產的名稱' },
    { '欄位說明': '分類代碼*', '必填': '是', '說明': '資產分類的代碼，可從系統設定查詢' },
    { '欄位說明': '規格型號', '必填': '否', '說明': '產品的規格或型號' },
    { '欄位說明': '序號', '必填': '否', '說明': '產品序號或 S/N' },
    { '欄位說明': '部門代碼', '必填': '否', '說明': '所屬部門的代碼' },
    { '欄位說明': '位置代碼', '必填': '否', '說明': '存放位置的代碼' },
    { '欄位說明': '使用人工號', '必填': '否', '說明': '使用人的員工編號' },
    { '欄位說明': '供應商代碼', '必填': '否', '說明': '供應商的代碼' },
    { '欄位說明': '購入日期', '必填': '否', '說明': '格式：YYYY-MM-DD' },
    { '欄位說明': '購入金額', '必填': '否', '說明': '數字，不含千分位' },
    { '欄位說明': '保固到期', '必填': '否', '說明': '格式：YYYY-MM-DD' },
    { '欄位說明': '狀態', '必填': '否', '說明': '使用中/閒置/維修中，預設為「閒置」' },
    { '欄位說明': '備註', '必填': '否', '說明': '其他備註說明' }
  ];
  
  const wsInstruction = XLSX.utils.json_to_sheet(instructionData, { skipHeader: true });
  wsInstruction['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstruction, '欄位說明');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 匯入資產
 */
async function importAssets(buffer, userId) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  if (rows.length === 0) {
    throw new Error('Excel 檔案沒有資料');
  }

  // 預先載入參照資料
  const [categories, departments, locations, suppliers, users] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.department.findMany({ where: { isActive: true } }),
    prisma.location.findMany({ where: { isActive: true } }),
    prisma.supplier.findMany({ where: { isActive: true } }),
    prisma.user.findMany({ where: { isActive: true } })
  ]);

  // 建立查詢 map
  const categoryMap = new Map(categories.map(c => [c.code, c]));
  const departmentMap = new Map(departments.map(d => [d.code, d]));
  const locationMap = new Map(locations.map(l => [l.code, l]));
  const supplierMap = new Map(suppliers.map(s => [s.code, s]));
  const userMap = new Map(users.map(u => [u.employeeId, u]));

  const results = {
    total: rows.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // 取得當前年月，用於生成資產編號
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // 取得當月最大序號
  const lastAsset = await prisma.asset.findFirst({
    where: {
      assetNumber: { startsWith: `A${yearMonth}` }
    },
    orderBy: { assetNumber: 'desc' }
  });
  
  let seq = lastAsset ? parseInt(lastAsset.assetNumber.slice(-4)) : 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel 行號（含表頭）

    try {
      // 驗證必填欄位
      const name = row['資產名稱*'] || row['資產名稱'];
      const categoryCode = row['分類代碼*'] || row['分類代碼'];

      if (!name) {
        throw new Error('資產名稱為必填');
      }
      if (!categoryCode) {
        throw new Error('分類代碼為必填');
      }

      // 查詢分類
      const category = categoryMap.get(String(categoryCode));
      if (!category) {
        throw new Error(`找不到分類代碼: ${categoryCode}`);
      }

      // 查詢其他關聯資料
      const departmentCode = row['部門代碼'];
      const locationCode = row['位置代碼'];
      const supplierCode = row['供應商代碼'];
      const userEmployeeId = row['使用人工號'];

      const department = departmentCode ? departmentMap.get(String(departmentCode)) : null;
      const location = locationCode ? locationMap.get(String(locationCode)) : null;
      const supplier = supplierCode ? supplierMap.get(String(supplierCode)) : null;
      const user = userEmployeeId ? userMap.get(String(userEmployeeId)) : null;

      if (departmentCode && !department) {
        throw new Error(`找不到部門代碼: ${departmentCode}`);
      }
      if (locationCode && !location) {
        throw new Error(`找不到位置代碼: ${locationCode}`);
      }
      if (supplierCode && !supplier) {
        throw new Error(`找不到供應商代碼: ${supplierCode}`);
      }
      if (userEmployeeId && !user) {
        throw new Error(`找不到員工編號: ${userEmployeeId}`);
      }

      // 解析狀態
      const statusText = row['狀態'];
      let status = 'idle';
      if (statusText) {
        status = statusReverseMap[statusText] || 'idle';
        if (!['in_use', 'idle', 'repair'].includes(status)) {
          status = 'idle';
        }
      }

      // 解析日期
      const purchaseDate = parseDate(row['購入日期']);
      const warrantyExpiry = parseDate(row['保固到期']);

      // 解析金額
      const purchasePrice = row['購入金額'] ? parseFloat(String(row['購入金額']).replace(/,/g, '')) : null;

      // 生成資產編號
      seq++;
      const assetNumber = `A${yearMonth}${String(seq).padStart(4, '0')}`;

      // 建立資產
      await prisma.asset.create({
        data: {
          assetNumber,
          name: String(name),
          categoryId: category.id,
          specification: row['規格型號'] ? String(row['規格型號']) : null,
          serialNumber: row['序號'] ? String(row['序號']) : null,
          departmentId: department?.id || null,
          locationId: location?.id || null,
          userId: user?.id || null,
          supplierId: supplier?.id || null,
          purchaseDate,
          purchasePrice,
          warrantyExpiry,
          status,
          note: row['備註'] ? String(row['備註']) : null,
          createdBy: userId
        }
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: rowNum,
        message: error.message
      });
    }
  }

  return results;
}

/**
 * 解析日期字串
 */
function parseDate(value) {
  if (!value) return null;
  
  // 如果是 Excel 的數字日期
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  
  // 字串日期
  const str = String(value).trim();
  if (!str) return null;
  
  // 嘗試解析 YYYY-MM-DD 或 YYYY/MM/DD
  const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  // 嘗試其他格式
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  exportAssets,
  getImportTemplate,
  importAssets
};
