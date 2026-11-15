# Party Battle v1 — โหมดตี้ 3 คน สั่งเองทีละตัว (FF-style command battle)

Q 2026-11-15: เพื่อนๆ อยากให้เกมเป็นแนว "จัดตี้ turn-based จริงจัง" → ยืนยันแล้ว: **ผู้เล่นคนเดียวคุมหลายตัว** (แบบ JRPG คลาสสิก) ไม่ใช่ online co-op
Status: 📝 draft (ยังไม่ implement) · Scope: Phase 1 MVP

> ทำแค่ "แนวเกม" (party, command menu, rows, ATB) ซึ่งเป็นกลไกทั่วไปของ JRPG
> ห้ามใช้ชื่อ ตัวละคร ไอเทม ฉาก หรือหน้าตาของเกมอื่น (FF / TS Online) — ทุกอย่างใช้โลก Novice to Hero ของเราเอง

---

## 1. Goal (so what)

- เล่นแบบ **ตี้ 3 คน**: ตัวเรา (หัวหน้า) + เพื่อนร่วมทีม 2 คนที่จ้างจากเมือง
- ถึงตาใคร → **ผู้เล่นเลือกคำสั่ง** โจมตี / สกิล / ป้องกัน / ไอเทม → เลือกเป้า
- การจัดตี้มีความหมาย: tank แถวหน้า, ฮีลแถวหลัง, สกิลเสริมกัน
- ยังเล่นบนมือถือสบาย: มีปุ่ม **🔁 Auto** (ใช้คำสั่งเดิมซ้ำ / ให้ AI เลือก) สำหรับฟาร์ม
- **ไม่แตะ BattleScene เดิม** (6,019 บรรทัด + test 100+ ไฟล์) → ดันปกติ/หอคอย/Rift เล่นได้เหมือนเดิม 100%

### Non-goals (Phase 1)
- ❌ Online co-op / realtime (ดู §9 — engine ที่ออกแบบนี้รองรับในอนาคต)
- ❌ เพื่อนร่วมทีมมีเลเวล/ของ/ต้นสกิลเป็นของตัวเอง (ใช้ตาม Base Lv ของหัวหน้า)
- ❌ ระบบธาตุ, combo 2 คน, ยืมตัวเพื่อน (Phase 2-3)
- ❌ MonSkill ทุกแบบ (รองรับ subset ใน §6)

---

## 2. Decision: เขียน engine ใหม่ ไม่ต่อเติม BattleScene

| ทางเลือก | ข้อดี | ข้อเสีย | ผล |
|---|---|---|---|
| A. แปลง hero ใน BattleScene เป็น array | ใช้ kit อาชีพเดิมครบ | `this.hp`, `this.st`, `this.hx`, `this.frenzy`… เป็น singleton ทั้งไฟล์ ต้องแก้หลายพันจุด เสี่ยงพังบาลานซ์ทุกโหมด | ❌ |
| B. เพื่อนร่วมทีม = `Ally` แบบใหม่ใน BattleScene | เร็ว | เพื่อนเป็นตัวรอง ไม่ใช่ FF จริง + ไฟล์ใหญ่ขึ้นอีก | ❌ |
| **C. `src/party/` engine ใหม่ (pure TS) + `PartyBattleScene`** | test ได้แบบ headless, deterministic (seed), ไม่กระทบโหมดเดิม, ต่อยอด online ได้ | สกิลอาชีพต้องนิยามใหม่เป็นแบบ "เลือกจากเมนู" | ✅ |

**เหตุผลหลัก:** สกิลเดิมออกแบบมาเพื่อ semi-auto (proc, trigger, combo, auto-skill ออกเอง) ซึ่งไม่เข้ากับเมนูคำสั่งอยู่แล้ว → ยังไงก็ต้องมี skill data ชุดใหม่สำหรับ command battle

### สิ่งที่ reuse จากของเดิม
- `heroStats(save)` → Stats ของหัวหน้า (ของ, การ์ด, ตีบวก, stat มีผลครบ = progression เดิมไม่สูญเปล่า)
- `MONSTERS` / `DUNGEONS` / `mon-stats.ts` scaling → มอนชุดเดิม
- `afterDef`, `hitChance` (`src/data/battle-rules.ts`) → สูตรดาเมจเดิม
- `MODES` (`src/data/modes.ts`) → เพิ่มโหมด `party` แบบ data
- `gfx/hero-visual`, `pixelfx`, `sfx`, `ui.ts` → ภาพ/เสียง/ปุ่ม

