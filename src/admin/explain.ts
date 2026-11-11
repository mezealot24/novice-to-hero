// Pure Thai explanations for every tunable field in the Balance Engine ("ปรับแล้วได้อะไร" + increase/decrease effects + formula hints).
import { HARD_PASSIVES, HARD_SKILLS, MONSTERS, type HitFx, type MonSkill, type MonsterKind } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { JOB2, type Job2Id } from '../data/jobs2'
import type { Skill2Id } from '../data/skill2'
import type { TableId } from '../data/tunables'
import {
  ARCH_TH, CLS_TH, DUNGEON_LABEL, FX_NAME, FX_TH, SKILL2_BY_ID, SLOT_TH, STAT_TH, TABLE_EXPLAIN,
  type FieldExplain, type TableExplain,
} from './explain/labels'
import { BATTLE_STATIC } from './explain/battle'

export { TABLE_EXPLAIN }
export type { FieldExplain, TableExplain }

// ---------- Monster fields ----------
function explainSkillLeaf(rest: string[], prefixName: string, sk?: MonSkill, defaultLabel?: string): FieldExplain {
  const leaf = rest.join('.')
  const head = prefixName ? `${prefixName} · ` : ''
  const kind = sk?.kind
  if (rest[0] === 'fx') {
    const k = rest[1] as keyof HitFx
    const name = FX_NAME[k] ?? k
    const unit = k === 'freeze' ? 'เกจ (เต็ม 100 แช่แข็ง)' : 'สแต็ก/เทิร์น'
    return {
      label: defaultLabel ?? `${head}${name}`,
      effect: k === 'freeze'
        ? `เพิ่ม = เติมเกจแช่แข็งฮีโร่ไวขึ้น (เต็ม 100 หยุดเทิร์น) · 0 = ไม่แช่`
        : `เพิ่ม = ฮีโร่ติด${name.replace(/^ติด/, '')}นาน/หลายชั้นขึ้น · 0 = ไม่มีผล`,
      detail: `${FX_TH[k] ?? ''} (${unit}) · ถ้าสกิลมี +Lv จะบวกเพิ่ม +1 ทุก ${'lv.fxEvery'} เลเวล (ยกเว้นแช่แข็ง)`,
    }
  }
  switch (leaf) {
    case 'every':
      return {
        label: defaultLabel ?? `${head}ใช้ทุก N เทิร์น`,
        effect: 'ลดเลข = มอนใช้สกิลนี้ถี่ขึ้น (เก่ง/กดดันขึ้น) · เพิ่มเลข = ใช้ห่างขึ้น',
        detail: 'ตัวนับเทิร์นของมอนเอง เช่น 4 = ออกสกิลทุก ๆ 4 เทิร์น (ค่ายิ่งน้อยยิ่งอันตราย)',
      }
    case 'pow': {
      if (kind === 'bolt' || kind === 'strike') {
        const atk = kind === 'bolt' ? 'M.ATK' : 'P.ATK'
        return {
          label: defaultLabel ?? `${head}ความแรงสกิล (pow)`,
          effect: `เพิ่ม = สกิลฟาดแรงขึ้นตามสัดส่วน (สูตร ${atk} × monDmgMul × pow × statScale)`,
          detail: 'ค่าเริ่มต้นเวลาไม่ใส่คือ 1.3 · ปรับ 2.0 คือแรงเกือบสองเท่าจากปกติ เหมาะปรับความแรงท่าใหญ่ของบอส',
        }
      }
      if (kind === 'heal') {
        return {
          label: defaultLabel ?? `${head}สัดส่วนฮีลต่อ % Max HP`,
          effect: 'เพิ่ม = มอนฟื้น HP ตัวเอง/พวกมากขึ้น (0.15 = 15% Max HP, ตัน 100%)',
          detail: 'คิดเป็นสัดส่วนของ Max HP แล้วคูณด้วย statScale (WIS) และเลเวลสกิล (สกิลฮีลตันที่ 1.0 = เต็มหลอด)',
        }
      }
      if (kind === 'shield') {
        return {
          label: defaultLabel ?? `${head}สัดส่วนโล่ต่อ % Max HP`,
          effect: 'เพิ่ม = มอนสร้างเกราะป้องกันหนากว่าเดิม (0.1 = 10% Max HP, ตัน 100%)',
          detail: 'สร้างโล่ดูดซับดาเมจให้มอนตามสัดส่วน Max HP × statScale (WIS)',
        }
      }
      if (kind === 'warcry') {
        return {
          label: defaultLabel ?? `${head}พลังบัฟ Warcry`,
          effect: 'เพิ่ม = มอนบัฟตัวเองตีแรงขึ้นเยอะกว่าเดิม (0.25 = ตีแรงขึ้น +25%)',
          detail: 'เพิ่มตัวคูณดาเมจให้มอนชั่วคราวตามจำนวน turns × statScale (STR)',
        }
      }
      if (kind === 'haste') {
        return {
          label: defaultLabel ?? `${head}พลังเร่งเกจ (Haste)`,
          effect: 'เพิ่ม = เติมเกจเทิร์นให้ตัวเอง/พวกมากขั้น ทำให้ออกเทิร์นแทรกไวขึ้น',
          detail: 'เติม Action Gauge ให้มอน (ค่า 30 = ข้ามเกจทันที ~30%)',
        }
      }
      if (kind === 'revive') {
        return {
          label: defaultLabel ?? `${head}HP หลังชุบชีวิต`,
          effect: 'เพิ่ม = เพื่อนมอนที่ฟื้นขึ้นมาจะมีเลือดเหลือเยอะขึ้น (0.5 = ฟื้น 50% Max HP)',
          detail: 'ใช้ชุบเพื่อนที่ตายในเวฟด้วย Max HP × pow (ตัน 100%)',
        }
      }
      return {
        label: defaultLabel ?? `${head}พลังสกิล (pow)`,
        effect: 'เพิ่ม = ความแรงหรือค่าผลของสกิลสูงขึ้น · หมายเหตุ: สกิลสาย curse มักไม่ได้อ่าน pow (ใช้ fx แทน)',
        detail: 'ตัวคูณความแรงหลักของสกิลก่อนนำไปคูณ statScale และเลเวลสกิล',
      }
    }
    case 'turns':
      return {
        label: defaultLabel ?? `${head}ระยะเวลาบัฟ/สถานะ (เทิร์น)`,
        effect: 'เพิ่ม = บัฟหรือผลสกิลอยู่นานขึ้น · ลด = หมดฤทธิ์ไวขึ้น',
        detail: 'จำนวนเทิร์นของผลต่อเนื่อง เช่น Warcry เพิ่ม ATK นานกี่เทิร์น (ไม่รวมสแต็กพิษ/เผาที่ตั้งใน fx)',
      }
    case 'hits':
      return {
        label: defaultLabel ?? `${head}จำนวนฮิต`,
        effect: 'เพิ่ม = สกิลตี/ยิงหลายครั้งขึ้นต่อ 1 รอบ (แต่ละฮิตรีดคริ/หลบแยกกัน)',
        detail: 'จำนวนฮิตพื้นฐานของสกิล ก่อนบวกโบนัส +1 ฮิตทุก N เลเวลตาม SKILL_SCALE.lv.hitsEvery',
      }
    case 'alone':
      return {
        label: defaultLabel ?? `${head}ตัวคูณเมื่ออยู่ตัวเดียว`,
        effect: 'เพิ่ม = พอมอนเหลือตัวสุดท้ายในห้องจะกดสกิลนี้แรงขึ้นเป็นพิเศษ (เช่น 2 = แรง ×2)',
        detail: 'ป้องกันไม่ให้มอนซัมมอนหรือตัวเดี่ยวอ่อนเกินไปเวลาลูกน้องตายหมดแล้ว',
      }
    case 'drain':
      return {
        label: defaultLabel ?? `${head}ดูดเลือดคืนมอน`,
        effect: 'เพิ่ม = มอนฟื้น HP เท่ากับสัดส่วนของดาเมจที่สกิลนี้ทำใส่ฮีโร่ (0.1 = ดูด 10%)',
        detail: 'คิดจากดาเมจจริงหลังหักโล่/เกราะที่ฮีโร่โดนจากสกิลนี้แล้ว',
      }
    case 'lv':
      return {
        label: defaultLabel ?? `${head}เลเวลสกิล (Lv)`,
        effect: 'เพิ่ม = สกิลแรงขึ้น +10%/Lv, ฮิตเพิ่มทุก 10 Lv, ดีบัฟเพิ่มทุก 5 Lv (ว่าง = Lv 1)',
        detail: 'ปรับง่ายสุดถ้าอยากบัฟสกิลเดียวแบบครบชุดในช่องเดียว (ทำงานตามกฎ RO-style ใน SKILL_SCALE.lv)',
      }
    default:
      return {
        label: defaultLabel ?? `${head}${leaf}`,
        effect: 'พารามิเตอร์เฉพาะของสกิลมอนสเตอร์',
      }
  }
}

