# ระบบป้องกัน Passive อาชีพ Mage (3 สายธาตุ: สายฟ้า / ไฟ / น้ำแข็ง)

เอกสารนี้ออกแบบมาเพื่อแก้ปัญหาความเปราะบางของอาชีพ **Mage** (`squishy-class-counterplay`) ในโปรเจกต์ **Novice to Hero** โดยแยกกลไกการเอาตัวรอดออกเป็น **Passive 3 สายธาตุ** ที่มีเอกลักษณ์การเล่นแตกต่างกันอย่างชัดเจน และเชื่อมโยงกับสถานะประจำธาตุ (`Shock`, `Burn`, `Chill/Freeze`) รวมถึงค่าพลังเวท (`MATK` / `INT`) ของตัวละคร

---

## 1. ภาพรวมการออกแบบทั้ง 3 สาย (Design Overview)

| สายธาตุ | ชื่อสกิล Passive | แนวคิดการป้องกันหลัก (Core Defense) | เอฟเฟกต์สวนกลับเมื่อถูกโจมตี (Counterplay) |
| ----- | ----- | ----- | ----- |
| **สายฟ้า (Lightning)** | **Static Mirage** (อาภรณ์อัสนีพรางตา) | **Dodge + Micro-Stun:** เพิ่มโอกาสหลบหลีก และได้เกราะไฟฟ้าสั้นๆ เมื่อหลบสำเร็จ | ช็อตศัตรูด้วยสายฟ้า และลดความเร็วโจมตีของศัตรู (`Shock`) |
| **สายไฟ (Fire)** | **Molten Mantle** (เกราะเพลิงผลาญ) | **Damage Reduction + Burn Shield:** ลดดาเมจที่ได้รับ และดูดซับความร้อนจากศัตรูที่ติดไฟมาเป็นเกราะ | สะท้อนดาเมจเวทไฟกลับไปหาผู้โจมตี พร้อมแปะสถานะเผาไหม้ (`Burn`) |
| **สายน้ำแข็ง (Ice)** | **Glacial Aegis** (เกราะน้ำแข็งนิรันดร์) | **Auto-Barrier + DEF:** สร้างโล่น้ำแข็งดูดซับดาเมจอัตโนมัติและฟื้นฟูโล่ซ้ำได้ | ทำให้ผู้โจมตีติดหนาวเหน็บ (`Chill`) และระเบิดแช่แข็ง (`Freeze`) เมื่อโล่แตก |

---

## 2. รายละเอียดและสูตรคำนวณแต่ละสาย (Mechanics & Formulas)

### 2.1 สายฟ้า: Static Mirage (อาภรณ์อัสนีพรางตา)

เน้นความพริ้วไหวและตัดจังหวะการโจมตีของมอนสเตอร์

* **Passive Stat:** เพิ่มอัตราหลบหลีกพื้นฐาน (Dodge Chance):

  $$
  \text{Bonus Dodge} = 3\% \times \text{Rank} \quad (\text{สูงสุด } 15\% \text{ ที่ Rank 5})
  $$

* **On-Hit / On-Dodge Trigger (Static Discharge):**
  * เมื่อถูกโจมตีหรือหลบหลีกสำเร็จ จะปล่อยกระแสไฟฟ้าสวนกลับ สร้างความเสียหายเวทสายฟ้า:

    $$
    \text{Counter Dmg} = \text{MATK} \times (0.20 + 0.08 \times \text{Rank})
    $$

  * มีโอกาส $20\% + (5\% \times \text{Rank})$ ที่จะทำให้ศัตรูติดสถานะ **Electrified / Micro-Stun** ชะงักการโจมตีเป็นเวลา $0.4\text{ s}$ และลดความเร็วโจมตีศัตรูลง $15\%$ เป็นเวลา $3\text{ s}$ (Internal Cooldown: $2.5\text{ s}$)

### 2.2 สายไฟ: Molten Mantle (เกราะเพลิงผลาญ)

เน้นการแลกหมัด เปลี่ยนดาเมจและสถานะเผาไหม้ให้เป็นความอึด

* **Passive Stat:** ลดความเสียหายที่ได้รับทั้งหมด (Damage Reduction):

  $$
  \text{Dmg Reduction} = 2\% \times \text{Rank} \quad (\text{สูงสุด } 10\% \text{ ที่ Rank 5})
  $$

* **On-Hit Trigger (Blazing Thorns):**
  * เมื่อถูกโจมตี จะระเบิดไอร้อนสวนกลับทันที สร้างความเสียหายเวทไฟ:

    $$
    \text{Thorns Dmg} = \text{MATK} \times (0.25 + 0.10 \times \text{Rank})
    $$

  * แปะสถานะ **Burn** ใส่ผู้โจมตีทันที $1\text{ Stack}$ นาน $4\text{ s}$
