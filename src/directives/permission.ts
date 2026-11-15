import type { Directive } from 'vue'
import { useUserStore } from '../stores/user'

/**
 * 按钮级权限指令（与 PC 基座 v-permission 同语义）：无权限直接移除元素。
 * 权限点双端共享（sys_permission.code 全局唯一），移动端直接复用 PC 权限码。
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const userStore = useUserStore()
    if (!userStore.hasPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  }
}
