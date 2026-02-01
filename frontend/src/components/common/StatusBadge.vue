<script setup>
defineProps({
  status: {
    type: String,
    required: true,
  },
})

const statusConfig = {
  active: { label: '啟用', class: 'bg-green-100 text-green-800' },
  inactive: { label: '停用', class: 'bg-gray-100 text-gray-800' },
  in_use: { label: '使用中', class: 'bg-green-100 text-green-800' },
  idle: { label: '閒置', class: 'bg-yellow-100 text-yellow-800' },
  repair: { label: '維修中', class: 'bg-blue-100 text-blue-800' },
  pending_scrap: { label: '待報廢', class: 'bg-orange-100 text-orange-800' },
  scrapped: { label: '已報廢', class: 'bg-gray-100 text-gray-800' },
  lost: { label: '遺失', class: 'bg-red-100 text-red-800' },
  draft: { label: '草稿', class: 'bg-gray-100 text-gray-800' },
  in_progress: { label: '進行中', class: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', class: 'bg-green-100 text-green-800' },
  closed: { label: '已結案', class: 'bg-gray-100 text-gray-800' },
}
</script>

<template>
  <span
    :class="[
      'px-2 py-1 text-xs font-medium rounded-full',
      statusConfig[status]?.class || 'bg-gray-100 text-gray-800',
    ]"
  >
    {{ statusConfig[status]?.label || status }}
  </span>
</template>