* **Synergy (Cauterize / ไฟหลอมเกราะ):**
  * ทุกครั้งที่ศัตรูได้รับดาเมจจากสถานะ **Burn** หรือเมื่อ Mage ร่ายเวทไฟโจมตีศัตรูที่ติด Burn จะเปลี่ยนพลังงานความร้อนเป็นเกราะชั่วคราว (Flame Ward):

    $$
    \text{Shield Gain} = \text{MATK} \times (0.05 \times \text{Rank})
    $$

    *(สะสมได้สูงสุดไม่เกิน $25\%$ ของ $\text{MaxHP}$)*

### 2.3 สายน้ำแข็ง: Glacial Aegis (เกราะน้ำแข็งนิรันดร์)

เน้นการป้องกันที่หนาและมั่นคงที่สุด เหมาะกับการรับดาเมจหนักๆ จากบอส

* **Passive Stat:** เพิ่มพลังป้องกันพื้นฐาน $\text{DEF}$ และ $\text{MDEF}$:

  $$
  \text{Bonus DEF/MDEF} = 4\% \times \text{Rank} \quad (\text{สูงสุด } 20\% \text{ ที่ Rank 5})
  $$

* **Periodic Barrier (Permafrost Shield):**
  * เมื่อเริ่มการต่อสู้ และทุกๆ $8\text{ s}$ จะสร้างโล่น้ำแข็งดูดซับความเสียหาย:

    $$
    \text{Barrier HP} = (\text{MaxHP} \times 0.06 \times \text{Rank}) + (\text{MATK} \times 0.25 \times \text{Rank})
    $$

* **On-Hit & On-Break Trigger (Frostbite & Shatter Nova):**
  * ขณะที่มีโล่น้ำแข็ง ศัตรูที่โจมตีเข้ามาจะติดสถานะ **Chill** ลดความเร็วโจมตีลง $20\%$ นาน $3\text{ s}$
  * **Shatter Nova:** เมื่อโล่น้ำแข็งถูกทำลายจนหมด จะระเบิดคลื่นความเย็นสร้างความเสียหาย $\text{MATK} \times (0.30 + 0.10 \times \text{Rank})$ และ **Freeze (แช่แข็ง)** ศัตรูเป็นเวลา $1.0\text{ s}$ (Internal Cooldown: $8\text{ s}$)

---

## 3. คู่มือการวางโค้ดทีละไฟล์ (ใส่ไฟล์ไหน บรรทัดไหน)

### จุดที่ 1: โค้ด `MageDefenseStats` ที่คุณไฮไลต์ไว้
ให้นำไปใส่ใน **2 ไฟล์** เพื่อให้ระบบ Skill Tree และระบบ Stat ของตัวละครรู้จักตัวแปรทั้ง 3 สายครับ:

#### 1.1 ไฟล์ `src/data/tree-types.ts` (ประมาณบรรทัดที่ 15–35)
* **วิธีหาจุดวาง:** กด `Ctrl+F` ค้นหา `interface` ที่เก็บโบนัสของโหนดสกิล (หรือดูช่วงท้ายไฟล์ `src/data/tree-types.ts`)
* **การวาง:** สามารถวาง `export interface MageDefenseStats` ไว้ **บรรทัดสุดท้ายของไฟล์ `src/data/tree-types.ts`** หรือนำทั้ง 3 ฟิลด์ไปใส่ข้างใน `interface` โบนัสของโหนดได้เลย:

```ts
// วางไว้ท้ายไฟล์ src/data/tree-types.ts (ประมาณบรรทัดที่ 30+)
export interface MageDefenseStats {
  /** Rank ของ Static Mirage (สายฟ้า 0-5) */
  mageDefLightningRank?: number;
  /** Rank ของ Molten Mantle (สายไฟ 0-5) */
  mageDefFireRank?: number;
  /** Rank ของ Glacial Aegis (สายน้ำแข็ง 0-5) */
  mageDefIceRank?: number;
}
```

#### 1.2 ไฟล์ `src/data/stats.ts` (3 จุดในไฟล์เดียว)
1. **จุดที่ 1 (ใน `interface HeroStats` ประมาณบรรทัดที่ 50–85):**
   * กด `Ctrl+F` หา `export interface HeroStats` แล้วเลื่อนลงมาใกล้ปีกกาปิด `}` ของ interface นั้น จากนั้นเพิ่ม 3 บรรทัดนี้เข้าไป:
   ```ts
   mageDefLightningRank: number;
   mageDefFireRank: number;
   mageDefIceRank: number;
   ```
