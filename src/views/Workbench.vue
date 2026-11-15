<template>
  <div class="workbench">
    <van-nav-bar :title="userStore.siteName || '工作台'" fixed placeholder safe-area-top>
      <template #right>
        <van-icon name="chat-o" size="20" badge="" @click="onMessagePlaceholder" />
      </template>
    </van-nav-bar>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-search v-model="keyword" placeholder="搜索应用" shape="round" />

      <!-- 分组宫格：顶层目录=分组、二级目录=子组标题（如 移动工作台 → 移动审批/车间作业），点击进入 /sub/{name}{path} -->
      <div v-for="group in visibleGroups" :key="group.group" class="wb-group">
        <div class="wb-group-title">{{ group.group }}</div>
        <template v-for="sub in group.subs" :key="sub.sub || group.group">
          <div v-if="sub.sub" class="wb-sub-title">{{ sub.sub }}</div>
          <div class="wb-grid">
            <div v-for="item in sub.items" :key="item.menu.id" class="wb-grid-item" @click="openEntry(item)">
              <div class="wb-icon-wrap">
                <div class="wb-app-icon" :style="{ background: iconBg(item) }">
                  <van-icon :name="iconOf(item)" size="24" />
                </div>
                <!-- 待办角标自绘（van-badge 包裹式在 show=false 时 wrapper 红壳仍可见；仅 oa 审批入口挂待办数） -->
                <span v-if="badgeOf(item) > 0" class="wb-badge">{{ badgeOf(item) > 99 ? '99+' : badgeOf(item) }}</span>
              </div>
              <div class="wb-app-name">{{ item.menu.name }}</div>
            </div>
          </div>
        </template>
      </div>

      <van-empty
        v-if="!visibleGroups.length"
        :description="keyword ? '没有匹配的应用' : '暂无可用应用，请联系管理员在「菜单管理」登记移动端菜单（客户端=移动端）'"
      />
      <div class="wb-footer">{{ userStore.tenantName || '' }}</div>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../api/request'
import { menuFullPath } from '../micro/apps'
import { useUserStore, type MenuNode } from '../stores/user'
import { buildWorkbenchGroups, type WorkbenchGroup } from '../router'

const router = useRouter()
const userStore = useUserStore()

const keyword = ref('')
const refreshing = ref(false)
/** OA 待办数徽标（数字站内信思路的最小落地：仅 oa-mobile 挂 todo/count） */
const oaTodoCount = ref(0)

const groups = computed(() => buildWorkbenchGroups(userStore.menus))

const visibleGroups = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return groups.value
  const filtered: WorkbenchGroup[] = []
  for (const group of groups.value) {
    const subs = group.subs
      .map((s) => ({ sub: s.sub, items: s.items.filter((n) => n.menu.name.includes(kw)) }))
      .filter((s) => s.items.length)
    if (subs.length) filtered.push({ group: group.group, subs })
  }
  return filtered
})

/** 应用图标色板：按菜单 id 稳定取色 */
const ICON_COLORS = ['#409eff', '#00b578', '#ff8f1f', '#fa4b4b', '#8f68f4', '#0aa8a4', '#f0a020', '#5a8dee']
function iconBg(item: MenuNode) {
  return ICON_COLORS[item.menu.id % ICON_COLORS.length]
}
function iconOf(item: MenuNode) {
  const map: Record<string, string> = {
    'oa-mobile': 'orders-o',
    'mes-mobile': 'records-o'
  }
  return map[item.menu.microName || ''] || (item.menu.type === 3 ? 'apps-o' : 'bookmark-o')
}

/** 待办徽标仅挂审批入口（microName=oa-mobile 的第一个入口） */
function badgeOf(item: MenuNode): number {
  if (item.menu.microName !== 'oa-mobile') return 0
  return oaTodoCount.value
}

function openEntry(item: MenuNode) {
  const path = menuFullPath(item.menu)
  if (!path) {
    showToast('该菜单未配置路由地址')
    return
  }
  if (path.startsWith('/sub/')) {
    router.push(path)
  } else if (path.startsWith('/')) {
    router.push(path)
  } else {
    showToast('该菜单路由地址不是内部路由')
  }
}

async function loadBadges() {
  try {
    // 徽标为装饰性数据：失败静默（oa-mobile 未接入时 404/无权限都不打扰）
    const count = await request.get('/oa/process/todo/count', { skipErrorToast: true })
    oaTodoCount.value = Number(count) || 0
  } catch {
    oaTodoCount.value = 0
  }
}

async function onRefresh() {
  try {
    await userStore.fetchProfile()
  } catch { /* profile 失败由拦截器提示 */ }
  await loadBadges()
  refreshing.value = false
}

/** 右上角消息图标占位：点击提示待建设（此前模板引用未定义处理函数，点击即抛 TypeError） */
function onMessagePlaceholder() {
  showToast('消息中心建设中')
}

// 工作台不在基站 keep-alive include 内（仅 WujieContainer 保活），onActivated 不触发——
// 首挂载必须 onMounted 拉待办数，保活切回（若未来纳入缓存）由 onActivated 补
onMounted(loadBadges)
onActivated(loadBadges)
</script>

<style scoped>
.workbench {
  min-height: 100%;
}
.wb-group {
  margin: 4px 0 8px;
}
.wb-group-title {
  padding: 10px 16px 2px;
  font-size: 13px;
  color: var(--van-text-color-2);
}
.wb-sub-title {
  padding: 8px 16px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--van-text-color);
}
.wb-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 0;
  padding: 8px 8px 12px;
  background: var(--van-background-2);
}
.wb-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.wb-icon-wrap {
  position: relative;
}
.wb-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--van-danger-color);
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  box-sizing: border-box;
  z-index: 1;
}
.wb-app-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.wb-app-name {
  font-size: 12px;
  color: var(--van-text-color);
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wb-footer {
  padding: 20px 0 28px;
  text-align: center;
  font-size: 12px;
  color: var(--van-text-color-3);
}
</style>
