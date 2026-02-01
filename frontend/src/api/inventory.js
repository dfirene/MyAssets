import api from './index'

export const inventoryApi = {
  // ========== 盤點計畫 ==========
  
  // 查詢盤點計畫列表
  listPlans(params = {}) {
    return api.get('/inventory/plans', { params })
  },

  // 查詢單一盤點計畫
  getPlan(id) {
    return api.get(`/inventory/plans/${id}`)
  },

  // 建立盤點計畫
  createPlan(data) {
    return api.post('/inventory/plans', data)
  },

  // 更新盤點計畫
  updatePlan(id, data) {
    return api.put(`/inventory/plans/${id}`, data)
  },

  // 刪除盤點計畫
  deletePlan(id) {
    return api.delete(`/inventory/plans/${id}`)
  },

  // 開始盤點
  startPlan(id) {
    return api.post(`/inventory/plans/${id}/start`)
  },

  // 完成盤點
  completePlan(id) {
    return api.post(`/inventory/plans/${id}/complete`)
  },

  // 關閉盤點
  closePlan(id) {
    return api.post(`/inventory/plans/${id}/close`)
  },

  // 取得盤點計畫的資產清單
  getPlanAssets(id, params = {}) {
    return api.get(`/inventory/plans/${id}/assets`, { params })
  },

  // 掃描資產
  scanAsset(planId, data) {
    return api.post(`/inventory/plans/${planId}/scan`, data)
  },

  // 查詢盤點記錄
  getRecords(planId, params = {}) {
    return api.get(`/inventory/plans/${planId}/records`, { params })
  },

  // 取得盤點差異報表
  getDiscrepancyReport(planId) {
    return api.get(`/inventory/plans/${planId}/discrepancy-report`)
  },

  // 更新盤點記錄
  updateRecord(recordId, data) {
    return api.put(`/inventory/records/${recordId}`, data)
  },
}

export default inventoryApi
