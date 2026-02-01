import api from './index'

export const reportApi = {
  // Dashboard 統計
  getDashboard() {
    return api.get('/reports/dashboard')
  },

  // 資產統計報表
  getAssetReport(params = {}) {
    return api.get('/reports/assets', { params })
  },

  // 匯出資產清冊
  exportAssetList(params = {}) {
    return api.get('/reports/assets/export', {
      params,
      responseType: 'blob',
    })
  },

  // 匯出盤點報表
  exportInventoryReport(planId) {
    return api.get(`/reports/inventory/${planId}/export`, {
      responseType: 'blob',
    })
  },
}

export default reportApi
