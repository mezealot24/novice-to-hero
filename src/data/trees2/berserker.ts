// 🪓 Berserker ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'bz_c', job: 'swordsman', job2: 'berserker', name: 'สับ', icon: '💥', blurb: 'คริ · ดาเมจคริ · Frenzy' },
    { id: 'bz_d', job: 'swordsman', job2: 'berserker', name: 'ดวล', icon: '⚔️', blurb: 'เหลือตัวเดียว / บอส แรงขึ้น' },
    { id: 'bz_r', job: 'swordsman', job2: 'berserker', name: 'คลั่ง', icon: '🩸', blurb: 'Rage ไว · เลือดน้อยยิ่งแรง' },
  ],
  nodes: [
    n('bz_c1', 'bz_c', 1, '🎯', 'คมสับ', 3, (lv) => `คริ +${lv * 3}%`, (lv) => ({ crit: 0.03 * lv })),
    n('bz_c2', 'bz_c', 2, '🩸', 'เลือดสาด', 3, (lv) => `ดาเมจคริ +${lv * 10}%`, (lv) => ({ critMul: 0.1 * lv })),
    n('bz_c3', 'bz_c', 3, '🔥', 'ฟันซ้ำแผล', 3, (lv) => `Frenzy สูงสุด +${lv}`, (lv) => ({ j2FrenzyMax: lv })),
    n('bz_c4', 'bz_c', 4, '💢', 'หน้าแหก', 1, () => 'คริใส่บอส/มินิบอส ดาเมจ +50%', () => ({ j2BossCrit: 0.5 })),
    n('bz_d1', 'bz_d', 1, '👁️', 'ตาต่อตา', 3, (lv) => `เหลือมอนตัวเดียว หรือตีบอส: ดาเมจ +${lv * 8}%`, (lv) => ({ j2Duel: 0.08 * lv })),
    n('bz_d2', 'bz_d', 2, '💨', 'ไล่ล่า', 3, (lv) => `ความเร็ว +${lv * 4}%`, (lv) => ({ aspd: 0.064 * lv })),
    n('bz_d3', 'bz_d', 3, '🪨', 'ใจเด็ด', 3, (lv) => `P.DEF +${lv * 3} · ต้านทาน +${lv * 5}%`, (lv) => ({ def: 3 * lv, tenacity: 0.05 * lv })),
    n('bz_d4', 'bz_d', 4, '☠️', 'ดวลตาย', 1, () => 'บอส/มินิบอส HP ต่ำกว่า 30%: ดาเมจ +50%', () => ({ j2DuelExec: 0.5 })),
    n('bz_r1', 'bz_r', 1, '😡', 'เดือดดาล', 3, (lv) => `ได้ Rage +${lv * 10}%`, (lv) => ({ rageGain: 0.1 * lv })),
    n('bz_r2', 'bz_r', 2, '🩹', 'เลือดยิ่งน้อย', 3, (lv) => `ดาเมจ +${lv * 10}% x ส่วนที่ HP หายไป (HP 20% = +${lv * 8}%)`, (lv) => ({ j2LowHp: 0.1 * lv })),
    n('bz_r3', 'bz_r', 3, '🧛', 'ไม่หยุด', 3, (lv) => `ดูดเลือด +${lv}% (ตีธรรมดา + คอมโบ)`, (lv) => ({ lifesteal: 0.01 * lv })),
    n('bz_r4', 'bz_r', 4, '👹', 'ไม่รู้สึกเจ็บ', 1, () => 'Rage เต็ม 100: ฟันเพิ่มทันที 1 รอบ (Rage เหลือ 0)', () => ({ j2RageTurn: 1 })),
  ],
  talents: [],
}
