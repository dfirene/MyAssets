import api from './index'

export const inventoryApi = {
  // 盤點計畫
  listPlans(params = {}) {
    return api.get('/inventory/plans', { params })
  },

  getPlan(id) {
    return api.get(`/inventory/plans/${id}`)
  },

  createPlan(data) {
    return api.post('/inventory/plans', data)
  },

  updatePlan(id, data) {
    return api.put(`/inventory/plans/${id}`, data)
  },

  deletePlan(id) {
    return api.delete(`/inventory/plans/${id}`)
  },

  startPlan(id) {
    return api.post(`/inventory/plans/${id}/start`)
  },

  completePlan(id) {
    return api.post(`/inventory/plans/${id}/complete`)
  },

  closePlan(id) {
    return api.post(`/inventory/plans/${id}/close`)
  },

  getProgress(id) {
    return api.get(`/inventory/plans/${id}/progress`)
  },

  getPendingAssets(id, params = {}) {
    return api.get(`/inventory/plans/${id}/pending-assets`, { params })
  },

  getRecords(id, params = {}) {
    return api.get(`/inventory/plans/${id}/records`, { params })
  },

  // 盤點執行
  ocrScan(data) {
    return api.post('/inventory/ocr', data)
  },

  manualScan(data) {
    return api.post('/inventory/manual-scan', data)
  },
}

export default inventoryApi
