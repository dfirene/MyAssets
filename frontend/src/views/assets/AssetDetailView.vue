<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Modal from '@/components/common/Modal.vue'
import { assetApi } from '@/api/assets'
import { departmentApi, locationApi } from '@/api/basicData'
import { userApi } from '@/api/users'

const route = useRoute()
const router = useRouter()
const assetId = route.params.id

const loading = ref(true)
const asset = ref(null)
const movements = ref([])
const movementsLoading = ref(false)

// 異動 Modal
const showMovementModal = ref(false)
const saving = ref(false)
const departments = ref([])
const locations = ref([])
const users = ref([])

const movementForm = ref({
  movementType: 'transfer',
  toDeptId: '',
  toLocationId: '',
  toCustodianId: '',
  reason: '',
})

const movementTypes = [
  { value: 'transfer', label: '調撥' },
  { value: 'borrow', label: '借用' },
  { value: 'return', label: '歸還' },
  { value: 'repair', label: '送修' },
  { value: 'repair_done', label: '維修完成' },
  { value: 'idle', label: '閒置' },
  { value: 'scrap', label: '報廢' },
]

onMounted(async () => {
  await loadAsset()
  await loadOptions()
})

async function loadAsset() {
  loading.value = true
  try {
    const res = await assetApi.get(assetId)
    asset.value = res.data.data
    await loadMovements()
  } catch (error) {
    console.error('載入資產失敗:', error)
    alert('載入資產失敗')
    router.push('/assets')
  } finally {
    loading.value = false
  }
}

async function loadMovements() {
  movementsLoading.value = true
  try {
    const res = await assetApi.getMovements(assetId, { pageSize: 50 })
    movements.value = res.data.data
  } catch (error) {
    console.error('載入異動紀錄失敗:', error)
  } finally {
    movementsLoading.value = false
  }
}

async function loadOptions() {
  try {
    const [deptRes, locRes, userRes] = await Promise.all([
      departmentApi.list({ flat: true }),
      locationApi.list({ flat: true }),
      userApi.list({ pageSize: 500, status: 'active' }),
    ])
    departments.value = deptRes.data.data
    locations.value = locRes.data.data
    users.value = userRes.data.data
  } catch (error) {
    console.error('載入選項失敗:', error)
  }
}

function openMovement() {
  movementForm.value = {
    movementType: 'transfer',
    toDeptId: asset.value.department?.id || '',
    toLocationId: asset.value.location?.id || '',
    toCustodianId: asset.value.custodian?.id || '',
    reason: '',
  }
  showMovementModal.value = true
}

