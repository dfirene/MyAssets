<script setup>
import { ref, onMounted, computed } from 'vue'
import { reportApi } from '@/api/reports'

const loading = ref(true)
const dashboard = ref(null)

const stats = computed(() => {
  if (!dashboard.value) {
    return [
      { name: '資產總數', value: '0', icon: 'assets', color: 'bg-blue-500' },
      { name: '使用中', value: '0', icon: 'in_use', color: 'bg-green-500' },
      { name: '閒置', value: '0', icon: 'idle', color: 'bg-yellow-500' },
      { name: '維修中', value: '0', icon: 'repair', color: 'bg-orange-500' },
    ]
  }

  const s = dashboard.value.summary
  return [
    { name: '資產總數', value: s.activeAssets.toLocaleString(), icon: 'assets', color: 'bg-blue-500' },
    { name: '使用中', value: s.inUse.toLocaleString(), icon: 'in_use', color: 'bg-green-500' },
    { name: '閒置', value: s.idle.toLocaleString(), icon: 'idle', color: 'bg-yellow-500' },
    { name: '維修中', value: s.repair.toLocaleString(), icon: 'repair', color: 'bg-orange-500' },
  ]
})

const highlights = computed(() => {
  if (!dashboard.value) return []
  const s = dashboard.value.summary
  return [
    { label: '總資產價值', value: `NT$ ${s.totalValue.toLocaleString()}`, color: 'text-primary-600' },
    { label: '本月新增', value: s.newThisMonth, color: 'text-green-600' },
    { label: '即將過保（30天內）', value: s.expiringWarranty, color: s.expiringWarranty > 0 ? 'text-red-600' : 'text-gray-600' },
  ]
})

const movementTypeLabels = {
  transfer: '調撥',
  borrow: '借用',
  return: '歸還',
  repair: '送修',
  repair_done: '維修完成',
  scrap: '報廢',
  idle: '閒置',
}

onMounted(async () => {
  await loadDashboard()
})

async function loadDashboard() {
  loading.value = true
  try {
    const res = await reportApi.getDashboard()
    dashboard.value = res.data.data
  } catch (error) {
    console.error('載入 Dashboard 失敗:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
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

    <!-- Highlights -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="h in highlights" :key="h.label" class="card text-center">
        <p :class="['text-2xl font-bold', h.color]">{{ loading ? '...' : h.value }}</p>
        <p class="text-sm text-gray-500">{{ h.label }}</p>
      </div>
    </div>

    <!-- Charts & Info -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 分類統計 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">依分類統計</h2>
        <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>
        <div v-else-if="!dashboard?.assetsByCategory?.length" class="text-center py-8 text-gray-500">
          尚無資料
        </div>
        <div v-else class="space-y-3">
          <div v-for="cat in dashboard.assetsByCategory" :key="cat.categoryId" class="flex items-center">
            <span class="w-28 text-sm text-gray-600 truncate">{{ cat.categoryName }}</span>
            <div class="flex-1 mx-3">
              <div class="bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-primary-600 h-2 rounded-full" 
                  :style="{ width: `${(cat.count / dashboard.summary.activeAssets * 100)}%` }"
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
            to="/settings"
            class="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            <svg class="h-8 w-8 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="mt-2 block text-sm text-gray-700">系統設定</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 底部區塊 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 部門統計 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">依部門統計</h2>
        <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>
        <div v-else-if="!dashboard?.assetsByDepartment?.length" class="text-center py-8 text-gray-500">
          尚無資料
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            v-for="dept in dashboard.assetsByDepartment" 
            :key="dept.departmentId"
            class="text-center p-3 bg-gray-50 rounded-lg"
          >
            <p class="text-xl font-bold text-primary-600">{{ dept.count }}</p>
            <p class="text-xs text-gray-600 truncate">{{ dept.departmentName }}</p>
          </div>
        </div>
      </div>

      <!-- 近期異動 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">近期異動</h2>
        <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>
        <div v-else-if="!dashboard?.recentMovements?.length" class="text-center py-8 text-gray-500">
          尚無異動紀錄
        </div>
        <div v-else class="space-y-3">
          <div 
            v-for="m in dashboard.recentMovements" 
            :key="m.id"
            class="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ m.assetNo }}</p>
              <p class="text-xs text-gray-500">{{ m.assetName }}</p>
            </div>
            <div class="text-right">
              <span class="text-xs px-2 py-1 bg-gray-100 rounded">
                {{ movementTypeLabels[m.movementType] || m.movementType }}
              </span>
              <p class="text-xs text-gray-400 mt-1">{{ formatDateTime(m.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 進行中盤點 -->
    <div v-if="dashboard?.recentInventory" class="card border-l-4 border-l-green-500">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-gray-900">{{ dashboard.recentInventory.name }}</h3>
          <p class="text-sm text-gray-500">
            {{ formatDate(dashboard.recentInventory.startDate) }} ~ {{ formatDate(dashboard.recentInventory.endDate) }}
          </p>
        </div>
        <RouterLink 
          :to="`/inventory/${dashboard.recentInventory.id}`"
          class="btn btn-primary text-sm"
        >
          {{ dashboard.recentInventory.status === 'in_progress' ? '繼續盤點' : '查看結果' }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