---

## 3. Architecture

```
HubScene ──(🍺 โรงเตี๊ยม: จ้าง/จัดแถว)──► save.party
    │
    └──(🎮 โหมด: ตี้)──► go('party', { d })
                              │
PartyBattleScene (Phaser: วาด + รับ input เท่านั้น)
    │  createBattle(party, foes, seed)
    │  loop:
    │    actor = nextActor(state)
    │    cmd   = actor.side === 'ally' ? await commandMenu(actor) : foeCommand(state, actor)
    │    events = resolve(state, actor, cmd)      ← pure, ไม่มี Phaser
    │    await playEvents(events)                 ← animate ตาม event list
    │    if (outcome(state)) → settle (reward ผ่าน MODES.party.reward)
```

### ไฟล์ใหม่
| ไฟล์ | หน้าที่ |
|---|---|
| `src/data/party.ts` | ตัวเลขบาลานซ์ทั้งหมด: `PARTY` rules, `PARTY_SKILLS`, `MERCS` (สถิติเพื่อนร่วมทีมต่ออาชีพ), `PARTY_ITEMS` |
| `src/party/types.ts` | `Unit`, `Command`, `BattleEvent`, `BattleState` |
| `src/party/engine.ts` | `createBattle`, `nextActor`, `previewQueue`, `resolve`, `outcome` — **ห้าม import phaser** |
| `src/party/foe-ai.ts` | `foeCommand`: มอนเลือกเป้า/ท่า |
| `src/party/auto.ts` | `autoCommand`: AI ฝั่งเราสำหรับปุ่ม Auto |
| `src/party/rng.ts` | seeded RNG (mulberry32) — ทุกการสุ่มใน engine ผ่านตัวนี้ |
| `src/scenes/PartyBattleScene.ts` | วาดฉาก, แถบ HP/MP/ATB, เมนูคำสั่ง, เลือกเป้า, เล่น event |
| `src/scenes/TavernScene.ts` | จ้างเพื่อนร่วมทีม + จัดแถวหน้า/หลัง |
| `tests/party-engine.test.ts` | test headless (ดู §8) |

---

## 4. Core types (`src/party/types.ts`)

```ts
export type Side = 'ally' | 'foe'
export type Row = 'front' | 'back'

export interface Unit {
  id: string; side: Side; name: string; icon: string
  job?: JobId            // ally เท่านั้น
  kind?: MonsterKind     // foe เท่านั้น
  row: Row
  st: Stats              // ally หัวหน้า = heroStats(save) · เพื่อน = mercStats() · foe = statMonster()
  maxHp: number; hp: number
  maxMp: number; mp: number
  gauge: number          // 0..100 (ATB)
  defending: boolean     // ป้องกันจนถึงตาถัดไป
  status: StatusInst[]   // buff/debuff มีจำนวนตา
  skills: PartySkillId[]
  ko: boolean
}

export type Command =
  | { kind: 'attack'; target: string }
  | { kind: 'skill'; skill: PartySkillId; target: string | 'allFoes' | 'allAllies' }
  | { kind: 'defend' }
  | { kind: 'item'; item: PartyItemId; target: string }
  | { kind: 'row' }      // สลับแถว (เสียตา)

export type BattleEvent =
  | { t: 'act'; actor: string; label: string }
  | { t: 'hit'; src: string; dst: string; dmg: number; crit: boolean; magic: boolean }
  | { t: 'miss'; src: string; dst: string }
  | { t: 'heal'; dst: string; n: number }
  | { t: 'mp'; dst: string; n: number }
  | { t: 'status'; dst: string; id: StatusId; on: boolean }
  | { t: 'ko'; dst: string }
  | { t: 'revive'; dst: string; hp: number }
  | { t: 'charge'; src: string; label: string }   // มอนชาร์จ (เตือนล่วงหน้า)

export interface BattleState {
  units: Unit[]; turn: number; seed: number; rng: Rng
  items: Record<PartyItemId, number>               // ของติดตัวต่อรอบ
  log: BattleEvent[]
}
```

