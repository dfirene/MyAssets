<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-gray-300">404</h1>
      <h2 class="text-2xl font-semibold text-gray-900 mt-4">頁面不存在</h2>
      <p class="text-gray-600 mt-2">您要找的頁面不存在或已被移除</p>
      <RouterLink to="/" class="btn btn-primary mt-6 inline-block">
        返回首頁
      </RouterLink>
    </div>
  </div>
</template>