function explainMonsterField(path: string, native: boolean, defaultLabel?: string): FieldExplain {
  const dot = path.indexOf('.')
  const k = dot > 0 ? path.slice(0, dot) : ''
  const rel = dot > 0 ? path.slice(dot + 1) : path
  const monName = MONSTERS[k as MonsterKind]?.name ?? k
  const p = rel.split('.')

  if (p[0] === 'skills') {
    const sk = MONSTERS[k as MonsterKind]?.skills?.[Number(p[1])]
    let rest = p.slice(2)
    let prefix = sk?.name ?? `สกิล #${p[1]}`
    let targetSk = sk
    if (rest[0] === 'pick') {
      const sub = sk?.pick?.[Number(rest[1])]
      prefix = `${prefix} › ${sub?.name ?? `#${rest[1]}`}`
      targetSk = sub
      rest = rest.slice(2)
    }
    return explainSkillLeaf(rest, prefix, targetSk, defaultLabel)
  }

  if (p[0] === 'phases') {
    const ph = MONSTERS[k as MonsterKind]?.phases?.[Number(p[1])]
    const phLabel = `เฟส ${Number(p[1]) + 1}${ph?.name ? ` (${ph.name})` : ''}`
    const rest = p.slice(2)
    if (rest[0] === 'onHit' || rest[0] === 'slamFx') {
      const fxKey = rest[1] as keyof HitFx
      const act = rest[0] === 'onHit' ? 'ตีปกติแล้วติด' : 'ท่าชาร์จติด'
      return {
        label: defaultLabel ?? `${phLabel} · ${act}${FX_NAME[fxKey] ?? fxKey}`,
        effect: `ตั้ง > 0 = พอเข้า${phLabel} การ${act}${FX_NAME[fxKey]?.replace(/^ติด/, '') ?? fxKey}จะแรง/นานตามเลขนี้ (แทนค่าเดิม)`,
        detail: FX_TH[fxKey],
      }
    }
    switch (rest.join('.')) {
      case 'at':
        return {
          label: defaultLabel ?? `${phLabel} · เข้าเฟสเมื่อ HP ≤`,
          effect: 'เพิ่ม = เข้าเฟสเร็วขึ้นตั้งแต่เลือดยังเยอะ (เช่น 0.5 → 0.7) · ลด = รอใกล้ตายค่อยคลั่ง',
          detail: 'สัดส่วน HP ปัจจุบันต่อ Max HP ของบอส (0.5 = เข้าเฟสเมื่อเลือด ≤ 50%)',
        }
      case 'speed':
        return {
          label: defaultLabel ?? `${phLabel} · ความเร็ว ×`,
          effect: 'เพิ่ม = เข้าเฟสแล้วบอสได้เทิร์นถี่ขึ้น (1.3 = เร็วขึ้น +30%)',
          detail: 'คูณความเร็วเทิร์นเกจของบอสหลังเข้าเฟส (1 = คงเดิม)',
        }
      case 'dmg':
        return {
          label: defaultLabel ?? `${phLabel} · ดาเมจ ×`,
          effect: 'เพิ่ม = เข้าเฟสแล้วบอสตีแรงขึ้น (1.25 = แรงขึ้น +25%)',
          detail: 'คูณดาเมจทุกฮิตและสกิลของบอสตั้งแต่เข้าเฟสนี้เป็นต้นไป',
        }
      case 'heal':
        return {
          label: defaultLabel ?? `${phLabel} · ฮีลตอนเข้าเฟส`,
          effect: 'เพิ่ม = ทันทีที่เปลี่ยนเฟสบอสจะเด้งเลือดคืนมากขึ้น (0.15 = ฮีล 15% Max HP × WIS scale)',
          detail: 'ถูกคูณเพิ่มเติมโดย SKILL_SCALE.fx.phaseHeal ตามค่า WIS ของมอน',
        }
      case 'shield':
        return {
          label: defaultLabel ?? `${phLabel} · โล่ตอนเข้าเฟส`,
          effect: 'เพิ่ม = ทันทีที่เปลี่ยนเฟสบอสได้เกราะรับดาเมจหนาขึ้น (0.2 = 20% Max HP × WIS scale)',
          detail: 'ต้องตีให้โล่แตกก่อนจึงจะลด HP จริงของบอสต่อได้ (ถูกสเกลด้วย WIS)',
        }
      case 'reflect':
        return {
          label: defaultLabel ?? `${phLabel} · สะท้อนดาเมจ`,
          effect: 'เพิ่ม = เข้าเฟสแล้วฮีโร่ตีบอสจะสะท้อนเข้าตัวเองมากขึ้น (0.1 = สะท้อน 10%, ตันที่ battle.reflectCap)',
          detail: 'ใช้กับฮิตโจมตีตรง (ไม่รวม DoT) · ค่านี้ไปแทนค่า reflect เดิมของมอนในเฟสนั้น',
        }
      case 'absorb':
        return {
          label: defaultLabel ?? `${phLabel} · ดูดซับ → Soul Strike`,
          effect: 'เพิ่ม = เก็บสัดส่วนดาเมจที่โดนไว้สะสมแล้วยิงคืนเป็น Soul Strike ตอนชาร์จ',
          detail: 'ดาเมจที่ถูกเก็บจะระเบิดคืนในท่าชาร์จ (เพดานรวมต่อครั้งคุมด้วย battle.soulCap)',
        }
      case 'chargeEvery':
        return {
          label: defaultLabel ?? `${phLabel} · ชาร์จทุก N เทิร์น`,
          effect: 'ลดเลข = เข้าเฟสแล้วบอสชาร์จท่าใหญ่ถี่ขึ้น! · เพิ่ม = ชาร์จห่างลง',
          detail: 'ปรับรอบการชาร์จท่าใหญ่ใหม่เมื่อเข้าเฟส (เช่นจากทุก 3 เทิร์น เหลือทุก 2 เทิร์น)',
        }
      case 'drainStats':
        return {
          label: defaultLabel ?? `${phLabel} · ดูดสเตตัสต่อเทิร์น`,
          effect: 'เพิ่ม = ทุกเทิร์นที่บอสขยับจะดูดทุก stat ฮีโร่แรงขึ้น + บอสตีแรงขึ้น +1% ต่อ 1 แต้มที่ดูด',
          detail: 'กลไก Death Realm ของบอส: ยิ่งสู้ยืดเยื้อฮีโร่ยิ่งอ่อนลงและบอสยิ่งตีแรง',
        }
      case 'summon.1':
        return {
          label: defaultLabel ?? `${phLabel} · จำนวนลูกน้องที่เรียก`,
          effect: 'เพิ่ม = เข้าเฟสแล้วเรียกลูกน้องออกมาขวางหลายตัวขึ้น (บีบบริหาร AoE/ลำดับเป้าหมาย)',
          detail: 'จำนวนมอนลูกน้องที่ถูกเรียกเพิ่มเข้าสู่สนามทันทีเมื่อเปลี่ยนเฟส',
        }
      default:
        return { label: defaultLabel ?? `${phLabel} · ${rest.join('.')}`, effect: 'ค่าพิเศษของเฟสบอส' }
    }
  }

  if (p[0] === 'statAlloc') {
    const s = p[1]
    return {
      label: defaultLabel ?? p[1].toUpperCase(),
      effect: `เพิ่มน้ำหนัก = แบ่งแต้มลง ${STAT_TH[s] ?? s} มากขึ้น (สัดส่วนเทียบช่องอื่น ไม่ใช่แต้มดิบ)`,
      detail: native
        ? 'มอน D6+ นำแต้มจาก pointsMul มาหารตามสัดส่วนนี้ตรง ๆ เพื่อสร้างทุกค่าพลัง (HP/ATK/M.ATK/DEF/Hit/Flee/Crit/Combo/Speed)'
        : 'มอน D1–5 ยึดค่าเดิมตอน build เป็นจุดอ้างอิง ถ้าปรับสัดส่วนนี้ใหม่ ค่าพลังจริงในเกมจะเปลี่ยนตามอัตราส่วนที่เปลี่ยนไป',
    }
  }

  if (p[0] === 'onHit') {
    const fx = p[1] as keyof HitFx
    return {
      label: defaultLabel ?? (FX_NAME[fx] ?? fx),
      effect: `ตั้ง > 0 = ทุกครั้งที่ ${monName} ตีโดนฮีโร่ จะยัดสถานะนี้ใส่ฮีโร่ด้วย`,
      detail: `${FX_TH[fx] ?? ''} · ค่า 0 หรือว่าง = ตีปกติไม่ติดสถานะนี้`,
    }
  }

  if (p[0] === 'slamFx') {
    const fx = p[1] as keyof HitFx
    return {
      label: defaultLabel ?? `ท่าชาร์จ${FX_NAME[fx] ?? fx}`,
      effect: 'ตั้ง > 0 = เมื่อบอสปล่อยท่าชาร์จโดนฮีโร่ จะยัดดีบัฟนี้พ่วงไปด้วย',
      detail: `${FX_TH[fx] ?? ''} · ทำให้ต้องหลบ/เบรก/ถือเครื่องรางกันดีบัฟตอนสู้บอสมากขึ้น`,
    }
  }

  const staticMon: Record<string, FieldExplain> = {
    hp: {
      label: defaultLabel ?? 'HP ฐาน',
      effect: native
        ? '⚠️ มอน D6+ ไม่ได้อ่านช่องนี้ (ใช้ pointsMul / statAlloc / bodyMul.hp แทน)'
        : 'เพิ่ม = มอนเลือดอึดขึ้นตามสัดส่วนโดยตรง (ยังคงคูณกับ stat ratio และ bodyMul.hp)',
      detail: native ? 'ซ่อนอยู่ในการ์ดรายตัว เพราะ D6+ คำนวณ HP จาก VIT + MON_STAT.levelBase.hp × body โดยตรง' : 'ค่า HP อ้างอิงของมอน D1–5 ที่ระดับบ้านเกิด',
    },
    dmg: {
      label: defaultLabel ?? 'ATK ฐาน (P.ATK)',
      effect: native
        ? '⚠️ มอน D6+ ไม่ได้อ่านช่องนี้ (ใช้ statAlloc.str / bodyMul.dmg แทน)'
        : 'เพิ่ม = ตีกายภาพและสกิล strike แรงขึ้นเป็นสัดส่วนตรง',
      detail: 'ก่อนเข้าสูตรดาเมจจริง ค่านี้ยังถูกคูณด้วย battle.monDmgMul (ค่าปกติ 0.55)',
    },
    matk: {
      label: defaultLabel ?? 'M.ATK ฐาน',
      effect: native
        ? '⚠️ มอน D6+ ไม่ได้อ่านช่องนี้ (ใช้ statAlloc.int / bodyMul.matk แทน)'
        : 'เพิ่ม = เวท (bolt) และ DoT เวทของมอนแรงขึ้น · ถ้าเว้นว่างเกมจะใช้ ATK แทน',
    },
    def: {
      label: defaultLabel ?? (native ? 'DEF (โบนัส +)' : 'DEF ฐาน'),
      effect: 'เพิ่ม = ลดดาเมจกายภาพที่ฮีโร่ตีเข้า (ถ้าฮีโร่ติดคริจะเจาะทะลุ DEF แต่สกิล/ตีปกติโดนลด)',
      detail: native ? 'มอน D6+: บวก (+) ทับค่า DEF ที่คำนวณจาก VIT และเลเวล' : 'มอน D1–5: ค่า DEF ฐานที่ระดับบ้านเกิด (บวกผลต่างจาก VIT)',
    },
    flee: {
      label: defaultLabel ?? (native ? 'Flee (โบนัส +)' : 'Flee ฐาน'),
      effect: 'เพิ่ม = มอนหลบการโจมตีกายภาพของฮีโร่เก่งขึ้น บีบให้ฮีโร่ต้องมี Hit หรือใช้เวท/คริ',
      detail: native ? 'บวก (+) ทับ Flee ที่ได้จาก AGI' : 'ค่าตั้ง Flee ที่บ้านเกิด (ถ้าไม่ตั้งเกมใช้ 5)',
    },
    hit: {
      label: defaultLabel ?? (native ? 'Hit (โบนัส +)' : 'Hit ฐาน'),
      effect: 'เพิ่ม = มอนตีโดนแม่นขึ้น ลดโอกาสที่ฮีโร่สายหลบ (Flee) จะหลบการโจมตีพ้น',
      detail: native ? 'บวก (+) ทับ Hit ที่ได้จาก DEX และเลเวล' : 'ค่าตั้ง Hit ที่บ้านเกิด (ถ้าไม่ตั้งเกมใช้ 15)',
    },
    xp: {
      label: defaultLabel ?? 'EXP ที่ให้',
      effect: 'เพิ่ม = ฮีโร่ได้ EXP ในรอบวิ่งไวขึ้น (อัปสกิลในรันไว) · ลด = โตช้าลง',
      detail: 'ตัวคูณหลักก่อนนำไปเข้าสูตร Account EXP และเลเวลในดันเจี้ยน',
    },
    'zeny.0': {
      label: defaultLabel ?? 'Zeny ต่ำสุด',
      effect: 'เพิ่ม = การันตีเงินขั้นต่ำต่อการฆ่ามอนตัวนี้สูงขึ้น',
      detail: 'เกมสุ่มดรอป Zeny ในช่วง [ต่ำสุด, สูงสุด]',
    },
    'zeny.1': {
      label: defaultLabel ?? 'Zeny สูงสุด',
      effect: 'เพิ่ม = เพดานเงินสูงสุดที่ดรอปต่อตัวมากขึ้น (ฟาร์มรวยไวขึ้น)',
      detail: 'ควรตั้งไม่ต่ำกว่า zeny.0',
    },
    crit: {
      label: defaultLabel ?? (native ? 'โอกาสคริ (โบนัส +)' : 'โอกาสคริ'),
      effect: 'เพิ่ม = มอนติดคริบ่อยขึ้น (ตีแรง × monCritMul และ Flee หลบไม่ได้ ต้องพึ่งหลบโชคดี/โล่)',
      detail: '0.1 = +10% · คริมอนจะลดความแรงลงได้เฉพาะค่า Crit DR ของฮีโร่ (LUK)',
    },
    combo: {
      label: defaultLabel ?? (native ? 'โอกาสคอมโบ (โบนัส +)' : 'โอกาสคอมโบ'),
      effect: 'เพิ่ม = ตีปกติแล้วมีโอกาสต่อชุดสูงสุด battle.comboMax ฮิต (ฮิตละ × monComboMul)',
      detail: '0.2 = 20% ต่อฮิตถัดไป · ใช้ทดสอบบิวท์ AGI/Ignore Combo ของผู้เล่นได้',
    },
    counter: {
      label: defaultLabel ?? (native ? 'โอกาสสวนกลับ (โบนัส +)' : 'โอกาสสวนกลับ'),
      effect: 'เพิ่ม = เวลาฮีโร่ตีโดน มอนจะสวนหมัดกลับทันที (แรง × monCounterMul) กดดันสายตีรัว',
      detail: '0.15 = โอกาสสวน 15% · ฮีโร่ต้านได้ด้วย DEX (Ignore Counter) และ VIT (Counter DR)',
    },
    lifesteal: {
      label: defaultLabel ?? 'ดูดเลือด (%)',
      effect: 'เพิ่ม = มอนฟื้น HP ตาม % ดาเมจที่ตีเข้าเนื้อฮีโร่ (0.2 = ดูด 20%, เผาไหม้/Anti-heal ช่วยแก้ทาง)',
      detail: 'ถ้ามอนตีโล่ไม่เข้าเนื้อ จะดูดเลือดไม่ได้ · ลดลงได้ถ้าเลือดฮีโร่มีโล่ซับ',
    },
    reflect: {
      label: defaultLabel ?? 'สะท้อนดาเมจ (%)',
      effect: 'เพิ่ม = ตีมอนแรงเท่าไร ฮีโร่โดนสะท้อนคืนเท่านั้น (โดนจำกัดเพดานต่อฮิตที่ battle.reflectCap)',
      detail: 'ทำงานกับการโจมตีตรง ไม่ทำให้ฮีโร่ตายจากสะท้อน และถูกลดด้วย M.DEF',
    },
    absorb: {
      label: defaultLabel ?? 'ดูดซับ → Soul Strike',
      effect: 'เพิ่ม = เก็บดาเมจที่โดนเข้าบาร์สะสม แล้วยิงคืนรวมเป็นลูกบอลเวทตอนท่าชาร์จ (Mirage)',
      detail: 'เพดานดาเมจสะสมรวมที่ระเบิดคืนคุมด้วย battle.soulCap',
    },
    razor: {
      label: defaultLabel ?? 'Blood Razor (% HP ปัจจุบัน)',
      effect: 'เพิ่ม = ทุกครั้งที่มอนตีโดนจะแถมดาเมจเวทคิดจาก % เลือดปัจจุบันฮีโร่ (เจ็บหนักแม้ฮีโร่เลือดเยอะ)',
      detail: 'ยังถูกสเกลเพิ่มตาม INT ด้วย SKILL_SCALE.fx.razor.per · ลด/แก้ทางด้วย M.DEF',
    },
    fixedFlee: {
      label: defaultLabel ?? 'หลบตายตัว (Fixed Flee)',
      effect: 'เพิ่ม = มอนมีโอกาสหลบ 100% แม้แต่คริ/เวทก็ไม่โดน ตามอัตรานี้ (เช่น 0.5 = หลบครึ่งนึงเสมอ)',
      detail: 'ข้ามการเทียบ Hit vs Flee ปกติทั้งหมด (ใช้กับบอสกิมมิกอย่างเมเดน)',
    },
    deathBlast: {
      label: defaultLabel ?? 'ระเบิดตอนตาย × ATK',
      effect: 'เพิ่ม = พอฆ่ามอนตัวนี้ตายมันจะระเบิดเวทใส่ฮีโร่แรงขึ้น (0 = ไม่ระเบิด)',
      detail: 'ดาเมจ = ATK × monDmgMul × deathBlast (เป็นดาเมจเวท หลบได้ด้วย Flee/โล่)',
    },
    slamMul: {
      label: defaultLabel ?? 'แรงท่าชาร์จ × ATK',
      effect: 'เพิ่ม = ท่าทุบ/ชาร์จของบอสแรงขึ้น (เช่น 2.2 = ตีหนัก 2.2 เท่า + ตัดเกจสตั๊น)',
      detail: 'ใช้เฉพาะมอนที่มีระบบชาร์จ (บอสหรือมอนที่ตั้ง chargeEvery)',
    },
    chargeEvery: {
      label: defaultLabel ?? 'ชาร์จทุก N เทิร์น',
      effect: 'ลดเลข = บอสชาร์จท่าใหญ่ถี่ขึ้น บีบให้ต้องเร่งดาเมจหรือมีสถานะต้าน/เบรก',
      detail: 'ค่าว่างจะใช้ค่ากลางจาก battle.slamEvery (ค่าปกติ 3 เทิร์น)',
    },
    shots: {
      label: defaultLabel ?? 'จำนวนนัดต่อการตี',
      effect: 'เพิ่ม = ตีปกติ 1 ครั้งยิงออกหลายนัด (เหมาะกับมอนปืน/ทริกเกอร์ติดพิษ/Blood Razor)',
      detail: 'แต่ละนัดแยกคำนวณ Hit/Crit (แต่คิดดาเมจรวมตามสเปคของตัวละครนั้น)',
    },
    speedMul: {
      label: defaultLabel ?? 'ความเร็ว × (speedMul)',
      effect: 'เพิ่ม = เทิร์นเกจมอนเดินเร็วกว่าเดิม ออกเทิร์นแทรกฮีโร่ถี่ขึ้น (1 = ปกติ)',
      detail: 'ใช้ได้ทั้งมอน D1–5 และ D6+ โดยคูณทับความเร็วพื้นฐานหรือความเร็วจาก AGI',
    },
    'bodyMul.hp': {
      label: defaultLabel ?? 'ตัวคูณ HP (bodyMul.hp)',
      effect: 'เพิ่ม = คูณ HP สุดท้ายของมอนหลังคำนวณทุกอย่างแล้ว (เช่น 1.2 = อึดขึ้น +20%, 1 = ปกติ)',
      detail: 'วิธีปรับความอึดของมอนเดี่ยวตัวเดียวที่เร็วและเห็นผลตรงที่สุดโดยไม่เพี้ยนสเตตัสอื่น',
    },
    'bodyMul.dmg': {
      label: defaultLabel ?? 'ตัวคูณ ATK (bodyMul.dmg)',
      effect: 'เพิ่ม = คูณพลังโจมตีกายภาพสุดท้าย (1.2 = ตีแรง +20%, 1 = ปกติ)',
      detail: 'ใช้ปรับความโหดของมอนเดี่ยวตัวเดียวโดยไม่ไปยุ่งกับ Hit/Crit',
    },
    'bodyMul.matk': {
      label: defaultLabel ?? 'ตัวคูณ M.ATK (bodyMul.matk)',
      effect: 'เพิ่ม = คูณพลังเวทสุดท้าย (ทำให้ท่า bolt แรงขึ้นเฉพาะตัวนี้, 1 = ปกติ)',
      detail: 'มีผลกับมอนสายเวทและการตี/สกิลที่ใช้ M.ATK',
    },
    pointsMul: {
      label: defaultLabel ?? 'ตัวคูณแต้ม stat (pointsMul)',
      effect: 'เพิ่ม = เพิ่มงบแต้มสเตตัสทั้งหมด (เก่งขึ้นรอบด้านทั้ง HP, ATK, DEF, Speed, Flee, Crit)',
      detail: 'ค่า 1.5 = มีแต้มแจกให้ statAlloc เพิ่มขึ้น 50% (เหมาะเร่งระดับความโหดทั้งตัวแบบสมส่วน)',
    },
    'venom.dmg': {
      label: defaultLabel ?? 'Venom ดาเมจ',
      effect: 'เพิ่ม = พลังพิเศษแบบพิษเฉพาะตัวแรงขึ้น (สเกลกับสกิล/พาสซีฟพิษของมอน)',
    },
    'venom.dex': {
      label: defaultLabel ?? 'Venom +DEX',
      effect: 'เพิ่ม = เพิ่มความแม่นยำ (DEX) เสริมสำหรับกลไก Venom ของมอนตัวนั้น',
    },
    'venom.turns': {
      label: defaultLabel ?? 'Venom นาน (เทิร์น)',
      effect: 'เพิ่ม = ระยะเวลาของกลไก Venom นานขึ้นกี่เทิร์น',
    },
    'trueSight.after': {
      label: defaultLabel ?? 'True Sight หลังโดนหลบ (ครั้ง)',
      effect: 'ลดเลข = ฮีโร่หลบได้ไม่กี่ที มอนก็เปิด True Sight ล็อกเป้าแล้ว! (กดดันสาย AGI หลบล้วน)',
      detail: 'เมื่อฮีโร่หลบครบ N ครั้ง มอนจะเปิดตาที่สามทำให้ตีโดนแน่นอนช่วงหนึ่ง',
    },
    'trueSight.turns': {
      label: defaultLabel ?? 'True Sight นาน (เทิร์น)',
      effect: 'เพิ่ม = พอเปิด True Sight แล้วมอนจะตีโดนแน่/ต้านหลบนานขึ้นกี่เทิร์น',
      detail: 'ลดความได้เปรียบของบิวท์หลบ 100% เวลาเจอเกือบครบเทิร์น',
    },
  }

  return staticMon[rel] ?? {
    label: defaultLabel ?? rel,
    effect: 'ค่าปรับสมดุลของมอนสเตอร์ตัวนี้',
  }
}

