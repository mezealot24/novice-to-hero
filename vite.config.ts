import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// singlefile: the whole game (Phaser included) ends up in one HTML so it can be shared as one link.
export default defineConfig({ plugins: [viteSingleFile()], build: { chunkSizeWarningLimit: 4000 } })
