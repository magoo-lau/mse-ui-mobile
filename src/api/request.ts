import axios from 'axios'
import { showToast } from 'vant'
import { LOGIN_PATH, storageKey } from '../config/side'

/** 单请求静默标记：非 0 业务码 / 非 401 异常不弹全局提示，由调用方自行降级（如登录页域名个性化）；
 * 另：下方响应拦截器在 code===0 时 return body.data，运行时调用侧拿到的直接是业务数据，
 * 类型层面经 AxiosInstance 增强同步该解包约定（默认 any 与运行时一致，调用方可显式泛型收紧） */
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean
  }
  export interface AxiosInstance {
    request<T = any>(config: AxiosRequestConfig): Promise<T>
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    head<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    options<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  }
}

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
  // 与 PC 基座同约定：方法级 JSON 头压过 axios ≥1.20 对空 body 的表单编码默认
  headers: {
    post: { 'Content-Type': 'application/json' },
    put: { 'Content-Type': 'application/json' },
    patch: { 'Content-Type': 'application/json' }
  }
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(storageKey('token'))
  if (token) config.headers.Authorization = token
  if (config.data instanceof FormData) config.headers.setContentType(false)
  return config
})

/** 并发请求同时 401 时只提示/跳转一次；整页跳转后模块重载自动复位 */
let redirectingToLogin = false

request.interceptors.response.use(
  (resp) => {
    const body = resp.data
    if (body.code === 0) return body.data
    if (!resp.config.skipErrorToast) showToast(body.message || '请求失败')
    return Promise.reject(body)
  },
  (err) => {
    if (err.response?.status === 401) {
      if (!redirectingToLogin) {
        redirectingToLogin = true
        localStorage.removeItem(storageKey('token'))
        localStorage.removeItem(storageKey('user'))
        showToast(err.response?.data?.message || '账号未登录或会话已过期')
        window.location.href = LOGIN_PATH
      }
    } else if (!err.config?.skipErrorToast) {
      showToast(err.response?.data?.message || err.message || '网络异常')
    }
    return Promise.reject(err)
  }
)

export default request