const COMBO_EXPLAIN: Record<string, FieldExplain> = {
  baseCount: {
    label: 'จำนวนคอมโบพื้นฐานฮีโร่ (ฮิตเสริม)',
    effect: 'เพิ่ม = ฮีโร่ทุกคนเริ่มด้วยสิทธิ์คอมโบต่อชุดยาวขึ้น (ต้องลุ้นอัตราติดทีละฮิต)',
    detail: 'จำนวนฮิตเสริมสูงสุดพื้นฐาน (รวมกับ +จากอาวุธ/การ์ด) โดยทอยโอกาสติดต่อไปเรื่อย ๆ จนกว่าจะพลาด',
  },
  rateCap: {
    label: 'เพดานอัตราคอมโบ/สวนกลับรวม',
    effect: 'เพิ่ม = อนุญาตให้สะสม % คอมโบ/สวนกลับเกิน 100% ไปสู้กับค่าต้าน Ignore ของบอสได้สูงขึ้น',
    detail: '1.5 = ตันที่ 150% (ส่วนที่เกิน 100% มีประโยชน์ไว้หักล้างค่า ignore/ignoreCounter ของมินิบอสและบอส)',
  },
  dmgFloor: {
    label: 'พื้นต่ำสุดตัวคูณดาเมจ (Damage Floor)',
    effect: 'เพิ่ม = แม้เจอบอสลดดาเมจคอมโบ/สวนกลับหนักแค่ไหน ดาเมจก็ไม่ร่วงต่ำกว่าสัดส่วนนี้ (0.2 = อย่างน้อย 20%)',
    detail: 'ป้องกันไม่ให้สกิลตีปกติ/คอมโบ/สวนกลับเหลือ 0 ดาเมจ',
  },
  hardAdd: {
    label: 'โบนัสต้านทานของมอนในโหมด Hard/หอคอย',
    effect: 'เพิ่ม = มินิบอส/บอสใน Hard และหอคอยต้านคอมโบ/สวนกลับของฮีโร่เก่งขึ้น (+0.1 = +10%)',
    detail: 'บวกเพิ่มเข้าไปใน ignore, comboDR, ignoreCounter, counterDR ของฝั่งมอน',
  },
  defCap: {
    label: 'เพดานป้องกันคอมโบ/สวนกลับจาก Stats ฮีโร่',
    effect: 'เพิ่ม = ฮีโร่ที่อัป AGI/DEX/VIT สูง ๆ จะกันคอมโบ/สวนกลับมอนได้เกือบสมบูรณ์ (ตันที่ค่านี้, การ์ดบวกแยกต่างหาก)',
    detail: 'ค่าเริ่มต้น 0.3 (30%) สำหรับสูตร stat/(stat+defK)',
  },
  critDRCap: {
    label: 'เพดานลดดาเมจคริจาก LUK ฮีโร่',
    effect: 'เพิ่ม = ฮีโร่สาย LUK ลดความแรงคริของมอนได้ลึกกว่าเดิม (0.5 = ลดสูงสุด 50%)',
    detail: 'คูณกับ (monCritMul × (1 - critDR)) โดยไม่ต่ำกว่า 1×',
  },
  defK: {
    label: 'ตัวหารโค้งต้านทานฮีโร่ (defK)',
    effect: 'ลดเลข = ฮีโร่ต้องการ AGI/DEX/VIT/LUK น้อยลงก็ถึงเพดานกันแล้ว · เพิ่ม = ต้องปั้นสเตตัสหนักขึ้น',
    detail: 'สูตร x / (x + defK) · เช่น defK 400 ต้องมี stat 400 เพื่อได้ครึ่งเดียวก่อนถึง Cap',
  },
}

const TIER_TH: Record<string, string> = { normal: 'มอนปกติ', mini: 'มินิบอส', boss: 'บอส (MVP)' }
function explainCombo(path: string): FieldExplain {
  if (COMBO_EXPLAIN[path]) return COMBO_EXPLAIN[path]
  const [cat, tier] = path.split('.')
  const t = TIER_TH[tier] ?? tier
  if (cat === 'ignore') return { label: `มอนเมินคอมโบฮีโร่ · ${t}`, effect: `เพิ่ม = หักลบโอกาสคอมโบของฮีโร่เมื่อสู้กับ${t} (0.25 = หักออก 25%p)`, detail: 'ลดโอกาสติดคอมโบของฮีโร่โดยตรง (สะสม rate เกิน 100% ช่วยหักล้างได้)' }
  if (cat === 'basicDR') return { label: `มอนลดดาเมจตีปกติ/สวน · ${t}`, effect: `เพิ่ม = ${t}รับดาเมจจากการตีธรรมดาและสวนกลับเบาลง (ไม่กระทบสกิล)`, detail: 'นำไปหักลบในสูตร 1 + basicDmg - basicDR' }
  if (cat === 'comboDR') return { label: `มอนลดดาเมจฮิตคอมโบ · ${t}`, effect: `เพิ่ม = ${t}รับดาเมจเฉพาะฮิตคอมโบแถมเบาลง ลดความโกงของบิวท์ตีรัว`, detail: 'หักลบเพิ่มจาก basicDR ในฮิตคอมโบเท่านั้น' }
  if (cat === 'ignoreCounter') return { label: `มอนเมินสวนกลับฮีโร่ · ${t}`, effect: `เพิ่ม = ลดโอกาสฮีโร่สวนกลับเมื่อสู้กับ${t} (บีบสาย Counter)` }
  if (cat === 'counterDR') return { label: `มอนลดดาเมจฮิตสวนกลับ · ${t}`, effect: `เพิ่ม = ${t}โดนดาเมจจากท่าสวนกลับเบาลง`, detail: 'หักลบร่วมกับ basicDR เวลาฮีโร่ตีสวนกลับ' }
  return { label: path, effect: 'ค่าสูตรคอมโบ/สวนกลับ' }
}

function explainHard(path: string): FieldExplain {
  const staticHard: Record<string, FieldExplain> = {
    hpGrow: { label: 'อัตราโต HP เกิน Lv 20 (ทบต้น/Lv)', effect: 'เพิ่ม = ผู้เล่น Lv 21–45 ลง Hard เจอบอสเลือดหนาขึ้นแบบทวีคูณ (1.08 = +8% ต่อ Lv)' },
    dmgGrow: { label: 'อัตราโต ATK เกิน Lv 20 (ทบต้น/Lv)', effect: 'เพิ่ม = ผู้เล่น Lv 21–45 ลง Hard เจอมอนตีแรงขึ้นทวีคูณ (1.04 = +4% ต่อ Lv)' },
    maxLv: { label: 'เพดาน Base Lv ที่ Hard สเกลตาม', effect: 'เพิ่ม = คนเลเวลสูงเกิน 45 ยังเจอมอนเก่งขึ้นเรื่อย ๆ ไม่ตันเร็ว · ลด = ฟาร์ม Hard ชิลขึ้นเมื่อ Lv สูง' },
    hp: { label: 'ตัวคูณ HP ฐานโหมด Hard', effect: 'เพิ่ม = มอนโหมด Hard เลือดเยอะขึ้นทันทีทุกระดับเลเวล (1.3 = +30% ทับกราฟ)' },
    atk: { label: 'ตัวคูณ ATK ฐานโหมด Hard', effect: 'เพิ่ม = มอนโหมด Hard ตีและยิงเวทแรงขึ้นทันทีทุกระดับ (1.3 = +30% ทับกราฟ)' },
    turnMul: { label: 'ตัวคูณเทิร์นจำกัดโหมด Hard', effect: 'เพิ่ม = ให้เวลาสู้ในโหมด Hard นานขึ้นตามเลือดที่หนาขึ้น (1.4 = +40% เทิร์น)' },
    reward: { label: 'ตัวคูณรางวัลโหมด Hard (Zeny / EXP)', effect: 'เพิ่ม = ลง Hard คุ้มค่ากว่าปกติมากขึ้น (ก่อนคูณ (อัตราส่วน HP)^rewardPow)' },
    mats: { label: 'ตัวคูณวัตถุดิบคราฟต์โหมด Hard', effect: 'เพิ่ม = ดรอปวัตถุดิบตีบวก/คราฟต์ในโหมด Hard เยอะขึ้น (ปัดขึ้น)' },
    rewardPow: { label: 'เลขยกกำลังโบนัสรางวัลตามความถึก (rewardPow)', effect: 'เพิ่ม = ยิ่งลง Hard ที่เลเวลสูง (มอนเลือดบวมกว่าเดิมมาก) รางวัลยิ่งคูณพุ่งแรงตามอัตราส่วน HP' },
    hitPerLv: { label: 'Hit ที่มอน Hard ได้เพิ่มต่อ Lv', effect: 'เพิ่ม = ยิ่งฮีโร่ Base Lv สูงกว่าดัน มอน Hard ยิ่งตีแม่นขึ้น แก้ทางสาย Flee หลบสบายเกินไป' },
  }
  if (staticHard[path]) return staticHard[path]
  const p = path.split('.')
  if (p[0] === 'recLv') {
    const d = DUNGEON_LABEL[p[1]] ?? p[1]
    return {
      label: `Lv แนะนำ · ${d}`,
      effect: 'เพิ่ม = จุดเริ่มคิดสเกล Hard สูงขึ้น (ฮีโร่ Lv ต่ำกว่านี้จะได้มอนเบาลงตามกราฟ)',
      detail: 'ถ้า Base Lv ฮีโร่ ≤ recLv มอน Hard จะสเกลตาม (hp/atk × ฐาน) เท่านั้น ไม่บวก Gap เพิ่ม',
    }
  }
  if (p[0] === 'curve') {
    const dName = ['D1 ทุ่งเยลลี่', 'D2 ป่าหมาป่าเงา', 'D3 วิหารร้าง', 'D4 บึงอสรพิษ', 'D5 ปราสาทจอมมาร'][Number(p[1])] ?? `จุดที่ ${p[1]}`
    const k = p[2]
    if (k === '0') return { label: `กราฟ Hard ${dName} · จุด Lv อ้างอิง`, effect: 'ปรับตำแหน่งจุดอ้างอิงบนแกน Base Lv ของกราฟไต่ระดับความโหด' }
    if (k === '1') return { label: `กราฟ Hard ${dName} · HP บอสอ้างอิง`, effect: 'เพิ่ม = ดึงความอึดของมอน Hard ช่วง Lv นี้ขึ้น · ลด = ช่วง Lv นี้บางลง (กราฟลากเส้นต่อจุด)' }
    if (k === '2') return { label: `กราฟ Hard ${dName} · ATK บอสอ้างอิง`, effect: 'เพิ่ม = ดึงดาเมจมอน Hard ช่วง Lv นี้ขึ้น · ลด = ตีเบาลง' }
  }
  return { label: path, effect: 'ค่าปรับสมดุลโหมด Hard' }
}

