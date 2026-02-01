const prisma = require('../models/prisma');
const logger = require('../utils/logger');

/**
 * OCR 辨識服務
 * 
 * 標籤格式：
 * ┌─────────────────────────┐
 * │ 資編：040400275         │
 * │ 類別：資訊-可攜式電腦    │
 * │ 名稱：ASUS筆記型電腦     │
 * │ 取得年月：2023/9        │
 * └─────────────────────────┘
 */
class OcrService {
  // 辨識規則
  patterns = {
    assetNo: /資編[：:]\s*(\d{6,12})/,
    category: /類別[：:]\s*(.+?(?:-.+)?)\s*$/m,
    name: /名稱[：:]\s*(.+?)\s*$/m,
    acquireDate: /取得年月[：:]\s*(\d{4}\/\d{1,2})/,
  };

  /**
   * 解析 OCR 文字
   */
  parseOcrText(text) {
    const result = {
      assetNo: null,
      category: null,
      name: null,
      acquireDate: null,
      raw: text,
    };

    if (!text) return result;

    // 提取資產編號
    const assetNoMatch = text.match(this.patterns.assetNo);
    if (assetNoMatch) {
      result.assetNo = assetNoMatch[1];
    }

    // 提取類別
    const categoryMatch = text.match(this.patterns.category);
    if (categoryMatch) {
      result.category = categoryMatch[1].trim();
    }

    // 提取名稱
    const nameMatch = text.match(this.patterns.name);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
    }

    // 提取取得年月
    const dateMatch = text.match(this.patterns.acquireDate);
    if (dateMatch) {
      result.acquireDate = dateMatch[1];
    }

