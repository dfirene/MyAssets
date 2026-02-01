<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Modal from '@/components/common/Modal.vue'
import { inventoryApi } from '@/api/inventory'
import { departmentApi, locationApi, categoryApi } from '@/api/basicData'

const router = useRouter()

const loading = ref(false)
const plans = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

// 新增/編輯 Modal
const showFormModal = ref(false)
const editMode = ref(false)
const saving = ref(false)
const form = ref(getEmptyForm())

// 選項
const departments = ref([])
const locations = ref([])
const categories = ref([])

const columns = [
  { key: 'name', title: '計畫名稱' },
  { key: 'period', title: '盤點期間', width: '180px' },
  { key: 'progressText', title: '進度', width: '120px' },
  { key: 'status', title: '狀態', width: '100px' },
  { key: 'actions', title: '操作', width: '200px' },
]

function getEmptyForm() {
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return {
    id: null,
    name: '',
    description: '',
    startDate: today,
    endDate: nextMonth,
    scopeType: 'all',
    scopeIds: [],
  }
}

onMounted(async () => {
  await Promise.all([loadPlans(), loadOptions()])
})

async function loadPlans() {
  loading.value = true
  try {
    const res = await inventoryApi.listPlans({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    })
    plans.value = res.data.data.map(p => ({
      ...p,
      period: `${formatDate(p.startDate)} ~ ${formatDate(p.endDate)}`,
      progressText: p.progress 
        ? `${p.progress.matchedCount}/${p.progress.totalAssets} (${p.progress.percentage}%)`
        : '-',
    }))
    pagination.value = res.data.pagination
  } catch (error) {
    console.error('載入盤點計畫失敗:', error)
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const [deptRes, locRes, catRes] = await Promise.all([
      departmentApi.list({ flat: true }),
      locationApi.list({ flat: true }),
      categoryApi.list({ flat: true }),
    ])
    departments.value = deptRes.data.data
    locations.value = locRes.data.data
    categories.value = catRes.data.data
  } catch (error) {
    console.error('載入選項失敗:', error)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function openCreate() {
  editMode.value = false
  form.value = getEmptyForm()
  showFormModal.value = true
}

function openEdit(plan) {
  editMode.value = true
  form.value = {
    id: plan.id,
    name: plan.name,
    description: plan.description || '',
    startDate: plan.startDate?.split('T')[0] || '',
    endDate: plan.endDate?.split('T')[0] || '',
    scopeType: plan.scopeType,
    scopeIds: plan.scopeIds || [],
  }
  showFormModal.value = true
}

async function savePlan() {
  saving.value = true
  try {
    if (editMode.value) {
      await inventoryApi.updatePlan(form.value.id, form.value)
    } else {
      await inventoryApi.createPlan(form.value)
    }
    showFormModal.value = false
    await loadPlans()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function deletePlan(plan) {
  if (!confirm(`確定要刪除「${plan.name}」嗎？`)) return
  
  try {
    await inventoryApi.deletePlan(plan.id)
    await loadPlans()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}

async function startPlan(plan) {
  if (!confirm(`確定要開始「${plan.name}」嗎？`)) return
  
  try {
    await inventoryApi.startPlan(plan.id)
    await loadPlans()
  } catch (error) {
    alert(error.response?.data?.error?.message || '操作失敗')
  }
}

async function completePlan(plan) {
  if (!confirm(`確定要完成「${plan.name}」嗎？`)) return
  
  try {
    await inventoryApi.completePlan(plan.id)
    await loadPlans()
  } catch (error) {
    alert(error.response?.data?.error?.message || '操作失敗')
  }
}

function goToExecute(plan) {
  router.push(`/inventory/${plan.id}`)
}

function getScopeOptions() {
  switch (form.value.scopeType) {
    case 'department': return departments.value
    case 'location': return locations.value
    case 'category': return categories.value
    default: return []
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">盤點管理</h1>
        <p class="text-gray-600">管理盤點計畫與執行盤點作業</p>
      </div>
      <button @click="openCreate" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增盤點計畫
      </button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden p-0">
      <DataTable :columns="columns" :data="plans" :loading="loading">
        <template #cell-status="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #cell-actions="{ row }">
          <template v-if="row.status === 'draft'">
            <button @click.stop="startPlan(row)" class="text-green-600 hover:text-green-900 mr-2">
              開始
            </button>
            <button @click.stop="openEdit(row)" class="text-primary-600 hover:text-primary-900 mr-2">
              編輯
            </button>
            <button @click.stop="deletePlan(row)" class="text-red-600 hover:text-red-900">
              刪除
            </button>
          </template>
          <template v-else-if="row.status === 'in_progress'">
            <button @click.stop="goToExecute(row)" class="text-primary-600 hover:text-primary-900 mr-2">
              執行盤點
            </button>
            <button @click.stop="completePlan(row)" class="text-green-600 hover:text-green-900">
              完成
            </button>
          </template>
          <template v-else-if="row.status === 'completed'">
            <button @click.stop="goToExecute(row)" class="text-primary-600 hover:text-primary-900 mr-2">
              查看
            </button>
          </template>
          <template v-else>
            <button @click.stop="goToExecute(row)" class="text-primary-600 hover:text-primary-900">
              查看
            </button>
          </template>
        </template>
      </DataTable>

      <!-- Empty State -->
      <div v-if="!loading && plans.length === 0" class="text-center py-12">
        <svg class="h-12 w-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="mt-2 text-gray-500">尚無盤點計畫</p>
        <button @click="openCreate" class="mt-4 btn btn-primary">建立第一個盤點計畫</button>
      </div>
    </div>

    <!-- Form Modal -->
    <Modal :show="showFormModal" :title="editMode ? '編輯盤點計畫' : '新增盤點計畫'" @close="showFormModal = false">
      <form @submit.prevent="savePlan" class="space-y-4">
        <div>
          <label class="label">計畫名稱 *</label>
          <input v-model="form.name" type="text" class="input" required placeholder="例：2026年2月全廠盤點" />
        </div>
        <div>
          <label class="label">說明</label>
          <textarea v-model="form.description" class="input" rows="2"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">開始日期 *</label>
            <input v-model="form.startDate" type="date" class="input" required />
          </div>
          <div>
            <label class="label">結束日期 *</label>
            <input v-model="form.endDate" type="date" class="input" required />
          </div>
        </div>
        <div>
          <label class="label">盤點範圍</label>
          <select v-model="form.scopeType" class="input" @change="form.scopeIds = []">
            <option value="all">全部資產</option>
            <option value="department">依部門</option>
            <option value="location">依位置</option>
            <option value="category">依分類</option>
          </select>
        </div>
        <div v-if="form.scopeType !== 'all'">
          <label class="label">選擇範圍</label>
          <div class="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
            <label v-for="opt in getScopeOptions()" :key="opt.id" class="flex items-center">
              <input type="checkbox" :value="opt.id" v-model="form.scopeIds" class="mr-2" />
              {{ opt.name }}
            </label>
          </div>
        </div>
      </form>
      <template #footer>
        <button @click="showFormModal = false" class="btn btn-secondary">取消</button>
        <button @click="savePlan" :disabled="saving" class="btn btn-primary">
          {{ saving ? '儲存中...' : '儲存' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
