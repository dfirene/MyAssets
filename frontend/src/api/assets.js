import api from './index'

export const assetApi = {
  // 查詢資產列表
  list(params = {}) {
    return api.get('/assets', { params })
  },

  // 查詢單一資產
  get(id) {
    return api.get(`/assets/${id}`)
  },

  // 根據資產編號查詢
  getByAssetNo(assetNo) {
    return api.get(`/assets/by-no/${assetNo}`)
  },

  // 建立資產
  create(data) {
    return api.post('/assets', data)
  },

  // 更新資產
  update(id, data) {
    return api.put(`/assets/${id}`, data)
  },

  // 刪除資產
  delete(id) {
    return api.delete(`/assets/${id}`)
  },

  // 資產統計
  statistics() {
    return api.get('/assets/statistics')
  },

  // 查詢異動紀錄
  getMovements(id, params = {}) {
    return api.get(`/assets/${id}/movements`, { params })
  },

  // 建立異動
  createMovement(id, data) {
    return api.post(`/assets/${id}/movements`, data)
  },

  // 批次調撥
  batchTransfer(data) {
    return api.post('/assets/batch-transfer', data)
  },
}

export default assetApi