function explainHardSkill(path: string): FieldExplain {
  const [idxStr, ...rest] = path.split('.')
  const i = Number(idxStr)
  const sk = HARD_SKILLS[i]
  const prefix = sk ? `${i} · ${sk.name} (${sk.kind})` : `สกิล Hard #${i}`
  return explainSkillLeaf(rest, prefix, sk)
}

function explainHardPassive(path: string): FieldExplain {
  const [idxStr, ...rest] = path.split('.')
  const i = Number(idxStr)
  const hp = HARD_PASSIVES[i]
  const head = hp ? `${i} · ${hp.name}` : `พาสซีฟ Hard #${i}`
  const leaf = rest.join('.')
  if (rest[0] === 'onHit') {
    const fx = rest[1] as keyof HitFx
    return { label: `${head} · ตีติด${FX_NAME[fx]?.replace(/^ติด/, '') ?? fx}`, effect: `ตั้ง > 0 = บอส Hard ที่สุ่มได้พาสซีฟนี้จะยัดสถานะนี้ทุกครั้งที่ตีโดน`, detail: FX_TH[fx] }
  }
  switch (leaf) {
    case 'lifesteal': return { label: `${head} · ดูดเลือด`, effect: 'เพิ่ม = ตีโดนทีไรเด้งเลือดคืนมากขึ้น (0.15 = ดูด 15% ดาเมจที่ทำได้)' }
    case 'reflect': return { label: `${head} · สะท้อนดาเมจ`, effect: 'เพิ่ม = ตีมอนตัวนี้แล้วสะท้อนกลับใส่ฮีโร่แรงขึ้น (ตันที่ battle.reflectCap)' }
    case 'speed': return { label: `${head} · ความเร็ว ×`, effect: 'เพิ่ม = มอนที่ได้พาสซีฟนี้จะออกเทิร์นเร็วกว่าปกติ (1.2 = +20%)' }
    case 'enrage': return { label: `${head} · ดาเมจ × ตอนคลั่ง (<35% HP)`, effect: 'เพิ่ม = พอบอส Hard เลือดต่ำกว่า 35% จะตีแรงขึ้นมาก (แถมเร็วขึ้น +15% ตามสคริปต์)' }
    case 'def': return { label: `${head} · โบนัส P.DEF +`, effect: 'เพิ่ม = มอนได้เกราะกายภาพเพิ่มตรง ๆ (ช่วยกันสายกายภาพที่ไม่ติดคริ)' }
    default: return { label: `${head} · ${leaf}`, effect: 'พาสซีฟสุ่มในโหมด Hard' }
  }
}

const MON_STAT_MAP: Record<string, FieldExplain> = {
  'monStat.tierPct.normal': { label: 'สัดส่วนแต้ม stat · มอนปกติ', effect: 'เพิ่ม = มอนปกติใน D6+ ได้แต้มสเตตัสต่อเลเวลมากขึ้น (0.5 = ได้ 50% ของฮีโร่)' },
  'monStat.tierPct.mini': { label: 'สัดส่วนแต้ม stat · มินิบอส', effect: 'เพิ่ม = มินิบอสใน D6+ เก่งขึ้นรอบด้าน (1.0 = ได้แต้มเท่าฮีโร่)' },
  'monStat.tierPct.boss': { label: 'สัดส่วนแต้ม stat · บอส (MVP)', effect: 'เพิ่ม = บอส D6+ มีแต้มสเตตัสสูงขึ้นมาก (1.5 = 150% ของฮีโร่)' },
  'monStat.hardAdd': { label: 'โบนัสสัดส่วนแต้มในโหมด Hard/หอคอย', effect: 'เพิ่ม = มอน D6+ ในโหมด Hard บวกสัดส่วนแต้ม stat เพิ่มจากเดิม (+0.5 = +50%)' },
  'monStat.levelBase.hp': { label: 'ค่าฐาน HP ต่อ Lv (แทนค่าเกราะผู้เล่น)', effect: 'เพิ่ม = มอน D6+ เลือดพื้นฐานสูงขึ้นทุกตัวต่อ 1 เลเวล (นำไปคูณ body ด้วย!)' },
  'monStat.levelBase.atk': { label: 'ค่าฐาน P.ATK ต่อ Lv', effect: 'เพิ่ม = ดาเมจกายภาพพื้นฐานของมอนทุกตัวต่อเลเวลแรงขึ้น (เช่น Lv40 × 3.5 = +140 ATK)' },
  'monStat.levelBase.matk': { label: 'ค่าฐาน M.ATK ต่อ Lv', effect: 'เพิ่ม = ดาเมจเวทพื้นฐานของมอนทุกตัวต่อเลเวลแรงขึ้น' },
  'monStat.levelBase.def': { label: 'ค่าฐาน P.DEF ต่อ Lv', effect: 'เพิ่ม = ยิ่งดันลึกมอนยิ่งเกราะหนา (บีบให้ฮีโร่ต้องปั้นคริหรือเจาะเกราะ)' },
  'monStat.levelBase.hit': { label: 'ค่าฐาน Hit ต่อ Lv', effect: 'เพิ่ม = ยิ่งดันลึกมอนยิ่งตีแม่น (บีบสาย Flee ต้องอัปเลเวลเกียร์ตาม)' },
  'monStat.body.normal': { label: 'ตัวคูณรูปร่าง HP · มอนปกติ', effect: 'เพิ่ม = มอนปกติ D6+ ทุกตัวเลือดหนาขึ้นทั้งระบบ (ค่าปกติ 1)' },
  'monStat.body.mini': { label: 'ตัวคูณรูปร่าง HP · มินิบอส', effect: 'เพิ่ม = มินิบอส D6+ อึดขึ้นหลายเท่าเพื่อไม่ให้จบไวเกินไป (ค่าปกติ 5)' },
  'monStat.body.boss': { label: 'ตัวคูณรูปร่าง HP · บอส (MVP)', effect: 'เพิ่ม = บอส D6+ ทุกตัวอึดขึ้นมาก (ค่าปกติ 8 เท่าของสเตตัส+levelBase)' },
  'monStat.mdefCap': { label: 'เพดานกันเวท (M.DEF Cap) ของมอน', effect: 'เพิ่ม = มอนสาย WIS สูงสามารถลดดาเมจเวทได้ลึกขึ้น (0.75 = กันได้สูงสุด 75%)' },
  'monStat.luckyCap': { label: 'เพดานหลบโชคดี (Lucky Dodge) ของมอน', effect: 'เพิ่ม = มอนสาย LUK สูงหลบได้แม้แต่คริ/เวทถี่ขึ้น (0.25 = สูงสุด 25%)' },
  'monStat.rateCap': { label: 'เพดาน Crit / Combo / Counter มอน', effect: 'เพิ่ม = ยอมให้มอนสะสมเรตคอมโบ/สวนกลับเกิน 100% เพื่อสู้กับการต้านของฮีโร่ได้มากขึ้น' },
  'levelGap.free': { label: 'ระยะห่าง Lv ปลอดการหักรางวัล', effect: 'เพิ่ม = ฮีโร่เวลเกินดัน D6+ ได้หลายเลเวลขึ้นโดยยังได้ของ/EXP เต็ม 100%' },
  'levelGap.per': { label: 'หักรางวัลต่อ Lv ที่เกิน (%)', effect: 'เพิ่ม = พอเวลเกินระยะปลอดภาษีปุ๊บ รางวัลร่วงฮวบไวขึ้น (-0.1 = -10%/Lv)' },
  'levelGap.min': { label: 'พื้นต่ำสุดรางวัลเมื่อเวลเกินเยอะ', effect: 'เพิ่ม = ต่อให้เวลทิ้งห่างแค่ไหนก็ยังได้รางวัลขั้นต่ำเท่านี้ (0.4 = อย่างน้อย 40%)' },
  'legacy.tierDrop.normal': { label: 'Lv ลดหลั่นของมอนปกติ (D1–5)', effect: 'เพิ่ม = มอนลูกกระจ๊อกใน D1–5 จะมีเลเวลต่ำกว่าบอสในดันนั้นมากขึ้น (คำนวณ stat อ่อนลง)' },
  'legacy.tierDrop.mini': { label: 'Lv ลดหลั่นของมินิบอส (D1–5)', effect: 'เพิ่ม = มินิบอสใน D1–5 มีเลเวลอ้างอิงต่ำกว่าบอสดันนั้นมากขึ้น' },
  'legacy.tierDrop.boss': { label: 'Lv ลดหลั่นของบอส (D1–5)', effect: 'ปกติ 0 = บอส D1–5 ใช้เลเวลเต็มของ legacy.lv ดันเจี้ยนนั้น' },
}
function explainMonStat(path: string): FieldExplain {
  if (MON_STAT_MAP[path]) return MON_STAT_MAP[path]
  if (path.startsWith('legacy.lv.')) {
    const d = path.slice('legacy.lv.'.length)
    return {
      label: `Lv อ้างอิงของ ${DUNGEON_LABEL[d] ?? d} (D1–5)`,
      effect: 'เพิ่ม = มอนในดันนี้ได้แต้มสเตตัสคำนวณ M.DEF / Tenacity / Skill Scale มากขึ้น',
      detail: 'มีผลกับค่า stat เสริม (M.DEF/Lucky/Skill Scale) ของมอน D1–5 โดยคง HP/ATK จุดอ้างอิงเดิมไว้',
    }
  }
  return { label: path, effect: 'ค่าสูตรสเตตัสมอน' }
}

function explainArchetype(path: string): FieldExplain {
  const [arch, stat] = path.split('.')
  return {
    label: `${ARCH_TH[arch] ?? arch} · ${(stat ?? '').toUpperCase()}`,
    effect: `เพิ่ม = แม่แบบสาย ${arch} เน้น ${STAT_TH[stat] ?? stat} เยอะขึ้น (ใช้เป็นค่าสำรองถ้ามอนไม่ระบุ statAlloc เอง)`,
  }
}

const SKILL_SCALE_MAP: Record<string, FieldExplain> = {
  per: { label: 'ตัวคูณแรงสกิลต่อ 1 แต้ม stat เกินค่ากลาง', effect: 'เพิ่ม = มอนที่อัป stat ตรงสาย (เช่น Mage อัป INT) จะร่ายสกิลแรงต่างจากมอนทั่วไปชัดเจน (0.003 = +0.3%/แต้ม)' },
  min: { label: 'ตัวคูณสเกลสกิลขั้นต่ำ (Floor)', effect: 'เพิ่ม = มอนที่ stat ต่ำกว่าเกณฑ์จะร่ายสกิลไม่เบาจนเกินไป (0.8 = อย่างน้อย 80%)' },
  max: { label: 'ตัวคูณสเกลสกิลสูงสุด (Cap)', effect: 'เพิ่ม = ปลดล็อกให้บอสสายเฉพาะทางที่ stat พุ่งแรงสามารถเบิร์สต์สกิลทะลุ ×1.5 ได้' },
  'fx.phaseHeal.per': { label: 'เฟสฮีลบอส: เพิ่มตาม WIS (/แต้ม)', effect: 'เพิ่ม = ยิ่งบอสมี WIS สูง ฮีลตอนเข้าเฟสจะเด้งเยอะกว่าเดิม' },
  'fx.phaseShield.per': { label: 'เฟสโล่บอส: เพิ่มตาม WIS (/แต้ม)', effect: 'เพิ่ม = ยิ่งบอสมี WIS สูง โล่ตอนเข้าเฟสจะหนากว่าเดิม' },
  'fx.razor.per': { label: 'Blood Razor: เพิ่มตาม INT (/แต้ม)', effect: 'เพิ่ม = มอนที่มี Blood Razor + INT สูงจะกัด % เลือดฮีโร่เจ็บขึ้น' },
  'lv.powPer': { label: 'เลเวลสกิลมอน: แรงขึ้นต่อ +1 Lv', effect: 'เพิ่ม = ทุก ๆ +1 เลเวลสกิลมอน (เช่นในหอคอยลึก ๆ) สกิลจะแรงพุ่งไวขึ้น (0.1 = +10%/Lv)' },
  'lv.hitsEvery': { label: 'เลเวลสกิลมอน: +1 ฮิตทุกกี่ Lv', effect: 'ลดเลข = มอนเลเวลสกิลสูง (หอคอย) จะได้จำนวนฮิตเพิ่มเร็วขึ้น! (0 = ปิดไม่เพิ่มฮิต)' },
  'lv.fxEvery': { label: 'เลเวลสกิลมอน: +1 สแต็กดีบัฟทุกกี่ Lv', effect: 'ลดเลข = พิษ/เผา/เกราะแตกจากสกิลมอนเพิ่มจำนวนชั้นเร็วขึ้นตามเลเวลสกิล (0 = ปิด)' },
  'lv.turnsEvery': { label: 'เลเวลสกิลมอน: +1 เทิร์น Warcry ทุกกี่ Lv', effect: 'ลดเลข = บัฟ Warcry ของมอนอยู่นานขึ้นเร็วกว่าเดิมตามเลเวลสกิล (0 = ปิด)' },
}

