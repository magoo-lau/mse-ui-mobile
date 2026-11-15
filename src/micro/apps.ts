/**
 * 移动端子应用「内置兜底注册表」（仅应用地址类配置；正式通道=业务工程版本化脚本登记 sys_micro_app(client=2) + 移动菜单）
 *
 * 生产入口部署于 /m-apps/{name}/（nginx location /m-apps/），路由前缀仍为 /sub/{name}
 * （与 PC 基座同一 urlPrefix 契约，子应用模板零改动复用）。
 */
export type MicroAppSide = 'tenant' | 'platform' | 'both'

export const CLIENT_PC = 1
export const CLIENT_MOBILE = 2

export interface MicroAppConfig {
  /** 子应用唯一标识，决定路由前缀：/sub/{name} */
  name: string
  /** 显示名（未配置页面菜单时作为工作台单项标题） */
  title: string
  /** 开发环境入口（子应用 dev server 地址） */
  devEntry: string
  /** 生产环境入口（子应用静态资源部署路径） */
  prodEntry: string
  /** 菜单可见端（移动基站仅消费租户端） */
  side: MicroAppSide
  /** 客户端 1 PC 2 移动端 */
  client?: number
  /** 是否登记过页面菜单（type=3） */
  hasMenus?: boolean
}

export const builtinMicroApps: MicroAppConfig[] = [
  {
    // 协同办公移动版：mse-modules/mse-oa（oa-mobile-ui 子应用），待办审批/发起审批
    name: 'oa-mobile',
    title: '审批',
    devEntry: '//localhost:4210',
    prodEntry: '/m-apps/oa/',
    side: 'tenant',
    client: CLIENT_MOBILE
  },
  {
    // 制造执行移动版：mse-modules/mse-mes（mes-mobile-ui 子应用），报工/点检/扫码
    name: 'mes-mobile',
    title: '车间作业',
    devEntry: '//localhost:4220',
    prodEntry: '/m-apps/mes/',
    side: 'tenant',
    client: CLIENT_MOBILE
  }
]

export function getEntry(app: MicroAppConfig): string {
  return import.meta.env.DEV ? app.devEntry : app.prodEntry
}

export function menuVisible(app: MicroAppConfig, platform: boolean): boolean {
  if ((app.client ?? CLIENT_PC) === CLIENT_PC) return false
  return app.side === 'both' || app.side === (platform ? 'platform' : 'tenant')
}

/**
 * 菜单树节点的完整路由地址（与 PC 基座 menuFullPath 同构）：
 * type=3 子应用页面 → /sub/{microName}{path}（:param 段取默认值 1）；目录/菜单 → 绝对路径原样。
 */
export function menuFullPath(menu: { type: number; path: string; microName?: string | null }): string {
  if (menu.type === 3) {
    const concrete = (menu.path || '')
      .split('/')
      .map((seg) => (seg.startsWith(':') ? '1' : seg))
      .join('/')
    return `/sub/${menu.microName || ''}${concrete}`
  }
  return menu.path || ''
}
