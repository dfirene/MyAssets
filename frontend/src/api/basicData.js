import api from './index'

// 部門 API
export const departmentApi = {
  list(params = {}) {
    return api.get('/departments', { params })
  },
  get(id) {
    return api.get(`/departments/${id}`)
  },
  create(data) {
    return api.post('/departments', data)
  },
  update(id, data) {
    return api.put(`/departments/${id}`, data)
  },
  delete(id) {
    return api.delete(`/departments/${id}`)
  },
}

// 分類 API
export const categoryApi = {
  list(params = {}) {
    return api.get('/categories', { params })
  },
  get(id) {
    return api.get(`/categories/${id}`)
  },
  create(data) {
    return api.post('/categories', data)
  },
  update(id, data) {
    return api.put(`/categories/${id}`, data)
  },
  delete(id) {
    return api.delete(`/categories/${id}`)
  },
}

// 位置 API
export const locationApi = {
  list(params = {}) {
    return api.get('/locations', { params })
  },
  get(id) {
    return api.get(`/locations/${id}`)
  },
  create(data) {
    return api.post('/locations', data)
  },
  update(id, data) {
    return api.put(`/locations/${id}`, data)
  },
  delete(id) {
    return api.delete(`/locations/${id}`)
  },
}

// 供應商 API
export const supplierApi = {
  list(params = {}) {
    return api.get('/suppliers', { params })
  },
  get(id) {
    return api.get(`/suppliers/${id}`)
  },
  create(data) {
    return api.post('/suppliers', data)
  },
  update(id, data) {
    return api.put(`/suppliers/${id}`, data)
  },
  delete(id) {
    return api.delete(`/suppliers/${id}`)
  },
}

// 角色 API
export const roleApi = {
  list(params = {}) {
    return api.get('/roles', { params })
  },
  get(id) {
    return api.get(`/roles/${id}`)
  },
  create(data) {
    return api.post('/roles', data)
  },
  update(id, data) {
    return api.put(`/roles/${id}`, data)
  },
  delete(id) {
    return api.delete(`/roles/${id}`)
  },
  getPermissions() {
    return api.get('/roles/permissions')
  },
}
