import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)
  
  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name || '')
  const userRoles = computed(() => user.value?.roles || [])
  
  // Actions
  async function login(account, password) {
    try {
      const response = await api.post('/auth/login', { account, password })
      const { data } = response.data
      
      token.value = data.token
      refreshToken.value = data.refreshToken
      user.value = data.user
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error?.message || '登入失敗'
      }
    }
  }
  
  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // 即使 API 失敗也要清除本地狀態
    }
    
    token.value = null
    refreshToken.value = null
    user.value = null
    
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    
    router.push({ name: 'Login' })
  }
  
  async function fetchUser() {
    if (!token.value) return
    
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.data
    } catch (error) {
      // Token 無效，登出
      await logout()
    }
  }
  
  async function refreshAccessToken() {
    if (!refreshToken.value) {
      await logout()
      return false
    }
    
    try {
      const response = await api.post('/auth/refresh', {
        refreshToken: refreshToken.value,
      })
      const { data } = response.data
      
      token.value = data.token
      refreshToken.value = data.refreshToken
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      
      return true
    } catch (error) {
      await logout()
      return false
    }
  }
  
  // 初始化時載入使用者資訊
  if (token.value) {
    fetchUser()
  }
  
  return {
    user,
    token,
    isAuthenticated,
    userName,
    userRoles,
    login,
    logout,
    fetchUser,
    refreshAccessToken,
  }
})
