import { defineStore } from 'pinia'
import { builtinMicroApps, menuVisible, CLIENT_MOBILE, type MicroAppConfig } from '../micro/apps'

interface MicroAppItem {
  name: string
  title: string
  devEntry: string
  prodEntry: string
  side: number | string
  /** 客户端 1 PC 2 移动端（后端已按 client=2 过滤，此处防御性再过滤） */
  client?: number | string
  /** 是否登记过页面菜单（type=3）：这类应用入口收敛在工作台宫格，不再兜底渲染单项 */
  hasMenus?: boolean
}

/**
 * 移动端子应用注册表（后台配置优先，内置兜底；仅应用地址，页面菜单在菜单管理 client=2 维护）。
 *
 * - 登录后 userStore.fetchProfile 用 /me?client=2 下发的 microApps 填充（client=2 的应用）；
 * - 空列表按 appsRegistered 区分「已登记但不可见=清空」与「从未登记=内置兜底」；
 * - 登出重置回兜底表，避免串账号残留。
 */
export const useMicroStore = defineStore('micro', {
  state: () => ({
    apps: builtinMicroApps as MicroAppConfig[]
  }),
  getters: {
    /** 可见子应用（移动基站仅租户端；menuVisible 内含 client 过滤） */
    visibleApps(state) {
      return () => state.apps.filter((app) => menuVisible(app, false))
    }
  },
  actions: {
    applyFromProfile(list: MicroAppItem[] | undefined | null, appsRegistered?: boolean) {
      if (list?.length) {
        this.apps = list
          .filter((item) => Number(item.client ?? 1) === CLIENT_MOBILE)
          .map((item) => ({
            name: item.name,
            title: item.title,
            devEntry: item.devEntry || '',
            prodEntry: item.prodEntry,
            side: 'tenant' as const,
            client: Number(item.client ?? 1),
            hasMenus: !!item.hasMenus
          }))
        return
      }
      if (appsRegistered) this.apps = []
    },
    reset() {
      this.apps = builtinMicroApps
    }
  }
})
