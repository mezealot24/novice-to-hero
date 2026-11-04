// Preview builds only (PREVIEW=1 npm run build -> __PREVIEW__): a ready-made Lv 20 test hero so a playtest link
// (its own origin, empty save) can try late-game content right away. Main builds compile this out.
import { JOBS, type JobId } from './data/jobs'
import { newSave, setSave } from './save'

declare const __PREVIEW__: boolean
export const PREVIEW = typeof __PREVIEW__ !== 'undefined' && __PREVIEW__

const KIT: Record<Exclude<JobId, 'novice'>, { weapon: string; head: string; offhand: string }> = {
  swordsman: { weapon: 'c_herosword', head: 'h_helm', offhand: 'o_tower' },
  archer: { weapon: 'c_sealbow', head: 'h_ranger', offhand: 'o_windquiver' },
  mage: { weapon: 'c_sealstaff', head: 'h_witch', offhand: 'o_starorb' },
  cleric: { weapon: 'c_dawnmace', head: 'h_halo', offhand: 'o_holyshield' },
  thief: { weapon: 'c_rustfang', head: 'h_hood', offhand: 'o_scorpion' },
}
export const PREVIEW_JOBS = Object.keys(KIT) as Exclude<JobId, 'novice'>[]

/** Base Lv 20 / Job Lv 20, 57 stat points + 20 skill points to spend, crafted gear grade 4 +5, dungeons 1-4 cleared. */
export function previewHero(job: Exclude<JobId, 'novice'>) {
  const s = newSave(`ทดสอบ${JOBS[job].name}`, 'human')
  const k = KIT[job], worn = [k.weapon, 'c_emeraldmail', 'c_lichring', k.head, k.offhand, 'fang']
  Object.assign(s, {
    job, baseLevel: 20, jobLevel: 20, statPoints: 57, skillPoints: 20, zeny: 20000, gems: 200,
    owned: [...s.owned, ...worn], clears: 8, clearsBy: { d1: 3, d2: 2, d3: 2, d4: 1 },
    grade: Object.fromEntries(worn.slice(0, 3).map((id) => [id, 4])), refine: Object.fromEntries(worn.map((id) => [id, 5])),
  })
  s.equipped = { weapon: k.weapon, armor: 'c_emeraldmail', acc: 'c_lichring', head: k.head, offhand: k.offhand, acc2: 'fang' }
  setSave(s)
}