2. **จุดที่ 2 (ค่าเริ่มต้น Default Stats ประมาณบรรทัดที่ 110–160):**
   * กด `Ctrl+F` หาจุดที่กำหนดค่าเริ่มต้นให้ `HeroStats` (เช่น `const base: HeroStats = {` หรือใน `computeStats`) แล้วใส่ค่าเริ่มต้นเป็น `0`:
   ```ts
   mageDefLightningRank: 0,
   mageDefFireRank: 0,
   mageDefIceRank: 0,
   ```
3. **จุดที่ 3 (ตอนดึงเลเวลสกิลจาก Tree ประมาณบรรทัดที่ 220–280):**
   * กด `Ctrl+F` หาจุดที่อ่านค่า `tree` หรือ `skillLevels` ของผู้เล่น แล้วเพิ่มโค้ดดึง Rank ของทั้ง 3 โหนด:
   ```ts
   stats.mageDefLightningRank = save.treeLevels?.['mage_lightning_static_mirage'] ?? 0;
   stats.mageDefFireRank = save.treeLevels?.['mage_fire_molten_mantle'] ?? 0;
   stats.mageDefIceRank = save.treeLevels?.['mage_ice_glacial_aegis'] ?? 0;
   ```

---

### จุดที่ 2: เพิ่มโหนดสกิลลงใน Skill Tree ของ Mage
* **ไฟล์:** `src/data/trees/mage.ts`
* **บรรทัด:** ประมาณ **บรรทัดที่ 35–115** (ภายใน Array `nodes: [ ... ]` ของแต่ละสายธาตุ หรือวางต่อท้ายโหนดสุดท้ายก่อนปิด `];`)
* **วิธีหาจุดวาง:** เปิดไฟล์ `src/data/trees/mage.ts` จะเห็นการประกาศโหนดของทั้ง 3 สาย (`fire`, `ice`, `lightning`) ให้นำโหนดทั้ง 3 ด้านล่างไปวางต่อท้ายใน Array โหนดของ Mage ได้เลยครับ:

```ts
// วางต่อท้ายรายการโหนดใน src/data/trees/mage.ts (ก่อนปิด Array โหนดของ Mage)
  {
    id: 'mage_lightning_static_mirage',
    name: 'Static Mirage',
    nameTh: 'อาภรณ์อัสนีพรางตา',
    branch: 'lightning',
    tier: 2,
    type: 'passive',
    maxRank: 5,
    reqPoints: 5,
    desc: (rank: number) =>
      `เพิ่ม Dodge +${rank * 3}% เมื่อถูกโจมตีหรือหลบสำเร็จจะช็อตสวนกลับ ${20 + rank * 8}% MATK และมีโอกาส ${20 + rank * 5}% ทำให้ศัตรูชะงัก 0.4 วิ`,
    bonuses: (rank: number) => ({
      dodgePct: rank * 0.03,
      mageDefLightningRank: rank,
    }),
  },
  {
    id: 'mage_fire_molten_mantle',
    name: 'Molten Mantle',
    nameTh: 'เกราะเพลิงผลาญ',
    branch: 'fire',
    tier: 2,
    type: 'passive',
    maxRank: 5,
    reqPoints: 5,
    desc: (rank: number) =>
      `ลดดาเมจที่ได้รับ ${rank * 2}% สะท้อนไฟเมื่อถูกตี ${25 + rank * 10}% MATK พร้อมติด Burn และสร้างเกราะไฟ ${rank * 5}% MATK เมื่อเผาไหม้ศัตรู`,
    bonuses: (rank: number) => ({
      dmgReductionPct: rank * 0.02,
      mageDefFireRank: rank,
    }),
  },
  {
    id: 'mage_ice_glacial_aegis',
    name: 'Glacial Aegis',
    nameTh: 'เกราะน้ำแข็งนิรันดร์',
    branch: 'ice',
    tier: 2,
    type: 'passive',
    maxRank: 5,
    reqPoints: 5,
    desc: (rank: number) =>
      `เพิ่ม DEF/MDEF +${rank * 4}% และสร้างโล่น้ำแข็ง (${rank * 6}% MaxHP + ${rank * 25}% MATK) ทุก 8 วิ เมื่อโล่แตกจะแช่แข็งศัตรู 1.0 วิ`,
    bonuses: (rank: number) => ({
      defPct: rank * 0.04,
      mdefPct: rank * 0.04,
      mageDefIceRank: rank,
    }),
  },
```

---

