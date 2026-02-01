import api from './index'

export const userApi = {
  // 查詢使用者列表
  list(params = {}) {
    return api.get('/users', { params })
  },

  // 查詢單一使用者
  get(id) {
    return api.get(`/users/${id}`)
  },

  // 建立使用者
  create(data) {
    return api.post('/users', data)
  },

  // 更新使用者
  update(id, data) {
    return api.put(`/users/${id}`, data)
  },

  // 刪除使用者
  delete(id) {
    return api.delete(`/users/${id}`)
  },

  // 重設密碼
  resetPassword(id, password) {
    return api.post(`/users/${id}/reset-password`, { password })
  },
}

export default userApi
