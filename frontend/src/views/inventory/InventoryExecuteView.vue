<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Modal from '@/components/common/Modal.vue'
import { inventoryApi } from '@/api/inventory'

const route = useRoute()
const router = useRouter()
const planId = computed(() => route.params.id)

// 計畫資料
const plan = ref(null)
const loading = ref(true)

// Tab 狀態
const activeTab = ref('scan')

// 掃描相關
const scanInput = ref('')
const scanning = ref(false)
const lastScanResult = ref(null)

// 記錄列表
const records = ref([])
const recordsLoading = ref(false)
const recordsPagination = ref({ page: 1, pageSize: 50, total: 0 })
const recordsFilter = ref('')

// 差異報表
const report = ref(null)
const reportLoading = ref(false)

// 資產清單
const assets = ref([])
const assetsLoading = ref(false)
const assetsSummary = ref(null)
const assetsFilter = ref('')

const statusLabels = {
  draft: '草稿',
  in_progress: '進行中',
  completed: '已完成',
  closed: '已結案',
}

const matchStatusLabels = {
  matched: '相符',
  unmatched: '系統無此資產',
  discrepancy: '差異',
}

onMounted(async () => {
  await loadPlan()
})

async function loadPlan() {
  loading.value = true
  try {
    const res = await inventoryApi.getPlan(planId.value)
    plan.value = res.data.data
    
    // 根據狀態決定預設 Tab
    if (plan.value.status === 'in_progress') {
      activeTab.value = 'scan'
    } else {
      activeTab.value = 'records'
    }
  } catch (error) {
    console.error('載入失敗:', error)
    alert('載入盤點計畫失敗')
    router.push('/inventory')
  } finally {
    loading.value = false
  }
}

async function handleScan() {
  if (!scanInput.value.trim()) return
  
  scanning.value = true
  lastScanResult.value = null
  
  try {
    const res = await inventoryApi.scanAsset(planId.value, {
      assetNo: scanInput.value.trim(),
    })
    lastScanResult.value = res.data.data
    
    // 更新計畫統計
    await loadPlan()
    
    // 清空輸入
    scanInput.value = ''
  } catch (error) {
    alert(error.response?.data?.error?.message || '掃描失敗')
  } finally {
    scanning.value = false
  }
}

async function loadRecords() {
  recordsLoading.value = true
  try {
    const res = await inventoryApi.getRecords(planId.value, {
      page: recordsPagination.value.page,
      pageSize: recordsPagination.value.pageSize,
      matchStatus: recordsFilter.value || undefined,
    })
    records.value = res.data.data
    recordsPagination.value = res.data.pagination
  } catch (error) {
    console.error('載入記錄失敗:', error)
  } finally {
    recordsLoading.value = false
  }
}

async function loadAssets() {
  assetsLoading.value = true
  try {
    const res = await inventoryApi.getPlanAssets(planId.value, {
      status: assetsFilter.value || undefined,
    })
    assets.value = res.data.data
    assetsSummary.value = res.data.summary
  } catch (error) {
    console.error('載入資產失敗:', error)
  } finally {
    assetsLoading.value = false
  }
}

async function loadReport() {
  reportLoading.value = true
  try {
    const res = await inventoryApi.getDiscrepancyReport(planId.value)
    report.value = res.data.data
  } catch (error) {
    console.error('載入報表失敗:', error)
  } finally {
    reportLoading.value = false
  }
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'records' && records.value.length === 0) {
    loadRecords()
  } else if (tab === 'assets' && assets.value.length === 0) {
    loadAssets()
  } else if (tab === 'report' && !report.value) {
    loadReport()
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-TW')
}

