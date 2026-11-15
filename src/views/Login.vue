<template>
  <div class="login-page">
    <div class="login-hero">
      <div class="login-title">{{ branding?.siteTitle || '移动工作台' }}</div>
      <div class="login-subtitle" v-if="boundTenant">欢迎，{{ boundTenant.tenantName }}</div>
    </div>

    <van-form class="login-form" @submit="doLogin">
      <van-cell-group inset>
        <van-field
          v-if="!boundTenant"
          v-model="form.tenantCode"
          name="tenantCode"
          label="租户编码"
          placeholder="请输入租户编码"
          clearable
          :rules="[{ required: true, message: '请输入租户编码' }]"
        />
        <van-field
          v-model="form.username"
          name="username"
          label="账号"
          placeholder="请输入账号"
          clearable
          :rules="[{ required: true, message: '请输入账号' }]"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
        <van-field
          v-if="captcha.required"
          v-model="form.captchaCode"
          name="captchaCode"
          label="验证码"
          placeholder="图形验证码"
          :rules="[{ required: true, message: '请输入图形验证码' }]"
        >
          <template #button>
            <img v-if="captcha.image" :src="captcha.image" class="captcha-img" alt="验证码" @click="refreshCaptcha" />
          </template>
        </van-field>
      </van-cell-group>
      <div class="login-submit">
        <van-button round block type="primary" native-type="submit" :loading="loading" loading-text="登录中…">
          登 录
        </van-button>
      </div>
    </van-form>

    <!-- 双因子第二段：动态码输入（TOTP 验证器 / 邮箱通道） -->
    <van-popup v-model:show="twoFactorVisible" round :close-on-click-overlay="false" class="twofa-popup">
      <div class="twofa-box">
        <div class="twofa-title">双因子验证</div>
        <div class="twofa-desc" v-if="twoFactor.enroll">首次使用请先绑定验证器</div>
        <div class="twofa-desc" v-else-if="twoFactor.maskedEmail">动态码已发送至 {{ twoFactor.maskedEmail }}</div>
        <img v-if="twoFactor.enroll && twoFactor.enrollment?.qrImage" :src="twoFactor.enrollment!.qrImage" class="twofa-qr" alt="绑定二维码" />
        <van-field v-model="twoFactorCode" center clearable label="动态码" placeholder="6 位动态码">
          <template #button>
            <van-button
              v-if="twoFactor.emailAvailable"
              size="small"
              type="primary"
              :disabled="emailCooldown > 0"
              @click="sendEmailCode"
            >
              {{ emailCooldown > 0 ? `${emailCooldown}s` : '发邮箱码' }}
            </van-button>
          </template>
        </van-field>
        <div class="twofa-actions">
          <van-button size="small" @click="cancelTwoFactor">取消</van-button>
          <van-button size="small" type="primary" :loading="twoFactorLoading" @click="doTwoFactorLogin">确 认</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../api/request'
import {
  MOBILE_DEVICE, domainConfig, login, newCaptcha, twoFactorChallenge, twoFactorLogin, sendTwoFactorEmailCode,
  type CaptchaChallenge, type DomainBranding, type LoginResponse, type TwoFactorChallenge
} from '../api/auth'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({ tenantCode: '', username: '', password: '', captchaCode: '' })
const captcha = reactive<CaptchaChallenge>({ required: false, captchaId: null, image: null })
const branding = ref<DomainBranding | null>(null)
const loading = ref(false)

/** 域名绑定租户：锁定并隐藏租户编码输入 */
const boundTenant = ref<{ tenantId: number; tenantCode: string; tenantName: string } | null>(null)

/** 两段式双因子状态 */
const twoFactorVisible = ref(false)
const twoFactorLoading = ref(false)
const twoFactorCode = ref('')
const twoFactor = reactive<TwoFactorChallenge>({ enroll: false, enrollment: null, emailAvailable: false, maskedEmail: null })
let pendingTempToken = ''
const emailCooldown = ref(0)
let emailTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  // 域名个性化（标题/绑定租户）：装饰性接口，失败静默走默认
  try {
    const data = await domainConfig()
    if (data) {
      branding.value = data
      if (data.tenantId) {
        boundTenant.value = { tenantId: data.tenantId, tenantCode: data.tenantCode || '', tenantName: data.tenantName || '' }
      }
    }
  } catch { /* 静默回退 */ }
})

