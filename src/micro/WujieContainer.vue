<template>
  <div class="micro-container">
    <!-- 基站唯一导航层：应用名兜底 + 子应用 sub:title 上报的页面标题；返回箭头是子应用内所有页面的统一出口
         （子应用页面自身不再渲染 fixed navbar——wujie 下 fixed 相对视口会盖住本层导致无返回） -->
    <van-nav-bar v-if="app" :title="pageTitle" left-arrow @click-left="onBack" fixed placeholder safe-area-top />
    <div v-if="app" class="micro-body">
      <WujieVue
        :key="renderKey"
        width="100%"
        height="100%"
        :name="appName"
        :url="entry"
        :sync="true"
        :alive="true"
        :props="wujieProps"
        :after-mount="markReady"
        :activated="markReady"
      />
      <div v-if="!ready" class="micro-loading">
        <van-loading size="28" vertical>加载中…</van-loading>
      </div>
    </div>
    <van-empty v-else description="未找到该应用，请在平台端登记移动端子应用或在 src/micro/apps.ts 兜底表中登记" />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WujieVue from 'wujie-vue3'
import { getEntry } from './apps'
import { useUserStore } from '../stores/user'
import { useMicroStore } from '../stores/micro'
import { useThemeStore } from '../stores/theme'

defineOptions({ name: 'WujieContainer' })

const { bus, destroyApp } = WujieVue
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const microStore = useMicroStore()
const themeStore = useThemeStore()

// appName 只在实例创建时解析一次：keep-alive 按 appName 分组实例，实例复用时 route 已变化
const appName = String(route.params.appName ?? '')
const app = computed(() => microStore.apps.find((item) => item.name === appName))
const entry = computed(() => (app.value ? getEntry(app.value) : ''))

/** 导航栏标题：子应用经 sub:title 上报当前页中文标题（路由 meta.title），未上报回退应用名 */
const pageTitle = ref(app.value?.title || '')
function onSubTitle(msg: { urlPrefix: string; title: string }) {
  if (msg.urlPrefix === `/sub/${appName}` && msg.title) pageTitle.value = msg.title
}
bus.$on('sub:title', onSubTitle)

// 加载态与快速切换自愈（与 PC 基座 WujieContainer 同策略）：
// ① 未就绪前显示 loading 占位；② 加载中途切走的实例重新激活时清空串行队列重建实例
const ready = ref(false)
const renderKey = ref(0)
const leftMidLoad = ref(false)
let readyFallbackTimer: ReturnType<typeof setTimeout> | undefined

function markReady() {
  ready.value = true
  if (readyFallbackTimer) {
    clearTimeout(readyFallbackTimer)
    readyFallbackTimer = undefined
  }
}

function armReadyFallback() {
  readyFallbackTimer = setTimeout(markReady, 30000)
}
armReadyFallback()

// wujie props（与 PC 基座同一契约结构）：登录态后续变化经 bus auth:change 广播
const wujieProps = computed(() => ({
  urlPrefix: `/sub/${appName}`,
  token: userStore.token,
  tenantId: userStore.tenantId,
  platform: userStore.platform,
  nickname: userStore.nickname,
  permissions: userStore.permissions,
  theme: themeStore.snapshot
}))

// 主应用路由变化经 bus 下发给子应用（wujie sync 只做子→主单向同步）
function navigateToSub(path: string, query: Record<string, unknown> = {}) {
  const prefix = `/sub/${appName}`
  if (!app.value || (path !== prefix && !path.startsWith(`${prefix}/`))) return
  const subPath = path === prefix ? '/' : path.slice(prefix.length) || '/'
  const entries = Object.entries(query).filter(([, v]) => v != null)
  const qs = entries.length ? '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : ''
  bus.$emit('sub:navigate', { urlPrefix: prefix, path: subPath + qs })
}

// 子应用上报就绪后再下发一次当前目标路由（直达/刷新场景 immediate 下发早于就绪会丢失）
function onSubReady(msg: { urlPrefix: string }) {
  if (msg.urlPrefix === `/sub/${appName}`) {
    markReady()
    navigateToSub(route.path, route.query)
  }
}
bus.$on('sub:ready', onSubReady)

function clearWujieQueue() {
  const queue = (window as any).__WUJIE_QUEUE
  if (queue && queue[appName]) delete queue[appName]
}

function onBack() {
  // 子应用内部有历史则返回上一页（经子应用自身路由），否则回工作台
  if (window.history.length > 1) router.back()
  else router.replace('/workbench')
}

onDeactivated(() => {
  if (!ready.value) leftMidLoad.value = true
})

onActivated(() => {
  if (leftMidLoad.value && !ready.value) {
    leftMidLoad.value = false
    if (readyFallbackTimer) clearTimeout(readyFallbackTimer)
    armReadyFallback()
    clearWujieQueue()
    renderKey.value++
  }
})

onBeforeUnmount(() => {
  bus.$off('sub:ready', onSubReady)
  bus.$off('sub:title', onSubTitle)
  if (readyFallbackTimer) clearTimeout(readyFallbackTimer)
  clearWujieQueue()
})
</script>

<style scoped>
.micro-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.micro-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  /* 挂载链钉满高度：wujie 组件根 div 与 wujie-app 宿主默认 auto/inline，
     子应用内部 html/body/#app 的 height:100% 链会解析成内容高——.sub-body 永不内滚，
     滚动落到基站主文档，内容从 fixed 导航栏下穿过。宿主块级化钉满后子应用自行内滚。 */
  display: flex;
  flex-direction: column;
}
.micro-body > :deep(div) {
  flex: 1;
}
.micro-body :deep(wujie-app) {
  display: block;
  height: 100%;
}
.micro-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--van-background);
  z-index: 1;
  pointer-events: none;
}
</style>