const PROGRESSION_MAP: Record<string, FieldExplain> = {
  'stat.pointsPerLevel': { label: 'แต้ม Stat ต่อ Base Lv (ฮีโร่ + มอน)', effect: 'เพิ่ม = ฮีโร่เก่งไวขึ้นทุกเวล + ⚠️ ส่งผลให้แต้มสเตตัสมอน D6+ (MON_STAT.pointsPerLv) พุ่งตามด้วย!' },
  'stat.xpBase': { label: 'Account EXP ที่ต้องใช้ Lv แรก', effect: 'เพิ่ม = ผู้เล่นเลเวลอัปช่วงต้นเกมช้าลง ต้องฟาร์มมากขึ้น' },
  'stat.xpStep': { label: 'Account EXP ที่เพิ่มต่อเลเวล', effect: 'เพิ่ม = กราฟเก็บเวลช่วงกลาง–ท้ายเกมชันขึ้น (อัป Base Lv ยากขึ้น)' },
  'job.xpBase': { label: 'Job EXP ที่ต้องใช้ Lv แรก', effect: 'เพิ่ม = ปลดล็อกจุดเปลี่ยนอาชีพ (Job Lv 10) ช้าลง' },
  'job.xpStep': { label: 'Job EXP ที่เพิ่มต่อเลเวล', effect: 'เพิ่ม = อัป Job Lv แต่ละขั้นยากขึ้น' },
  'run.runXpBase': { label: 'EXP ในรอบวิ่ง (Lv 1)', effect: 'เพิ่ม = ในแต่ละรอบดันเจี้ยน ฮีโร่ได้เลือกอัปสกิล/การ์ดรอบแรกรอนานขึ้น' },
  'run.runXpStep': { label: 'EXP ในรอบวิ่ง (+ต่อ Lv)', effect: 'เพิ่ม = ท้ายดันเจี้ยนได้เลือกสกิลอัปในรันน้อยครั้งลง' },
  'run.xpOnClear': { label: 'EXP ในรันที่ได้ทันทีเมื่อเคลียร์ห้อง', effect: 'เพิ่ม = การันตี EXP โบนัสทุกห้อง ช่วยให้เลเวลในรันพุ่งแม้เจอห้องมอนน้อยตัว' },
  'run.healOnClear': { label: 'ฮีลหลังผ่านห้อง (% Max HP)', effect: 'เพิ่ม = ยืนระยะในดันเจี้ยนยาว ๆ ง่ายขึ้น หลังจบห้องเด้งเลือดคืนเยอะ (0.2 = 20%)' },
  'run.healOnLevel': { label: 'ฮีลเมื่ออัป Lv ในรัน (% Max HP)', effect: 'เพิ่ม = จังหวะเวลอัปในดันช่วยกู้สถานการณ์เลือดใกล้หมดได้ดีขึ้น (0.2 = 20%)' },
}

const KIT_EXPLAIN: Record<string, FieldExplain> = {
  archerAutoShots: { label: 'Archer · ทักษะ 1: จำนวนศรปกติ', effect: 'เพิ่ม = ยิงหลายดอกต่อเทิร์น (ทริกเกอร์คริ/พิษ/เหยี่ยวได้ถี่ขึ้น)' },
  archerVolleyShots: { label: 'Archer · ทักษะ 1 (ศรสาด): จำนวนศร', effect: 'เพิ่ม = โหมดกระจายเป้าโดนมอนมากขึ้น/ฮิตเยอะขึ้นต่อการกด 1 ครั้ง' },
  archerAuto: { label: 'Archer · ทักษะ 1: ดาเมจต่อดอก × P.ATK', effect: 'เพิ่ม = การยิงทุกดอกของนักธนูแรงขึ้นโดยตรง (ทักษะหลักใช้บ่อยสุด)' },
  archerUlt: { label: 'Archer · Ult: ศรทะลวง × P.ATK', effect: 'เพิ่ม = Ult ศรทะลวงเป้าหมายเดี่ยวเบิร์สต์บอสแรงขึ้น (ส่งผลถึง Beastmaster/Innovator Stampede ด้วย)' },
  mageFire: { label: 'Mage · Ult ไฟ: ความแรง × พลังเวท (Pm)', effect: 'เพิ่ม = ระเบิดไฟ (Hellfire) เผาทั้งกลุ่มแรงขึ้น' },
  mageFireStacks: { label: 'Mage · Ult ไฟ: จำนวนสแต็กเผาไหม้', effect: 'เพิ่ม = มอนติดไฟเผาแรงขึ้นต่อเทิร์นและโดนตัดฮีลนานขึ้น' },
  mageIce: { label: 'Mage · Ult น้ำแข็ง: ความแรง × พลังเวท', effect: 'เพิ่ม = พายุน้ำแข็ง (Blizzard) ทำดาเมจสูงขึ้น' },
  mageIceChill: { label: 'Mage · Ult น้ำแข็ง: ติดช้านาน (เทิร์น)', effect: 'เพิ่ม = ศัตรูทั้งกลุ่มเดินเกจช้าลงนานขึ้น มีเวลาทำดาเมจมากขึ้น' },
  mageLightHits: { label: 'Mage · Ult สายฟ้า: จำนวนฮิตสุ่ม', effect: 'เพิ่ม = สายฟ้าฟาด (Lightning Wrath) ตกลงมาเยอะลูกขึ้นต่อรอบ' },
  mageLightLo: { label: 'Mage · Ult สายฟ้า: ตัวคูณต่ำสุดต่อลูก', effect: 'เพิ่ม = ยกพื้นความแรงขั้นต่ำของสายฟ้าแต่ละฮิตให้เสถียรขึ้น' },
  mageLightHi: { label: 'Mage · Ult สายฟ้า: ตัวคูณสูงสุดต่อลูก', effect: 'เพิ่ม = เพิ่มเพดานลูกที่ฟาดโดนแรงสุดของสายฟ้า (สายสุ่มเบิร์สต์)' },
  'cast.breakBase': { label: 'Mage ร่ายเวท: โอกาสพื้นฐานโดนตีแล้วร่ายแตก', effect: 'เพิ่ม = ถ้านักเวทโดนตีระหว่างชาร์จ Ult จะถูกขัดการร่ายง่ายขึ้น (0.25 = 25%)' },
  'cast.breakDex': { label: 'Mage ร่ายเวท: DEX ช่วยกันร่ายแตก (/แต้ม)', effect: 'เพิ่ม = อัป DEX นิดเดียวก็ลดโอกาสโดนตีแล้วเวทแตกได้เยอะ' },
  'cast.breakMinHp': { label: 'Mage ร่ายเวท: ขั้นต่ำ % HP ที่เสี่ยงแตก', effect: 'เพิ่ม = ต้องโดนตีแรงทะลุสัดส่วน HP นี้เท่านั้นจึงจะเช็กโอกาสแตก (0.06 = ≥6% Max HP)' },
  'cast.breakRefund': { label: 'Mage ร่ายเวท: คืน % Mana เมื่อร่ายแตก', effect: 'เพิ่ม = ต่อให้โดนขัดร่ายก็ไม่เสีย Mana ฟรีทั้งหมด (0.6 = คืน 60%)' },
  'cast.fireMul': { label: 'Mage · ทักษะ 1: ลูกไฟระเบิด × พลังเวท', effect: 'เพิ่ม = ท่าโจมตีพื้นฐาน (ร่ายทันที) ของนักเวทแรงขึ้น' },
  'cast.ultMul': { label: 'Mage ร่ายเวท: ตัวคูณความแรงตอนปล่อยชาร์จ', effect: 'เพิ่ม = รางวัลความเสี่ยงจากการร่าย 1 เทิร์นสูงขึ้น (1.3 = แรง ×1.3 ทุกธาตุ)' },
  'cast.brokenUltCd': { label: 'Mage ร่ายเวท: CD เมื่อร่ายแตก (เทิร์น)', effect: 'ลดเลข = ถึงร่ายโดนตีแตกก็วนกลับมาร่าย Ult ใหม่ได้ไวขึ้น (ปกติ 2 เทิร์น)' },
  'cast.boltMana': { label: 'Mage ตีธรรมดา: ฟื้น Mana เมื่อปาลูกเวทเล็ก', effect: 'เพิ่ม = จังหวะกดตีปกติตอน Mana หมดฟื้น Mana กลับมาใช้สกิลไวขึ้น' },
  clericHealBelow: { label: 'Cleric · ทักษะ 1: เกณฑ์ % HP ที่จะฮีล', effect: 'เพิ่ม = พอเลือดพร่องจากจุดนี้ Cleric จะสลับมาฮีลตัวเองเร็วขึ้น (เช่น 0.75 = ฮีลเมื่อ HP < 75%)' },
  clericSmiteTargets: { label: 'Cleric · ทักษะ 1: แสงตกใส่กี่เป้าหมาย', effect: 'เพิ่ม = เวลาไม่ต้องฮีล ทักษะ 1 จะฟาดแสงโดนมอนหลายตัวพร้อมกันมากขึ้น' },
  'cleric.heal': { label: 'Cleric · ทักษะ 1: ฮีล × M.ATK', effect: 'เพิ่ม = กดฮีลทีนึงเลือดเด้งเยอะขึ้น (สเกลด้วย M.ATK + WIS healAmp)' },
  'cleric.smite': { label: 'Cleric · ทักษะ 1: แสงตก × M.ATK', effect: 'เพิ่ม = ดาเมจเวทเวลาใช้ทักษะ 1 โจมตีแรงขึ้น' },
  'cleric.basic': { label: 'Cleric · ตีธรรมดา: ตัวคูณ P.ATK', effect: 'เพิ่ม = ตีปกติของนักบวช/สายทุบแรงขึ้น (มีผลกับคอมโบและกระบอง)' },
  'cleric.ultAtk': { label: 'Cleric · Ult: ทุบทุกตัว × P.ATK', effect: 'เพิ่ม = ฮิตทุบกายภาพหมู่ของ Ult พรคุ้มครองแรงขึ้น' },
  'cleric.ultLight': { label: 'Cleric · Ult: Holy Light ต่อลูก × M.ATK', effect: 'เพิ่ม = ลูกบอลแสงที่โปรยใส่มอนหลังทุบแรงขึ้น (ทริกเกอร์ทั้งฮีล/โล่ได้ตามสาย)' },
  'cleric.ultLights': { label: 'Cleric · Ult: จำนวน Holy Light', effect: 'เพิ่ม = จำนวนลูกแสงที่ยิงแถมใน Ult เยอะขึ้น' },
  'cleric.ultShield': { label: 'Cleric · Ult: โล่ % Max HP', effect: 'เพิ่ม = กด Ult แล้วได้เกราะป้องกันหนากว่าเดิม (0.14 = 14% Max HP)' },
  'cleric.ultShieldTurns': { label: 'Cleric · Ult: เกราะอยู่นาน (เทิร์น)', effect: 'เพิ่ม = เกราะจาก Ult อยู่คุ้มครองนานขึ้นกี่เทิร์น' },
  'cleric.shieldTurns': { label: 'Cleric: ระยะเวลาเกราะสกิลมาตรฐาน (เทิร์น)', effect: 'เพิ่ม = โล่จากสกิลเสริมของ Cleric อยู่นานขึ้น' },
  'cleric.shieldCap': { label: 'Cleric: เพดานเกราะป้องกัน (% Max HP)', effect: 'เพิ่ม = นักบวชสะสมโล่ซ้อนทับกันได้หนายิ่งกว่าสายอื่น (ค่าปกติ 0.5 = 50% Max HP)' },
  'cleric.purifyHeal': { label: 'Cleric: ไฟชำระฮีล × M.ATK', effect: 'เพิ่ม = เอฟเฟกต์เสริมไฟชำระฟื้น HP เยอะขึ้นตาม M.ATK' },
  'cleric.ultMana': { label: 'Cleric · Ult: ค่าร่าย Mana พื้นฐาน', effect: 'ลดเลข = นักบวชกด Ult ได้บ่อยและประหยัด Mana มากขึ้น (ซิงค์ไปยัง JOBS.cleric.ult.cost)' },
  'cleric.ultManaLv': { label: 'Cleric tree · ราก: Mana Ult เพิ่มต่อ Lv', effect: 'เพิ่ม = ยิ่งอัปโนดราก Ult สูงขึ้นจะยิ่งกิน Mana แพงขึ้นแลกกับพลังทุบ (0 = ไม่กินเพิ่ม)' },
  clericUltAtkLv: { label: 'Cleric tree · ราก: ทุบ Ult +P.ATK ต่อ Lv', effect: 'เพิ่ม = แต่ละ Lv ของโนดรากทำให้ Ult ทุบแรงขึ้น (+0.15 = +15% P.ATK ต่อ Lv)' },
  clericJudgeEvery: { label: 'Cleric (ค่าเก่า Judgement): ทุกกี่เทิร์น', effect: 'ตัวนับเก่าสำหรับสกิล Judgement (ระบบปัจจุบันใช้ใยแมงมุม/แสงแตกเป็นหลัก)' },
  clericJudge: { label: 'Cleric (ค่าเก่า Judgement): ตัวคูณ', effect: 'ตัวคูณเก่าสำหรับ Judgement (ตรวจสอบสคริปต์ก่อนปรับใช้งาน)' },
  clericWarmCounterLv: { label: 'Cleric tree: พรอุ่นไอ +สวนกลับต่อ Lv', effect: 'เพิ่ม = อัปโนดพรอุ่นไอแล้วได้โอกาสสวนกลับสูงขึ้น (0.025 = +2.5% ต่อ Lv)' },
  clericWarmLightLv: { label: 'Cleric tree: พรอุ่นไอ +Holy Light ต่อ Lv', effect: 'เพิ่ม = อัปพรอุ่นไอแล้วเพิ่มจำนวนลูกแสงใน Ult มากขึ้น (+1 ลูก/Lv)' },
  clericSpearShieldLv: { label: 'Cleric tree: เกราะแสง +โล่ (% Max HP/Lv)', effect: 'เพิ่ม = ทุกครั้งที่หอกแสงพุ่ง ฮีโร่ได้โล่ % Max HP หนาขึ้น' },
  spearBase: { label: 'Cleric · หอกแสง: ดาเมจพื้นฐาน × M.ATK', effect: 'เพิ่ม = หอกแสง (passive/สกิล 2) ที่พุ่งยิงอัตโนมัติแรงขึ้นทุกเล่ม' },
  spearMax: { label: 'Cleric · หอกแสง: จำนวนเล่มสะสมสูงสุด', effect: 'เพิ่ม = สะสมหอกแสงไว้รอบตัวได้เยอะเล่มขึ้นก่อนปลดปล่อย/ตัน' },
  'clericTree.dawn.every': { label: 'Cleric tree · รุ่งอรุณ: ออกทุกกี่ฮิต', effect: 'ลดเลข = โบนัสแสงรุ่งอรุณทำงานถี่ขึ้นทุก ๆ N ฮิต (ตีปกติ/คอมโบ)' },
  'clericTree.dawn.matk': { label: 'Cleric tree · รุ่งอรุณ: × M.ATK ในสูตร', effect: 'เพิ่ม = สายเวท (M.ATK) ได้โบนัสแสงรุ่งอรุณแรงขึ้นควบคู่ STR+WIS' },
  'clericTree.dawn.share': { label: 'Cleric tree · รุ่งอรุณ: ตัวคูณโบนัส/Lv เดิม', effect: 'เพิ่ม = ดาเมจเวทแถม (STR + WIS + M.ATK%) ต่อ Lv แรงขึ้นชัดเจน' },
  'clericTree.dawn.heal': { label: 'Cleric tree · สมานแผล: ฮีลตามดาเมจ/Lv เดิม', effect: 'เพิ่ม = สัดส่วนที่ฮีลตัวเองจากโบนัสรุ่งอรุณที่ฟันใส่ตัวหน้าสูงขึ้น' },
  'clericTree.dawn.weak': { label: 'Cleric tree · สมานแผล: ตัวคูณกับมอนปกติ', effect: 'เพิ่ม = ดูดเลือด/ฮีลจากมอนลูกน้องได้เยอะขึ้น (0.6 = ได้ 60% เทียบกับตีบอส)' },
  'clericTree.dawn.wis.0': { label: 'Cleric tree · แสงแตก Lv1: เปลี่ยนดาเมจเป็น +WIS', effect: 'เพิ่ม = โบนัสรุ่งอรุณที่ทำได้แปลงเป็นบัฟ WIS เยอะขึ้นที่โนด Lv1' },
  'clericTree.dawn.wis.1': { label: 'Cleric tree · แสงแตก Lv2: เปลี่ยนดาเมจเป็น +WIS', effect: 'เพิ่ม = โบนัสรุ่งอรุณที่ทำได้แปลงเป็นบัฟ WIS เยอะขึ้นที่โนด Lv2' },
  'clericTree.dawn.wis.2': { label: 'Cleric tree · แสงแตก Lv3: เปลี่ยนดาเมจเป็น +WIS', effect: 'เพิ่ม = โบนัสรุ่งอรุณที่ทำได้แปลงเป็นบัฟ WIS เยอะขึ้นที่โนด Lv3' },
  'clericTree.dawn.wisTurns.0': { label: 'Cleric tree · แสงแตก Lv1: ระยะเวลา (เทิร์น)', effect: 'เพิ่ม = บัฟ +WIS จากแสงแตกอยู่ติดตัวนานขึ้นที่ Lv1' },
  'clericTree.dawn.wisTurns.1': { label: 'Cleric tree · แสงแตก Lv2: ระยะเวลา (เทิร์น)', effect: 'เพิ่ม = บัฟ +WIS จากแสงแตกอยู่ติดตัวนานขึ้นที่ Lv2' },
  'clericTree.dawn.wisTurns.2': { label: 'Cleric tree · แสงแตก Lv3: ระยะเวลา (เทิร์น)', effect: 'เพิ่ม = บัฟ +WIS จากแสงแตกอยู่ติดตัวนานขึ้นที่ Lv3' },
  'clericTree.dawn.crit': { label: 'Cleric tree · ★ อรุณพิทักษ์: +ดาเมจคริ', effect: 'เพิ่ม = โบนัสรุ่งอรุณ (ซึ่งติดคริ 100%) ระเบิดความแรงคริสูงขึ้น' },
  'clericTree.core.base': { label: 'Cleric tree · จิตสงบ: +STR/+WIS ต่อ Lv เดิม', effect: 'เพิ่ม = นักบวชได้ STR+WIS ตั้งต้นจากโนดแก่นศรัทธามากขึ้น' },
  'clericTree.core.regen': { label: 'Cleric tree · จิตสงบ: ฟื้น Mana ต่อ Lv เดิม', effect: 'เพิ่ม = ฟื้น Mana ต่อเทิร์นมากขึ้นตามค่าต่ำสุดของ STR/WIS (1 หน่วย = 3 Mana/เทิร์น)' },
  'clericTree.core.intPer.0': { label: 'Cleric tree · ศรัทธาสู่กาย Lv1: ทุกกี่แต้ม', effect: '⚠️ ลดเลข = แปลง INT→STR และ WIS→VIT ได้ไวขึ้น! · เพิ่ม = แลกแต้มได้ช้าลง' },
  'clericTree.core.intPer.1': { label: 'Cleric tree · ศรัทธาสู่กาย Lv2: ทุกกี่แต้ม', effect: '⚠️ ลดเลข = แปลง INT→STR และ WIS→VIT ได้ไวขึ้น! · เพิ่ม = แลกแต้มได้ช้าลง' },
  'clericTree.core.intPer.2': { label: 'Cleric tree · ศรัทธาสู่กาย Lv3: ทุกกี่แต้ม', effect: '⚠️ ลดเลข = แปลง INT→STR และ WIS→VIT ได้ไวขึ้น! · เพิ่ม = แลกแต้มได้ช้าลง' },
  'clericTree.core.guard': { label: 'Cleric tree · มานาพิทักษ์: ดูดดาเมจเป็น Mana/Lv เดิม', effect: 'เพิ่ม = เวลาโดนมอนตี (เข้าเนื้อหรือโล่) ได้ Mana เด้งคืนมามากขึ้น' },
  'clericTree.core.wisAmp': { label: 'Cleric tree · มานาพิทักษ์: ขยายผลต่อ 1 WIS', effect: 'เพิ่ม = ยิ่งปั้น WIS เยอะ มานาพิทักษ์ยิ่งปั๊ม Mana ให้เยอะขึ้นตาม' },
  'clericTree.core.heal': { label: 'Cleric tree · มานาพิทักษ์: จ่าย Mana คืน HP', effect: 'เพิ่ม = ทุกครั้งที่ Cleric กดสกิลเสีย Mana จะแปลงกลับมาเป็นฮีล HP เยอะขึ้น' },
  'clericTree.core.shield': { label: 'Cleric tree · มานาพิทักษ์: โล่ต้นเวฟ × Max Mana/Lv', effect: 'เพิ่ม = เริ่มแต่ละห้องได้เกราะเปิดฉากหนาขึ้นตาม Max Mana ที่มี' },
  thiefAuto: { label: 'Thief · ทักษะ 1: ดาเมจแทง × P.ATK', effect: 'เพิ่ม = สกิล 1 ของโจรแทงแรงขึ้นทันที' },
  thiefAutoPoison: { label: 'Thief · ทักษะ 1: พิษใส่เป้า (สแต็ก)', effect: 'เพิ่ม = ทักษะ 1 ยัดสแต็กพิษใส่มอนเยอะขึ้นต่อครั้ง (ซินเนอร์จี้กับ Mobster)' },
  thiefUlt: { label: 'Thief · Ult: ดาเมจต่อฮิต × P.ATK', effect: 'เพิ่ม = แต่ละทีในชุดรัวมีด (Ult) แรงขึ้น' },
  thiefUltHits: { label: 'Thief · Ult: จำนวนทีแทง', effect: 'เพิ่ม = รัวแทงหลายฮิตมากขึ้นต่อ 1 Ult (เพิ่มโอกาสทริกเกอร์พิษ/คริ/หลบ)' },
  thiefUltDodge: { label: 'Thief · Ult: โควตาหลบแน่นอน (ครั้ง)', effect: 'เพิ่ม = หลังกด Ult โจรจะหลบการโจมตีของมอนได้ชัวร์หลายครั้งขึ้น' },
}

