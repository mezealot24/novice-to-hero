// localStorage keys shared by the game (live-config.ts) and admin.html, kept dependency-free so admin doesn't pull in game code.
/** ?cfg=local reads {patch, guards} from here (DEV / PREVIEW builds only): tools/bot.cjs, playtests, admin "Test in game". */
export const LOCAL_KEY = 'novice-to-hero.cfg.local'
