<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Modal from '@/components/common/Modal.vue'
import { inventoryApi } from '@/api/inventory'

const route = useRoute()
const router = useRouter()
const planId = route.params.id

const loading = ref(true)
const plan = ref(null)
const progress = ref(null)
const pendingAssets = ref([])
const records = ref([])
const activeTab = ref('scan')

// OCR Modal
const showOcrModal = ref(false)
const ocrText = ref('')
const ocrResult = ref(null)
const scanning = ref(false)

// 手動盤點
const manualAssetNo = ref('')
const manualScanning = ref(false)

// 篩選
const recordFilter = ref('')

onMounted(async () => {
  await loadPlan()
})

async function loadPlan() {
  loading.value = true
  try {
    const [planRes, progressRes] = await Promise.all([
      inventoryApi.getPlan(planId),
      inventoryApi.getProgress(planId),
    ])
    plan.value = planRes.data.data
    progress.value = progressRes.data.data
    
    await Promise.all([loadPendingAssets(), loadRecords()])
  } catch (error) {
    console.error('載入盤點計畫失敗:', error)
    alert('載入失敗')
    router.push('/inventory')
  } finally {
    loading.value = false
  }
}

async function loadPendingAssets() {
  try {
    const res = await inventoryApi.getPendingAssets(planId, { pageSize: 100 })
    pendingAssets.value = res.data.data
  } catch (error) {
    console.error('載入待盤資產失敗:', error)
  }
}

async function loadRecords() {
  try {
    const params = { pageSize: 100 }
    if (recordFilter.value) {
      params.matchStatus = recordFilter.value
    }
    const res = await inventoryApi.getRecords(planId, params)
    records.value = res.data.data
  } catch (error) {
    console.error('載入盤點紀錄失敗:', error)
  }
}

// OCR 辨識（模擬前端 OCR，實際需要使用 Tesseract.js）
function openOcrModal() {
  ocrText.value = ''
  ocrResult.value = null
  showOcrModal.value = true
}

async function processOcr() {
  if (!ocrText.value.trim()) {
    alert('請輸入或貼上 OCR 辨識文字')
    return
  }

  scanning.value = true
  try {
    const res = await inventoryApi.ocrScan({
      planId,
      ocrText: ocrText.value,
    })
    ocrResult.value = res.data.data
    
    // 刷新資料
    await Promise.all([
      loadPendingAssets(),
      loadRecords(),
      refreshProgress(),
    ])
  } catch (error) {
    alert(error.response?.data?.error?.message || 'OCR 處理失敗')
  } finally {
    scanning.value = false
  }
}

async function manualScan() {
  if (!manualAssetNo.value.trim()) {
    alert('請輸入資產編號')
    return
  }

  manualScanning.value = true
  try {
    const res = await inventoryApi.manualScan({
      planId,
      assetNo: manualAssetNo.value.trim(),
    })
    
    alert(res.data.message)
    manualAssetNo.value = ''
    
    // 刷新資料
    await Promise.all([
      loadPendingAssets(),
      loadRecords(),
      refreshProgress(),
    ])
  } catch (error) {
    alert(error.response?.data?.error?.message || '盤點失敗')
  } finally {
    manualScanning.value = false
  }
}

async function quickScan(asset) {
  manualAssetNo.value = asset.assetNo
  await manualScan()
}