// ---------- Class skills (table `skills`) ----------
const S2P_TH: Record<string, [string, string]> = {
  guardCut: ['🛡️ ลดดาเมจเข้า', 'เพิ่ม = ขณะตั้งการ์ดลดดาเมจที่ฮีโร่โดนเยอะขึ้น'],
  bloodVamp: ['🩸 ดูดเลือดจากสกิล', 'เพิ่ม = ดูดเลือดจากดาเมจของทักษะ 2 + สู้ได้นานขึ้น'],
  tauntWeak: ['💢 ยั่วยุมอนตีเบาลง', 'เพิ่ม = มอนที่โดนยั่วยุจะโจมตีเบาลงตามสัดส่วนนี้'],
  rainMul: ['🌧️ ดาเมจฝนธนู × P.ATK', 'เพิ่ม = ฝนธนูยิงหมู่ทุกตัวแรงขึ้นชัดเจน'],
  hawkCrit: ['🦅 โอกาสคริเพิ่ม', 'เพิ่ม = บัฟตาเหยี่ยวบวก % คริให้ฮีโร่มากขึ้น'],
  trapPush: ['🕳️ ผลักเกจมอน (%)', 'เพิ่ม = กับดักถีบเกจมอนถอยหลังไปไกลขึ้น ทำให้มอนได้เทิร์นช้าลง'],
  mshieldTake: ['🔮 Mana Shield รับดาเมจแทน', 'เพิ่ม = แบ่งดาเมจที่โดนไปลงหลอด Mana แทนเลือดมากขึ้น (ระวัง Mana หมดไว)'],
  novaMul: ['❄️ ดาเมจ Frost Nova × พลังเวท', 'เพิ่ม = ระเบิดวงน้ำแข็งใส่ทุกตัวแรงขึ้น'],
  arcaneMul: ['✨ ดาเมจ Arcane Bolts × พลังเวท', 'เพิ่ม = ยิงกระสุนเวทแต่ละลูกแรงขึ้น'],
  renewHeal: ['💚 ฮีลต่อเนื่องต่อเทิร์น × M.ATK', 'เพิ่ม = ฮีล Renew เด้งเลือดแรงขึ้นทุกเทิร์น'],
  kyrieHp: ['🛡️ บาเรีย Kyrie % Max HP', 'เพิ่ม = เกราะ Kyrie ซับดาเมจได้หนาขึ้นตาม % เลือดสูงสุด'],
  spearPlus: ['🔱 หอกแสงแรงเพิ่มต่อ Lv × M.ATK', 'เพิ่ม = บวกตัวคูณความแรงให้หอกแสงทุกเล่มแรงขึ้น'],
  smokeHeal: ['💨 ฟื้น % HP ในระเบิดควัน', 'เพิ่ม = กดระเบิดควันแล้วเด้งเลือดคืนเยอะขึ้นตาม % Max HP'],
  pickRes: ['⚡ คืน Energy', 'เพิ่ม = กดสกิลนี้แล้วได้ Energy เด้งคืนมาใช้ท่าอื่นต่อทันที'],
}

const S2N_TH: Record<string, FieldExplain> = {
  bloodTurns: { label: '🩸 กระหายเลือด: นาน (เทิร์น)', effect: 'เพิ่ม = บัฟดูดเลือด + ATK ของทักษะ 2 อยู่ได้นานหลายเทิร์นขึ้น' },
  bloodAtk: { label: '🩸 กระหายเลือด: +ATK (%)', effect: 'เพิ่ม = ระหว่างเปิดบัฟกระหายเลือด ตีกายภาพแรงขึ้น (+0.15 = +15%)' },
  hawkTurns: { label: '🦅 ตาเหยี่ยว: นาน (เทิร์น)', effect: 'เพิ่ม = บัฟคริ/ดาเมจคริจากเหยี่ยวอยู่นานขึ้น' },
  hawkCritDmg: { label: '🦅 ตาเหยี่ยว: +ดาเมจคริ', effect: 'เพิ่ม = เวลาติดคริระหว่างบัฟจะฟัน/ยิงแรงขึ้น (+0.3 = +30% Crit Dmg)' },
  trapMul: { label: '🕳️ กับดัก: ดาเมจ × P.ATK', effect: 'เพิ่ม = ดาเมจตอนกับดักทำงานใส่ศัตรูแรงขึ้น' },
  novaPush: { label: '❄️ Frost Nova: ผลักเกจ (%)', effect: 'เพิ่ม = ระเบิดน้ำแข็งถีบเกจเทิร์นมอนถอยหลังไกลขึ้น' },
  blessTurns: { label: '🙏 พรแสง: นาน (เทิร์น)', effect: 'เพิ่ม = บัฟสเตตัส +15 (STR/DEX/INT/WIS) อยู่ติดตัวนานขึ้น' },
  blessStat: { label: '🙏 พรแสง: +STR/DEX/INT/WIS', effect: 'เพิ่ม = กดพรแสงแล้วค่าสถานะหลัก 4 อย่างพุ่งขึ้นทันทีทั้ง ATK/M.ATK/Hit/Heal' },
  blessCleanse: { label: '🙏 พรแสง: ล้างดีบัฟ (จำนวน)', effect: 'เพิ่ม = กดร่ายแล้วลบสถานะผิดปกติออกจากตัวเองได้หลายอย่างในครั้งเดียว' },
  kyrieHits: { label: '🛡️ Kyrie: แตกหลังโดน (ฮิต)', effect: 'เพิ่ม = โล่ Kyrie รับการโจมตีได้หลายครั้งขึ้นก่อนสลาย' },
  gloriaLuk: { label: '✨ ★ Gloria: +LUK ระหว่างบัฟ', effect: 'เพิ่ม = ช่วงมีพรแสงจะได้ค่า LUK พุ่ง (เพิ่มคริ + หลบโชคดี + ดรอป)' },
  pickPoison: { label: '🐍 ล้วงกระเป๋า: พิษใส่เป้า (สแต็ก)', effect: 'เพิ่ม = แทงขโมย Energy แล้วยัดสแต็กพิษใส่มอนหนาขึ้น' },
}