### จุดที่ 3: ฟังก์ชันคำนวณระบบป้องกันและสวนกลับ
* **ไฟล์:** `src/data/skill-math.ts`
* **บรรทัด:** **บรรทัดสุดท้ายของไฟล์** (เลื่อนลงไปล่างสุดของไฟล์ `src/data/skill-math.ts` แล้ววางต่อท้ายได้เลย)

```ts
// วางไว้ท้ายสุดของไฟล์ src/data/skill-math.ts
export interface MageDefenseRuntime {
  iceBarrierHp: number;
  iceBarrierTimerMs: number;
  lightningIcdMs: number;
  iceShatterIcdMs: number;
  fireShieldHp: number;
}

export interface IncomingHitContext {
  incomingDamage: number;
  isDodged: boolean;
  heroMaxHp: number;
  heroMatk: number;
  lightningRank: number;
  fireRank: number;
  iceRank: number;
}

export interface DefenseResolutionResult {
  finalHpDamage: number;
  counterLightningDmg: number;
  counterFireDmg: number;
  counterIceDmg: number;
  applyShock: boolean;
  applyBurn: boolean;
  applyChill: boolean;
  applyFreeze: boolean;
  shatteredIceBarrier: boolean;
}

export function createMageDefenseRuntime(): MageDefenseRuntime {
  return {
    iceBarrierHp: 0,
    iceBarrierTimerMs: 0,
    lightningIcdMs: 0,
    iceShatterIcdMs: 0,
    fireShieldHp: 0,
  };
}

export function calcGlacialBarrierMax(maxHp: number, matk: number, iceRank: number): number {
  if (iceRank <= 0) return 0;
  return Math.floor(maxHp * (0.06 * iceRank) + matk * (0.25 * iceRank));
}

export function tickMageDefense(
  state: MageDefenseRuntime,
  dtMs: number,
  maxHp: number,
  matk: number,
  iceRank: number
): void {
  if (state.lightningIcdMs > 0) {
    state.lightningIcdMs = Math.max(0, state.lightningIcdMs - dtMs);
  }
  if (state.iceShatterIcdMs > 0) {
    state.iceShatterIcdMs = Math.max(0, state.iceShatterIcdMs - dtMs);
  }

  if (iceRank > 0) {
    state.iceBarrierTimerMs += dtMs;
    if (state.iceBarrierTimerMs >= 8000) {
      state.iceBarrierTimerMs -= 8000;
      state.iceBarrierHp = calcGlacialBarrierMax(maxHp, matk, iceRank);
    }
  }
}

export function onMageFireBurnTick(
  state: MageDefenseRuntime,
  maxHp: number,
  matk: number,
  fireRank: number
): number {
  if (fireRank <= 0) return 0;
  const gain = Math.floor(matk * (0.05 * fireRank));
  const cap = Math.floor(maxHp * 0.25);
  const before = state.fireShieldHp;
  state.fireShieldHp = Math.min(cap, state.fireShieldHp + gain);
  return state.fireShieldHp - before;
}

export function resolveMagePassiveDefense(
  state: MageDefenseRuntime,
  ctx: IncomingHitContext,
  rng: () => number = Math.random
): DefenseResolutionResult {
  const result: DefenseResolutionResult = {
    finalHpDamage: Math.max(0, ctx.incomingDamage),
    counterLightningDmg: 0,
    counterFireDmg: 0,
    counterIceDmg: 0,
    applyShock: false,
    applyBurn: false,
    applyChill: false,
    applyFreeze: false,
    shatteredIceBarrier: false,
  };

  // 1. สายฟ้า: ทำงานทั้งตอนหลบสำเร็จ (On-Dodge) และตอนถูกโจมตี (On-Hit)
  if (ctx.lightningRank > 0 && state.lightningIcdMs <= 0) {
    result.counterLightningDmg = Math.floor(
      ctx.heroMatk * (0.20 + 0.08 * ctx.lightningRank)
    );
    const shockChance = 0.20 + 0.05 * ctx.lightningRank;
    if (rng() < shockChance) {
      result.applyShock = true;
    }
    state.lightningIcdMs = 2500;
  }

  if (ctx.isDodged) {
    result.finalHpDamage = 0;
    return result;
  }

  // 2. สายไฟ: ลดดาเมจ + สะท้อนไฟ + แปะ Burn
  if (ctx.fireRank > 0) {
    const dmgRed = 0.02 * ctx.fireRank;
    result.finalHpDamage = Math.floor(result.finalHpDamage * (1 - dmgRed));
    result.counterFireDmg = Math.floor(
      ctx.heroMatk * (0.25 + 0.10 * ctx.fireRank)
    );
    result.applyBurn = true;

    if (state.fireShieldHp > 0 && result.finalHpDamage > 0) {
      const absorbed = Math.min(state.fireShieldHp, result.finalHpDamage);
      state.fireShieldHp -= absorbed;
      result.finalHpDamage -= absorbed;
    }
  }

  // 3. สายน้ำแข็ง: โล่น้ำแข็งดูดซับดาเมจ + แปะ Chill + ระเบิด Freeze เมื่อโล่แตก
  if (ctx.iceRank > 0) {
    if (state.iceBarrierHp > 0 && result.finalHpDamage > 0) {
      result.applyChill = true;
      const absorbed = Math.min(state.iceBarrierHp, result.finalHpDamage);
      state.iceBarrierHp -= absorbed;
      result.finalHpDamage -= absorbed;

      if (state.iceBarrierHp === 0 && state.iceShatterIcdMs <= 0) {
        result.shatteredIceBarrier = true;
        result.counterIceDmg = Math.floor(
          ctx.heroMatk * (0.30 + 0.10 * ctx.iceRank)
        );
        result.applyFreeze = true;
        state.iceShatterIcdMs = 8000;
      }
    }
  }

  return result;
}
```

