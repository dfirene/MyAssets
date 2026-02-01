<script setup>
import { ref, onMounted } from 'vue'
import Modal from '@/components/common/Modal.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { locationApi } from '@/api/basicData'

const loading = ref(false)
const locations = ref([])
const flatLocations = ref([])
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

const levelNames = ['', '廠區/大樓', '樓層', '區域']

onMounted(async () => {
  await loadLocations()
})

async function loadLocations() {
  loading.value = true
  try {
    const [treeRes, flatRes] = await Promise.all([
      locationApi.list({ includeInactive: true }),
      locationApi.list({ flat: true, includeInactive: true }),
    ])
    locations.value = treeRes.data.data
    flatLocations.value = flatRes.data.data
  } catch (error) {
    console.error('載入位置失敗:', error)
  } finally {
    loading.value = false
  }
}

function openCreate(parentId = null, level = 1) {
  editMode.value = false
  form.value = {
    id: null,
    code: '',
    name: '',
    parentId: parentId || '',
    sortOrder: 0,
    status: 'active',
    _level: level,
  }
  showModal.value = true
}

function openEdit(loc) {
  editMode.value = true
  form.value = {
    id: loc.id,
    code: loc.code,
    name: loc.name,
    parentId: loc.parentId || '',
    sortOrder: loc.sortOrder,
    status: loc.status,
    _level: loc.level,
  }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value }
    delete data._level
    if (!data.parentId) data.parentId = null
    
    if (editMode.value) {
      await locationApi.update(form.value.id, data)
    } else {
      await locationApi.create(data)
    }
    showModal.value = false
    await loadLocations()
  } catch (error) {
    alert(error.response?.data?.error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function deleteLoc(loc) {
  if (!confirm(`確定要停用「${loc.name}」嗎？`)) return
  
  try {
    await locationApi.delete(loc.id)
    await loadLocations()
  } catch (error) {
    alert(error.response?.data?.error?.message || '刪除失敗')
  }
}

function renderTree(items, level = 1) {
  return items
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">存放位置管理</h3>
      <button @click="openCreate(null, 1)" class="btn btn-primary">
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增廠區/大樓
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8 text-gray-500">載入中...</div>

    <!-- Tree -->
    <div v-else class="space-y-2">
      <template v-for="loc1 in locations" :key="loc1.id">
        <!-- Level 1: 廠區/大樓 -->
        <div class="border rounded-lg bg-white">
          <div class="flex justify-between items-center p-4">
            <div>
              <span class="font-medium">🏢 {{ loc1.name }}</span>
              <span class="text-gray-500 text-sm ml-2">({{ loc1.code }})</span>
              <StatusBadge :status="loc1.status" class="ml-2" />
            </div>
            <div class="space-x-2">
              <button @click="openCreate(loc1.id, 2)" class="text-sm text-primary-600 hover:text-primary-900">新增樓層</button>
              <button @click="openEdit(loc1)" class="text-sm text-primary-600 hover:text-primary-900">編輯</button>
              <button @click="deleteLoc(loc1)" class="text-sm text-red-600 hover:text-red-900">停用</button>
            </div>
          </div>
          
          <!-- Level 2: 樓層 -->
          <div v-if="loc1.children?.length" class="border-t">
            <template v-for="loc2 in loc1.children" :key="loc2.id">
              <div class="ml-6 border-b last:border-b-0">
                <div class="flex justify-between items-center p-3">
                  <div>
                    <span>📍 {{ loc2.name }}</span>
                    <span class="text-gray-500 text-sm ml-2">({{ loc2.code }})</span>
                    <StatusBadge :status="loc2.status" class="ml-2" />
                  </div>
                  <div class="space-x-2">
                    <button @click="openCreate(loc2.id, 3)" class="text-sm text-primary-600 hover:text-primary-900">新增區域</button>
                    <button @click="openEdit(loc2)" class="text-sm text-primary-600 hover:text-primary-900">編輯</button>
                    <button @click="deleteLoc(loc2)" class="text-sm text-red-600 hover:text-red-900">停用</button>
                  </div>
                </div>

                <!-- Level 3: 區域 -->
                <div v-if="loc2.children?.length" class="ml-6 bg-gray-50 rounded mb-2">
                  <div v-for="loc3 in loc2.children" :key="loc3.id" class="flex justify-between items-center p-2 border-b last:border-b-0">
                    <div>
                      <span class="text-sm">📎 {{ loc3.name }}</span>
                      <span class="text-gray-500 text-xs ml-2">({{ loc3.code }})</span>
                      <StatusBadge :status="loc3.status" class="ml-2" />
                    </div>
                    <div class="space-x-2">
                      <button @click="openEdit(loc3)" class="text-xs text-primary-600 hover:text-primary-900">編輯</button>
                      <button @click="deleteLoc(loc3)" class="text-xs text-red-600 hover:text-red-900">停用</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
      
      <div v-if="locations.length === 0" class="text-center py-8 text-gray-500">
        尚無位置資料
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editMode ? '編輯位置' : `新增${levelNames[form._level] || '位置'}`" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="label">位置代碼</label>
          <input v-model="form.code" type="text" class="input" required />
        </div>
        <div>
          <label class="label">位置名稱</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div v-if="form._level > 1 || editMode">
          <label class="label">上層位置</label>
          <select v-model="form.parentId" class="input" :disabled="!editMode && form._level > 1">
            <option value="">無（頂層）</option>
            <option 
              v-for="l in flatLocations.filter(x => x.id !== form.id && x.level < 3)" 
              :key="l.id" 
              :value="l.id"
            >
              {{ '　'.repeat(l.level - 1) }}{{ l.name }}
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