const J2_DETAIL_HINTS: Record<string, string> = {
  'berserker.ignorePainTurns': '★ ไม่รู้สึกเจ็บ: ฮีโร่เลือดเหลือ 1 HP อมตะตามจำนวนเทิร์นนี้ (ฮีล/ดูดเลือดไม่ทำงาน) ก่อนเข้าช่วง regen',
  'berserker.ignorePainRegenPct': '★ หลังจบช่วงอมตะ 1 HP ฮีโร่จะฮีลคืนจากสัดส่วนของดาเมจตรง (ไม่รวม DoT) ที่ตัวเองทำได้',
  'crusader.gcPay': 'หัก HP ปัจจุบัน (ไม่ใช่ Max HP) เพื่อร่าย Grand Cross และนำจำนวน HP ที่เสียไปบวกกับ Mana ที่เผาเป็นโบนัส gcBurn',
  'crusader.gcBurn': 'สูตรโบนัสเวทต่อเป้า = gcBurn × (Mana ที่เผาทิ้งทั้งหมด + HP ที่จ่ายไป)',
  'crusader.guardCap': 'Paladin (ขั้น 3) บวกเพดานนี้เพิ่มอีก +10% (จาก 40% → 50%)',
  'monk.asuraSlow': '⚠️ อาชูร่าสไตรก์: เพิ่ม = ติดสถานะ 😵 ง่อยแดกแล้วเดินช้าลงมากขึ้น',
  'monk.asuraWeak': '⚠️ อาชูร่าสไตรก์: เพิ่ม = ติดสถานะ 😵 ง่อยแดกแล้วตีธรรมดาเบาลงมากขึ้น',
  'monk.asuraExhaustTurns': '⚠️ อาชูร่าสไตรก์: เพิ่ม = หลังปล่อยอสุราแล้วติด 😵 ง่อยแดก (0 Mana/ลูกพลัง/ล็อกสกิล) นานขึ้น',
  'monk.haymakerAt': 'ลดเลข = หมัดแค้นปล่อยออกง่ายขึ้น (สะสมแรงฮึดถึงเกณฑ์ไวขึ้น)',
  'monk.haymakerStarAt': 'ลดเลข = ★ หมัดพิพากษา ปล่อยออกง่ายขึ้นอีก (สะสมแรงฮึดถึงเกณฑ์ไวขึ้น)',
  'monk.haymakerMdefHp': 'รวมสูตร True Damage จากค่า M.DEF (0..0.75) × Max HP ของมังค์',
  'monk.asuraMdefHp': 'รวมสูตรเบิร์สจากค่า M.DEF (0..0.75) × Max HP ของมังค์ เพิ่มเข้ากับ P.ATK + Mana ที่เผา',
  'monk.comboFinishCdCut': 'เพิ่ม = ★ พายุหมัดปิดฉากช่วยหั่นคูลดาวน์ Skill 3 และ Ult กลับมามากขึ้น',
  'sage.basicMul': 'Sage ใช้หนังสือตีประชิดเป็น P.ATK (แทนที่จะยิงลูกเวทเล็ก 0.6× แบบ Mage) เพื่อกระตุ้น Auto Spell',
  'innovator.mirrorCap': 'สะท้อนดาเมจกลับใส่มอนตาม % ดาเมจที่โดน แต่ไม่เกินเพดาน battle.reflectCap × Max HP',
  'innovator.wetAmp': '☁️ เมฆฝนทำให้มอนที่ติดเปียกรับดาเมจแรงขึ้นจากทุกฮิตของฮีโร่',
}

function explainKit2Effect(_id: Job2Id, key: string, j2Name: string): string {
  if (key.startsWith('tree.')) return `ปรับพลังโนด Skill tree ของ ${j2Name} (ตัวคูณ/ผลต่อ Lv เดิม หรือ ★ สำคัญ)`
  if (key.startsWith('mastery.')) {
    if (key.endsWith('atkPct')) return `เพิ่ม = โบนัส P.ATK (%) จากพาสซีฟชำนาญอาวุธของ ${j2Name} สูงขึ้น`
    if (key.endsWith('matk')) return `เพิ่ม = โบนัส M.ATK พื้นฐานของ ${j2Name} สูงขึ้น`
    if (key.endsWith('crit')) return `เพิ่ม = โบนัสโอกาสคริพื้นฐานจากพาสซีฟอาวุธของ ${j2Name} สูงขึ้น`
    if (key.endsWith('hit')) return `เพิ่ม = โบนัสความแม่น (Hit) ของ ${j2Name} สูงขึ้น`
    if (key.endsWith('def')) return `เพิ่ม = โบนัสเกราะ P.DEF ของ ${j2Name} สูงขึ้น`
    if (key.endsWith('combo')) return `เพิ่ม = โบนัสโอกาสคอมโบของ ${j2Name} สูงขึ้น`
    if (key.endsWith('spellCrit')) return `เพิ่ม = โบนัสเวทคริของ ${j2Name} สูงขึ้น`
    if (key.endsWith('poisonDmg')) return `เพิ่ม = พิษทุกสแต็กกัดมอนแรงขึ้นต่อชั้น`
  }
  if (/^(asuraSlow|asuraWeak|asuraExhaustTurns)$/.test(key)) return '⚠️ ข้อเสียหลังปล่อยอาชูร่า: เพิ่ม = ติดสถานะง่อยแดกหนัก/นานขึ้น (ลดเลข = ฟื้นตัวไวขึ้น)'
  if (/Dr$/.test(key)) return 'เพิ่ม = ลดดาเมจที่ฮีโร่ได้รับลงตามสัดส่วนนี้ (ถึกขึ้น)'
  if (/MdefHp$/.test(key)) return 'เพิ่ม = โบนัสดาเมจที่คำนวณจาก M.DEF × Max HP แรงขึ้นชัดเจน'
  if (/Turns$|Grace$/.test(key)) return 'เพิ่ม = บัฟ/สถานะหรือเอฟเฟกต์นี้คงอยู่นานขึ้นกี่เทิร์น'
  if (/Hits$|MaxHits$|Knives$|Boxes$|Meteors$|Pulses/.test(key) || key.startsWith('gcPulses.')) return 'เพิ่ม = จำนวนฮิต/ลูก/กระแทกมากขึ้น (เพิ่มดาเมจรวมและการทริกเกอร์เอฟเฟกต์)'
  if (/Push$/.test(key) || key === 'roar') return 'เพิ่ม = ผลักเกจเทิร์นมอนถอยหลังไปไกลขึ้น ทำให้ฮีโร่ได้เปรียบเทิร์น'
  if (/Every$/.test(key)) return '⚠️ ลดเลข = ออกท่าอัตโนมัตินี้ถี่ขึ้น (เก่งขึ้น) · เพิ่มเลข = นาน ๆ ออกที'
  if (/Cap$/.test(key)) return 'เพิ่ม = ปลดเพดานสูงสุดของเอฟเฟกต์ให้ปั้นสเตตัส/โล่ต่อได้สูงขึ้น'
  if (/Chance$|Crit$|Stun$|Taunt$|Guard$|Bleed$|Burn$|Chill$|Break$/.test(key)) return 'เพิ่ม = โอกาสติดผลหรือจำนวนชั้นดีบัฟมากขึ้น'
  if (/Taken$/.test(key)) return '⚠️ เพิ่ม = ฮีโร่รับดาเมจหนักขึ้นเป็นข้อเสียแลกบัฟ (ลด = เสี่ยงน้อยลง)'
  if (/Pay$/.test(key)) return '⚠️ เพิ่ม = เสีย % HP ปัจจุบันตอนกดร่ายมากขึ้น (แรงกับ gcBurn มากขึ้น แต่เสี่ยงเลือดลด)'
  if (/Refund|CdRefund/.test(key)) return 'เพิ่ม = คืนทรัพยากร (HP / คูลดาวน์) กลับมามากขึ้นเมื่อเข้าเงื่อนไข'
  if (/Speed$|Aspd/.test(key)) return 'เพิ่ม = ออกเทิร์นเร็วขึ้น / ได้จังหวะไวขึ้น'
  if (/Mana$/.test(key)) return 'เพิ่ม = ปริมาณ Mana ที่ได้/ขโมย/ต้องการในเงื่อนไขมากขึ้น'
  if (/Hp$|Shield$|Heal$/.test(key)) return 'เพิ่ม = ปริมาณเลือด/เกราะของฮีโร่หรือซัมมอนหนาขึ้น'
  return `เพิ่ม = เพิ่มพลังหรือตัวคูณของสกิลนี้ในสายอาชีพ ${j2Name}`
}

function explainSkillTable(path: string, defaultLabel?: string): FieldExplain {
  const p = path.split('.')

  if (p[0] === 'crit') {
    const cls = p[1], slot = p[2]
    return {
      label: defaultLabel ?? `ความแรงคริ · ${CLS_TH[cls] ?? cls} (${SLOT_TH[slot] ?? slot})`,
      effect: '1 = คริเต็ม 100% · 0.5 = ยังติดคริแต่โบนัส (critMul−1) เหลือครึ่ง · 0 = สกิลนี้ไม่ม้วนคริเลย',
      detail: 'ใช้ควบคุมสมดุลระหว่างสายคริกับสายเวท/ตีคงที่ (ไม่รวมคริการันตี ★ พันดาบ และ on-hit procs) มีผลถึงอาชีพขั้น 2 ด้วย',
    }
  }

  if (p[0] === 'job') {
    const cls = p[1], slot = p[2], prop = p[3]
    const job = JOBS[cls as keyof typeof JOBS]
    const skName = slot === 'auto' ? job?.auto.name : job?.ult.name
    if (prop === 'cost') {
      const res = job?.resource === 'energy' ? 'Energy' : job?.resource === 'rage' ? 'Rage' : 'Mana'
      return {
        label: defaultLabel ?? `ค่าร่าย ${skName ?? slot} (${res})`,
        effect: `⚠️ ลดเลข = กดใช้${skName ?? 'สกิล'}ได้ถี่และคุ้มทรัพยากรมากขึ้น · เพิ่ม = กิน ${res} เยอะขึ้น`,
        detail: `ถ้าปรับสำหรับคลาสหลัก ค่าร่ายของ ${job?.name ?? cls} จะเปลี่ยนตามจริงทันที (ข้อความคำอธิบายต้อง build ใหม่)`,
      }
    }
    if (prop === 'cd') {
      return {
        label: defaultLabel ?? `คูลดาวน์ ${skName ?? slot} (เทิร์น)`,
        effect: '⚠️ ลดเลข = วนกลับมาใช้ Ult ได้เร็วขึ้น (ต่ำสุด 2 เทิร์น) · เพิ่ม = รอนานขึ้น',
      }
    }
  }

  if (p[0] === 'job2') {
    const id = p[1] as Job2Id, slot = p[2], prop = p[3]
    const j2 = JOB2[id]
    const skName = slot === 'skill3' ? j2?.skill3.name : j2?.ult.name
    if (prop === 'cost') {
      return {
        label: defaultLabel ?? `${j2?.name ?? id} · ค่าร่าย ${skName ?? 'ทักษะ 3'}`,
        effect: '⚠️ ลดเลข = กดใช้ทักษะ 3 ได้บ่อยขึ้น · เพิ่ม = เปลือง Mana/Energy/Rage มากขึ้น',
      }
    }
    if (prop === 'cd') {
      return {
        label: defaultLabel ?? `${j2?.name ?? id} · คูลดาวน์ ${skName ?? slot}`,
        effect: '⚠️ ลดเลข = สกิลวนกลับมาใช้ได้เร็วขึ้น · เพิ่ม = คูลดาวน์นานขึ้น',
      }
    }
  }

  if (p[0] === 'skill2') {
    const id = p[1] as Skill2Id, prop = p[2]
    const s2 = SKILL2_BY_ID.get(id)
    const name = s2 ? `${s2.icon} ${s2.name}` : id
    if (prop === 'cost') {
      return {
        label: defaultLabel ?? `ค่าร่าย ${name}`,
        effect: '⚠️ ลดเลข = กดใช้ทักษะ 2 ท่านี้ได้ถี่และประหยัดมากขึ้น · เพิ่ม = จ่ายทรัพยากรแพงขึ้น',
      }
    }
    if (prop === 'cd') {
      return {
        label: defaultLabel ?? `คูลดาวน์ ${name} (เทิร์น)`,
        effect: '⚠️ ลดเลข = ทักษะ 2 ท่านี้พร้อมใช้ไวขึ้น (ขั้นต่ำ 1 เทิร์น) · เพิ่ม = รอนานขึ้น',
      }
    }
  }

  if (p[0] === 's2p') {
    const key = p[1], part = p[2]
    const info = S2P_TH[key]
    const baseName = info?.[0] ?? key
    const baseEff = info?.[1] ?? 'เพิ่ม = ความแรงหรือค่าผลของทักษะ 2 สูงขึ้น'
    return {
      label: defaultLabel ?? `${baseName} · ${part === 'base' ? 'ฐาน (Lv0)' : 'เพิ่มต่อเลเวล "+"'}`,
      effect: part === 'base' ? `${baseEff} (ฐานตั้งต้นก่อนบวก +ต่อ Lv)` : `${baseEff} (สเกลเติบโตเมื่ออัปปุ่ม "+" เพิ่มเลเวล)`,
      detail: 'สูตรคำนวณจริงในเกม: base + (per × ระดับเลเวล "+" ของทักษะ 2)',
    }
  }

  if (p[0] === 's2n' && S2N_TH[p[1]]) return { ...S2N_TH[p[1]], label: defaultLabel ?? S2N_TH[p[1]].label }

  const staticSkills: Record<string, FieldExplain> = {
    'sword.auto': { label: defaultLabel ?? 'Swordsman · ค่าร่าย Mana ฟันพายุ', effect: '⚠️ ลดเลข = ใช้ Mana น้อยลง กดฟันพายุได้แทบทุกเทิร์น (ซิงค์เข้า jobs)' },
    'sword.autoMul': { label: defaultLabel ?? 'Swordsman · ฟันพายุ × P.ATK', effect: 'เพิ่ม = ทักษะ 1 (ฟันทุกตัว) ของนักดาบ/Berserker/Knight แรงขึ้นชัดเจน' },
    'sword.ult': { label: defaultLabel ?? 'Swordsman · ค่าร่าย Mana Ult ผ่าสวรรค์', effect: '⚠️ ลดเลข = ใช้ Mana กด Ult น้อยลง (ซิงค์เข้า jobs)' },
    'sword.ultMul': { label: defaultLabel ?? 'Swordsman · Ult ผ่าสวรรค์ × P.ATK', effect: 'เพิ่ม = Ult ฟันหมู่ของนักดาบและคลาสต่อยอดแรงขึ้น' },
    'sword.ultShield': { label: defaultLabel ?? 'Swordsman · Ult โล่ (% Max HP)', effect: 'เพิ่ม = กด Ult แล้วได้โล่กันดาเมจหนาขึ้น (0.15 = 15% Max HP)' },
    'mage.barrier': { label: defaultLabel ?? 'Mage · บาเรียเมื่อปล่อย Ult (× M.ATK)', effect: 'เพิ่ม = หลังปล่อยเวทใหญ่ของ Mage/Wizard จะได้โล่หนากันตัวตามค่า M.ATK' },
  }
  if (staticSkills[path]) return staticSkills[path]

  if (p[0] === 'kit2') {
    const id = p[1] as Job2Id, key = p.slice(2).join('.')
    const j2 = JOB2[id]
    const effect = explainKit2Effect(id, key, j2?.name ?? id)
    return {
      label: defaultLabel ?? `${j2?.name ?? id} · ${key}`,
      effect,
      detail: J2_DETAIL_HINTS[`${id}.${key}`],
    }
  }

  return { label: defaultLabel ?? path, effect: 'ตัวเลขปรับสมดุลสกิลอาชีพ' }
}

