<script setup>
import { ref, onMounted, computed } from 'vue'
import { assetApi } from '@/api/assets'

const loading = ref(true)
const statistics = ref(null)

const stats = computed(() => {
  if (!statistics.value) {
    return [
      { name: '資產總數', value: '0', color: 'bg-blue-500' },
      { name: '使用中', value: '0', color: 'bg-green-500' },
      { name: '閒置', value: '0', color: 'bg-yellow-500' },
      { name: '維修中', value: '0', color: 'bg-orange-500' },
    ]
  }

  const getCount = (status) => {
    const item = statistics.value.byStatus.find(s => s.status === status)
    return item ? item.count : 0
  }

  return [
    { name: '資產總數', value: statistics.value.total.toLocaleString(), color: 'bg-blue-500' },
    { name: '使用中', value: getCount('in_use').toLocaleString(), color: 'bg-green-500' },
    { name: '閒置', value: getCount('idle').toLocaleString(), color: 'bg-yellow-500' },
    { name: '維修中', value: getCount('repair').toLocaleString(), color: 'bg-orange-500' },
  ]
})

const recentActivities = ref([])

onMounted(async () => {
  await loadStatistics()
})

async function loadStatistics() {
  loading.value = true
  try {
    const res = await assetApi.statistics()
    statistics.value = res.data.data
  } catch (error) {
    console.error('載入統計失敗:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Title -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">儀表板</h1>
      <p class="text-gray-600">歡迎使用資訊資產管理系統</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="stat in stats"
        :key="stat.name"
        class="card flex items-center"
      >
        <div :class="[stat.color, 'p-3 rounded-lg']">
          <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm text-gray-500">{{ stat.name }}</p>
          <p class="text-2xl font-semibold text-gray-900">{{ loading ? '...' : stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Charts & Info -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 分類統計 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">依分類統計</h2>
        <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>
        <div v-else-if="!statistics?.byCategory?.length" class="text-center py-8 text-gray-500">
          尚無資料
        </div>
        <div v-else class="space-y-3">
          <div v-for="cat in statistics.byCategory.slice(0, 5)" :key="cat.categoryId" class="flex items-center">
            <span class="w-24 text-sm text-gray-600 truncate">{{ cat.categoryName }}</span>
            <div class="flex-1 mx-3">
              <div class="bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-primary-600 h-2 rounded-full" 
                  :style="{ width: `${(cat.count / statistics.total * 100)}%` }"
                ></div>
              </div>
            </div>
            <span class="text-sm font-medium text-gray-900 w-12 text-right">{{ cat.count }}</span>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div class="grid grid-cols-2 gap-4">
          <RouterLink
            to="/assets"
            class="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg class="h-8 w-8 mx-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span class="mt-2 block text-sm text-gray-700">新增資產</span>
          </RouterLink>
          <RouterLink
            to="/inventory"
            class="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg class="h-8 w-8 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span class="mt-2 block text-sm text-gray-700">開始盤點</span>
          </RouterLink>
          <RouterLink
            to="/reports"
            class="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg class="h-8 w-8 mx-auto text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span class="mt-2 block text-sm text-gray-700">查看報表</span>
          </RouterLink>
          <RouterLink
            to="/assets"
            class="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg class="h-8 w-8 mx-auto text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="mt-2 block text-sm text-gray-700">搜尋資產</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 部門統計 -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">依部門統計</h2>
      <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>
      <div v-else-if="!statistics?.byDepartment?.length" class="text-center py-8 text-gray-500">
        尚無資料
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div 
          v-for="dept in statistics.byDepartment" 
          :key="dept.departmentId"
          class="text-center p-4 bg-gray-50 rounded-lg"
        >
          <p class="text-2xl font-bold text-primary-600">{{ dept.count }}</p>
          <p class="text-sm text-gray-600 truncate">{{ dept.departmentName }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
