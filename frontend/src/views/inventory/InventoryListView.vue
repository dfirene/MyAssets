<script setup>
import { ref } from 'vue'

const plans = ref([])
const loading = ref(false)
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">盤點管理</h1>
        <p class="text-gray-600">管理盤點計畫與執行盤點作業</p>
      </div>
      <button class="btn btn-primary">
        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        新增盤點計畫
      </button>
    </div>

    <!-- Plans List -->
    <div class="card">
      <div v-if="loading" class="text-center py-12 text-gray-500">
        載入中...
      </div>
      <div v-else-if="plans.length === 0" class="text-center py-12">
        <svg class="h-12 w-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="mt-2 text-gray-500">尚無盤點計畫</p>
        <button class="mt-4 btn btn-primary">建立第一個盤點計畫</button>
      </div>
      <div v-else class="divide-y">
        <div v-for="plan in plans" :key="plan.id" class="py-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-medium text-gray-900">{{ plan.name }}</h3>
              <p class="text-sm text-gray-500">{{ plan.startDate }} ~ {{ plan.endDate }}</p>
            </div>
            <span class="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
              {{ plan.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