async function refreshCaptcha() {
  if (!form.tenantCode && !boundTenant.value) return
  const data: CaptchaChallenge = await newCaptcha({
    tenantId: boundTenant.value?.tenantId,
    tenantCode: boundTenant.value?.tenantCode || form.tenantCode || undefined,
    username: form.username || undefined
  })
  captcha.required = !!data.required
  captcha.captchaId = data.captchaId
  captcha.image = data.image
}

async function doLogin() {
  loading.value = true
  try {
    const resp: LoginResponse = await login({
      tenantId: boundTenant.value?.tenantId,
      tenantCode: boundTenant.value?.tenantCode || form.tenantCode || undefined,
      username: form.username,
      password: form.password,
      originDomain: window.location.hostname,
      device: MOBILE_DEVICE,
      captchaId: captcha.captchaId || undefined,
      captchaCode: form.captchaCode || undefined
    })
    if (resp.twoFactorRequired && resp.tempToken) {
      pendingTempToken = resp.tempToken
      await enterTwoFactor()
      return
    }
    if (resp.result) onLoginSuccess(resp.result)
  } catch (err: any) {
    // 登录失败提示：优先后端细分文案；无论何种失败都刷新验证码挑战（一次性，已消费即失效）
    showToast(err?.message || err?.response?.data?.message || '登录失败')
    form.password = ''
    await refreshCaptcha()
  } finally {
    loading.value = false
  }
}

async function enterTwoFactor() {
  try {
    const challenge: TwoFactorChallenge = await twoFactorChallenge(pendingTempToken)
    Object.assign(twoFactor, challenge)
    twoFactorCode.value = ''
    twoFactorVisible.value = true
  } catch (err: any) {
    showToast(err?.response?.data?.message || '获取双因子挑战失败')
  }
}

function cancelTwoFactor() {
  twoFactorVisible.value = false
  pendingTempToken = ''
}

async function sendEmailCode() {
  try {
    await sendTwoFactorEmailCode(pendingTempToken)
    showToast('邮箱动态码已发送')
    emailCooldown.value = 60
    emailTimer = setInterval(() => {
      emailCooldown.value--
      if (emailCooldown.value <= 0 && emailTimer) {
        clearInterval(emailTimer)
        emailTimer = undefined
      }
    }, 1000)
  } catch (err: any) {
    showToast(err?.response?.data?.message || '发送失败')
  }
}

async function doTwoFactorLogin() {
  if (!twoFactorCode.value) {
    showToast('请输入动态验证码')
    return
  }
  twoFactorLoading.value = true
  try {
    const resp: LoginResponse = await twoFactorLogin({ tempToken: pendingTempToken, code: twoFactorCode.value })
    twoFactorVisible.value = false
    pendingTempToken = ''
    if (resp.result) onLoginSuccess(resp.result)
  } catch (err: any) {
    showToast(err?.response?.data?.message || err?.message || '动态码错误')
  } finally {
    twoFactorLoading.value = false
  }
}

function onLoginSuccess(result: { tokenValue: string; tenantId: number | string; nickname: string; platform: boolean }) {
  userStore.setLogin({
    tokenValue: result.tokenValue,
    tenantId: result.tenantId,
    nickname: result.nickname,
    platform: false
  })
  router.replace('/workbench')
}
</script>

<style scoped>
.login-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--van-background-2);
}
.login-hero {
  padding: 72px 32px 32px;
}
.login-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--van-text-color);
}
.login-subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: var(--van-text-color-2);
}
.login-form {
  margin-top: 8px;
}
.captcha-img {
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
}
.login-submit {
  margin: 24px 16px;
}
.twofa-popup {
  width: 86%;
  padding: 20px 0 8px;
}
.twofa-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 8px;
}
.twofa-title {
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: var(--van-text-color);
}
.twofa-desc {
  text-align: center;
  font-size: 13px;
  color: var(--van-text-color-2);
}
.twofa-qr {
  align-self: center;
  width: 160px;
  height: 160px;
}
.twofa-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 8px 8px;
}
</style>
