<script setup>
import { ref, onMounted } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import Modal from '@/components/common/Modal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { supplierApi } from '@/api/basicData'

const loading = ref(false)
const suppliers = ref([])
const showModal = ref(false)
const editMode = ref(false)
const saving = ref(false)

const form = ref({
  id: null,
  code: '',
  name: '',
  taxId: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  serviceItems: '',
  status: 'active',
})

const columns = [
  { key: 'code', title: '代碼', width: '100px' },
  { key: 'name', title: '供應商名稱' },
  { key: 'taxId', title: '統編', width: '100px' },
  { key: 'contactName', title: '聯絡人', width: '100px' },
  { key: 'phone', title: '電話', width: '120px' },
  { key: 'status', title: '狀態', width: '80px' },
  { key: 'actions', title: '操作', width: '100px' },
]

onMounted(async () => {
  await loadSuppliers()
})

async function loadSuppliers() {
  loading.value = true
  try {
    const res = await supplierApi.list({ pageSize: 100 })
    suppliers.value = res.data.data
  } catch (error) {
    console.error('載入供應商失敗:', error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editMode.value = false
  form.value = {
    id: null,
    code: '',
    name: '',
    taxId: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    serviceItems: '',
    status: 'active',
  }
  showModal.value = true
}

function openEdit(supplier) {
  editMode.value = true
  form.value = { ...supplier }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editMode.value) {
      await supplierApi.update(form.value.id, form.value)
    } else {
      await supplierApi.create(form.value)
    }
    showModal.value = false
    await loadSuppliers()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function deleteSupplier(supplier) {
  if (!confirm(`確定要停用「${supplier.name}」嗎？`)) return
  
  try {
    await supplierApi.delete(supplier.id)
    await loadSuppliers()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">供應商管理</h3>
      <button @click="openCreate" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增供應商
      </button>
    </div>

    <!-- Table -->
    <DataTable :columns="columns" :data="suppliers" :loading="loading">
      <template #cell-status="{ value }">
        <StatusBadge :status="value" />
      </template>
      <template #cell-actions="{ row }">
        <button @click.stop="openEdit(row)" class="text-primary-600 hover:text-primary-900 mr-2">
          編輯
        </button>
        <button @click.stop="deleteSupplier(row)" class="text-red-600 hover:text-red-900">
          停用
        </button>
      </template>
    </DataTable>

    <!-- Modal -->
    <Modal :show="showModal" :title="editMode ? '編輯供應商' : '新增供應商'" size="lg" @close="showModal = false">
      <form @submit.prevent="save" class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">供應商代碼</label>
          <input v-model="form.code" type="text" class="input" required />
        </div>
        <div>
          <label class="label">供應商名稱</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div>
          <label class="label">統一編號</label>
          <input v-model="form.taxId" type="text" class="input" />
        </div>
        <div>
          <label class="label">聯絡人</label>
          <input v-model="form.contactName" type="text" class="input" />
        </div>
        <div>
          <label class="label">電話</label>
          <input v-model="form.phone" type="text" class="input" />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" />
        </div>
        <div class="col-span-2">
          <label class="label">地址</label>
          <input v-model="form.address" type="text" class="input" />
        </div>
        <div class="col-span-2">
          <label class="label">服務項目</label>
          <textarea v-model="form.serviceItems" class="input" rows="2"></textarea>
        </div>
        <div v-if="editMode">
          <label class="label">狀態</label>
          <select v-model="form.status" class="input">
            <option value="active">啟用</option>
            <option value="inactive">停用</option>
          </select>
        </div>
      </form>
      <template #footer>
        <button @click="showModal = false" class="btn btn-secondary">取消</button>
        <button @click="save" :disabled="saving" class="btn btn-primary">
          {{ saving ? '儲存中...' : '儲存' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
