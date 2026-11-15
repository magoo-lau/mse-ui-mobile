<template>
  <div class="sessions">
    <van-nav-bar title="登录设备" left-arrow @click-left="router.back()" fixed placeholder safe-area-top />
    <van-pull-refresh v-model="refreshing" @refresh="load">
      <template v-if="sessions.length">
        <van-cell-group inset class="session-group">
          <van-cell v-for="s in sessions" :key="s.sessionId" center>
            <template #title>
              <div class="session-title">
                <van-tag :type="s.current ? 'primary' : 'default'" size="medium">
                  {{ s.current ? '当前设备' : deviceLabel(s.deviceType) }}
                </van-tag>
                <span class="session-os">{{ s.os || '未知设备' }}</span>
              </div>
            </template>
            <template #label>
              <div class="session-label">IP {{ s.ip || '-' }} · {{ s.browser || '-' }} · 登录于 {{ formatTime(s.loginTime) }}</div>
            </template>
            <template #value>
              <van-button v-if="!s.current" size="small" plain type="danger" @click="kick(s)">下线</van-button>
            </template>
          </van-cell>
        </van-cell-group>
      </template>
      <van-empty v-else-if="!loading" description="暂无在线会话" />
      <div class="sessions-actions">
        <van-button block plain type="danger" :disabled="!sessions.some((s) => !s.current)" @click="kickOthers">
          下线其他设备
        </van-button>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showConfirmDialog, showSuccessToast } from 'vant'
import { useRouter } from 'vue-router'
import { sessionList, sessionLogout, sessionLogoutOthers, type SessionItem } from '../api/auth'

const router = useRouter()
const sessions = ref<SessionItem[]>([])
const loading = ref(false)
const refreshing = ref(false)

function deviceLabel(deviceType: string) {
  const map: Record<string, string> = { pc: 'PC 端', mobile: '移动端', app: 'App', mini: '小程序' }
  return map[deviceType] || deviceType || '未知端'
}

function formatTime(value: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

async function load() {
  loading.value = true
  try {
    const list = await sessionList()
    sessions.value = Array.isArray(list) ? list : []
  } catch { /* 拦截器已提示 */ }
  loading.value = false
  refreshing.value = false
}

async function kick(s: SessionItem) {
  await showConfirmDialog({ title: '下线设备', message: `确定下线 ${s.os || '该设备'} 上的会话？` })
  await sessionLogout(s.sessionId)
  showSuccessToast('已下线')
  load()
}

async function kickOthers() {
  await showConfirmDialog({ title: '下线其他设备', message: '确定下线除当前设备外的全部会话？' })
  await sessionLogoutOthers()
  showSuccessToast('已全部下线')
  load()
}

onMounted(load)
</script>

<style scoped>
.sessions {
  min-height: 100%;
}
.session-group {
  margin-top: 12px;
}
.session-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.session-os {
  color: var(--van-text-color);
}
.session-label {
  margin-top: 4px;
}
.sessions-actions {
  padding: 20px 16px;
}
</style>
