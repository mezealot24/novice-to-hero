import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// singlefile: the whole game (Phaser included) ends up in one HTML so it can be shared as one link.
// PREVIEW=1: playtest build (src/preview-kit.ts test hero on the title screen)
// `vite build --mode admin`: the live-ops balance editor (admin.html, src/admin/) as a second single-file page in the same dist/.
// singlefile can't take two inputs in one build, so `npm run build` runs the game build, then this one (emptyOutDir off).
export default defineConfig(({ mode }) => ({
  plugins: [viteSingleFile()],
  build: {
    chunkSizeWarningLimit: 4000,
    ...(mode === 'admin' ? { emptyOutDir: false, rollupOptions: { input: 'admin.html' } } : {}),
  },
  define: { __PREVIEW__: JSON.stringify(!!process.env.PREVIEW), __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version ?? '0'}@${new Date().toISOString().slice(0, 16)}`) }, // __APP_VERSION__: which build an analytics event came from
}))