    return result;
  }

  /**
   * 處理 OCR 辨識並建立盤點紀錄
   * 
   * @param {Object} data - 辨識資料
   * @param {string} data.planId - 盤點計畫 ID
   * @param {string} data.ocrText - OCR 辨識文字（前端已辨識）
   * @param {string} data.imagePath - 影像路徑
   * @param {number} data.latitude - GPS 緯度
   * @param {number} data.longitude - GPS 經度
   * @param {string} userId - 操作者 ID
   */
  async processOcr(data, userId) {
    // 解析 OCR 文字
    const parsed = this.parseOcrText(data.ocrText);

    logger.info('OCR 解析結果:', parsed);

    // 如果沒有解析到資產編號，嘗試用提供的 assetNo
    const assetNo = parsed.assetNo || data.assetNo;

    if (!assetNo) {
      // 建立盤盈紀錄（找不到資產編號）
      const record = await this.createRecord({
        planId: data.planId,
        assetNo: 'UNKNOWN-' + Date.now(),
        ocrRawText: parsed.raw,
        ocrCategory: parsed.category,
        ocrName: parsed.name,
        ocrDate: parsed.acquireDate,
        imagePath: data.imagePath,
        matchStatus: 'unmatched',
        discrepancyNote: '無法辨識資產編號',
        scannedBy: userId,
        gpsLatitude: data.latitude,
        gpsLongitude: data.longitude,
      });

      return {
        success: true,
        matchStatus: 'unmatched',
        message: '無法辨識資產編號',
        record,
        parsed,
      };
    }

    // 查詢資產
    const asset = await prisma.asset.findUnique({
      where: { assetNo },
      include: {
        category: { include: { parent: true } },
      },
    });

    if (!asset) {
      // 盤盈：系統中沒有這筆資產
      const record = await this.createRecord({
        planId: data.planId,
        assetNo,
        ocrRawText: parsed.raw,
        ocrCategory: parsed.category,
        ocrName: parsed.name,
        ocrDate: parsed.acquireDate,
        imagePath: data.imagePath,
        matchStatus: 'unmatched',
        discrepancyNote: '系統中查無此資產',
        scannedBy: userId,
        gpsLatitude: data.latitude,
        gpsLongitude: data.longitude,
      });

      return {
        success: true,
        matchStatus: 'unmatched',
        message: `資產編號 ${assetNo} 在系統中不存在（盤盈）`,
        record,
        parsed,
      };
    }

    // 比對資訊
    const discrepancies = [];

    // 比對類別
    if (parsed.category) {
      const systemCategory = asset.category.parent
        ? `${asset.category.parent.name}-${asset.category.name}`
        : asset.category.name;
      
      if (!this.fuzzyMatch(parsed.category, systemCategory)) {
        discrepancies.push(`類別不符：標籤[${parsed.category}] vs 系統[${systemCategory}]`);
      }
    }

    // 比對名稱
    if (parsed.name && !this.fuzzyMatch(parsed.name, asset.name)) {
      discrepancies.push(`名稱不符：標籤[${parsed.name}] vs 系統[${asset.name}]`);
    }

    // 比對取得年月
    if (parsed.acquireDate) {
      const systemDate = asset.acquireDate.toISOString().substring(0, 7).replace('-', '/');
      if (parsed.acquireDate !== systemDate) {
        discrepancies.push(`取得年月不符：標籤[${parsed.acquireDate}] vs 系統[${systemDate}]`);
      }
    }

    // 判斷匹配狀態
    const matchStatus = discrepancies.length > 0 ? 'discrepancy' : 'matched';

    // 建立盤點紀錄
    const record = await this.createRecord({
      planId: data.planId,
      assetNo,
      ocrRawText: parsed.raw,
      ocrCategory: parsed.category,
      ocrName: parsed.name,
      ocrDate: parsed.acquireDate,
      imagePath: data.imagePath,
      matchStatus,
      matchAssetId: asset.id,
      discrepancyNote: discrepancies.length > 0 ? discrepancies.join('；') : null,
      scannedBy: userId,
      gpsLatitude: data.latitude,
      gpsLongitude: data.longitude,
    });

    return {
      success: true,
      matchStatus,
      message: matchStatus === 'matched' 
        ? `資產 ${assetNo} 盤點成功` 
        : `資產 ${assetNo} 存在差異`,
      record,
      parsed,
      asset: {
        id: asset.id.toString(),
        assetNo: asset.assetNo,
        name: asset.name,
        category: asset.category.parent
          ? `${asset.category.parent.name}-${asset.category.name}`
          : asset.category.name,
      },
      discrepancies,
    };
  }

  /**
   * 手動盤點
   */
  async manualScan(data, userId) {
    const asset = await prisma.asset.findUnique({
      where: { assetNo: data.assetNo },
    });

    if (!asset) {
      throw new Error(`資產編號 ${data.assetNo} 不存在`);
    }

    // 檢查是否已盤點
    const existing = await prisma.inventoryRecord.findFirst({
      where: {
        planId: BigInt(data.planId),
        matchAssetId: asset.id,
        matchStatus: 'matched',
      },
    });

    if (existing) {
      throw new Error(`資產 ${data.assetNo} 已盤點過`);
    }

    const record = await this.createRecord({
      planId: data.planId,
      assetNo: data.assetNo,
      matchStatus: 'matched',
      matchAssetId: asset.id,
      discrepancyNote: data.note,
      scannedBy: userId,
      gpsLatitude: data.latitude,
      gpsLongitude: data.longitude,
    });

    return {
      success: true,
      matchStatus: 'matched',
      message: `資產 ${data.assetNo} 盤點成功`,
      record,
    };
  }

  /**
   * 建立盤點紀錄
   */
  async createRecord(data) {
    const record = await prisma.inventoryRecord.create({
      data: {
        planId: BigInt(data.planId),
        assetNo: data.assetNo,
        ocrRawText: data.ocrRawText,
        ocrCategory: data.ocrCategory,
        ocrName: data.ocrName,
        ocrDate: data.ocrDate,
        imagePath: data.imagePath,
        matchStatus: data.matchStatus,
        matchAssetId: data.matchAssetId ? BigInt(data.matchAssetId) : null,
        discrepancyNote: data.discrepancyNote,
        scannedBy: BigInt(data.scannedBy),
        scannedAt: new Date(),
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
      },
    });

    return {
      id: record.id.toString(),
      assetNo: record.assetNo,
      matchStatus: record.matchStatus,
      scannedAt: record.scannedAt,
    };
  }

  /**
   * 模糊比對
   */
  fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return false;
    
    // 移除空白和特殊字元後比對
    const normalize = (s) => s.replace(/[\s\-_]/g, '').toLowerCase();
    const n1 = normalize(str1);
    const n2 = normalize(str2);
    
    // 完全匹配或包含關係
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }
}

module.exports = new OcrService();
