<script setup>
import { ref, shallowRef, markRaw } from 'vue'
import UsersTab from './tabs/UsersTab.vue'
import DepartmentsTab from './tabs/DepartmentsTab.vue'
import CategoriesTab from './tabs/CategoriesTab.vue'
import LocationsTab from './tabs/LocationsTab.vue'
import SuppliersTab from './tabs/SuppliersTab.vue'

const tabs = [
  { id: 'users', name: '使用者管理', component: markRaw(UsersTab) },
  { id: 'departments', name: '部門管理', component: markRaw(DepartmentsTab) },
  { id: 'categories', name: '資產分類', component: markRaw(CategoriesTab) },
  { id: 'locations', name: '存放位置', component: markRaw(LocationsTab) },
  { id: 'suppliers', name: '供應商', component: markRaw(SuppliersTab) },
]

const activeTab = ref('users')
const currentComponent = shallowRef(tabs[0].component)

function switchTab(tabId) {
  activeTab.value = tabId
  const tab = tabs.find(t => t.id === tabId)
  if (tab) {
    currentComponent.value = tab.component
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">系統設定</h1>
      <p class="text-gray-600">管理系統基礎資料與設定</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="switchTab(tab.id)"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
            activeTab === tab.id
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="card">
      <component :is="currentComponent" />
    </div>
  </div>
</template>
