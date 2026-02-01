<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Modal from '@/components/common/Modal.vue'
import { assetApi } from '@/api/assets'
import { categoryApi, departmentApi, locationApi, supplierApi } from '@/api/basicData'
import { userApi } from '@/api/users'

const router = useRouter()

// 資料狀態
const loading = ref(false)
const assets = ref([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

// 篩選條件
const filters = ref({
  search: '',
  categoryId: '',
  departmentId: '',
  status: '',
})

// 選項資料
const categories = ref([])
const departments = ref([])
const locations = ref([])
const suppliers = ref([])
const users = ref([])

// 新增/編輯 Modal
const showFormModal = ref(false)
const editMode = ref(false)
const saving = ref(false)
const form = ref(getEmptyForm())

// 異動 Modal
const showMovementModal = ref(false)
const movementForm = ref({
  assetId: '',
  assetNo: '',
  assetName: '',
  movementType: 'transfer',
  toDeptId: '',
  toLocationId: '',
  toCustodianId: '',
  reason: '',
})

const columns = [
  { key: 'assetNo', title: '資產編號', width: '130px' },
  { key: 'name', title: '資產名稱' },
  { key: 'categoryName', title: '分類', width: '120px' },
  { key: 'departmentName', title: '使用部門', width: '100px' },
  { key: 'custodianName', title: '保管人', width: '80px' },
  { key: 'status', title: '狀態', width: '80px' },
  { key: 'actions', title: '操作', width: '150px' },
]

const statusOptions = [
  { value: 'in_use', label: '使用中' },
  { value: 'idle', label: '閒置' },
  { value: 'repair', label: '維修中' },
  { value: 'pending_scrap', label: '待報廢' },
  { value: 'scrapped', label: '已報廢' },
  { value: 'lost', label: '遺失' },
]

const movementTypes = [
  { value: 'transfer', label: '調撥' },
  { value: 'borrow', label: '借用' },
  { value: 'return', label: '歸還' },
  { value: 'repair', label: '送修' },
  { value: 'repair_done', label: '維修完成' },
  { value: 'idle', label: '閒置' },
  { value: 'scrap', label: '報廢' },
]

function getEmptyForm() {
  return {
    id: null,
    assetNo: '',
    name: '',
    categoryId: '',
    specModel: '',
    serialNo: '',
    acquireDate: new Date().toISOString().split('T')[0],
    acquireAmount: '',
    supplierId: '',
    purchaseNo: '',
    departmentId: '',
    custodianId: '',
    locationId: '',
    status: 'in_use',
    warrantyDate: '',
    remark: '',
  }
}

onMounted(async () => {
  await Promise.all([
    loadAssets(),
    loadOptions(),
  ])
})

async function loadAssets() {
  loading.value = true
  try {
    const res = await assetApi.list({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      ...filters.value,
    })
    assets.value = res.data.data.map(a => ({
      ...a,
      categoryName: a.category?.name || '-',
      departmentName: a.department?.name || '-',
      custodianName: a.custodian?.name || '-',
    }))
    pagination.value = res.data.pagination
  } catch (error) {
    console.error('載入資產失敗:', error)
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const [catRes, deptRes, locRes, suppRes, userRes] = await Promise.all([
      categoryApi.list({ flat: true }),
      departmentApi.list({ flat: true }),
      locationApi.list({ flat: true }),
      supplierApi.list({ select: true }),
      userApi.list({ pageSize: 500, status: 'active' }),
    ])
    categories.value = catRes.data.data
    departments.value = deptRes.data.data
    locations.value = locRes.data.data
    suppliers.value = suppRes.data.data
    users.value = userRes.data.data
  } catch (error) {
    console.error('載入選項失敗:', error)
  }
}

function search() {
  pagination.value.page = 1
  loadAssets()
}

function resetFilters() {
  filters.value = {
    search: '',
    categoryId: '',
    departmentId: '',
    status: '',
  }
  search()
}

function goToDetail(asset) {
  router.push(`/assets/${asset.id}`)
}

function openCreate() {
  editMode.value = false
  form.value = getEmptyForm()
  showFormModal.value = true
}

function openEdit(asset) {
  editMode.value = true
  form.value = {
    id: asset.id,
    assetNo: asset.assetNo,
    name: asset.name,
    categoryId: asset.category?.id || '',
    specModel: asset.specModel || '',
    serialNo: asset.serialNo || '',
    acquireDate: asset.acquireDate?.split('T')[0] || '',
    acquireAmount: asset.acquireAmount || '',
    supplierId: asset.supplier?.id || '',
    purchaseNo: asset.purchaseNo || '',
    departmentId: asset.department?.id || '',
    custodianId: asset.custodian?.id || '',
    locationId: asset.location?.id || '',
    status: asset.status,
    warrantyDate: asset.warrantyDate?.split('T')[0] || '',
    remark: asset.remark || '',
  }
  showFormModal.value = true
}

async function saveAsset() {
  saving.value = true
  try {
    if (editMode.value) {
      await assetApi.update(form.value.id, form.value)
    } else {
      await assetApi.create(form.value)
    }
    showFormModal.value = false
    await loadAssets()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

function openMovement(asset) {
  movementForm.value = {
    assetId: asset.id,
    assetNo: asset.assetNo,
    assetName: asset.name,
    movementType: 'transfer',
    toDeptId: asset.department?.id || '',
    toLocationId: asset.location?.id || '',
    toCustodianId: asset.custodian?.id || '',
    reason: '',
  }
  showMovementModal.value = true
}

async function saveMovement() {
  saving.value = true
  try {
    await assetApi.createMovement(movementForm.value.assetId, {
      movementType: movementForm.value.movementType,
      toDeptId: movementForm.value.toDeptId || null,
      toLocationId: movementForm.value.toLocationId || null,
      toCustodianId: movementForm.value.toCustodianId || null,
      reason: movementForm.value.reason,
    })
    showMovementModal.value = false
    await loadAssets()
  } catch (error) {
    alert(error.response?.data?.error?.message || '異動失敗')
  } finally {
    saving.value = false
  }
}

async function deleteAsset(asset) {
  if (!confirm(`確定要報廢「${asset.name}」嗎？`)) return
  
  try {
    await assetApi.delete(asset.id)
    await loadAssets()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}

// Excel 匯入匯出
const showImportModal = ref(false)
const importFile = ref(null)
const importing = ref(false)
const importResult = ref(null)

async function exportExcel() {
  try {
    const res = await assetApi.exportExcel({
      categoryId: filters.value.categoryId,
      departmentId: filters.value.departmentId,
      status: filters.value.status,
      keyword: filters.value.search,
    })
    
    // 下載檔案
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `assets_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('匯出失敗：' + (error.response?.data?.error?.message || error.message))
  }
}

async function downloadTemplate() {
  try {
    const res = await assetApi.downloadTemplate()
    
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'asset_import_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('下載範本失敗：' + (error.response?.data?.error?.message || error.message))
  }
}

function openImportModal() {
  importFile.value = null
  importResult.value = null
  showImportModal.value = true
}

function onFileChange(e) {
  importFile.value = e.target.files[0]
}

async function importExcel() {
  if (!importFile.value) {
    alert('請選擇檔案')
    return
  }
  
  importing.value = true
  try {
    const res = await assetApi.importExcel(importFile.value)
    importResult.value = res.data.data
    
    if (importResult.value.success > 0) {
      await loadAssets()
    }
  } catch (error) {
    alert('匯入失敗：' + (error.response?.data?.error?.message || error.message))
  } finally {
    importing.value = false
  }
}

function closeImportModal() {
  showImportModal.value = false
  importFile.value = null
  importResult.value = null
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">資產管理</h1>
        <p class="text-gray-600">管理所有資訊資產</p>
      </div>
      <div class="flex gap-2">
        <button @click="exportExcel" class="btn btn-secondary">
          <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          匯出
        </button>
        <button @click="openImportModal" class="btn btn-secondary">
          <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          匯入
        </button>
        <button @click="openCreate" class="btn btn-primary">
          <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新增資產
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="filters.search"
            type="text"
            class="input"
            placeholder="搜尋資產編號、名稱、序號..."
            @keyup.enter="search"
          />
        </div>
        <select v-model="filters.categoryId" class="input w-40">
          <option value="">全部分類</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">
            {{ c.level === 2 ? '　' : '' }}{{ c.name }}
          </option>
        </select>
        <select v-model="filters.departmentId" class="input w-40">
          <option value="">全部部門</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <select v-model="filters.status" class="input w-32">
          <option value="">全部狀態</option>
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <button @click="search" class="btn btn-primary">搜尋</button>
        <button @click="resetFilters" class="btn btn-secondary">清除</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden p-0">
      <DataTable :columns="columns" :data="assets" :loading="loading" @row-click="goToDetail">
        <template #cell-status="{ value }">
          <StatusBadge :status="value" />
        </template>
        <template #cell-actions="{ row }">
          <button @click.stop="openEdit(row)" class="text-primary-600 hover:text-primary-900 mr-2">
            編輯
          </button>
          <button @click.stop="openMovement(row)" class="text-green-600 hover:text-green-900 mr-2">
            異動
          </button>
          <button @click.stop="deleteAsset(row)" class="text-red-600 hover:text-red-900">
            報廢
          </button>
        </template>
      </DataTable>

      <!-- Pagination -->
      <div class="px-6 py-4 border-t flex justify-between items-center">
        <span class="text-sm text-gray-500">
          共 {{ pagination.total }} 筆，第 {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.pageSize) || 1 }} 頁
        </span>
        <div class="flex space-x-2">
          <button
            @click="pagination.page--; loadAssets()"
            :disabled="pagination.page <= 1"
            class="btn btn-secondary text-sm"
          >
            上一頁
          </button>
          <button
            @click="pagination.page++; loadAssets()"
            :disabled="pagination.page >= Math.ceil(pagination.total / pagination.pageSize)"
            class="btn btn-secondary text-sm"
          >
            下一頁
          </button>
        </div>
      </div>
    </div>

    <!-- Asset Form Modal -->
    <Modal :show="showFormModal" :title="editMode ? '編輯資產' : '新增資產'" size="xl" @close="showFormModal = false">
      <form @submit.prevent="saveAsset" class="grid grid-cols-2 gap-4">
        <div v-if="editMode">
          <label class="label">資產編號</label>
          <input v-model="form.assetNo" type="text" class="input bg-gray-100" disabled />
        </div>
        <div :class="editMode ? '' : 'col-span-2'">
          <label class="label">資產名稱 *</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div>
          <label class="label">分類 *</label>
          <select v-model="form.categoryId" class="input" required>
            <option value="">請選擇</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{ c.level === 2 ? '　' : '' }}{{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">規格型號</label>
          <input v-model="form.specModel" type="text" class="input" />
        </div>
        <div>
          <label class="label">序號</label>
          <input v-model="form.serialNo" type="text" class="input" />
        </div>
        <div>
          <label class="label">取得日期 *</label>
          <input v-model="form.acquireDate" type="date" class="input" required />
        </div>
        <div>
          <label class="label">取得金額</label>
          <input v-model="form.acquireAmount" type="number" class="input" step="0.01" />
        </div>
        <div>
          <label class="label">供應商</label>
          <select v-model="form.supplierId" class="input">
            <option value="">請選擇</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">採購單號</label>
          <input v-model="form.purchaseNo" type="text" class="input" />
        </div>
        <div>
          <label class="label">使用部門 *</label>
          <select v-model="form.departmentId" class="input" required>
            <option value="">請選擇</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">保管人 *</label>
          <select v-model="form.custodianId" class="input" required>
            <option value="">請選擇</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">存放位置</label>
          <select v-model="form.locationId" class="input">
            <option value="">請選擇</option>
            <option v-for="l in locations" :key="l.id" :value="l.id">
              {{ '　'.repeat(l.level - 1) }}{{ l.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">狀態</label>
          <select v-model="form.status" class="input">
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">保固到期日</label>
          <input v-model="form.warrantyDate" type="date" class="input" />
        </div>
        <div class="col-span-2">
          <label class="label">備註</label>
          <textarea v-model="form.remark" class="input" rows="2"></textarea>
        </div>
      </form>
      <template #footer>
        <button @click="showFormModal = false" class="btn btn-secondary">取消</button>
        <button @click="saveAsset" :disabled="saving" class="btn btn-primary">
          {{ saving ? '儲存中...' : '儲存' }}
        </button>
      </template>
    </Modal>

    <!-- Movement Modal -->
    <Modal :show="showMovementModal" title="資產異動" @close="showMovementModal = false">
      <form @submit.prevent="saveMovement" class="space-y-4">
        <div class="bg-gray-100 p-3 rounded">
          <p class="text-sm text-gray-600">資產編號：{{ movementForm.assetNo }}</p>
          <p class="font-medium">{{ movementForm.assetName }}</p>
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

    <!-- Import Modal -->
    <Modal :show="showImportModal" title="匯入資產" @close="closeImportModal">
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 class="font-medium text-blue-800 mb-2">匯入說明</h4>
          <ul class="text-sm text-blue-700 space-y-1">
            <li>• 請先下載匯入範本，依照範本格式填寫</li>
            <li>• 分類、部門、位置、供應商需填寫「代碼」</li>
            <li>• 日期格式：YYYY-MM-DD</li>
          </ul>
          <button @click="downloadTemplate" class="mt-3 text-sm text-blue-600 hover:text-blue-800 underline">
            📥 下載匯入範本
          </button>
        </div>

        <div v-if="!importResult">
          <label class="label">選擇 Excel 檔案</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            @change="onFileChange"
            class="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
          />
        </div>

        <div v-if="importResult" class="bg-gray-50 rounded p-4">
          <h4 class="font-medium mb-2">匯入結果</h4>
          <div class="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ importResult.total }}</p>
              <p class="text-sm text-gray-500">總筆數</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-green-600">{{ importResult.success }}</p>
              <p class="text-sm text-gray-500">成功</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-red-600">{{ importResult.failed }}</p>
              <p class="text-sm text-gray-500">失敗</p>
            </div>
          </div>
          
          <div v-if="importResult.errors?.length > 0" class="mt-4">
            <h5 class="font-medium text-red-700 mb-2">錯誤明細：</h5>
            <div class="max-h-40 overflow-y-auto text-sm">
              <div v-for="err in importResult.errors" :key="err.row" class="text-red-600">
                第 {{ err.row }} 行：{{ err.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <button @click="closeImportModal" class="btn btn-secondary">
          {{ importResult ? '關閉' : '取消' }}
        </button>
        <button
          v-if="!importResult"
          @click="importExcel"
          :disabled="importing || !importFile"
          class="btn btn-primary"
        >
          {{ importing ? '匯入中...' : '開始匯入' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