**กฎ:** `resolve()` แก้ `state` แล้วคืน `BattleEvent[]` — scene ห้ามคำนวณดาเมจเอง แค่ animate ตาม event

---

## 5. Battle rules (`src/data/party.ts` → `PARTY`)

| กฎ | ค่าเริ่มต้น (ปรับได้) | หมายเหตุ |
|---|---|---|
| ขนาดตี้ | `size: 3` | Phase 2 อาจเปิด 4 |
| ATB | `gauge += speed` ทุก tick, ถึง 100 = ได้ตา | speed = `BATTLE.heroSpeed * aspd / PLAYER.aspd` (สูตรเดิม) |
| Wait mode | เกจ **หยุด** ระหว่างเปิดเมนู | ไม่กดดันบนมือถือ · ตั้งค่า Active mode ได้ทีหลัง |
| แถวหน้า | รับดาเมจกายภาพ x1.0, ตีกายภาพ x1.0 | |
| แถวหลัง | รับดาเมจกายภาพ `backTakenMul: 0.7`, ตีกายภาพ melee `backMeleeMul: 0.7` | ธนู/เวท/ฮีลไม่โดนลด |
| ป้องกัน | ดาเมจเข้า `defendMul: 0.5` จนถึงตาตัวเอง | |
| เป้าของมอน | สุ่มถ่วงน้ำหนัก: หน้า `frontWeight: 3`, หลัง `backWeight: 1`, ยั่วยุ x`tauntWeight: 4` | |
| ล้ม (KO) | HP 0 = ไม่มีตา, ฟื้นด้วยสกิล/ไอเทม · จบดัน = ฟื้น 1 HP | |
| แพ้ | ทั้งตี้ KO | |
| MP | `maxMp` จาก `st.maxRes` (หัวหน้า) / `MERCS[job].mp` · ฟื้น `mpPerTurn` ต่อตาตัวเอง | ใช้ MP ทุกอาชีพ (ตัด Rage/Energy ออกใน Phase 1 ให้เรียบง่าย) |
| ฟื้นระหว่างห้อง | HP `roomHeal: 0.3`, MP `roomMp: 0.5` ของค่าสูงสุด | |
| มอนสเกลตามตี้ | HP x`foeHpMul: 2.2`, ATK x`foeAtkMul: 1.1` | ต้องจูนด้วย sim (§8) |
| ไอเทมติดตัวต่อรอบ | ยาฟื้น HP x3, ขนนกฟื้นชีพ x1 | ชื่อของเราเอง ไม่ใช้ชื่อไอเทมของเกมอื่น |

### สูตรดาเมจ (reuse)
```
physical = rollAtk(st) * skillMul * rowMul * (crit ? st.critMul : 1)
         → afterDef(dmg, target.def) * (target.defending ? defendMul : 1)
magic    = st.matk * skillMul * (1 - target.mdef)
hit      = hitChance(src.hit, dst.flee)   // magic ไม่พลาด (ตามกฎเดิมของจอมเวท)
```

---

## 6. Skills & AI

### 6.1 สกิลต่ออาชีพ (`PARTY_SKILLS`, Phase 1 = 4 ต่ออาชีพ)
ชื่อ/ไอคอนยืมจาก kit เดิมของเราเพื่อให้คุ้นเคย ตัวเลขอยู่ใน data

| อาชีพ | บทบาท | สกิล |
|---|---|---|
| ⚔️ นักดาบ | Tank | ฟันหนัก (เดี่ยว x1.8) · กวาดดาบ (ศัตรูทั้งหมด x0.8) · ยั่วยุ (taunt 3 ตา) · คุ้มกัน (รับดาเมจแทนเพื่อน 1 คน 1 ตา) |
| 🏹 นักธนู | DPS แถวหลัง | ยิงคู่ (2 ฮิต x0.7) · ยิงจุดอ่อน (crit +50%) · ฝนธนู (ทั้งหมด x0.7) · ยิงขา (ลด speed 2 ตา) |
| 🔮 จอมเวท | DPS เวท | ลูกไฟ (เดี่ยว เวท x2.0) · พายุน้ำแข็ง (ทั้งหมด x1.0 + chill) · สายฟ้า (เดี่ยว + ชะงัก: gauge -30) · สมาธิ (ฟื้น MP 30%) |
| ✨ นักบวช | Healer | ฮีล (เดี่ยว) · ฮีลหมู่ · ชุบชีวิต (ฟื้น 30% HP) · พร (ATK +20% ทั้งตี้ 3 ตา) |
| 🗡️ โจร | Debuff/Speed | แทงพิษ (poison 3 ตา) · ตีสองที · หลบหลีก (flee สูง 2 ตา) · ปล้น (zeny +) |

