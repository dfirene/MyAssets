<script setup>
import { ref, onMounted } from 'vue'
import Modal from '@/components/common/Modal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { departmentApi } from '@/api/basicData'

const loading = ref(false)
const departments = ref([])
const flatDepartments = ref([])
const showModal = ref(false)
const editMode = ref(false)
const saving = ref(false)

const form = ref({
  id: null,
  code: '',
  name: '',
  parentId: '',
  sortOrder: 0,
  status: 'active',
})

onMounted(async () => {
  await loadDepartments()
})

async function loadDepartments() {
  loading.value = true
  try {
    const [treeRes, flatRes] = await Promise.all([
      departmentApi.list({ includeInactive: true }),
      departmentApi.list({ flat: true, includeInactive: true }),
    ])
    departments.value = treeRes.data.data
    flatDepartments.value = flatRes.data.data
  } catch (error) {
    console.error('載入部門失敗:', error)
  } finally {
    loading.value = false
  }
}

function openCreate(parentId = null) {
  editMode.value = false
  form.value = {
    id: null,
    code: '',
    name: '',
    parentId: parentId || '',
    sortOrder: 0,
    status: 'active',
  }
  showModal.value = true
}

function openEdit(dept) {
  editMode.value = true
  form.value = {
    id: dept.id,
    code: dept.code,
    name: dept.name,
    parentId: dept.parentId || '',
    sortOrder: dept.sortOrder,
    status: dept.status,
  }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value }
    if (!data.parentId) data.parentId = null
    
    if (editMode.value) {
      await departmentApi.update(form.value.id, data)
    } else {
      await departmentApi.create(data)
    }
    showModal.value = false
    await loadDepartments()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function deleteDept(dept) {
  if (!confirm(`確定要停用「${dept.name}」嗎？`)) return
  
  try {
    await departmentApi.delete(dept.id)
    await loadDepartments()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">部門管理</h3>
      <button @click="openCreate()" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增部門
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>

    <!-- Tree -->
    <div v-else class="space-y-2">
      <template v-for="dept in departments" :key="dept.id">
        <!-- Level 1 -->
        <div class="border rounded-lg p-4 bg-white">
          <div class="flex justify-between items-center">
            <div>
              <span class="font-medium">{{ dept.name }}</span>
              <span class="text-gray-500 text-sm ml-2">({{ dept.code }})</span>
              <StatusBadge :status="dept.status" class="ml-2" />
            </div>
            <div class="space-x-2">
              <button @click="openCreate(dept.id)" class="text-sm text-primary-600 hover:text-primary-900">新增子部門</button>
              <button @click="openEdit(dept)" class="text-sm text-primary-600 hover:text-primary-900">編輯</button>
              <button @click="deleteDept(dept)" class="text-sm text-red-600 hover:text-red-900">停用</button>
            </div>
          </div>
          
          <!-- Children -->
          <div v-if="dept.children?.length" class="mt-3 ml-6 space-y-2">
            <div v-for="child in dept.children" :key="child.id" class="border rounded p-3 bg-gray-50">
              <div class="flex justify-between items-center">
                <div>
                  <span>{{ child.name }}</span>
                  <span class="text-gray-500 text-sm ml-2">({{ child.code }})</span>
                  <StatusBadge :status="child.status" class="ml-2" />
                </div>
                <div class="space-x-2">
                  <button @click="openEdit(child)" class="text-sm text-primary-600 hover:text-primary-900">編輯</button>
                  <button @click="deleteDept(child)" class="text-sm text-red-600 hover:text-red-900">停用</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <div v-if="departments.length === 0" class="text-center py-8 text-gray-500">
        尚無部門資料
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editMode ? '編輯部門' : '新增部門'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="label">部門代碼</label>
          <input v-model="form.code" type="text" class="input" required />
        </div>
        <div>
          <label class="label">部門名稱</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div>
          <label class="label">上層部門</label>
          <select v-model="form.parentId" class="input">
            <option value="">無（頂層部門）</option>
            <option v-for="d in flatDepartments.filter(x => x.id !== form.id)" :key="d.id" :value="d.id">
              {{ d.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">排序</label>
          <input v-model.number="form.sortOrder" type="number" class="input" />
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
