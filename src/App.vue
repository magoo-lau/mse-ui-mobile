<template>
  <van-config-provider :theme="themeStore.resolvedDark ? 'dark' : 'light'" class="app-shell">
    <router-view v-slot="{ Component, route: viewRoute }">
      <!-- 子应用容器按 appName 分组保活（切应用不重载 wujie 沙箱）；页签页不缓存保证刷新即最新 -->
      <keep-alive :include="['WujieContainer']">
        <component :is="Component" :key="viewRoute.params.appName ?? viewRoute.fullPath" />
      </keep-alive>
    </router-view>
    <!-- 底部导航：仅页签页显示（子应用全屏沉浸） -->
    <van-tabbar v-if="route.meta.tab" route fixed placeholder safe-area-bottom>
      <van-tabbar-item replace to="/workbench" icon="apps-o">工作台</van-tabbar-item>
      <van-tabbar-item replace to="/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </van-config-provider>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useThemeStore } from './stores/theme'

defineOptions({ name: 'App' })

const route = useRoute()
const themeStore = useThemeStore()
</script>

<style scoped>
/* 高度链锚点：#app(100%) → .app-shell(100%) → 各页壳/容器按 100%/flex 分层。
   缺此层时 config-provider 高度 auto，会被 wujie 子应用内容反向撑破，
   滚动落到主文档上，内容从 fixed 导航栏下方穿过（搜索框被裁、行项盖到导航区）。 */
.app-shell {
  height: 100%;
}
</style>
