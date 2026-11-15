import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import App from './App.vue'
import router from './router'
import { initMicro } from './micro'
import { permission } from './directives/permission'
import 'vant/lib/index.css'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// 全量注册（含 Toast/Dialog 等函数式组件）；移动端组件量小，按需引入收益有限
app.use(Vant)
app.directive('permission', permission)

// 微前端初始化（pinia 之后）：登录态/主题经 bus 广播给存活子应用，401 统一登出
initMicro()

app.mount('#app')
