import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: '/sofa-shine-squad/', // 🔥 ESSENCIAL
  plugins: [react()],
})