const reportService = require('../services/reportService');
const { success, errors } = require('../utils/response');

/**
 * 報表控制器
 */
const reportController = {
  /**
   * Dashboard 統計
   * GET /api/v1/reports/dashboard
   */
  async dashboard(req, res, next) {
    try {
      const stats = await reportService.getDashboardStats();
      return success(res, stats);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 資產統計報表
   * GET /api/v1/reports/assets
   */
  async assetReport(req, res, next) {
    try {
      const { categoryId, departmentId, dateFrom, dateTo } = req.query;
      const report = await reportService.getAssetReport({
        categoryId,
        departmentId,
        dateFrom,
        dateTo,
      });
      return success(res, report);
    } catch (error) {
      next(error);
    }
  },

  /**
   * 匯出盤點報表
   * GET /api/v1/reports/inventory/:planId/export
   */
  async exportInventoryReport(req, res, next) {
    try {
      const { buffer, filename } = await reportService.exportInventoryReport(req.params.planId);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      if (error.message.includes('不存在')) {
        return errors.notFound(res, error.message);
      }
      next(error);
    }
  },

  /**
   * 匯出資產清冊
   * GET /api/v1/reports/assets/export
   */
  async exportAssetList(req, res, next) {
    try {
      const { categoryId, departmentId, locationId, status } = req.query;
      const { buffer, filename } = await reportService.exportAssetList({
        categoryId,
        departmentId,
        locationId,
        status,
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = reportController;
