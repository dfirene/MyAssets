<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const assetId = route.params.id

const asset = ref(null)
const loading = ref(true)
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <RouterLink to="/assets" class="inline-flex items-center text-gray-600 hover:text-gray-900">
      <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <p class="text-gray-500">載入中...</p>
    </div>

    <!-- Asset Detail -->
    <div v-else-if="asset" class="space-y-6">
      <!-- Header -->
      <div class="card">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ asset.name }}</h1>
            <p class="text-gray-500">資產編號：{{ asset.assetNo }}</p>
          </div>
          <div class="flex space-x-2">
            <button class="btn btn-secondary">編輯</button>
            <button class="btn btn-primary">異動</button>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">基本資訊</h2>
          <dl class="space-y-3">
            <div class="flex">
              <dt class="w-24 text-gray-500">分類</dt>
              <dd class="text-gray-900">{{ asset.category }}</dd>
            </div>
            <div class="flex">
              <dt class="w-24 text-gray-500">規格</dt>
              <dd class="text-gray-900">{{ asset.spec || '-' }}</dd>
            </div>
            <div class="flex">
              <dt class="w-24 text-gray-500">序號</dt>
              <dd class="text-gray-900">{{ asset.serialNo || '-' }}</dd>
            </div>
          </dl>
        </div>

        <div class="card">
          <h2 class="text-lg font-semibold mb-4">使用資訊</h2>
          <dl class="space-y-3">
            <div class="flex">
              <dt class="w-24 text-gray-500">部門</dt>
              <dd class="text-gray-900">{{ asset.department }}</dd>
            </div>
            <div class="flex">
              <dt class="w-24 text-gray-500">保管人</dt>
              <dd class="text-gray-900">{{ asset.custodian }}</dd>
            </div>
            <div class="flex">
              <dt class="w-24 text-gray-500">位置</dt>
              <dd class="text-gray-900">{{ asset.location || '-' }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="card text-center py-12">
      <p class="text-gray-500">找不到此資產</p>
    </div>
  </div>
</template>
