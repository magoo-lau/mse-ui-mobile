import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import type { MenuNode } from '../stores/user'

const router = createRouter({
  // base=/m/（生产 nginx location /m/ 与构建 base 同构；dev server 亦以 /m/ 提供）
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', component: () => import('../views/Login.vue') },
    {
      path: '/',
      component: () => import('../views/TabLayout.vue'),
      redirect: '/workbench',
      children: [
        { path: 'workbench', component: () => import('../views/Workbench.vue'), meta: { title: '工作台', tab: true } },
        { path: 'mine', component: () => import('../views/Mine.vue'), meta: { title: '我的', tab: true } }
      ]
    },
    // 微前端子应用：/sub/{appName}/**，全屏容器（自带 NavBar 返回），不带底部 Tabbar
    { path: '/sub/:appName/:pathMatch(.*)*', component: () => import('../micro/WujieContainer.vue') },
    // 登录设备管理（「我的」进入）
    { path: '/profile/sessions', component: () => import('../views/Sessions.vue'), meta: { title: '登录设备' } },
    { path: '/:pathMatch(.*)*', redirect: '/workbench' }
  ]
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  if (to.path === '/login') {
    return userStore.token ? '/workbench' : true
  }
  if (!userStore.token) return '/login'
  if (!userStore.profileLoaded) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.clearLocal()
      return '/login'
    }
  }
  return true
})

/** 工作台分组：group=顶层目录名；subs=子分组（sub 为空串表示页面直挂目录、不渲染子组标题） */
export interface WorkbenchGroup {
  group: string
  subs: { sub: string; items: MenuNode[] }[]
}

/**
 * 移动端工作台宫格数据整形（两级分组）：client=2 菜单树（顶层目录=分组、二级目录=子组标题、
 * type=3 页面=入口）。兼容两种登记形态——
 * · 目录直挂页面（旧形态）：分组内单网格无子组标题；
 * · 分组目录 → 业务子目录 → 页面（550 移动工作台形态）：分组内按子目录再分小节。
 * 顶层散页归入「常用」组。
 */
export function buildWorkbenchGroups(nodes: MenuNode[]): WorkbenchGroup[] {
  const groups: WorkbenchGroup[] = []
  for (const node of nodes) {
    if (node.menu.type === 1) {
      const subs: { sub: string; items: MenuNode[] }[] = []
      for (const child of node.children || []) {
        if (child.menu.type === 1) {
          const items = collectEntries(child.children || [])
          if (items.length) subs.push({ sub: child.menu.name, items })
        } else {
          pushFlat(subs, child)
        }
      }
      if (subs.length) groups.push({ group: node.menu.name, subs })
    } else {
      let group = groups.find((g) => g.group === '常用')
      if (!group) {
        group = { group: '常用', subs: [] }
        groups.unshift(group)
      }
      pushFlat(group.subs, node)
    }
  }
  return groups
}

function pushFlat(subs: { sub: string; items: MenuNode[] }[], node: MenuNode) {
  let sub = subs.find((s) => !s.sub)
  if (!sub) {
    sub = { sub: '', items: [] }
    subs.unshift(sub)
  }
  sub.items.push(node)
}

function collectEntries(nodes: MenuNode[]): MenuNode[] {
  const items: MenuNode[] = []
  for (const node of nodes) {
    if (node.menu.type === 1) items.push(...collectEntries(node.children || []))
    else items.push(node)
  }
  return items
}

export default router
