// Figtree, bundled with the app (not loaded from Google Fonts, which some NHS networks block).
import '@fontsource-variable/figtree'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