- หัวหน้าที่ยังเป็น 🌱 โนวิส ได้ kit โนวิส 2 สกิล (ทุบ, ปฐมพยาบาล)
- Job2/Job3 ของหัวหน้า: Phase 1 ใช้แค่ stat ที่ได้ · Phase 2 เพิ่มสกิลที่ 5-6 ตามสาย

### 6.2 Foe AI (`foe-ai.ts`)
- ปกติ: ตีธรรมดา ใส่เป้าแบบถ่วงน้ำหนักตามแถว/taunt (§5)
- Boss: ใช้ `charge` / `chargeEvery` / `slamMul` เดิม → event `charge` เตือน 1 ตาล่วงหน้า ให้ผู้เล่นสั่ง **ป้องกัน** หรือ **ฮีลรอ** (นี่คือจุด "จริงจัง" ของ turn-based)
- MonSkill ที่รองรับใน Phase 1: ตีทั้งตี้, ติดพิษ, ฮีลตัวเอง, เรียกลูกน้อง (`summon`) · ตัวอื่นตกเป็น "ตีธรรมดา x1.3" ไปก่อน และ list ไว้ใน test ว่ายังไม่รองรับ

### 6.3 Auto (`auto.ts`)
- 🔁 **ทำซ้ำ**: ใช้คำสั่งล่าสุดของแต่ละคน (ถ้า MP ไม่พอ → ตีธรรมดา)
- 🤖 **AI**: นักบวชฮีลคนที่ HP < 50%, นักดาบยั่วยุถ้าไม่มีใคร taunt, ที่เหลือใช้สกิลแรงสุดที่ MP พอ ใส่เป้า HP น้อยสุด
- ค่าเริ่มต้น: **สั่งเอง** · ปุ่มสลับอยู่มุมจอ · จำค่าใน `save.party.auto`

---

## 7. UI (`PartyBattleScene`, มือถือแนวนอน 960x540)

```
┌──────────────────────────────────────────────────────────┐
│ ลำดับตา: [⚔️][👹][✨][👹][🏹][⚔️] ...        ⏸  🔁Auto  │
│                                                          │
│   หลัง  หน้า                          👹  👹             │
│   🏹     ⚔️                         👹      👑(boss)      │
│   ✨                                                     │
│                                                          │
├────────────────────────────┬─────────────────────────────┤
│ ⚔️ ทอม   HP ████░ 320/400  │  [ โจมตี ]   [ สกิล  ]      │
│          MP ██░░░  20/60   │  [ ป้องกัน ] [ ไอเทม ]      │
│ ✨ มีน   HP █████ 210/210  │                             │
│ 🏹 ฟ้า   HP ██░░░  90/250  │  ← เลือกเป้า: แตะที่มอน    │
└────────────────────────────┴─────────────────────────────┘
```

- แถบลำดับตา: reuse แนวคิด `previewQueue()` เดิม (simulate บน copy)
- คนที่ถึงตา: ขอบเรืองแสง + ยกตัวขึ้นนิดนึง
- เลือกเป้า: แตะที่ sprite ได้เลย (ปุ่มใหญ่ ≥ 48px, safe area ตาม `game-ui-ux`)
- ⏸ = `pause-menu.ts` เดิม
- Game feel: hit-stop สั้น, ตัวเลขดาเมจลอย, จอสั่นตอน boss slam (ใช้ `lowShake` เดิม)

### TavernScene (🍺 โรงเตี๊ยม ใน Hub)
- จ้างเพื่อนร่วมทีม: เลือกอาชีพ (5 อาชีพ) + ตั้งชื่อ · ค่าจ้าง zeny ครั้งเดียว `PARTY.hireCost`
- ช่องตี้ 2 ช่อง (หัวหน้าตายตัว) · ลากหรือแตะเพื่อสลับแถวหน้า/หลัง
- ปลดได้ฟรี

