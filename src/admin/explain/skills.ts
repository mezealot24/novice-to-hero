import { JOBS } from '../../data/jobs'
import { JOB2, type Job2Id } from '../../data/jobs2'
import type { Skill2Id } from '../../data/skill2'
import { CLS_TH, SKILL2_BY_ID, SLOT_TH, type FieldExplain } from './labels'

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

export function explainSkillTable(path: string, defaultLabel?: string): FieldExplain {
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
