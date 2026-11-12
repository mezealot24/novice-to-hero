import { PACKS } from './dungeons'
import type { MonsterKind } from './monsters'

export interface RoomDef {
  title: string
  spawn: [MonsterKind, number][]
  boss?: boolean
  turnLimit?: number // hero turns before the fight is lost (default BATTLE.turnLimit)
  lv?: number // level dungeon (D6+): monster level in this room (default: spread over DungeonDef.level)
  mini?: boolean // 1v1 duel: spawn is ignored, one mini boss is drawn from MINI_POOL (data/relics.ts)
  miniPool?: MonsterKind[] // this duel draws from these instead of MINI_POOL (Dungeon 4-5)
}

export interface DungeonDef {
  id: string
  name: string
  boss: string
  tier: number // event rewards scale with this
  sky: [number, number] // gradient top, bottom
  hills: number // tint on the far hills / trees
  unlock: 'none' | 'job' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9' | 'd10' // 'job' = after the first job change, 'dN' = after clearing dungeon N
  rooms: RoomDef[]
  level?: [number, number] // D6+: fixed monster level band; its stat monsters use data/mon-stats.ts (no Hero Power scaling)
}

export const DUNGEONS: DungeonDef[] = [{
  id: 'd1', name: 'ทุ่งเจลล็อป', boss: 'ราชาเจลล็อป', tier: 1, sky: [0x2c3a6e, 0xe9a46a], hills: 0xffffff, unlock: 'none',
  rooms: [
    { title: 'ห้อง 1 · ทุ่งหญ้า', spawn: [['jellop', 4]] },
    { title: 'ห้อง 2 · ทางเดินป่า', spawn: [['jellop', 3], ['wolf', 1]] },
    { title: 'ห้อง 3 · ฝูงหมาป่า', spawn: [['jellop', 3], ['wolf', 2]] },
    { title: 'ห้องบอส · ราชาเจลล็อป', spawn: [['king', 1]], boss: true, turnLimit: 34 }, // boss buff v1: limits grow with boss HP
  ],
}, {
  id: 'd2', name: 'ป่าหมาป่าเงา', boss: 'จ่าฝูงเงา', tier: 2, sky: [0x141a3a, 0x6a4a8a], hills: 0x8a7ab8, unlock: 'job',
  rooms: [
    { title: 'เวฟ 1 · ปากถ้ำค้างคาว', spawn: [['bat', 3], ['shroom', 1]] },
    { title: 'เวฟ 2 · ดงเห็ดสปอร์', spawn: [['shroom', 2], ['bat', 1], ['dewsprite', 1]] },
    { title: 'เวฟ 3 · ทางหมูป่า', spawn: [['boar', 1], ['shadowwolf', 1], ['bat', 1]] },
    { title: 'เวฟ 4 · ฝูงหมาป่าเงา', spawn: [['shadowwolf', 2], ['shroom', 1], ['dewsprite', 1]] },
    { title: 'เวฟ 5 · หน้าถ้ำจ่าฝูง', spawn: [['boar', 2], ['shadowwolf', 1], ['shroom', 1]] },
    { title: 'ห้องบอส · จ่าฝูงเงา', spawn: [['alpha', 1]], boss: true, turnLimit: 36 },
  ],
}, {
  id: 'd3', name: 'ซากป้อมวีรชน', boss: 'อัศวินมรณะ', tier: 3, sky: [0x1a0f22, 0x8a3a3a], hills: 0xb07a7a, unlock: 'd2',
  rooms: [
    { title: 'เวฟ 1 · ประตูป้อม', spawn: [['skeleton', 2], ['wisp', 1]] },
    { title: 'เวฟ 2 · ลานหิน', spawn: [['gargoyle', 1], ['skeleton', 1], ['wisp', 1], ['bonepriest', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, turnLimit: 40 },
    { title: 'เวฟ 3 · ระเบียงผี', spawn: [['wisp', 3], ['skeleton', 1]] },
    { title: 'เวฟ 4 · หน้าบัลลังก์', spawn: [['gargoyle', 2], ['skeleton', 1], ['bonepriest', 1]] },
    { title: 'ห้องบอส · อัศวินมรณะ', spawn: [['deathknight', 1]], boss: true, turnLimit: 46 },
  ],
}, {
  id: 'd4', name: 'บึงพิษมรกต', boss: 'ไฮดรามรกต', tier: 4, sky: [0x0f2a22, 0x5a8a3a], hills: 0x6ab07a, unlock: 'd3',
  rooms: [
    { title: 'เวฟ 1 · ริมบึง', spawn: [['toad', 2], ['lizardshaman', 1]] },
    { title: 'เวฟ 2 · รังต่อ', spawn: [['hornet', 2], ['turtleguard', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['venomqueen', 'frostgiant'], turnLimit: 45 },
    { title: 'เวฟ 3 · ดงคางคกระเบิด', spawn: [['bloater', 2], ['turtleguard', 1], ['hornet', 1]] },
    { title: 'เวฟ 4 · กำแพงกระดอง', spawn: [['turtleguard', 2], ['lizardshaman', 1], ['toad', 1]] },
    { title: 'ห้องบอส · ไฮดรามรกต', spawn: [['hydra', 1]], boss: true, turnLimit: 50 },
  ],
}, {
  id: 'd5', name: 'บัลลังก์อเวจี', boss: 'จอมลิชโมรเดคัส', tier: 5, sky: [0x0a0612, 0x6a1a3a], hills: 0x9a4a6a, unlock: 'd4',
  rooms: [
    { title: 'เวฟ 1 · ประตูนรก', spawn: [['hellknight', 1], ['imp', 1]] },
    { title: 'เวฟ 2 · โถงคำสาป', spawn: [['hexwitch', 1], ['necropriest', 1], ['imp', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['mirage', 'warlord'], turnLimit: 45 },
    { title: 'เวฟ 3 · ระเบียงกระจก', spawn: [['wraith', 2], ['imp', 1], ['hexwitch', 1]] },
    { title: 'เวฟ 4 · กองทัพศพ', spawn: [['hellknight', 2], ['necropriest', 1], ['imp', 1]] },
    { title: 'ห้องบอส · จอมลิชโมรเดคัส', spawn: [['lich', 1]], boss: true, turnLimit: 56 },
  ],
}, {
  // D6+ (Q 2026-11-04): fixed level band, monsters with 7 base stats (data/mon-stats.ts), no Hero Power scaling
  id: 'd6', name: 'สุสานทรายกษัตริย์', boss: 'ราชันย์ทรายเนเฟรู', tier: 6, sky: [0x3a2410, 0xe8b060], hills: 0xd8a860, unlock: 'd5', level: [40, 50],
  rooms: [
    { title: 'เวฟ 1 · ประตูสุสาน', spawn: [['mummy', 2], ['jackal', 1]], lv: 40 },
    { title: 'เวฟ 2 · ทางเดินอักษรภาพ', spawn: [['sandscorp', 2], ['dunewraith', 1], ['sunpriest', 1]], lv: 42 },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['sphinx', 'jackallord'], turnLimit: 45, lv: 46 },
    { title: 'เวฟ 3 · ห้องเก็บสมบัติ', spawn: [['scarab', 1], ['jackal', 2], ['dunewraith', 1]], lv: 45 },
    { title: 'เวฟ 4 · หน้าห้องบรรทม', spawn: [['mummy', 1], ['scarab', 1], ['sunpriest', 1]], lv: 48 },
    { title: 'ห้องบอส · ราชันย์ทรายเนเฟรู', spawn: [['pharaoh', 1]], boss: true, turnLimit: 50, lv: 50 },
  ],
},
// D7-D10 (v78): each pack adds its dungeon once it is built (data/dungeons/dN.ts)
...PACKS.flatMap((p) => (p.dungeon ? [p.dungeon] : [])),
]
/** Old single-dungeon name (DungeonScene, the unused real-time prototype, still reads it). */
export const DUNGEON = DUNGEONS[0]
