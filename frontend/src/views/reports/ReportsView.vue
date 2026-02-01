<script setup>
const reports = [
  { id: 'asset-summary', name: '資產總覽報表', description: '依分類、部門、狀態統計資產數量與金額', icon: 'chart' },
  { id: 'asset-detail', name: '資產明細報表', description: '資產清單明細，支援多條件篩選', icon: 'list' },
  { id: 'inventory-progress', name: '盤點進度報表', description: '各盤點計畫執行進度統計', icon: 'progress' },
  { id: 'inventory-diff', name: '盤點差異報表', description: '盤盈、盤虧、差異清單', icon: 'diff' },
  { id: 'movement', name: '資產異動報表', description: '期間內資產異動紀錄', icon: 'movement' },
  { id: 'warranty', name: '保固到期報表', description: '即將到期或已到期保固清單', icon: 'warranty' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">報表中心</h1>
      <p class="text-gray-600">查詢各類統計報表</p>
    </div>

    <!-- Reports Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="report in reports"
        :key="report.id"
        class="card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start space-x-4">
          <div class="p-3 bg-primary-100 rounded-lg">
            <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-medium text-gray-900">{{ report.name }}</h3>
            <p class="text-sm text-gray-500 mt-1">{{ report.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
