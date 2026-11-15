import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局外观状态（与 PC 基座 stores/theme.ts 同构，localStorage 同 key「mse-theme」）：
 * 深浅色模式 + 主题色（设备级偏好不入库）。
 *
 * - mode=auto 跟随系统（matchMedia 实时监听）；snapshot 下发解析结果，子应用免判断
 * - Vant 4 暗色：html 根节点挂 van-theme-dark 类（全量 --van-* 变量随类生效，传送门弹层同覆盖）；
 *   主色写 --van-primary-color 到根节点（弹层 teleport 到 body 也能继承）
 * - 子应用联动：micro/index.ts watch snapshot 经 bus 广播 theme:change（alive 模式 props 不更新）
 */

export type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'mse-theme'
export const DEFAULT_PRIMARY = '#409eff'
/** 预设主色（「我的」页快捷选择，与 PC 主题色板一致） */
export const PRESET_COLORS = ['#409eff', '#00b578', '#ff8f1f', '#fa4b4b', '#8f68f4', '#0aa8a4']

function parseHex(color: string): boolean {
  const hex = color.trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex)
}

/** 系统深色状态（模块级 ref：matchMedia 监听全局唯一，auto 模式共用） */
const systemDark = ref(false)

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'light' as ThemeMode,
    primary: DEFAULT_PRIMARY
  }),
  getters: {
    /** 实际生效深色：dark 恒深、light 恒浅、auto 跟随系统 */
    resolvedDark(): boolean {
      return this.mode === 'dark' || (this.mode === 'auto' && systemDark.value)
    },
    /** 下发子应用的快照（wujie props 初始值 / theme:change 事件共用同一结构，与 PC 契约一致） */
    snapshot(): { dark: boolean; primary: string } {
      return { dark: this.resolvedDark, primary: this.primary }
    }
  },
  actions: {
    /** 应用启动调用一次（initMicro 内）：读偏好、挂系统监听、应用首个主题 */
    init() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const saved = JSON.parse(raw) as { mode?: ThemeMode; primary?: string }
          if (saved.mode === 'light' || saved.mode === 'dark' || saved.mode === 'auto') this.mode = saved.mode
          if (saved.primary && parseHex(saved.primary)) this.primary = saved.primary
        }
      } catch {
        /* 坏数据按默认值处理 */
      }
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = mql.matches
      mql.addEventListener('change', (e) => {
        systemDark.value = e.matches
        this.apply()
      })
      this.apply()
    },
    setMode(mode: ThemeMode) {
      this.mode = mode
      this.persist()
      this.apply()
    },
    setPrimary(color: string) {
      if (!parseHex(color)) return
      this.primary = color
      this.persist()
      this.apply()
    },
    persist() {
      // 与 PC 同 key 同结构（不含 layout/showTags——移动端无此偏好），同域下与 PC 偏好互通
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: this.mode, primary: this.primary }))
    },
    /** 写 html.dark / van-theme-dark + 主色变量（内联样式优先级高于 Vant 默认值） */
    apply() {
      const root = document.documentElement
      root.classList.toggle('dark', this.resolvedDark)
      root.classList.toggle('van-theme-dark', this.resolvedDark)
      root.style.setProperty('--van-primary-color', this.primary)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', this.resolvedDark ? '#1f1f1f' : this.primary)
    }
  }
})