function getMatchStatusClass(status) {
  switch (status) {
    case 'matched': return 'bg-green-100 text-green-800'
    case 'unmatched': return 'bg-red-100 text-red-800'
    case 'discrepancy': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

async function completePlan() {
  if (!confirm('確定要完成此盤點計畫嗎？')) return
  
  try {
    await inventoryApi.completePlan(planId.value)
    await loadPlan()
  } catch (error) {
    alert(error.response?.data?.error?.message || '操作失敗')
  }
}

async function closePlan() {
  if (!confirm('確定要結案此盤點計畫嗎？結案後將無法再修改。')) return
  
  try {
    await inventoryApi.closePlan(planId.value)
    await loadPlan()
  } catch (error) {
    alert(error.response?.data?.error?.message || '操作失敗')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-2 text-gray-500">載入中...</p>
    </div>

    <template v-else-if="plan">
      <!-- Header -->
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-3">
            <button @click="router.push('/inventory')" class="text-gray-500 hover:text-gray-700">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">{{ plan.name }}</h1>
            <StatusBadge :status="plan.status" />
          </div>
          <p class="text-gray-600 mt-1">
            {{ formatDate(plan.startDate) }} ~ {{ formatDate(plan.endDate) }}
            <span v-if="plan.description" class="ml-2">| {{ plan.description }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button 
            v-if="plan.status === 'in_progress'"
            @click="completePlan"
            class="btn btn-secondary"
          >
            完成盤點
          </button>
          <button 
            v-if="plan.status === 'completed'"
            @click="closePlan"
            class="btn btn-secondary"
          >
            結案
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="card text-center">
          <p class="text-3xl font-bold text-gray-900">{{ plan.stats?.totalAssets || 0 }}</p>
          <p class="text-sm text-gray-500">應盤點</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-primary-600">{{ plan.stats?.scanned || 0 }}</p>
          <p class="text-sm text-gray-500">已盤點</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-green-600">{{ plan.stats?.matched || 0 }}</p>
          <p class="text-sm text-gray-500">相符</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-yellow-600">{{ plan.stats?.discrepancy || 0 }}</p>
          <p class="text-sm text-gray-500">差異</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-red-600">{{ plan.stats?.unmatched || 0 }}</p>
          <p class="text-sm text-gray-500">未比對</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex space-x-8">
          <button
            v-if="plan.status === 'in_progress'"
            @click="switchTab('scan')"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'scan'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            掃描盤點
          </button>
          <button
            @click="switchTab('records')"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'records'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            盤點記錄
          </button>
          <button
            @click="switchTab('assets')"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'assets'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            資產清單
          </button>
          <button
            @click="switchTab('report')"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'report'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            差異報表
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="card">
        <!-- Scan Tab -->
        <div v-if="activeTab === 'scan'" class="space-y-6">
          <div class="max-w-md mx-auto">
            <label class="label text-center block mb-2">輸入或掃描資產編號</label>
            <div class="flex gap-2">
              <input
                v-model="scanInput"
                type="text"
                class="input flex-1 text-center text-lg"
                placeholder="A2026020001"
                @keyup.enter="handleScan"
                :disabled="scanning"
                autofocus
              />
              <button
                @click="handleScan"
                :disabled="scanning || !scanInput.trim()"
                class="btn btn-primary"
              >
                {{ scanning ? '處理中...' : '確認' }}
              </button>
            </div>
          </div>

          <!-- Last Scan Result -->
          <div v-if="lastScanResult" class="max-w-lg mx-auto">
            <div 
              :class="[
                'p-4 rounded-lg border-2',
                lastScanResult.matchStatus === 'matched' ? 'border-green-500 bg-green-50' :
                lastScanResult.matchStatus === 'discrepancy' ? 'border-yellow-500 bg-yellow-50' :
                'border-red-500 bg-red-50'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium">{{ lastScanResult.assetNo }}</span>
                <span :class="['px-2 py-1 rounded text-sm', getMatchStatusClass(lastScanResult.matchStatus)]">
                  {{ matchStatusLabels[lastScanResult.matchStatus] }}
                </span>
              </div>
              
              <div v-if="lastScanResult.asset" class="text-sm text-gray-600 space-y-1">
                <p><span class="font-medium">名稱：</span>{{ lastScanResult.asset.name }}</p>
                <p><span class="font-medium">分類：</span>{{ lastScanResult.asset.category?.name }}</p>
                <p><span class="font-medium">部門：</span>{{ lastScanResult.asset.department?.name }}</p>
                <p><span class="font-medium">位置：</span>{{ lastScanResult.asset.location?.name || '-' }}</p>
              </div>
              <div v-else class="text-sm text-red-600">
                系統中找不到此資產編號
              </div>
              
              <p v-if="lastScanResult.discrepancyNote" class="mt-2 text-sm text-yellow-700">
                ⚠️ {{ lastScanResult.discrepancyNote }}
              </p>
            </div>
          </div>
        </div>

        <!-- Records Tab -->
        <div v-if="activeTab === 'records'">
          <div class="mb-4 flex gap-4">
            <select v-model="recordsFilter" @change="loadRecords" class="input w-40">
              <option value="">全部狀態</option>
              <option value="matched">相符</option>
              <option value="discrepancy">差異</option>
              <option value="unmatched">未比對</option>
            </select>
          </div>

          <div v-if="recordsLoading" class="text-center py-8">
            <div class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          </div>

          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">資產編號</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">資產名稱</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備註</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盤點時間</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盤點人</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="record in records" :key="record.id">
                <td class="px-4 py-3 whitespace-nowrap font-mono text-sm">{{ record.assetNo }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ record.asset?.name || '-' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span :class="['px-2 py-1 rounded text-xs', getMatchStatusClass(record.matchStatus)]">
                    {{ matchStatusLabels[record.matchStatus] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ record.discrepancyNote || '-' }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ formatDateTime(record.scannedAt) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">{{ record.scannedByUser?.name }}</td>
              </tr>
              <tr v-if="records.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">尚無盤點記錄</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Assets Tab -->
        <div v-if="activeTab === 'assets'">
          <div class="mb-4 flex gap-4 items-center">
            <select v-model="assetsFilter" @change="loadAssets" class="input w-40">
              <option value="">全部</option>
              <option value="scanned">已盤點</option>
              <option value="pending">未盤點</option>
            </select>
            <span v-if="assetsSummary" class="text-sm text-gray-500">
              已盤點 {{ assetsSummary.scanned }} / {{ assetsSummary.total }}，
              未盤點 {{ assetsSummary.pending }}
            </span>
          </div>

          <div v-if="assetsLoading" class="text-center py-8">
            <div class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          </div>

          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">資產編號</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名稱</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分類</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">位置</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盤點狀態</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="asset in assets" :key="asset.id">
                <td class="px-4 py-3 whitespace-nowrap font-mono text-sm">{{ asset.assetNo }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ asset.name }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ asset.category?.name }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ asset.department?.name }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ asset.location?.name || '-' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="asset.isScanned" class="text-green-600">✓ 已盤點</span>
                  <span v-else class="text-gray-400">未盤點</span>
                </td>
              </tr>
              <tr v-if="assets.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">無資產資料</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Report Tab -->
        <div v-if="activeTab === 'report'">
          <div v-if="reportLoading" class="text-center py-8">
            <div class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          </div>

          <div v-else-if="report" class="space-y-6">
            <!-- Summary -->
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-yellow-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-yellow-600">{{ report.summary.discrepancyCount }}</p>
                <p class="text-sm text-yellow-700">資料差異</p>
              </div>
              <div class="bg-red-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-red-600">{{ report.summary.unmatchedCount }}</p>
                <p class="text-sm text-red-700">系統無此資產</p>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-gray-600">{{ report.summary.notScannedCount }}</p>
                <p class="text-sm text-gray-700">未盤點</p>
              </div>
            </div>

            <!-- Discrepancies -->
            <div v-if="report.discrepancies.length > 0">
              <h3 class="font-medium mb-3">異常記錄</h3>
              <table class="min-w-full divide-y divide-gray-200 border rounded">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">資產編號</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">名稱</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">類型</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">說明</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="d in report.discrepancies" :key="d.id">
                    <td class="px-4 py-2 font-mono text-sm">{{ d.assetNo }}</td>
                    <td class="px-4 py-2">{{ d.asset?.name || '-' }}</td>
                    <td class="px-4 py-2">
                      <span :class="['px-2 py-1 rounded text-xs', getMatchStatusClass(d.matchStatus)]">
                        {{ d.type }}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-sm text-gray-500">{{ d.discrepancyNote || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Not Scanned -->
            <div v-if="report.notScanned.length > 0">
              <h3 class="font-medium mb-3">未盤點資產 ({{ report.notScanned.length }})</h3>
              <table class="min-w-full divide-y divide-gray-200 border rounded">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">資產編號</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">名稱</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">部門</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">位置</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">保管人</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="a in report.notScanned" :key="a.id">
                    <td class="px-4 py-2 font-mono text-sm">{{ a.assetNo }}</td>
                    <td class="px-4 py-2">{{ a.name }}</td>
                    <td class="px-4 py-2 text-sm text-gray-500">{{ a.department?.name }}</td>
                    <td class="px-4 py-2 text-sm text-gray-500">{{ a.location?.name || '-' }}</td>
                    <td class="px-4 py-2 text-sm text-gray-500">{{ a.custodian?.name }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="report.discrepancies.length === 0 && report.notScanned.length === 0" class="text-center py-8 text-green-600">
              <svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>盤點結果完全相符，無差異！</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
