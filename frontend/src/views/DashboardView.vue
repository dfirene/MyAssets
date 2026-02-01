<script setup>
import { ref, onMounted } from 'vue'

const stats = ref([
  { name: '資產總數', value: '0', icon: 'assets', color: 'bg-blue-500' },
  { name: '使用中', value: '0', icon: 'active', color: 'bg-green-500' },
  { name: '閒置', value: '0', icon: 'idle', color: 'bg-yellow-500' },
  { name: '待報廢', value: '0', icon: 'scrap', color: 'bg-red-500' },
])

const recentActivities = ref([])

onMounted(() => {
  // TODO: 載入統計資料
})
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
          <p class="text-2xl font-semibold text-gray-900">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions & Recent Activities -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Quick Actions -->
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

      <!-- Recent Activities -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">最近異動</h2>
        <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-500">
          <svg class="h-12 w-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p class="mt-2">暫無異動紀錄</p>
        </div>
        <ul v-else class="divide-y">
          <li v-for="activity in recentActivities" :key="activity.id" class="py-3">
            <div class="flex items-center space-x-3">
              <div class="flex-1">
                <p class="text-sm text-gray-900">{{ activity.description }}</p>
                <p class="text-xs text-gray-500">{{ activity.time }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
