// admin.html: "🎭 ท่าเฉพาะตัว (สคริปต์)" — mini-boss / passive kits that live in BattleScene scripts, not in MONSTERS.skills.
// Their numbers are shared BATTLE values (table `battle`): editing one here changes every monster with that kit.
// Names / wording follow docs/design/Novice to Hero Bestiary.html.
import { MONSTERS, type MonsterKind } from '../data/game-data'
import { fieldRow } from './model'

export interface KitField { path: string; label: string }
export interface ScriptKit { name: string; desc: string; fields: KitField[] }

const f = (path: string, label: string): KitField => ({ path, label })
interface KitDef extends ScriptKit { has: (k: MonsterKind) => boolean }
const mini = (kind: string) => (k: MonsterKind) => MONSTERS[k].mini === kind

const KITS: KitDef[] = [
  { has: mini('duelist'), name: '🎯 Into Arena · แทงจุดตาย (passive)', desc: 'ทุก N เทิร์น ดาเมจจริง = % max HP ฮีโร่ + ATK × Lv ดัน × ตัวคูณ แล้วฟื้นคืนภายในไม่กี่เทิร์น',
    fields: [f('duel.vitalEvery', 'ทุก N เทิร์น'), f('duel.vitalPct', '% max HP ฮีโร่'), f('duel.vitalLvMul', 'ATK × Lv ×'), f('duel.healTurns', 'ฟื้นคืนใน (เทิร์น)')] },
  { has: mini('duelist'), name: '🤺 Riposte', desc: 'ทุก N เทิร์น ตั้งท่าอมตะ ตีเข้าไปโดนสวนเป็นดาเมจจริง (มีเพดานต่อครั้ง ไม่ทำให้ตาย)',
    fields: [f('parryEvery', 'ทุก N เทิร์น'), f('duel.ripostePct', 'สวน % ของดาเมจ'), f('duel.riposteCap', 'เพดาน % max HP')] },
  { has: mini('duelist'), name: '⚔️ Grandado Espada (เฟส 2)', desc: 'เทิร์นแรกเปิดจุดตาย (อมตะ) เทิร์นถัดไปแทงคริหลายครั้ง ครั้งละ % max HP ฮีโร่ แล้วฟื้นคืน',
    fields: [f('duel.espadaEvery', 'CD (เทิร์น)'), f('duel.espadaHits', 'จำนวนแทง'), f('duel.espadaMin', 'ต่ำสุด % max HP'), f('duel.espadaMax', 'สูงสุด % max HP')] },
  { has: mini('hunter'), name: '👃 กลิ่นเลือด (passive)', desc: 'ฮีโร่ HP ต่ำกว่าเกณฑ์ → เทิร์นเร็วขึ้น + คอมโบเพิ่ม',
    fields: [f('scentAt', 'เมื่อ HP ฮีโร่ <'), f('scentSpeed', 'ความเร็ว ×'), f('scentCombo', 'คอมโบ +')] },
  { has: mini('hunter'), name: '😡 คลั่ง', desc: 'HP ตัวเองต่ำกว่าเกณฑ์ → เร็วขึ้น + ดูดเลือด',
    fields: [f('frenzyAt', 'เมื่อ HP <'), f('frenzySpeed', 'ความเร็ว ×'), f('frenzyLifesteal', 'ดูดเลือด')] },
  { has: mini('gunner'), name: '⏱️ Bullet Time', desc: 'HP ต่ำกว่าเกณฑ์ → นับถอยหลังแล้วยิงรัว นัดละ = ยิงปกติ × (1 + สุ่มโบนัส)',
    fields: [f('bulletTime.at', 'เมื่อ HP <'), f('bulletTime.countdown', 'นับถอยหลัง (เทิร์น)'), f('bulletTime.hits', 'จำนวนนัด'), f('bulletTime.bonusMin', 'โบนัสต่ำสุด'), f('bulletTime.bonusMax', 'โบนัสสูงสุด')] },
  { has: mini('drainer'), name: '👻 Summon Maiden', desc: 'HP ต่ำกว่าเกณฑ์ → เรียกเมเดน คาร์วอสอมตะจนกว่าเมเดนจะตาย · เทิร์นจำกัดเพิ่ม',
    fields: [f('maiden.at', 'เมื่อ HP <'), f('maiden.turns', 'เทิร์นจำกัด +')] },
  { has: mini('drainer'), name: '😈 ร่างปีศาจ', desc: 'HP ต่ำกว่าเกณฑ์ → ฟื้น % max HP ทุกเทิร์น',
    fields: [f('demonAt', 'เมื่อ HP <'), f('demonRegen', 'ฟื้น % / เทิร์น')] },
  { has: (k) => !!MONSTERS[k].toxicSkin, name: '🧪 Toxic Skin (passive)', desc: 'รับดาเมจลดลง · ตีโดนมันติดพิษ · ดีบัฟหมดเร็ว · คริของฮีโร่เบาลง',
    fields: [f('toxicSkin.dr', 'ลดดาเมจรับ'), f('toxicSkin.poison', 'พิษใส่คนตี (stack)'), f('toxicSkin.tenacity', 'ต้านดีบัฟ'), f('toxicSkin.critCut', 'ลดดาเมจคริ')] },
  { has: (k) => !!MONSTERS[k].iceSkin, name: '❄️ Ice Skin (passive)', desc: 'ตีโดนมันทีไร ติดหนามน้ำแข็ง: ดาเมจฮีโร่ลดลงไม่กี่เทิร์น',
    fields: [f('iceSkin.dmgCut', 'ลดดาเมจฮีโร่'), f('iceSkin.turns', 'นาน (เทิร์น)')] },
  { has: (k) => !!MONSTERS[k].vengeance, name: '🛡️ โล่แห่งความแค้น (passive)', desc: 'ตีโดน → ส่วนหนึ่งของดาเมจกลายเป็นโล่ · ระหว่างมีโล่ ฮีโร่โดน DoT',
    fields: [f('vengeance.share', 'ดาเมจ → โล่'), f('vengeance.turns', 'นาน (เทิร์น)'), f('vengeance.cd', 'CD'), f('vengeance.dotPct', 'DoT % max HP'), f('vengeance.dotMatk', 'DoT M.ATK ×')] },
]

/** Scripted kits this monster has, with the shared `battle` fields that tune them (unknown paths dropped). */
export function scriptKits(k: MonsterKind): ScriptKit[] {
  return KITS.filter((x) => x.has(k)).map(({ name, desc, fields }) => ({ name, desc, fields: fields.filter((q) => fieldRow('battle', q.path)) }))
}

/** Every monster that shares a kit (for the "shared value" warning). */
export const kitUsers = (name: string): string[] =>
  (Object.keys(MONSTERS) as MonsterKind[]).filter((k) => KITS.some((x) => x.name === name && x.has(k))).map((k) => MONSTERS[k].name)