---

### จุดที่ 4: เชื่อมเข้าฉากต่อสู้ `src/scenes/BattleScene.ts`

ในไฟล์ `src/scenes/BattleScene.ts` ให้เพิ่ม **4 จุดย่อย** ดังนี้ครับ:

1. **บรรทัดบนสุดของไฟล์ (Import ประมาณบรรทัดที่ 1–30):**
   * เพิ่ม import จาก `'../data/skill-math'`:
   ```ts
   import {
     MageDefenseRuntime,
     createMageDefenseRuntime,
     calcGlacialBarrierMax,
     tickMageDefense,
     resolveMagePassiveDefense,
   } from '../data/skill-math';
   ```
2. **ใน `class BattleScene` (ส่วนประกาศ Property ประมาณบรรทัดที่ 70–130):**
   * กด `Ctrl+F` หา `export class BattleScene` แล้วเพิ่มตัวแปรเก็บสถานะ:
   ```ts
   private mageDefState: MageDefenseRuntime = createMageDefenseRuntime();
   ```
3. **ในฟังก์ชัน `create()` หรือตอนเริ่มไฟต์ (ประมาณบรรทัดที่ 180–260):**
   * รีเซ็ตและเปิดโล่น้ำแข็งเริ่มต้นเมื่อเข้าด่าน:
   ```ts
   this.mageDefState = createMageDefenseRuntime();
   if ((this.hero.stats.mageDefIceRank ?? 0) > 0) {
     this.mageDefState.iceBarrierHp = calcGlacialBarrierMax(
       this.hero.maxHp,
       this.hero.matk,
       this.hero.stats.mageDefIceRank
     );
   }
   ```
4. **ในฟังก์ชัน `update(time: number, delta: number)` และฟังก์ชันที่มอนสเตอร์โจมตี Hero:**
   * ใน `update(time, delta)` ให้ใส่:
     ```ts
     tickMageDefense(
       this.mageDefState,
       delta,
       this.hero.maxHp,
       this.hero.matk,
       this.hero.stats.mageDefIceRank ?? 0
     );
     ```
   * ในจังหวะที่มอนสเตอร์โจมตีใส่ Hero (กด `Ctrl+F` ค้นหา `this.hero.takeDamage` ใน `BattleScene.ts`):
     ```ts
     const defRes = resolveMagePassiveDefense(this.mageDefState, {
       incomingDamage: rawMonsterDmg,
       isDodged: didHeroDodge,
       heroMaxHp: this.hero.maxHp,
       heroMatk: this.hero.matk,
       lightningRank: this.hero.stats.mageDefLightningRank ?? 0,
       fireRank: this.hero.stats.mageDefFireRank ?? 0,
       iceRank: this.hero.stats.mageDefIceRank ?? 0,
     });

     this.hero.takeDamage(defRes.finalHpDamage);

     if (defRes.counterLightningDmg > 0) {
       this.monster.takeDamage(defRes.counterLightningDmg, 'lightning');
       this.playPixelFx('zap-hit', this.monster.x, this.monster.y);
     }
     if (defRes.counterFireDmg > 0) {
       this.monster.takeDamage(defRes.counterFireDmg, 'fire');
       this.playPixelFx('fireball', this.monster.x, this.monster.y);
     }
     if (defRes.shatteredIceBarrier) {
       this.monster.takeDamage(defRes.counterIceDmg, 'ice');
       this.playPixelFx('frost-nova', this.hero.x, this.hero.y);
     }
     ```