async function refreshProgress() {
  try {
    const res = await inventoryApi.getProgress(planId)
    progress.value = res.data.data
  } catch (error) {
    console.error('刷新進度失敗:', error)
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-TW')
}

const progressPercentage = computed(() => {
  if (!progress.value || progress.value.totalAssets === 0) return 0
  return progress.value.percentage
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back -->
    <RouterLink to="/inventory" class="inline-flex items-center text-gray-600 hover:text-gray-900">
      <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <p class="text-gray-500">載入中...</p>
    </div>

    <template v-else-if="plan">
      <!-- Header -->
      <div class="card">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center space-x-3">
              <h1 class="text-2xl font-bold text-gray-900">{{ plan.name }}</h1>
              <StatusBadge :status="plan.status" />
            </div>
            <p class="text-gray-500 mt-1">{{ plan.description }}</p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-6">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-gray-600">盤點進度</span>
            <span class="font-medium">
              {{ progress?.matchedCount || 0 }} / {{ progress?.totalAssets || 0 }}
              ({{ progressPercentage }}%)
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4">
            <div
              class="bg-primary-600 h-4 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-xs mt-2 text-gray-500">
            <span>已匹配：{{ progress?.matchedCount || 0 }}</span>
            <span>盤盈：{{ progress?.unmatchedCount || 0 }}</span>
            <span>差異：{{ progress?.discrepancyCount || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex space-x-8">
          <button
            @click="activeTab = 'scan'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'scan'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ]"
          >
            盤點作業
          </button>
          <button
            @click="activeTab = 'pending'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'pending'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ]"
          >
            待盤清單 ({{ pendingAssets.length }})
          </button>
          <button
            @click="activeTab = 'records'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'records'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ]"
          >
            盤點紀錄
          </button>
        </nav>
      </div>

      <!-- Tab: Scan -->
      <div v-if="activeTab === 'scan'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- OCR 掃描 -->
          <div class="card">
            <h2 class="text-lg font-semibold mb-4">📷 OCR 影像辨識</h2>
            <p class="text-gray-600 text-sm mb-4">
              拍攝資產標籤照片，使用 OCR 自動辨識資產編號、類別、名稱等資訊。
            </p>
            <button 
              @click="openOcrModal" 
              class="btn btn-primary w-full"
              :disabled="plan.status !== 'in_progress'"
            >
              <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              開始 OCR 掃描
            </button>
          </div>

          <!-- 手動輸入 -->
          <div class="card">
            <h2 class="text-lg font-semibold mb-4">⌨️ 手動輸入</h2>
            <p class="text-gray-600 text-sm mb-4">
              直接輸入資產編號進行盤點。
            </p>
            <div class="flex space-x-2">
              <input
                v-model="manualAssetNo"
                type="text"
                class="input flex-1"
                placeholder="輸入資產編號..."
                :disabled="plan.status !== 'in_progress'"
                @keyup.enter="manualScan"
              />
              <button 
                @click="manualScan" 
                class="btn btn-primary"
                :disabled="plan.status !== 'in_progress' || manualScanning"
              >
                {{ manualScanning ? '處理中...' : '盤點' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Pending -->
      <div v-if="activeTab === 'pending'" class="card">
        <div v-if="pendingAssets.length === 0" class="text-center py-8 text-gray-500">
          🎉 所有資產都已盤點完成！
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">資產編號</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名稱</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分類</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">保管人</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="asset in pendingAssets" :key="asset.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ asset.assetNo }}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{{ asset.name }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ asset.category || '-' }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ asset.department || '-' }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ asset.custodian || '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <button 
                    @click="quickScan(asset)" 
                    class="text-primary-600 hover:text-primary-900"
                    :disabled="plan.status !== 'in_progress'"
                  >
                    快速盤點
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Records -->
      <div v-if="activeTab === 'records'" class="card">
        <!-- Filter -->
        <div class="mb-4">
          <select v-model="recordFilter" @change="loadRecords" class="input w-40">
            <option value="">全部紀錄</option>
            <option value="matched">已匹配</option>
            <option value="unmatched">盤盈</option>
            <option value="discrepancy">差異</option>
          </select>
        </div>

        <div v-if="records.length === 0" class="text-center py-8 text-gray-500">
          尚無盤點紀錄
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">資產編號</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">匹配資產</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備註</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盤點人員</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="record in records" :key="record.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-500">{{ formatDateTime(record.scannedAt) }}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ record.assetNo }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  {{ record.matchAsset?.name || '-' }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <span :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    record.matchStatus === 'matched' ? 'bg-green-100 text-green-800' :
                    record.matchStatus === 'unmatched' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  ]">
                    {{ record.matchStatusName }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                  {{ record.discrepancyNote || '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ record.scannedBy?.name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- OCR Modal -->
    <Modal :show="showOcrModal" title="OCR 影像辨識" size="lg" @close="showOcrModal = false">
      <div class="space-y-4">
        <p class="text-gray-600 text-sm">
          請拍攝資產標籤照片，或直接貼上 OCR 辨識結果文字。
        </p>
        
        <div>
          <label class="label">OCR 辨識文字</label>
          <textarea
            v-model="ocrText"
            class="input font-mono text-sm"
            rows="6"
            placeholder="資編：040400275
類別：資訊-可攜式電腦
名稱：ASUS筆記型電腦
取得年月：2023/9"
          ></textarea>
        </div>

        <!-- Result -->
        <div v-if="ocrResult" class="border rounded-lg p-4" :class="[
          ocrResult.matchStatus === 'matched' ? 'bg-green-50 border-green-200' :
          ocrResult.matchStatus === 'unmatched' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        ]">
          <p class="font-medium" :class="[
            ocrResult.matchStatus === 'matched' ? 'text-green-800' :
            ocrResult.matchStatus === 'unmatched' ? 'text-yellow-800' :
            'text-red-800'
          ]">
            {{ ocrResult.message }}
          </p>
          
          <div v-if="ocrResult.parsed" class="mt-2 text-sm text-gray-600">
            <p>解析結果：</p>
            <ul class="list-disc list-inside ml-2">
              <li>資產編號：{{ ocrResult.parsed.assetNo || '未辨識' }}</li>
              <li>類別：{{ ocrResult.parsed.category || '未辨識' }}</li>
              <li>名稱：{{ ocrResult.parsed.name || '未辨識' }}</li>
              <li>取得年月：{{ ocrResult.parsed.acquireDate || '未辨識' }}</li>
            </ul>
          </div>

          <div v-if="ocrResult.discrepancies?.length" class="mt-2 text-sm text-red-600">
            <p>差異項目：</p>
            <ul class="list-disc list-inside ml-2">
              <li v-for="(d, i) in ocrResult.discrepancies" :key="i">{{ d }}</li>
            </ul>
          </div>
        </div>
      </div>
      <template #footer>
        <button @click="showOcrModal = false" class="btn btn-secondary">關閉</button>
        <button @click="processOcr" :disabled="scanning" class="btn btn-primary">
          {{ scanning ? '處理中...' : '辨識並盤點' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
