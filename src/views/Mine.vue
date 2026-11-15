<template>
  <div class="mine">
    <div class="mine-header safe-area-top">
      <div class="avatar">
        <img v-if="userStore.avatar" :src="resolveAvatar(userStore.avatar)" alt="" />
        <van-icon v-else name="manager" size="34" />
      </div>
      <div class="meta">
        <div class="nickname">{{ userStore.nickname || '未登录' }}</div>
        <div class="tenant">{{ userStore.tenantName || '' }}</div>
      </div>
    </div>

    <van-cell-group inset class="mine-group" title="外观">
      <van-cell title="深色模式" center>
        <template #value>
          <van-radio-group :model-value="themeStore.mode" direction="horizontal" @update:model-value="onModeChange">
            <van-radio name="light">浅色</van-radio>
            <van-radio name="dark">深色</van-radio>
            <van-radio name="auto">跟随系统</van-radio>
          </van-radio-group>
        </template>
      </van-cell>
      <van-cell title="主题色" center>
        <template #value>
          <div class="color-dots">
            <span
              v-for="c in PRESET_COLORS"
              :key="c"
              class="color-dot"
              :class="{ active: themeStore.primary.toLowerCase() === c.toLowerCase() }"
              :style="{ background: c }"
              @click="themeStore.setPrimary(c)"
            />
          </div>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset class="mine-group" title="账号">
      <van-cell title="登录设备" icon="apps-o" is-link to="/profile/sessions" />
      <van-cell title="退出登录" icon="revoke" @click="onLogout" class="logout-cell" />
    </van-cell-group>

    <div class="mine-footer">移动工作台</div>
  </div>
</template>

<script setup lang="ts">
import { showConfirmDialog } from 'vant'
import { useRouter } from 'vue-router'
import { PRESET_COLORS, useThemeStore } from '../stores/theme'
import { useUserStore } from '../stores/user'
import type { ThemeMode } from '../stores/theme'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()

/** 头像地址解析：站内规范路径经 /api 代理（dev proxy 与生产 nginx 同约定） */
function resolveAvatar(url: string): string {
  if (!url) return ''
  if (/^(https?:|data:)/.test(url)) return url
  return `/api${url.startsWith('/') ? url : `/${url}`}`
}

function onModeChange(mode: string | number | undefined) {
  themeStore.setMode((mode as ThemeMode) || 'light')
}

async function onLogout() {
  await showConfirmDialog({ title: '退出登录', message: '确定退出当前账号？' })
  await userStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.mine {
  min-height: 100%;
  padding-bottom: 16px;
}
.mine-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 40px 24px 24px;
  background: var(--van-background-2);
}
.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--van-primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.nickname {
  font-size: 18px;
  font-weight: 600;
  color: var(--van-text-color);
}
.tenant {
  margin-top: 4px;
  font-size: 13px;
  color: var(--van-text-color-2);
}
.mine-group {
  margin-top: 12px;
}
.color-dots {
  display: flex;
  gap: 10px;
}
.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
  border: 2px solid transparent;
  cursor: pointer;
}
.color-dot.active {
  border-color: var(--van-text-color);
  box-shadow: 0 0 0 2px var(--van-background-2) inset;
}
.logout-cell {
  color: var(--van-danger-color);
}
.mine-footer {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: var(--van-text-color-3);
}
</style>
