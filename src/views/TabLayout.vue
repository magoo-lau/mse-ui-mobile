<template>
  <!-- Tab 页共用外壳：仅提供路由出口（Tabbar 由 App.vue 统一渲染） -->
  <router-view />
</template>

<script setup lang="ts">
defineOptions({ name: 'TabLayout' })
</script>
