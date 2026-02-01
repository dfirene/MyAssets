<script setup>
import { ref, onMounted } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import Modal from '@/components/common/Modal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { userApi } from '@/api/users'
import { departmentApi, roleApi } from '@/api/basicData'

const loading = ref(false)
const users = ref([])
const departments = ref([])
const roles = ref([])
const showModal = ref(false)
const editMode = ref(false)
const saving = ref(false)

const form = ref({
  id: null,
  account: '',
  name: '',
  email: '',
  departmentId: '',
  roleIds: [],
  status: 'active',
})

const columns = [
  { key: 'account', title: '帳號' },
  { key: 'name', title: '姓名' },
  { key: 'departmentName', title: '部門' },
  { key: 'roleNames', title: '角色' },
  { key: 'status', title: '狀態', width: '100px' },
  { key: 'actions', title: '操作', width: '120px' },
]

onMounted(async () => {
  await Promise.all([loadUsers(), loadDepartments(), loadRoles()])
})

async function loadUsers() {
  loading.value = true
  try {
    const res = await userApi.list({ pageSize: 100 })
    users.value = res.data.data.map(u => ({
      ...u,
      departmentName: u.department?.name || '-',
      roleNames: u.roles?.map(r => r.name).join(', ') || '-',
    }))
  } catch (error) {
    console.error('載入使用者失敗:', error)
  } finally {
    loading.value = false
  }
}

async function loadDepartments() {
  try {
    const res = await departmentApi.list({ flat: true })
    departments.value = res.data.data
  } catch (error) {
    console.error('載入部門失敗:', error)
  }
}

async function loadRoles() {
  try {
    const res = await roleApi.list({ select: true })
    roles.value = res.data.data
  } catch (error) {
    console.error('載入角色失敗:', error)
  }
}

function openCreate() {
  editMode.value = false
  form.value = {
    id: null,
    account: '',
    name: '',
    email: '',
    departmentId: '',
    roleIds: [],
    status: 'active',
  }
  showModal.value = true
}

function openEdit(user) {
  editMode.value = true
  form.value = {
    id: user.id,
    account: user.account,
    name: user.name,
    email: user.email,
    departmentId: user.department?.id || '',
    roleIds: user.roles?.map(r => r.id) || [],
    status: user.status,
  }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editMode.value) {
      await userApi.update(form.value.id, form.value)
    } else {
      await userApi.create(form.value)
    }
    showModal.value = false
    await loadUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function deleteUser(user) {
  if (!confirm(`確定要停用 ${user.name} 嗎？`)) return
  
  try {
    await userApi.delete(user.id)
    await loadUsers()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">使用者管理</h3>
      <button @click="openCreate" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增使用者
      </button>
    </div>

    <!-- Table -->
    <DataTable :columns="columns" :data="users" :loading="loading">
      <template #cell-status="{ value }">
        <StatusBadge :status="value" />
      </template>
      <template #cell-actions="{ row }">
        <button @click.stop="openEdit(row)" class="text-primary-600 hover:text-primary-900 mr-3">
          編輯
        </button>
        <button @click.stop="deleteUser(row)" class="text-red-600 hover:text-red-900">
          停用
        </button>
      </template>
    </DataTable>

    <!-- Modal -->
    <Modal :show="showModal" :title="editMode ? '編輯使用者' : '新增使用者'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="label">帳號 (Email)</label>
          <input v-model="form.account" type="email" class="input" required :disabled="editMode" />
        </div>
        <div>
          <label class="label">姓名</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" required />
        </div>
        <div>
          <label class="label">部門</label>
          <select v-model="form.departmentId" class="input">
            <option value="">請選擇</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">角色</label>
          <div class="space-y-2">
            <label v-for="r in roles" :key="r.id" class="flex items-center">
              <input type="checkbox" :value="r.id" v-model="form.roleIds" class="mr-2" />
              {{ r.name }}
            </label>
          </div>
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
