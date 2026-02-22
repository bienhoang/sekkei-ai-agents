import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './components/Layout.vue'
import MilkdownWrapper from './components/MilkdownWrapper.vue'
import './styles/custom.css'
import './styles/editor.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('MilkdownWrapper', MilkdownWrapper)
  },
}

export default theme