// ---------- Public API ----------
export function explainField(t: TableId, path: string, ctx?: { native?: boolean; defaultLabel?: string }): FieldExplain {
  switch (t) {
    case 'monsters': return explainMonsterField(path, !!ctx?.native, ctx?.defaultLabel)
    case 'battle': {
      if (BATTLE_STATIC[path]) return { ...BATTLE_STATIC[path], label: ctx?.defaultLabel ?? BATTLE_STATIC[path].label }
      if (path.startsWith('monSpeed.')) {
        const k = path.slice('monSpeed.'.length) as MonsterKind
        const name = MONSTERS[k]?.name ?? k
        return {
          label: `ความเร็ว · ${name}`,
          effect: 'เพิ่ม = มอนตัวนี้เกจเทิร์นวิ่งเร็วขึ้น ออกเทิร์นถี่ขึ้น (ค่าอ้างอิงกลางฮีโร่ = 10)',
          detail: 'มอน D6+ ใช้ค่า speed จาก AGI แทน (ใช้ค่านี้เป็น fallback เท่านั้น) ส่วน D1–5 อ่านค่านี้โดยตรง',
        }
      }
      if (path.startsWith('monBuff.')) {
        const [, kind, idxStr] = path.split('.')
        const dg = `D${Number(idxStr) + 1}`
        const dgName = DUNGEON_LABEL[dg.toLowerCase()] ?? dg
        if (kind === 'hp') return { label: `บัฟ HP มอนทั้งดัน · ${dgName}`, effect: 'เพิ่ม = มอนทุกตัวในดันเจี้ยนนี้ (ปกติ/มินิ/บอส) เลือดหนาขึ้นตามตัวคูณนี้' }
        if (kind === 'dmg') return { label: `บัฟ ATK/M.ATK มอนทั้งดัน · ${dgName}`, effect: 'เพิ่ม = มอนทุกตัวในดันเจี้ยนนี้ตีและสกิลแรงขึ้นตามตัวคูณนี้' }
        if (kind === 'turns') return { label: `คูณเทิร์นจำกัดของดัน · ${dgName}`, effect: 'เพิ่ม = ยืดเวลาเทิร์นจำกัดของห้องในดันเจี้ยนนี้ให้สู้ได้นานขึ้น' }
      }
      return { label: ctx?.defaultLabel ?? path, effect: 'ตัวคูณระบบต่อสู้ (BATTLE)' }
    }
    case 'combo': return explainCombo(path)
    case 'hard': return explainHard(path)
    case 'hardSkills': return explainHardSkill(path)
    case 'hardPassives': return explainHardPassive(path)
    case 'monStat': return explainMonStat(path)
    case 'archetypes': return explainArchetype(path)
    case 'skillScale': return SKILL_SCALE_MAP[path] ?? { label: path, effect: 'ค่าสเกลสกิลมอน' }
    case 'progression': return PROGRESSION_MAP[path] ?? { label: path, effect: 'ค่าความก้าวหน้าและ EXP' }
    case 'kit': return { ...(KIT_EXPLAIN[path] ?? { label: path, effect: 'ตัวคูณคิทคลาสหลัก' }), label: ctx?.defaultLabel ?? KIT_EXPLAIN[path]?.label ?? path }
    case 'skills': return explainSkillTable(path, ctx?.defaultLabel)
  }
}

export function explainTableGroup(t: TableId, key: string): { title: string; desc?: string } {
  if (t === 'hardSkills') {
    const sk = HARD_SKILLS[Number(key)]
    if (sk) return { title: `${key} · ${sk.name} (${sk.kind})`, desc: `สกิลสุ่มโหมด Hard สำหรับมินิบอสและบอส` }
  }
  if (t === 'hardPassives') {
    const hp = HARD_PASSIVES[Number(key)]
    if (hp) return { title: `${key} · ${hp.name}`, desc: `พาสซีฟสุ่มโหมด Hard (บอสดัน 3+ สุ่มติด 2 อย่าง)` }
  }
  const MAP: Partial<Record<TableId, Record<string, { title: string; desc?: string }>>> = {
    battle: {
      monSpeed: { title: '⚡ monSpeed · ความเร็วมอนรายตัว', desc: 'ความเร็วเทิร์นเกจพื้นฐานเทียบกับ heroSpeed (10)' },
      monBuff: { title: '🏰 monBuff · ตัวคูณทั้งดันเจี้ยน D1–D5', desc: 'ปรับ HP / ดาเมจ / เทิร์นทั้งดันพร้อมกัน (0 = D1 .. 4 = D5)' },
      duel: { title: '🎯 duel · กิมมิก Celeste (มินิบอส D3)', desc: 'ค่ากลางสคริปต์ Into Arena, Riposte, Grandado Espada' },
      toxicSkin: { title: '🧪 toxicSkin · พาสซีฟผิวพิษ (มินิบอส)', desc: 'ลดดาเมจ ต้านดีบัฟ ลดคริ และสะท้อนพิษใส่คนตี' },
      iceSkin: { title: '❄️ iceSkin · หนามน้ำแข็ง (Frost Giant)', desc: 'ตีโดนแล้วลดดาเมจฮีโร่' },
      vengeance: { title: '🛡️ vengeance · โล่แห่งความแค้น (Death Knight)', desc: 'แปลงดาเมจเป็นโล่และปล่อย DoT เวททุกเทิร์น' },
      bulletTime: { title: '⏱️ bulletTime · ยิงรัว (Gunner)', desc: 'นับถอยหลังและกระหน่ำยิงเมื่อเลือดต่ำกว่าเกณฑ์' },
      maiden: { title: '👻 maiden · เรียกเมเดน (Karvos)', desc: 'เงื่อนไขเรียกเมเดนและโควตาเทิร์นจำกัดเพิ่มเติม' },
      web: { title: '🕸️ web · สถานะใยพันตัว', desc: 'สัดส่วนการลด AGI ของมอน/ฮีโร่ที่ติดใยแมงมุม' },
    },
    combo: {
      ignore: { title: '🚫 ignore · มอนเมินคอมโบฮีโร่ (%)', desc: 'หักลบโอกาสคอมโบของผู้เล่นแยกตามระดับมอน' },
      basicDR: { title: '🛡️ basicDR · มอนลดดาเมจตีปกติ/สวนกลับ', desc: 'ลดความแรงตีปกติและสวนกลับแยกตามระดับมอน' },
      comboDR: { title: '🛡️ comboDR · มอนลดดาเมจฮิตคอมโบแถม', desc: 'ลดความแรงเฉพาะฮิตคอมโบที่แถมเพิ่ม' },
      ignoreCounter: { title: '🚫 ignoreCounter · มอนเมินสวนกลับฮีโร่ (%)', desc: 'หักลบโอกาสสวนกลับของผู้เล่นแยกตามระดับมอน' },
      counterDR: { title: '🛡️ counterDR · มอนลดดาเมจฮิตสวนกลับ', desc: 'ลดความแรงเมื่อฮีโร่ตีสวนกลับ' },
    },
    hard: {
      recLv: { title: '📏 recLv · Base Lv แนะนำต่อดัน D1–D5', desc: 'จุดเริ่มต้นการไต่ระดับความยากของโหมด Hard' },
      curve: { title: '📈 curve · กราฟความเก่งมอน Hard (D1–D5)', desc: '0 = Lv อ้างอิง · 1 = HP บอสอ้างอิง · 2 = ATK บอสอ้างอิง' },
    },
    monStat: {
      monStat: { title: '📐 monStat · สูตรสเตตัสมอน D6+', desc: 'สัดส่วนแต้ม stat, levelBase, ตัวคูณ body และเพดาน' },
      levelGap: { title: '⚖️ levelGap · ลดรางวัลเมื่อเวลเกินดัน', desc: 'ชะลอการฟาร์มดันต่ำกว่าตัวเกินควรใน D6+' },
      legacy: { title: '🏚️ legacy · ค่าอ้างอิงเลเวล D1–D5', desc: 'ใช้คำนวณสเตตัสเสริมและสกิลของมอน D1–5' },
    },
    skillScale: {
      fx: { title: '💫 fx · สกิลพิเศษในเฟส / Blood Razor', desc: 'ตัวคูณเพิ่มเติมตาม WIS (เฟสบอส) และ INT (Blood Razor)' },
      lv: { title: '⭐ lv · โบนัสเมื่อมอนมีเลเวลสกิล (+Lv)', desc: 'สเกลความแรง ฮิต จำนวนสแต็ก และเทิร์นเมื่อสกิล > Lv1' },
    },
    progression: {
      stat: { title: '📊 stat · Base Lv & แต้ม Stat', desc: 'แต้มต่อเลเวลและโค้ง Account EXP' },
      job: { title: '🎭 job · Job Lv & โค้ง Job EXP', desc: 'ความเร็วในการอัป Job Lv เพื่อเปลี่ยนอาชีพ' },
      run: { title: '🏃 run · EXP และฮีลในรอบดันเจี้ยน', desc: 'ค่าประสบการณ์ในรันและการฟื้นเลือดหลังจบห้อง' },
    },
    kit: {
      cast: { title: '🔮 cast · ระบบร่ายเวท (Mage)', desc: 'โอกาสร่ายแตก คืน Mana และลูกไฟพื้นฐาน' },
      cleric: { title: '✝️ cleric · ตัวคูณและโล่หลัก (Cleric)', desc: 'ค่าร่าย Ult, ฮีล, แสงตก, โล่ และเพดานโล่พระ' },
      clericTree: { title: '🕸️ clericTree · ใยแมงมุมพระ (รุ่งอรุณ / แก่นศรัทธา)', desc: 'ตัวเลขโนดในสกิลทรีของนักบวช' },
    },
    skills: {
      crit: { title: '💥 crit · ตัวคูณความแรงคริแยกสกิลคลาสหลัก', desc: '1 = ปกติ, 0.5 = โบนัสคริครึ่ง, 0 = ไม่คริ' },
      job: { title: '🎭 job · ค่าร่าย/คูลดาวน์สกิลคลาส 1', desc: 'ค่าร่ายและคูลดาวน์ใน JOBS' },
      skill2: { title: '2️⃣ skill2 · ค่าร่าย/คูลดาวน์ทักษะ 2 (ทั้ง 15 ท่า)', desc: 'cost และ cd ของทักษะ 2' },
      s2p: { title: '📈 s2p · สูตรทักษะ 2 (base + per × Lv "+")', desc: 'ปรับฐานและอัตราเพิ่มต่อเลเวลของทักษะ 2' },
      s2n: { title: '🔢 s2n · ค่าคงที่เฉพาะทักษะ 2', desc: 'จำนวนเทิร์น สแต็ก บัฟสเตตัส และโบนัสเสริม' },
      sword: { title: '⚔️ sword · ตัวเลขเฉพาะ Swordsman', desc: 'Mana และตัวคูณฟันพายุ / Ult' },
      mage: { title: '🔮 mage · ตัวเลขเฉพาะ Mage', desc: 'บาเรีย M.ATK หลังปล่อยเวท' },
      job2: { title: '🌟 job2 · ค่าร่าย/คูลดาวน์ 10 อาชีพขั้น 2', desc: 'cost/cd ของทักษะ 3 และ cd ของ Ult วิวัฒน์' },
      kit2: { title: '🛠️ kit2 · พารามิเตอร์สกิล/พาสซีฟ/ทรี 10 อาชีพขั้น 2', desc: 'ตัวคูณทั้งหมดของทั้ง 10 อาชีพขั้น 2' },
    },
  }
  return MAP[t]?.[key] ?? { title: key }
}
