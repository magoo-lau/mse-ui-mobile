# mse-ui-mobile —— 移动基站

移动端 H5 工作台（Vue3 + Vite + TS + **Vant 4** + Pinia + wujie）。租户端单模式，base=`/m/`，dev :3200。

- 登录（验证码/双因子两段式/域名绑定租户，`device=mobile` 与 PC 会话隔离）
- Tabbar 工作台：client=2 移动菜单树 → 分组宫格（OA 待办徽标），点击进入 wujie 移动子应用
- 我的：深浅色/主题色（localStorage `mse-theme` 与 PC 同 key）、登录设备管理、退出
- wujie 契约与 PC 基座完全同名（props/bus），移动子应用复制 `mse-sample/mse-ui-mobile-sub/` 模板接入

架构、授权口径（client 端维度分离）与移动子应用接入指南：[docs/tech/frontend/mse-ui-mobile.md](../../docs/tech/frontend/mse-ui-mobile.md)