---

## 8. Save schema & tests

### `src/save.ts` (additive เท่านั้น)
```ts
export interface PartyMember { id: string; name: string; job: JobId; row: Row }
party?: {
  members: PartyMember[]   // ไม่รวมหัวหน้า, ยาวสุด PARTY.size - 1
  leaderRow: Row           // default 'front'
  auto?: 'off' | 'repeat' | 'ai'
}
```
Migration ใน `load()`: `s.party ??= { members: [], leaderRow: 'front' }` · กรอง `members` ที่ `job` ไม่อยู่ใน `JOBS` หรือ field ไม่ครบทิ้ง (JSON เสีย/ถูกแก้)
เซฟเก่าโหลดได้เหมือนเดิม · ไม่ต้องขึ้น `v`

### Tests (`tests/party-engine.test.ts`)
- [ ] seed เดียวกัน + คำสั่งเดียวกัน → event log เหมือนกันทุกตัว (deterministic)
- [ ] ATB: speed 2 เท่า → ได้ตาประมาณ 2 เท่าใน 100 tick
- [ ] แถวหลังรับดาเมจกายภาพ x0.7, เวทไม่ลด
- [ ] ป้องกันลดดาเมจครึ่งหนึ่ง และหมดผลเมื่อถึงตาตัวเอง
- [ ] ตัวที่ KO ไม่ได้ตา, ชุบชีวิตแล้วกลับมาเข้าคิว
- [ ] ยั่วยุทำให้มอนเลือกเป้านั้นบ่อยขึ้นอย่างมีนัย (sim 1,000 ตา)
- [ ] ทั้งตี้ KO → `outcome = 'lose'` · ศัตรูหมด → `'win'`
- [ ] save migration: เซฟไม่มี `party` / `party` เสีย → ได้ค่า default ไม่ crash
- [ ] **Balance sim**: ตี้ AI (`auto.ts`) เคลียร์ D1-D5 ที่ Base Lv แนะนำได้ 60-85% (ปรับ `foeHpMul` / `foeAtkMul` จนเข้าช่วง)

---

## 9. Roadmap

| Phase | เนื้อหา | ขนาด |
|---|---|---|
| **1a** | `src/party/` engine + types + RNG + tests (headless ไม่มีภาพ) | 🟡 |
| **1b** | `PartyBattleScene` + เมนูคำสั่ง + เลือกเป้า + แถบลำดับตา | 🟡 |
| **1c** | `TavernScene` + save `party` + โหมด `party` ใน `MODES` (D1-D5) | 🟢 |
| **1d** | Auto (repeat/AI) + balance sim + จูนค่าใน `party.ts` | 🟢 |
| 2 | เพื่อนร่วมทีมมีเลเวล/ใส่ของได้ · สกิล Job2/3 ของหัวหน้า · ตี้ 4 คน | 🟡 |
| 3 | ธาตุแพ้ทาง · ท่าร่วม 2 คน (ใช้ตาทั้งคู่) · ยืมตัวเพื่อนจาก cloud (async) | 🟡 |
| 4 | Online co-op: รัน `engine.ts` เดียวกันบน Worker (Durable Object) server เป็นคนคิดผล · ทำได้เพราะ engine เป็น pure + seeded | 🔴 |

## 10. Open questions
1. ตี้ 3 หรือ 4 คนตั้งแต่แรก? (เสนอ 3: จอมือถือพอดี, บาลานซ์ง่าย)
2. โหมดตี้แยกจากดันปกติ หรือในอนาคตจะ **แทนที่** ระบบต่อสู้เดิม? (เสนอ: แยกก่อน ดูว่าคนชอบแบบไหน)
3. เพื่อนร่วมทีม Phase 1 ไม่มีของเลย โอเคไหม หรืออยากให้ใส่ของได้ตั้งแต่แรก?
4. Wait mode (เกจหยุดตอนเลือก) เป็นค่าเริ่มต้น หรือ Active (เกจเดินตลอด, มันส์กว่าแต่กดดัน)?
