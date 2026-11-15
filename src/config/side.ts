/** 构建侧别常量（移动基站仅租户端单模式，键位与 PC 基座隔离防同域互踩） */

export const IS_PLATFORM = false

/** 本侧登录页（401 整页跳转目标） */
export const LOGIN_PATH = '/login'

/** 应用标题（siteName 未配置时的回退值） */
export const APP_TITLE = '移动工作台'

/** localStorage 键位：token/user 加 mobile- 前缀；主题沿用 mse-theme（同域同浏览器与 PC 偏好一致） */
export function storageKey(kind: 'token' | 'user'): string {
  return kind === 'token' ? 'mse-mobile-token' : 'mse-mobile-user'
}