async function saveMovement() {
  saving.value = true
  try {
    await assetApi.createMovement(assetId, {
      movementType: movementForm.value.movementType,
      toDeptId: movementForm.value.toDeptId || null,
      toLocationId: movementForm.value.toLocationId || null,
      toCustodianId: movementForm.value.toCustodianId || null,
      reason: movementForm.value.reason,
    })
    showMovementModal.value = false
    await loadAsset()
  } catch (error) {
    alert(error.response?.data?.error?.message || '異動失敗')
  } finally {
    saving.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-TW')
}

function formatCurrency(amount) {
  if (!amount) return '-'
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <RouterLink to="/assets" class="inline-flex items-center text-gray-600 hover:text-gray-900">
      <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <p class="mt-2 text-gray-500">載入中...</p>
    </div>

    <!-- Asset Detail -->
    <template v-else-if="asset">
      <!-- Header -->
      <div class="card">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center space-x-3">
              <h1 class="text-2xl font-bold text-gray-900">{{ asset.name }}</h1>
              <StatusBadge :status="asset.status" />
            </div>
            <p class="text-gray-500 mt-1">資產編號：{{ asset.assetNo }}</p>
          </div>
          <div class="flex space-x-2">
            <button @click="openMovement" class="btn btn-primary">
              <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              異動
            </button>
            <RouterLink :to="`/assets/${assetId}/edit`" class="btn btn-secondary">
              編輯
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Details Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 基本資訊 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">基本資訊</h2>
          <dl class="space-y-3">
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">分類</dt>
              <dd class="text-gray-900">{{ asset.categoryPath || '-' }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">規格型號</dt>
              <dd class="text-gray-900">{{ asset.specModel || '-' }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">序號</dt>
              <dd class="text-gray-900">{{ asset.serialNo || '-' }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">取得日期</dt>
              <dd class="text-gray-900">{{ formatDate(asset.acquireDate) }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">取得金額</dt>
              <dd class="text-gray-900">{{ formatCurrency(asset.acquireAmount) }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">供應商</dt>
              <dd class="text-gray-900">{{ asset.supplier?.name || '-' }}</dd>
            </div>
            <div class="flex">
              <dt class="w-28 text-gray-500 flex-shrink-0">保固到期</dt>
              <dd class="text-gray-900">{{ formatDate(asset.warrantyDate) }}</dd>
            </div>
          </dl>
        </div>

        <!-- 使用資訊 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">使用資訊</h2>
          <dl class="space-y-3">
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">使用部門</dt>
              <dd class="text-gray-900">{{ asset.department?.name || '-' }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">保管人</dt>
              <dd class="text-gray-900">
                {{ asset.custodian?.name || '-' }}
                <span v-if="asset.custodian?.email" class="text-gray-500 text-sm ml-2">
                  ({{ asset.custodian.email }})
                </span>
              </dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">存放位置</dt>
              <dd class="text-gray-900">{{ asset.locationPath || '-' }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">狀態</dt>
              <dd><StatusBadge :status="asset.status" /></dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">建立者</dt>
              <dd class="text-gray-900">{{ asset.createdBy?.name || '-' }}</dd>
            </div>
            <div class="flex border-b pb-2">
              <dt class="w-28 text-gray-500 flex-shrink-0">建立時間</dt>
              <dd class="text-gray-900">{{ formatDateTime(asset.createdAt) }}</dd>
            </div>
            <div class="flex">
              <dt class="w-28 text-gray-500 flex-shrink-0">更新時間</dt>
              <dd class="text-gray-900">{{ formatDateTime(asset.updatedAt) }}</dd>
            </div>
          </dl>
        </div>

        <!-- 備註 -->
        <div v-if="asset.remark" class="card lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">備註</h2>
          <p class="text-gray-700 whitespace-pre-wrap">{{ asset.remark }}</p>
        </div>
      </div>

      <!-- 異動紀錄 -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">異動紀錄</h2>
        
        <div v-if="movementsLoading" class="text-center py-8 text-gray-500">
          載入中...
        </div>
        
        <div v-else-if="movements.length === 0" class="text-center py-8 text-gray-500">
          尚無異動紀錄
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">原因</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="m in movements" :key="m.id">
                <td class="px-4 py-3 text-sm text-gray-900">{{ formatDateTime(m.createdAt) }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {{ m.movementTypeName }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ m.reason || '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <StatusBadge :status="m.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="card text-center py-12">
      <p class="text-gray-500">找不到此資產</p>
      <RouterLink to="/assets" class="btn btn-primary mt-4">返回列表</RouterLink>
    </div>

    <!-- Movement Modal -->
    <Modal :show="showMovementModal" title="資產異動" @close="showMovementModal = false">
      <form @submit.prevent="saveMovement" class="space-y-4">
        <div class="bg-gray-100 p-3 rounded">
          <p class="text-sm text-gray-600">資產編號：{{ asset?.assetNo }}</p>
          <p class="font-medium">{{ asset?.name }}</p>
        </div>
        <div>
          <label class="label">異動類型 *</label>
          <select v-model="movementForm.movementType" class="input" required>
            <option v-for="t in movementTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div v-if="['transfer', 'borrow'].includes(movementForm.movementType)">
          <label class="label">調撥至部門</label>
          <select v-model="movementForm.toDeptId" class="input">
            <option value="">不變更</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div v-if="['transfer'].includes(movementForm.movementType)">
          <label class="label">調撥至位置</label>
          <select v-model="movementForm.toLocationId" class="input">
            <option value="">不變更</option>
            <option v-for="l in locations" :key="l.id" :value="l.id">
              {{ '　'.repeat(l.level - 1) }}{{ l.name }}
            </option>
          </select>
        </div>
        <div v-if="['transfer', 'borrow'].includes(movementForm.movementType)">
          <label class="label">新保管人</label>
          <select v-model="movementForm.toCustodianId" class="input">
            <option value="">不變更</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">異動原因</label>
          <textarea v-model="movementForm.reason" class="input" rows="2"></textarea>
        </div>
      </form>
      <template #footer>
        <button @click="showMovementModal = false" class="btn btn-secondary">取消</button>
        <button @click="saveMovement" :disabled="saving" class="btn btn-primary">
          {{ saving ? '處理中...' : '確認異動' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
