<script setup>
import { ref, onMounted } from 'vue'
import Modal from '@/components/common/Modal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { categoryApi } from '@/api/basicData'

const loading = ref(false)
const categories = ref([])
const flatCategories = ref([])
const showModal = ref(false)
const editMode = ref(false)
const saving = ref(false)

const form = ref({
  id: null,
  code: '',
  name: '',
  parentId: '',
  depreciationYears: null,
  description: '',
  sortOrder: 0,
  status: 'active',
})

onMounted(async () => {
  await loadCategories()
})

async function loadCategories() {
  loading.value = true
  try {
    const [treeRes, flatRes] = await Promise.all([
      categoryApi.list({ includeInactive: true }),
      categoryApi.list({ flat: true, includeInactive: true }),
    ])
    categories.value = treeRes.data.data
    flatCategories.value = flatRes.data.data
  } catch (error) {
    console.error('載入分類失敗:', error)
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
    depreciationYears: null,
    description: '',
    sortOrder: 0,
    status: 'active',
  }
  showModal.value = true
}

function openEdit(cat) {
  editMode.value = true
  form.value = {
    id: cat.id,
    code: cat.code,
    name: cat.name,
    parentId: cat.parentId || '',
    depreciationYears: cat.depreciationYears,
    description: cat.description || '',
    sortOrder: cat.sortOrder,
    status: cat.status,
  }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value }
    if (!data.parentId) data.parentId = null
    
    if (editMode.value) {
      await categoryApi.update(form.value.id, data)
    } else {
      await categoryApi.create(data)
    }
    showModal.value = false
    await loadCategories()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function deleteCat(cat) {
  if (!confirm(`確定要停用「${cat.name}」嗎？`)) return
  
  try {
    await categoryApi.delete(cat.id)
    await loadCategories()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">資產分類管理</h3>
      <button @click="openCreate()" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增大類
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>

    <!-- Tree -->
    <div v-else class="space-y-2">
      <template v-for="cat in categories" :key="cat.id">
        <div class="border rounded-lg p-4 bg-white">
          <div class="flex justify-between items-center">
            <div>
              <span class="font-medium">{{ cat.name }}</span>
              <span class="text-gray-500 text-sm ml-2">({{ cat.code }})</span>
              <StatusBadge :status="cat.status" class="ml-2" />
            </div>
            <div class="space-x-2">
              <button @click="openCreate(cat.id)" class="text-sm text-primary-600 hover:text-primary-900">新增小類</button>
              <button @click="openEdit(cat)" class="text-sm text-primary-600 hover:text-primary-900">編輯</button>
              <button @click="deleteCat(cat)" class="text-sm text-red-600 hover:text-red-900">停用</button>
            </div>
          </div>
          
          <!-- Children -->
          <div v-if="cat.children?.length" class="mt-3 ml-6 space-y-2">
            <div v-for="child in cat.children" :key="child.id" class="border rounded p-3 bg-gray-50">
              <div class="flex justify-between items-center">
                <div>
                  <span>{{ child.name }}</span>
                  <span class="text-gray-500 text-sm ml-2">({{ child.code }})</span>
                  <span v-if="child.depreciationYears" class="text-gray-500 text-sm ml-2">
                    折舊 {{ child.depreciationYears }} 年
                  </span>
                  <StatusBadge :status="child.status" class="ml-2" />
                </div>
                <div class="space-x-2">
                  <button @click="openEdit(child)" class="text-sm text-primary-600 hover:text-primary-900">編輯</button>
                  <button @click="deleteCat(child)" class="text-sm text-red-600 hover:text-red-900">停用</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <div v-if="categories.length === 0" class="text-center py-8 text-gray-500">
        尚無分類資料
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editMode ? '編輯分類' : '新增分類'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="label">分類代碼</label>
          <input v-model="form.code" type="text" class="input" required />
        </div>
        <div>
          <label class="label">分類名稱</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div>
          <label class="label">上層分類</label>
          <select v-model="form.parentId" class="input">
            <option value="">無（大類）</option>
            <option v-for="c in flatCategories.filter(x => x.id !== form.id && x.level === 1)" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">折舊年限</label>
          <input v-model.number="form.depreciationYears" type="number" class="input" placeholder="選填" />
        </div>
        <div>
          <label class="label">說明</label>
          <textarea v-model="form.description" class="input" rows="2"></textarea>
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
