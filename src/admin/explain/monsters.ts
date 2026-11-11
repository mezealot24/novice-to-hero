import { MONSTERS, type HitFx, type MonSkill, type MonsterKind } from '../../data/game-data'
import { FX_NAME, FX_TH, STAT_TH, type FieldExplain } from './labels'

// ---------- Monster fields ----------
export function explainSkillLeaf(rest: string[], prefixName: string, sk?: MonSkill, defaultLabel?: string): FieldExplain {
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

export function explainMonsterField(path: string, native: boolean, defaultLabel?: string): FieldExplain {
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
