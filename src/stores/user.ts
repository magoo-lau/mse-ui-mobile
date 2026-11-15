import { defineStore } from 'pinia'
import request from '../api/request'
import { APP_TITLE, storageKey } from '../config/side'
import { useMicroStore } from './micro'

export interface MenuNode {
  menu: {
    id: number
    parentId: number
    name: string
    /** 1 目录 2 菜单 3 子应用页面 */
    type: number
    menuScope: number
    /** 客户端 1 PC 2 移动端（移动端 /me?client=2 下发的树已按端过滤） */
    client: number
    path: string
    /** type=3 所属子应用标识（sys_micro_app.name），渲染为 /sub/{microName}{path} */
    microName: string | null
    component: string
    sort: number
    visible: number
    status: number
  }
  children: MenuNode[]
}

/** 刷新后恢复登录用户信息（token/user 分 key 存，与 request.ts / 路由守卫约定一致） */
function loadPersistedUser(): { tenantId: string | number; nickname: string; platform: boolean; avatar: string } {
  try {
    const raw = localStorage.getItem(storageKey('user'))
    if (raw) return { tenantId: '', nickname: '', platform: false, avatar: '', ...JSON.parse(raw) }
  } catch { /* 忽略损坏数据 */ }
  return { tenantId: '', nickname: '', platform: false, avatar: '' }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem(storageKey('token')) || '',
    ...loadPersistedUser(),
    /** 移动端菜单树（工作台分组宫格数据源，client=2 独立授权）与权限码集合（按钮显隐） */
    menus: [] as MenuNode[],
    permissions: [] as string[],
    roles: [] as string[],
    profileLoaded: false,
    tenantName: '',
    siteName: ''
  }),
  actions: {
    setLogin(data: { tokenValue: string; tenantId: string | number; nickname: string; platform: boolean }) {
      this.token = data.tokenValue
      this.tenantId = data.tenantId
      this.nickname = data.nickname
      this.platform = data.platform
      localStorage.setItem(storageKey('token'), data.tokenValue)
      localStorage.setItem(storageKey('user'), JSON.stringify({ tenantId: data.tenantId, nickname: data.nickname, platform: data.platform }))
    },
    /** 拉取移动端视图的菜单树/权限码/子应用：client=2 与 PC 基座同一端点，服务端按端过滤 */
    async fetchProfile() {
      const data = await request.get('/system/profile/me', { params: { client: 2 } })
      this.menus = data.menus || []
      this.permissions = data.permissions || []
      this.roles = data.roles || []
      if (data.user?.nickname) this.nickname = data.user.nickname
      this.avatar = data.user?.avatar || ''
      this.tenantName = data.tenantName || ''
      // 子应用注册：后台配置优先（client=2 已由服务端过滤）；空列表按 appsRegistered 区分
      // 「已登记但不可见=清空」与「从未登记=内置兜底」（stores/micro.ts）
      useMicroStore().applyFromProfile(data.microApps, data.appsRegistered)
      this.profileLoaded = true
      this.loadSiteName()
    },
    /** 界面名称内置参数 sys.site.name（每租户各自定制）；缺失/读取失败静默回退构建期标题 */
    async loadSiteName() {
      try {
        const value = await request.get('/system/config/config-key/sys.site.name', { skipErrorToast: true })
        this.siteName = value || ''
      } catch {
        this.siteName = ''
      }
      document.title = this.siteName || APP_TITLE
    },
    /** 按钮级权限判定：超管（*）或命中任一权限码（权限点双端共享，code 与 PC 同名） */
    hasPermission(codes: string | string[]): boolean {
      const list = Array.isArray(codes) ? codes : [codes]
      if (!list.length) return true
      return this.permissions.includes('*') || list.some((code) => this.permissions.includes(code))
    },
    async logout() {
      try {
        await request.post('/auth/logout')
      } catch { /* 会话已失效时静默 */ }
      this.clearLocal()
    },
    clearLocal() {
      this.token = ''
      this.tenantId = ''
      this.nickname = ''
      this.platform = false
      this.avatar = ''
      this.menus = []
      this.permissions = []
      this.roles = []
      this.profileLoaded = false
      this.tenantName = ''
      this.siteName = ''
      document.title = APP_TITLE
      useMicroStore().reset()
      localStorage.removeItem(storageKey('token'))
      localStorage.removeItem(storageKey('user'))
    }
  }
})
