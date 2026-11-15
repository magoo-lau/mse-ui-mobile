import { watch } from 'vue'
import WujieVue from 'wujie-vue3'
import { getEntry } from './apps'
import { useUserStore } from '../stores/user'
import { useMicroStore } from '../stores/micro'
import { useThemeStore } from '../stores/theme'
import { LOGIN_PATH } from '../config/side'

// wujie-vue3 的 ESM 入口仅默认导出组件，bus / preloadApp 是其静态属性
const { bus, preloadApp } = WujieVue

/**
 * 微前端初始化（与 PC 基座同一 bus 契约）：在 pinia 安装后调用（见 main.ts）
 * - 登录态/主题变化广播给存活子应用（alive 模式 props 不更新）
 * - 子应用 401 经 sub:auth-expired 统一登出
 * - 生产环境预加载注册表子应用
 */
export function initMicro() {
  const userStore = useUserStore()
  const microStore = useMicroStore()
  const themeStore = useThemeStore()

  themeStore.init()

  watch(
    () => ({
      token: userStore.token,
      tenantId: userStore.tenantId,
      platform: userStore.platform,
      nickname: userStore.nickname,
      permissions: userStore.permissions
    }),
    (auth) => bus.$emit('auth:change', auth)
  )

  watch(() => themeStore.snapshot, (theme) => bus.$emit('theme:change', theme))

  bus.$on('sub:auth-expired', () => {
    userStore.clearLocal()
    window.location.href = LOGIN_PATH
  })

  if (import.meta.env.PROD) {
    watch(() => microStore.apps, (apps) => {
      apps.forEach((app) => preloadApp({ name: app.name, url: getEntry(app) }))
    }, { immediate: true, deep: true })
  }
}
