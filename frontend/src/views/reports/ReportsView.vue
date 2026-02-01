<script setup>
import { ref, onMounted } from 'vue'
import { reportApi } from '@/api/reports'
import { inventoryApi } from '@/api/inventory'
import { categoryApi, departmentApi } from '@/api/basicData'

// 篩選條件
const filters = ref({
  categoryId: '',
  departmentId: '',
  dateFrom: '',
  dateTo: '',
})

// 報表資料
const assetReport = ref(null)
const loading = ref(false)

// 選項
const categories = ref([])
const departments = ref([])

// 盤點計畫列表（供匯出用）
const inventoryPlans = ref([])

// 當前顯示的報表
const activeReport = ref('asset')

onMounted(async () => {
  await Promise.all([
    loadOptions(),
    loadAssetReport(),
    loadInventoryPlans(),
  ])
})

async function loadOptions() {
  try {
    const [catRes, deptRes] = await Promise.all([
      categoryApi.list({ flat: true }),
      departmentApi.list({ flat: true }),
    ])
    categories.value = catRes.data.data
    departments.value = deptRes.data.data
  } catch (error) {
    console.error('載入選項失敗:', error)
  }
}

async function loadAssetReport() {
  loading.value = true
  try {
    const res = await reportApi.getAssetReport({
      categoryId: filters.value.categoryId || undefined,
      departmentId: filters.value.departmentId || undefined,
      dateFrom: filters.value.dateFrom || undefined,
      dateTo: filters.value.dateTo || undefined,
    })
    assetReport.value = res.data.data
  } catch (error) {
    console.error('載入報表失敗:', error)
  } finally {
    loading.value = false
  }
}

async function loadInventoryPlans() {
  try {
    const res = await inventoryApi.listPlans({ pageSize: 100 })
    inventoryPlans.value = res.data.data.filter(p => p.status !== 'draft')
  } catch (error) {
    console.error('載入盤點計畫失敗:', error)
  }
}

