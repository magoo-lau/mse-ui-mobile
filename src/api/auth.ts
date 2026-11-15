import request from './request'

/** 登录成功态（/auth/login 两段式的最终产物；字段与后端 AuthController.LoginResult 对应） */
export interface LoginResult {
  tokenName: string
  tokenValue: string
  tenantId: number | string
  userId: number | string
  nickname: string
  platform: boolean
}

/** 登录响应（两段式）：twoFactorRequired=true 时持有 tempToken 走 /auth/login/2fa */
export interface LoginResponse {
  twoFactorRequired: boolean
  totpEnroll: boolean
  tempToken: string | null
  result: LoginResult | null
}

/** 图形验证码挑战（required=false 时登录页隐藏验证码行） */
export interface CaptchaChallenge {
  required: boolean
  captchaId: string | null
  image: string | null
}

/** 双因子阶段挑战：enroll=true 附绑定二维码；否则附邮箱通道可用性 */
export interface TwoFactorChallenge {
  enroll: boolean
  enrollment: { secret: string; otpauthUri: string; qrImage: string } | null
  emailAvailable: boolean
  maskedEmail: string | null
}

/** 域名绑定租户（/auth/domain/config 命中时登录页锁定并隐藏租户编码） */
export interface DomainBranding {
  domain: string
  tenantId: number | null
  tenantCode: string | null
  tenantName: string | null
  siteTitle: string | null
  siteLogo: string | null
  loginBackground: string | null
  backgroundColor: string | null
  copyright: string | null
}

/** 移动端登录固定上报 device=mobile：Sa-Token deviceType 据此隔离会话（同端互斥顶号策略按租户参数生效） */
export const MOBILE_DEVICE = 'mobile'

export const newCaptcha = (params: { tenantId?: number; tenantCode?: string; username?: string }) =>
  request.get('/auth/captcha/new', { params, skipErrorToast: true })

export const login = (data: {
  tenantId?: number
  tenantCode?: string
  username: string
  password: string
  originDomain: string
  device: string
  captchaId?: string
  captchaCode?: string
}) => request.post('/auth/login', data, { skipErrorToast: true })

export const twoFactorChallenge = (tempToken: string) =>
  request.get('/auth/2fa/challenge', { params: { tempToken }, skipErrorToast: true })

export const sendTwoFactorEmailCode = (tempToken: string) =>
  request.post('/auth/2fa/email-code', { tempToken })

export const twoFactorLogin = (data: { tempToken: string; code: string; channel?: 'totp' | 'email' }) =>
  request.post('/auth/login/2fa', data, { skipErrorToast: true })

export const domainConfig = () =>
  request.get('/auth/domain/config', { params: { host: window.location.hostname }, skipErrorToast: true })

/** 在线会话自助管理（「我的 → 登录设备」） */
export interface SessionItem {
  sessionId: string
  deviceType: string
  ip: string
  browser: string
  os: string
  loginTime: string
  current: boolean
}

export const sessionList = () => request.get('/auth/session/list')

export const sessionLogout = (sessionId: string) =>
  request.post('/auth/session/logout', { sessionId })

export const sessionLogoutOthers = () => request.post('/auth/session/logout-others')
