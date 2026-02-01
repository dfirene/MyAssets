<script setup>
import { ref } from 'vue'

const assets = ref([])
const loading = ref(false)
const searchQuery = ref('')
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">資產管理</h1>
        <p class="text-gray-600">管理所有資訊資產</p>
      </div>
      <button class="btn btn-primary">
        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增資產
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="card">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            placeholder="搜尋資產編號、名稱..."
          />
        </div>
        <select class="input w-40">
          <option value="">全部分類</option>
        </select>
        <select class="input w-40">
          <option value="">全部狀態</option>
        </select>
        <button class="btn btn-secondary">搜尋</button>
      </div>
    </div>

    <!-- Asset Table -->
    <div class="card overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              資產編號
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              名稱
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              分類
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              使用部門
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              保管人
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              狀態
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="loading">
            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
              載入中...
            </td>
          </tr>
          <tr v-else-if="assets.length === 0">
            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
              尚無資產資料
            </td>
          </tr>
          <tr v-for="asset in assets" :key="asset.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {{ asset.assetNo }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ asset.name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ asset.category }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ asset.department }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ asset.custodian }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                使用中
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <button class="text-primary-600 hover:text-primary-900">檢視</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
