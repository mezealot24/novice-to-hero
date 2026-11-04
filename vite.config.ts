import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// singlefile: the whole game (Phaser included) ends up in one HTML so it can be shared as one link.
// PREVIEW=1: playtest build (src/preview-kit.ts test hero on the title screen)
export default defineConfig({ plugins: [viteSingleFile()], build: { chunkSizeWarningLimit: 4000 }, define: { __PREVIEW__: JSON.stringify(!!process.env.PREVIEW) } })