async function exportAssetList() {
  try {
    const res = await reportApi.exportAssetList({
      categoryId: filters.value.categoryId || undefined,
      departmentId: filters.value.departmentId || undefined,
    })
    downloadFile(res.data, `asset_list_${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    alert('匯出失敗：' + (error.response?.data?.error?.message || error.message))
  }
}

async function exportInventoryReport(planId) {
  try {
    const res = await reportApi.exportInventoryReport(planId)
    downloadFile(res.data, `inventory_report_${planId}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    alert('匯出失敗：' + (error.response?.data?.error?.message || error.message))
  }
}

function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function formatNumber(num) {
  return (num || 0).toLocaleString()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

const statusLabels = {
  in_use: '使用中',
  idle: '閒置',
  repair: '維修中',
  pending_scrap: '待報廢',
  scrapped: '已報廢',
  lost: '遺失',
}

const planStatusLabels = {
  in_progress: '進行中',
  completed: '已完成',
  closed: '已結案',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">報表中心</h1>
        <p class="text-gray-600">查詢各類統計報表</p>
      </div>
      <button @click="exportAssetList" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        匯出資產清冊
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          @click="activeReport = 'asset'"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm',
            activeReport === 'asset'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          資產統計
        </button>
        <button
          @click="activeReport = 'inventory'"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm',
            activeReport === 'inventory'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          盤點報表
        </button>
      </nav>
    </div>

    <!-- Asset Report -->
    <div v-if="activeReport === 'asset'" class="space-y-6">
      <!-- Filters -->
      <div class="card">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="label">分類</label>
            <select v-model="filters.categoryId" class="input w-40">
              <option value="">全部</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="label">部門</label>
            <select v-model="filters.departmentId" class="input w-40">
              <option value="">全部</option>
              <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label class="label">取得日期從</label>
            <input v-model="filters.dateFrom" type="date" class="input" />
          </div>
          <div>
            <label class="label">到</label>
            <input v-model="filters.dateTo" type="date" class="input" />
          </div>
          <button @click="loadAssetReport" class="btn btn-primary">查詢</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      </div>

      <template v-else-if="assetReport">
        <!-- Summary -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="card text-center">
            <p class="text-3xl font-bold text-primary-600">{{ formatNumber(assetReport.total) }}</p>
            <p class="text-sm text-gray-500">資產總數</p>
          </div>
          <div class="card text-center">
            <p class="text-3xl font-bold text-green-600">NT$ {{ formatNumber(assetReport.totalValue) }}</p>
            <p class="text-sm text-gray-500">資產總值</p>
          </div>
          <div class="card text-center">
            <p class="text-3xl font-bold text-blue-600">{{ assetReport.byCategory?.length || 0 }}</p>
            <p class="text-sm text-gray-500">分類數</p>
          </div>
          <div class="card text-center">
            <p class="text-3xl font-bold text-purple-600">{{ assetReport.byDepartment?.length || 0 }}</p>
            <p class="text-sm text-gray-500">部門數</p>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- By Category -->
          <div class="card">
            <h3 class="font-semibold text-gray-900 mb-4">依分類統計</h3>
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">分類</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">金額</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="item in assetReport.byCategory" :key="item.name">
                  <td class="px-3 py-2 text-sm">{{ item.name }}</td>
                  <td class="px-3 py-2 text-sm text-right">{{ formatNumber(item.count) }}</td>
                  <td class="px-3 py-2 text-sm text-right">{{ formatNumber(item.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- By Department -->
          <div class="card">
            <h3 class="font-semibold text-gray-900 mb-4">依部門統計</h3>
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">部門</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                  <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">金額</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="item in assetReport.byDepartment" :key="item.name">
                  <td class="px-3 py-2 text-sm">{{ item.name }}</td>
                  <td class="px-3 py-2 text-sm text-right">{{ formatNumber(item.count) }}</td>
                  <td class="px-3 py-2 text-sm text-right">{{ formatNumber(item.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- By Status -->
        <div class="card">
          <h3 class="font-semibold text-gray-900 mb-4">依狀態統計</h3>
          <div class="flex flex-wrap gap-4">
            <div v-for="item in assetReport.byStatus" :key="item.status" class="bg-gray-50 px-4 py-3 rounded-lg">
              <p class="text-xl font-bold text-gray-900">{{ formatNumber(item.count) }}</p>
              <p class="text-sm text-gray-500">{{ statusLabels[item.status] || item.status }}</p>
            </div>
          </div>
        </div>

        <!-- Monthly Trend -->
        <div v-if="assetReport.monthlyTrend?.length" class="card">
          <h3 class="font-semibold text-gray-900 mb-4">月度趨勢（近12個月）</h3>
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">月份</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">新增數量</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">新增金額</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="item in assetReport.monthlyTrend" :key="item.month">
                <td class="px-3 py-2 text-sm">{{ item.month }}</td>
                <td class="px-3 py-2 text-sm text-right">{{ formatNumber(item.count) }}</td>
                <td class="px-3 py-2 text-sm text-right">{{ formatNumber(item.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Inventory Reports -->
    <div v-if="activeReport === 'inventory'" class="card">
      <h3 class="font-semibold text-gray-900 mb-4">盤點報表匯出</h3>
      <p class="text-sm text-gray-500 mb-4">選擇盤點計畫匯出完整報表（包含盤點記錄、差異清單、未盤點資產）</p>
      
      <div v-if="inventoryPlans.length === 0" class="text-center py-8 text-gray-500">
        尚無可匯出的盤點計畫
      </div>
      
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">計畫名稱</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">期間</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">狀態</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">進度</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="plan in inventoryPlans" :key="plan.id">
            <td class="px-4 py-3">{{ plan.name }}</td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ formatDate(plan.startDate) }} ~ {{ formatDate(plan.endDate) }}
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 text-xs rounded-full" :class="{
                'bg-blue-100 text-blue-800': plan.status === 'in_progress',
                'bg-green-100 text-green-800': plan.status === 'completed',
                'bg-gray-100 text-gray-800': plan.status === 'closed',
              }">
                {{ planStatusLabels[plan.status] }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm">
              {{ plan.stats?.matched || 0 }} / {{ plan.stats?.total || 0 }}
            </td>
            <td class="px-4 py-3">
              <button @click="exportInventoryReport(plan.id)" class="text-primary-600 hover:text-primary-900">
                📥 匯出報表
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
