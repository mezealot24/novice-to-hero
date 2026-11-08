# Novice to Hero: ปิด 3 ช่องว่างได้แค่ไหน (follow-up, 2026-11-07)

- **Gap 1 (ตลาดไทยแยกแนวเกม): ปิดบางส่วน** ได้ภาพเชิงคุณภาพ (รายได้ไทยกระจุกที่ sports / MMORPG / 4X / shooter / MOBA ส่วน RPG ติดชาร์ตเฉพาะช่วง launch) แต่ **ไม่มีสัดส่วน % รายได้/ดาวน์โหลดตามแนวเกมของไทยเลย** และไม่มีข้อมูล idle RPG / ARPG ของไทยสักตัว (Sensor Tower, AppMagic, Statista อยู่หลัง paywall หรือเป็นภาพ)
- **Gap 2 (ค่าจ้าง KOL): ปิดบางส่วนแบบอ่อน** ได้ order-of-magnitude (micro ~1,000-18,500 THB/โพสต์) จากบล็อก agency ที่ไม่มี methodology; **ยืนยันว่าไทยไม่มี rate card สาธารณะ** (Relevant Audience, 2026-08-27) และไม่พบราคา gaming KOL/streamer เลย; CPI ไทยจริงก็ไม่มี (ค่าที่ได้ ~$1.30-2.00 เป็นการคำนวณจาก Meta CPC ที่ reliability ต่ำ)
- **Gap 3 (เกณฑ์ go/stop): ปิดไม่ได้ แต่ได้คำตอบชัด** คือ **ไม่มีมาตรฐานอุตสาหกรรมสำหรับ RPG/idle** ให้ยืม; เกณฑ์เดิมคงอยู่เป็น "ข้อเสนอผู้วิเคราะห์อิง all-genre percentile" (GameAnalytics 2026) และตัวเลข "ยอดนิยม" ทางออนไลน์ (Playio, D1 35-40%/D7 15%) เป็น folklore ห้ามใช้
- **สิ่งที่ต้องแก้ใน roadmap:** (1) เอา payer conversion ออกจากการเป็น gate (2) ผูกทุก gate กับขนาด cohort (D1 ~900 installs, D7 ~2,000+, D30 ต้องหลักพัน) (3) เพิ่มขั้น "paid CPI probe + small KOL test" ในเฟส 2→3 เพื่อวัดของจริง (4) เพิ่ม LINE OpenChat เป็นช่องฟรี (5) pre-register เกณฑ์ก่อนเปิด beta
- **ผลต่อ ship:** ไม่เปลี่ยนทิศทาง (Android + web, Thailand-first, turn-based) แต่ **ข้อมูลตลาดภายนอกจะไม่ช่วยตัดสิน go/stop เพิ่มอีก** ต้องใช้ data ผู้เล่นจริงของเราเอง; เฟสปัจจุบัน = ปลาย Content → ก่อน Beta, blocker เดิมยังเหมือนเดิม

---

## 0. วิธีอ่านรายงาน (สถานะข้อมูล)

- รายงานนี้ต่อยอดจาก Roadmap Strategy เดิม (2026-11-07) แต่อ่านแล้วเข้าใจได้เอง
- แท็ก: **[ยืนยัน]** = แหล่งปฐมภูมิ/ทางการ | **[รอง]** = สื่อ/บล็อก/ผู้สรุปรายงาน | **[ไม่ยืนยัน]** = แหล่งอ่อน, ไม่ระบุที่มา, หรือ folklore | **[inference]** = การคำนวณ/ข้อสรุปของผู้วิเคราะห์ ไม่ใช่ข้อเท็จจริงจากแหล่ง
- FX ที่ใช้แปลงคร่าว ๆ = **~37 THB/USD** (สมมติจากตัวเลข Maxion 10M THB ≈ $270k, 2025-10-04; ไม่ใช่อัตราทางการ) [inference]
- **ข้อควรระวังเรื่องข้อมูล:**
  - ตัวเลขไทยส่วนใหญ่เป็น Q1 2025 (อายุ ~18 เดือน ณ พ.ย. 2026)
  - GameAnalytics (GA) 2026: ค่าที่อ่านจาก PDF เป็นค่าประมาณจากกราฟ; จำนวนเกมใน sample ไม่ตรงกัน (16,262 ใน PDF vs 11,600 ที่ Game Growth Advisor อ้าง) แก้ไม่ได้ แต่ค่า D1/D7/D30 ตรงกันทุกแหล่ง
  - Adjust idle RPG CPI $3.19: ช่วงข้อมูลที่แหล่งสรุปอ้างไม่ตรงกัน (ปี 2025 vs ม.ค. 2024-ม.ค. 2026)

---

## 1. Gap 1: ตลาดไทยแยกตามแนวเกม — ปิดบางส่วน (เชิงคุณภาพได้ เชิงปริมาณไม่ได้)

### 1.1 ตารางค้นพบ

| # | ตัวเลข / ข้อค้นพบ | วันที่ | แหล่ง | ความน่าเชื่อถือ |
|---|---|---|---|---|
| 1 | ไทย Q1 2025 mobile IAP **$162M** (-6% QoQ) สูงสุดใน SEA; ไม่รวม D2C | 2025-06-13 | [GameDev Reports/Sensor Tower](https://gamedevreports.substack.com/p/sensor-tower-southeast-asia-mobile) | [รอง] |
| 2 | ไทย Q1 2025 genre รายได้สูงสุด (ranking ไม่มี %): realistic sports (-7.8% QoQ), **MMORPG (-27.4% QoQ)**, 4X (-5.6% QoQ) | 2025-06-13 | เดียวกับ #1 | [รอง] |
| 3 | ไทย Q1 2025 genre ดาวน์โหลดสูงสุด: simulators, platformers/runners, sandbox; ผู้เข้าใหม่: Ragnarok M: Classic (ทั้ง download และ revenue) | 2025-06-13 | เดียวกับ #1 | [รอง] |
| 4 | Google Play TH top-grossing (Android เท่านั้น): eFootball, EA FC Mobile, Coin Master, Roblox, Free Fire x2, RoV, Last War, Yulgang (MMORPG), Whiteout Survival; **ไม่มี idle RPG/ARPG** (การติด genre = ผู้วิจัยจัดเอง) | snapshot 2025-02-16 | [42matters](https://42matters.com/top-grossing-mobile-games-thailand) | [รอง]; genre label = [inference] |
| 5 | AppMagic snapshot ปี 2026 (ไม่ระบุเดือน): top grossing = eFootball, Free Fire, Roblox, EA FC 26, Coin Master; **ไม่มี RPG ใน top 5 ทั้ง free และ grossing** | 2026-06-09 | [Allcorrect](https://allcorrectgames.com/insights/the-gaming-market-in-thailand-2026/) | [รอง] (บล็อก marketing ต่อทอด AppMagic) |
| 6 | Seven Knights Re:BIRTH เป็น #1 revenue ที่ไทย (และ HK) หลัง launch 2025-09-18; ไม่ชัดว่ารวมหรือแยกตลาด | 2025-09-24 | [Gamemeca](https://www.gamemeca.com/en/view.php?gid=1766513) | [รอง]; spike ช่วง launch |
| 7 | Ragnarok: Twilight (SEA launch 2025-10-23) #1 Google Play free download, #2 Apple top grossing; **ระดับ SEA ไม่ใช่ไทยล้วน** | 2025-11-03 | [GlobeNewswire](https://www.globenewswire.com/news-release/2025/11/03/3178991/0/en/Ragnarok-Twilight-Has-Successfully-Launched-in-Southeast-Asia.html) | [รอง] (press release) |
| 8 | H1 2026: Ragnarok: The New World ครองอันดับ creative RPG ใน ID/TH/PH (5,900-8,400 creative sets ต่อตลาด); **Meta ถือ ~93% ของ top RPG creatives ใน SEA**; video >80% ความยาวเฉลี่ย 39-43 วินาที | 2026-09-01 | [SocialPeta](https://socialpeta.com/en/blog/2026-southeast-asia-mobile-game-marketing-report) | [รอง] (ad-intel ไม่ใช่รายได้) |
| 9 | SEA Q1 2025: 1.93B downloads, $625M IAP; รายได้นำโดย Strategy (4X/MOBA), Shooter, RPG; ดาวน์โหลดนำโดย Arcade/Simulation/Puzzle | 2025-06-13 / 2026-01-30 | [Sensor Tower](https://sensortower.com/blog/southeast-asia-mobile-gaming-2025), [Foxdata](https://foxdata.com/en/blogs/2025-southeast-asia-mobile-gaming-market-insight-report/) | [รอง] |
| 10 | Survey Rakuten (ผ่าน Statista): RPG = genre ที่ผู้เล่นออนไลน์ไทยชอบที่สุด **แต่ % ถูกปิด** | fieldwork 2025-01-19 ถึง 01-31 | [Statista](https://statista.com/statistics/1116832/thailand-most-popular-genre-of-online-games) | [รอง] |
| 11 | GMO Research (n=474, อายุ 16-60): 89.9% เล่นมือถือใน 12 เดือน; **46.7% ยึดเกมหลักเกมเดียว**; 31.0% สลับ genre; 50.7% ยอมเปลี่ยนเกมถ้า F2P/ราคาสมเหตุสมผล; ไม่มีข้อมูลรายแนว | fieldwork 2025-10-09 ถึง 10-15 (เผยแพร่ 2025-11-28) | [GMO Research](https://gmo-research.ai/en/resources/studies/2025-report-moblie-gaming-th) | [ยืนยัน] (primary survey; sample เล็ก, online panel) |
| 12 | RPG 29% / fighting 27% ของผู้เล่นออนไลน์ไทย | 2026-06-09 | [Allcorrect](https://allcorrectgames.com/insights/the-gaming-market-in-thailand-2026/) | [ไม่ยืนยัน] (ไม่ระบุที่มา) |
| 13 | สัดส่วน mobile ของตลาดเกมไทย ขัดกัน: Kasikorn **58.3%** (ปี 2025), depa **~49.6%** (ปี 2024), Allcorrect 71% (ไม่ระบุที่มา) | 2025 / 2025-09-02 / 2026-06-09 | [Digital in Asia](https://digitalinasia.com/thailand-gaming-market/), [The Nation](https://www.nationthailand.com/business/tech/40054880), Allcorrect | [รอง] / [รอง] / [ไม่ยืนยัน] |
| 14 | ยอดขายเกมที่พัฒนาในไทยลด 43.6% ปี 2024; ไม่พบเกม F2P mobile/web ที่ทำในไทยพร้อมตัวเลข downloads/รายได้ | 2025 | [Digital in Asia](https://digitalinasia.com/thailand-gaming-market/) | [รอง] |
| 15 | ข้อมูล Thai สำหรับ Capybara Go, AFK Journey, Diablo Immortal, Torchlight Infinite, Hero Siege: **ไม่พบ** | 2026-11-07 | (ค้นแล้วไม่พบ) | — |
| 16 | หัวข่าว "strategy surge as RPG revenue tumbles, H1 2025" (ระดับโลก) อ่านได้แค่หัวข้อ | 2025 | [PocketGamer.biz](https://www.pocketgamer.biz/strategy-games-surge-as-rpg-revenue-tumbles-h1-2025s-top-genres-revealed) | [ไม่ยืนยัน] (headline only) |

### 1.2 อ่านผล (so what)

- **ข้อสรุปเดิมที่ได้รับการหนุนเพิ่ม:** "ผู้เล่นไทยใช้เงินกับเกมค่ายใหญ่" มีหลักฐาน chart แล้ว (#4, #5) ไม่ใช่แค่ inference [inference จาก #4, #5]
- **RPG ไทย = ความนิยมสูง แต่รายได้ติดชาร์ตเป็นช่วง launch:** survey บอกชอบ RPG (#10) แต่ top-grossing ถูกครอง sports/shooter/MOBA/sandbox (#4, #5) และ MMORPG ไทย -27.4% QoQ (#2) [inference จาก #2, #4, #5, #6, #10]
- **ชั้นล่างที่แคบกว่า:** ผู้เล่น 46.7% ยึดเกมเดียว (#11) → เกมใหม่แย่งเวลากับ RoV/Free Fire/MLBB ไม่ใช่แย่ง wallet จากเกม RPG อื่นเท่านั้น [inference]
- **ช่องทางจ่ายเงินซื้อคนเล่น RPG แออัด:** creative RPG บน Meta ถูกครองโดย Ragnarok (#8) → ถ้าซื้อ UA บน Meta จะแข่งกับงบ publisher [inference จาก #8]
- **ไม่ควรเอาไปทำ forecast:** ไม่มีสัดส่วน % → ใช้ตลาดไทยเป็น "beta market" ต่อไป (คงข้อสรุปเดิม)

### 1.3 สิ่งที่ยังไม่ปิด

- สัดส่วนรายได้/ดาวน์โหลดไทยตามแนวเกม (%), idle RPG / ARPG / roguelite ของไทย, iOS vs Google Play ตามแนว
- แหล่งที่น่าจะมีคำตอบ แต่เข้าไม่ถึงในงานนี้: Sensor Tower/AppMagic report เต็ม, Niko Partners SEA Gamer Insights 2025 (n=3,131, [GlobeNewswire 2025-10-06](https://rss.globenewswire.com/news-release/2025/10/06/3161508/28124/en/2025-Southeast-Asia-Gamer-Insights-Diving-into-3-131-Surveys-and-Market-Trends.html)), Statista Thai RPG segment
- **ตัวเลขที่ห้ามอ้าง:** Antom "$393/player, 49% paying" (ไม่ระบุที่มา, 2025-11-12), Marketeer market size 72,966M baht (ขัดกับ depa/Kasikorn ~36B baht, 2024-08-15), Allcorrect 71%/86%/29%/27%

---

## 2. Gap 2: ค่าจ้าง KOL และต้นทุน UA — ปิดบางส่วนแบบอ่อน

### 2.1 ตารางค้นพบ: KOL / influencer

| # | ตัวเลข / ข้อค้นพบ | วันที่ | แหล่ง | ความน่าเชื่อถือ |
|---|---|---|---|---|
| 1 | "ไทย **ไม่มี rate card สาธารณะที่เชื่อถือได้**" ตัวเลขที่ลอยอยู่มาจาก survey ที่ไม่บอกวิธีหรือ sample แคบ; แนะนำคำนวณย้อนจาก gross profit ต่อ conversion และทดสอบด้วย paid brief เล็ก 1 ชิ้น | 2026-08-27 | [Relevant Audience](https://www.relevantaudience.com/social-media-marketing/influencer-marketing-thailand-guide/) | [รอง] (ความเชื่อมั่นสูงเฉพาะข้อความ "ไม่มี rate card") |
| 2 | Facebook influencer ไทย: micro **1,000-5,000 THB**, mid 5,000-25,000, macro 25,000-100,000+ (ไม่มี nano; ในบทความเดียวกัน macro ระบุทั้ง 25k-100k+ และ 100k+); ตัวอย่าง rate card รายคน: 3,500 THB/โพสต์, 6,500 THB/วิดีโอ 60 วินาที, 10,000 THB/โพสต์พร้อมลิงก์ | 2025-04-09 | [BaoLiba](https://baoliba-in2.pages.dev/posts/thailand-facebook-blogger-promotion-fee-standards-2025-04-09) | [ไม่ยืนยัน] (aggregator, ไม่มี methodology, ไม่ใช่เกม) |
| 3 | ไทยต่อโพสต์ (USD): nano (1K-10K followers) **$25-100**, micro (10K-100K) **$100-500**, macro (100K-1M) $500-2,000, mega $2,000+ | 2025-04-22 | [Awisee](https://awisee.com/blog/influencer-marketing-in-thailand/) | [ไม่ยืนยัน] (agency blog, ไม่มี methodology, ไม่ใช่เกม) |
| 4 | SEA proxy: nano ใน ID/VN มัก <$200 ต่อ TikTok; micro ทั้งภูมิภาค ~$300-1,500; ตัวอย่างสมมติ 15 creators ID = $1,500-3,000 (ไม่ใช่ที่สังเกตจริง) | 2026-04-28 | [ContentGrip](https://contentgrip.com/influencer-marketing-cost/) | [ไม่ยืนยัน] (ไม่ใช่ไทย) |
| 5 | งบ offline เริ่มต้นของ Maxion สำหรับ "Kyrie & Terra" ในไทย **10M THB (~$270k)** รวม BTS ads + KOL/gaming influencer (ไม่แยกส่วน KOL; ไม่รวม online) เป้า 200,000 pre-registrations | 2025-10-04 | [The Reporter Asia](https://thereporter.asia/eng/?p=3879) | [รอง] (ระดับ publisher ไม่ใช่ indie) |
| 6 | ราคา gaming KOL / streamer / livestream sponsorship / agency rate card ไทย: **ไม่พบ** | 2026-11-07 | (ค้นแล้วไม่พบ) | — |
| 7 | ตัวอย่าง indie ไทยที่มีงบการตลาดจริง: **ไม่พบ**; มีแค่เรื่องเล่าปี 2016 ว่า dev ไทยพึ่ง ASO/word-of-mouth เพราะ paid UA แพงเกินสำหรับรายเล็ก (ไม่มีตัวเลข) | 2016-08-01 | [Techsauce](https://techsauce.co/en/tech-and-biz/case-study-mobile-games-growth-hacking) | [รอง] (เก่า) |

### 2.2 ตารางค้นพบ: ต้นทุน paid UA

| # | ตัวเลข / ข้อค้นพบ | วันที่ | แหล่ง | ความน่าเชื่อถือ |
|---|---|---|---|---|
| 1 | **ไม่มี CPI ไทยที่ตรวจสอบได้**; Game Growth Advisor (GGA) ยอมรับว่าตรวจสอบ CPI รายประเทศ SEA ปี 2026 ไม่ได้ | 2026-08-27 | [GGA SEA entry](https://gamegrowthadvisor.com/blog/2026-08-27-sea-gaming-market-entry-guide-2026/) | [รอง] |
| 2 | CPI SEA Android casual/puzzle **$0.20-0.60** (ผู้เขียนให้ confidence "ต่ำถึงปานกลาง"; iOS ~3-4 เท่า) | 2026-03-17 (อัปเดต 2026-08-15) | [GGA UA CPI](https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/) | [ไม่ยืนยัน] (synthesis ของผู้เขียน) |
| 3 | Idle RPG global blended CPI **$3.19** (Adjust Gaming App Insights 2026, ข้อมูลปี 2025); Strategy $1.03; idle RPG CPM $5.78 (-9%) | 2026 (report) | [Adjust PDF](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf), [GGA KPI](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/) | [ยืนยัน] (อ่านผ่านผู้สรุป) / ไม่ใช่ตลาดไทย |
| 4 | Liftoff Android RPG CPI $4.29 (Feb 2024-Feb 2025, report "casual", scope RPG ไม่ชัด) | 2025 | [GameDev Reports/Liftoff](https://gamedevreports.substack.com/p/liftoff-and-singular-casual-games) | [รอง] |
| 5 | Midcore RPG CPI Android $2.50-6.00, iOS $4.00-12.00 (ข้อมูล "2025" ไม่ระบุวันที่); Meta/TikTok CPI +15-20% YoY | ไม่ระบุ | [Admiral Media](https://admiral.media/mobile-game-marketing-benchmarks/) | [ไม่ยืนยัน] |
| 6 | **Meta ไทย** (ประมาณการ 2026): CPM เฉลี่ย **$3.90** (ช่วง $3.20-4.80), CPC เฉลี่ย **$0.40**; เทียบ ID $2.80/$0.18, PH $3.50/$0.28, VN $2.10/$0.15 | 2026 (undated; "projections") | [Adamigo](https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026) | [ไม่ยืนยัน] (ที่มาไม่ระบุ) |
| 7 | **TikTok ไทย** in-feed: CPM **$0.90-2.60**, CPC **$0.08-0.24** | 2026-09-06 | [Stackmatix](https://stackmatix.com/blog/tiktok-ads-cost-by-country-2026) | [ไม่ยืนยัน] |
| 8 | Meta ไม่เปิดราคารายประเทศ; APAC avg price per ad +1% YoY ใน Q3 2026 | 2026-10-23 | [Relevant Audience](https://www.relevantaudience.com/meta/meta-q3-2026-ad-price-impressions-asia-pacific/) | [รอง] |
| 9 | GGA แนะนำ paid test **2-3 สัปดาห์ต่อประเทศ ต่อ 1 channel ด้วย creative เดียวกัน** วัด CPI, D1, early ARPDAU (ไม่ระบุงบ) | 2026-08-27 | [GGA SEA entry](https://gamegrowthadvisor.com/blog/2026-08-27-sea-gaming-market-entry-guide-2026/) | [รอง] (คำแนะนำ ไม่ใช่ data) |

### 2.3 ตัวเลขที่คำนวณเอง (ทั้งหมดเป็น [inference] — ห้ามอ้างเป็นข้อมูลตลาด)

| รายการ | วิธีคำนวณ | ผล | ข้อจำกัด |
|---|---|---|---|
| แปลง THB ของ Awisee (micro $100-500) | x 37 THB/USD | **~3,700-18,500 THB** | FX ประมาณ; band follower ไม่ตรงกับ BaoLiba จึงห้ามรวมสองแหล่ง |
| ช่วง micro ที่แหล่งสองแหล่งไม่ตรงกัน | BaoLiba 1,000-5,000 vs Awisee 3,700-18,500 | ต่างกันถึง ~3.7 เท่าที่ขอบบน | ยืนยันว่าตัวเลข KOL เป็นแค่ order-of-magnitude |
| CPI Meta ไทย (derived) | CPC $0.40 / click-to-install 20-30% | **~$1.33-2.00** | **อินพุตสองตัวอ่อนทั้งคู่:** CPC [ไม่ยืนยัน], อัตรา click→install 20-30% **เป็นสมมติฐานของผู้วิจัย ไม่มีแหล่ง** |
| CPI TikTok ไทย (derived) | CPC $0.08-0.24 / 20-30% | ~$0.27-1.20 | คุณภาพ install-intent ของ TikTok ไม่มีหลักฐาน |
| ต้นทุน cohort 1,000 installs | 1,000 x CPI $1.33-2.00 x 37 | **~49,000-74,000 THB** (ถ้าใช้ Adjust $3.19: ~118,000 THB) | ใช้เป็นกรอบงบ ไม่ใช่คำทำนาย |
| LTV ที่ต้องมีถ้า LTV:CPI = 3:1 (ธรรมเนียม GGA) | CPI x 3 | **~$4-6** ต่อ install (ที่ CPI $1.33-2.00) | 3:1 เป็นธรรมเนียมของ GGA ไม่ใช่มาตรฐาน |
| IAP D90 ต่อ install ที่เป็นไปได้ | payer share x ARPPU D90 midcore $9.80 (AppsFlyer ผ่าน Playio, ม.ค. 2025-มี.ค. 2026) | payer 1% = $0.10; 3% = $0.29; 5% (a16z midcore) = **$0.49** | นิยาม payer share/ARPPU ต่างกัน, ARPPU เป็นของ midcore ทั่วโลก ไม่ใช่ไทย/cosmetic-only |

- **อ่านผล [inference]:** ต่อให้ payer 5% และ ARPPU $9.80 รายได้ IAP D90 ~ $0.49/install < CPI ที่คำนวณได้ ~$1.33-2.00 → **paid UA ล้วนไม่คุ้มบน IAP cosmetic-only จนกว่าจะพิสูจน์ด้วยข้อมูลจริง** → สอดคล้องกับข้อสรุปเดิม "ห้ามซื้อ UA ก่อน D1/D7 ผ่าน" และเปลี่ยนบทบาทของ paid test เป็น "เครื่องมือวัด" ไม่ใช่ช่องทางโต
- Thailand มี IAP ARPU สูงสุดใน SEA ตามคำกล่าวเชิงคุณภาพของ [Foxdata](https://foxdata.com/en/blogs/2025-southeast-asia-mobile-gaming-market-insight-report/) (2025-07-18, [รอง]) → ARPPU ไทยอาจสูงกว่า $9.80 แต่ไม่มีตัวเลข

### 2.4 ช่องทางฟรี / ต้นทุนต่ำ

| ตัวเลข / ข้อค้นพบ | วันที่ | แหล่ง | ความน่าเชื่อถือ |
|---|---|---|---|
| LINE OpenChat ไทย: MAU 20M → **24M** หลังย้ายไป tab ที่ 3; 7.4M room joins; >100,000 rooms active; ห้องใหญ่สุด ~20,000-22,400 คน; **LINE ยังไม่มีผลิตภัณฑ์โฆษณาใน OpenChat** (ทางเข้าคือร่วมมือ admin ห้องที่มีอยู่) | ข้อมูล 2026-09-30 (รายงาน 2026-10-07/11) | [Relevant Audience](https://www.relevantaudience.com/social-media-marketing/line-openchat-thailand-24-million-monthly-users-third-tab/) | [รอง] |
| ประสิทธิผลของ OpenChat/Pantip/Facebook Groups/Discord/Reddit ต่อการได้ install เกมเล็ก: **ไม่พบข้อมูล** | 2026-11-07 | (ค้นแล้วไม่พบ) | — |
| Facebook เป็นช่องค้นพบของ >70% ผู้เล่นไทย (Antom ไม่ระบุที่มา) — ใช้เป็นทิศทางเท่านั้น | 2025-11-12 | [Antom](https://knowledge.antom.com/thailand-gaming-payment-trends-report-unveiling-southeast-asias-second-largest-gaming-market) | [ไม่ยืนยัน] |

### 2.5 สถานะ Gap 2

- **ปิดแล้ว:** รู้ว่าไม่มี rate card สาธารณะ → หยุดหาตัวเลข "มาตรฐาน"; มีกรอบงบทดสอบเริ่มต้น (ตาราง 2.3)
- **ยังไม่ปิด:** ราคา gaming KOL/streamer ไทย, CPI ไทยจริง, ประสิทธิผลช่องฟรี → ปิดได้ด้วยข้อมูลของเราเองเท่านั้น (หัวข้อ 5)

---

## 3. Gap 3: เกณฑ์ go/stop — ไม่มีมาตรฐานอุตสาหกรรมให้ยืม

### 3.1 ตารางค้นพบ: benchmark ที่ใช้ได้ vs ที่ใช้ไม่ได้

| # | ตัวเลข / ข้อค้นพบ | วันที่ | แหล่ง | ความน่าเชื่อถือ |
|---|---|---|---|---|
| 1 | GA mobile ทุกแนว (ข้อมูลปี 2025): **P50 / P75** D1 ~22% / >30%; D7 <4% / 6-7%; D30 0.68-0.79% / 1.6-1.8%; session 3.1-3.5 / ~5.2 นาที; sessions/day 3.8-3.9 / 5.3-5.7; **ไม่มีแยกแนว** | PDF ไฟล์ลงวันที่ 2026-01-27; สรุป GDR 2026-06-04 | [GA PDF](https://investgame.net/wp-content/uploads/2026/01/2026-01-27-2026-mobile-pc-benchmarks_compressed.pdf), [GDR](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) | [ยืนยัน] (ค่าอ่านจากกราฟ ประมาณ) |
| 2 | GA PC (3,582 เกม): D1 P50/P75 ~9% / 15-16%; D7 1.7-1.8% / 3.5-3.9%; D30 ~0.3% / 1-1.2% — ใช้เป็น proxy ของ web ไม่ได้ (ไม่มี benchmark HTML5/Poki/CrazyGames เลย) | 2026-01-27 | GA PDF | [ยืนยัน] (PC ไม่ใช่ browser) |
| 3 | Adjust 2026: D1 เฉลี่ยทุกแนว **27%** (ปี 2025; ฐาน paid-acquisition) — ส่วน genre D1 อยู่ในกราฟที่อ่านป้ายไม่ได้ | 2026 | [Adjust PDF](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf), [สรุป GDR](https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report) | [ยืนยัน] (ผ่านผู้สรุป) |
| 4 | GA (Feb 2025 summary): midcore เป็น segment ที่ sessions/day สูงสุด ~6-7; ไม่มีตัวเลข genre | 2025-02 | [GDR](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks) | [รอง] |
| 5 | **GGA go/kill matrix** (ธรรมเนียมของ consultant, anchored casual/puzzle): stop buying ถ้า D1 <25% Android; stop scaling ถ้า D7 <8% หรือ D30 <3%; go ถ้า D1 28-32%, D7 >7-8%, CPI 30-50% ของ LTV; kill ถ้า D1 <25% หลัง 3 รอบแก้ — **ตัวหน้าเว็บเองระบุว่าหลายตัวเลขเป็น convention ที่ไม่ได้ verify**; เกณฑ์ go อยู่แถว top quartile ของ GA | 2025-12-16 | [GGA soft launch](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) | [ไม่ยืนยัน] (convention) — ใช้เป็น template ได้ |
| 6 | **Rockbite** (ทีม idle RPG): ถ้าโปรเจกต์ขาด "60-70% ROI" ให้ทดสอบสมมติฐานใหม่ทั้งชุด ไม่ใช่ iterate (ไม่ระบุ window); R1 ที่ 25% แล้ว long-term retention >10% = "คุ้มทำต่อ"; **D7 ต้อง 2,000-5,000 players, payment metrics ต้อง 10,000-20,000 players ใน geo หลัก** | 2024-07-24 | [PocketGamer.biz](https://www.pocketgamer.biz/why-market-benchmarks-matter-how-to-work-with-analytics-at-launch) | [รอง] (กฎของสตูดิโอ ไม่ใช่มาตรฐาน) |
| 7 | **a16z**: D30 ควร "stand on its own"; วัด D30 ต้องมี cohort >=60 วัน; LTV ต้อง > CPI; payer ~2% casual / ~5% midcore; ~80% ของรายได้จาก top 20% payers; **ไม่ให้เกณฑ์ตัวเลข แนะนำให้ตั้งเกณฑ์ล่วงหน้า** | 2023-10-17 | [a16z](https://a16z.com/mobile-game-soft-launch/) | [รอง] (ความเห็นนักลงทุน ไม่ใช่ data) |
| 8 | ขนาดตัวอย่าง: อ่าน D1 ~30% ให้คลาดเคลื่อน ±3 จุดที่ 95% ต้อง ~**896 installs** | 2026-03-17 | [GGA KPI](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/) | [รอง] (สูตรมาตรฐาน; ตรวจซ้ำได้) |
| 9 | Payer conversion / ARPDAU ของ RPG/idle ปี 2024-26: **ไม่มีแหล่งน่าเชื่อถือ**; GGA ระบุว่า conversion "widely quoted, never sourced" | 2026-03-17 | GGA KPI | [รอง] |
| 10 | RPG daily payer conversion ~3% (top 15% ของเกม) — ข้อมูล GA มิ.ย. 2018-พ.ค. 2019 ผ่าน Playio | 2026-08 (ข้อมูลเก่า 7 ปี) | [Playio ARPPU](https://blog.playio.co/arppu-mobile-games) | [รอง] เก่า/คนละนิยาม |
| 11 | Tutorial completion / FTUE drop-off benchmark RPG: **ไม่พบ**; Playio อ้าง "onboarding ดีเพิ่ม retention ถึง 50%" และ "tutorial 70%" (เป็นตัวอย่างสมมติ) โดยไม่ระบุที่มา | 2026-08-02 | [Playio onboarding](https://blog.playio.co/mobile-game-onboarding-retention) | [ไม่ยืนยัน] |
| 12 | Genre retention ของ RPG/idle/ARPG/roguelite 2024-26: **ไม่มีแหล่ง primary** (GameIntel น่าจะมี แต่ gated และยังไม่ได้เปิด) | 2026-11-07 | [GameAnalytics GameIntel](https://gameanalytics.com/gameintel) | — |

### 3.2 Folklore — ห้ามใช้เป็น gate (เรียกชื่อชัด ๆ)

| ตัวเลข | ที่มาที่อ้าง | ทำไมห้ามใช้ |
|---|---|---|
| **Playio genre table:** RPG D1 40-60% / D7 25-40% / D30 15-25%; Idle/AFK 35-50% / 20-30% / 10-15%; Strategy 35-50% / 20-35% / 10-20% | [Playio retention by genre](https://blog.playio.co/retention-by-game-genre) (2025-12-19, แก้ 2026-06-21) | หน้าเองไม่ระบุ study/dataset; สูงกว่า GA ทุกแนว (D1 ~22%, D7 <4%, D30 ~0.7%) ~2-20 เท่า → ถ้าใช้เป็น gate จะ "ฆ่า" แทบทุกเกม [inference] |
| **"D1 35-40% / D7 15%" gate** | ไม่พบต้นทางในแหล่งใดที่เปิดได้ | เหนือ P75 ทุกแนวของ GA (D1 ~30%, D7 6-7%); น่าจะสะท้อนเกม breakout ไม่ใช่เกณฑ์ขั้นต่ำ [inference] |
| Admiral: D7 เฉลี่ยอุตสาหกรรม 15-20%, top quartile 25%+ | [Admiral Media](https://admiral.media/mobile-game-marketing-benchmarks/) (ไม่ระบุวันที่) | ขัดกับ GA P50 D7 <4% ~4-5 เท่า; ไม่ระบุที่มา |
| "35/15/5" แทน "40/20/10" | สรุปโดยผู้เขียน InvestGame ([PDF 2026-01](https://investgame.net/wp-content/uploads/2026/01/2026-01-20-Mobile_retention_benchmarks_2026.pdf)) | เป็นข้อเสนอของผู้สรุป ไม่ใช่ GA |
| Lamar - Idle Vlogger D1 52% / D7 20% / D30 5% | [Chimera](https://chimeravc.substack.com/p/chimera-checkpoint-2-the-web-game) (2025-08-04) | เกมเดียว, survivorship bias, ไม่ระบุวันวัด |
| "hybrid-casual paid UA เริ่มคุ้มที่ D7 ~18%" | [GGA soft launch](https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/) | กฎของ vendor, Tier 1 hybrid-casual, ไม่ใช่ตลาดเรา |
| Liftoff 2023: RPG CPI $0.60, D7 ROAS 1.7% | [Liftoff PDF](https://content.liftoff.io/hubfs/2023/Reports/2023%20Midcore%20Gaming%20Apps%20Report/2023%20Midcore%20Gaming%20Apps%20Report%20-%20EN.pdf) (ข้อมูลถึง พ.ค. 2023) | stale, geo mix ไม่ทราบ ([inference]: อีก 2 ปีต่อมา Android RPG $4.29) |

### 3.3 สถานะ Gap 3

- **ยืนยันได้:** ไม่มี go/kill threshold ที่ publish ของ publisher midcore/idle (Voodoo, Homa, Azur, Habby, Moonton ไม่พบ) และไม่มี benchmark RPG/idle genre-level ที่เป็น primary
- **เกณฑ์เดิมของเรา:** "ข้อเสนอผู้วิเคราะห์" ถูกต้องตามที่ระบุ → ต้องคงการติดป้ายนี้ต่อไป
- **ที่ปรับปรุงได้:** เทียบข้ามกับ template ของ GGA และ Rockbite ได้แล้ว ซึ่งเผยว่าปัญหาหลักไม่ใช่ "ตัวเลขเกณฑ์" แต่คือ "ขนาด cohort" (หัวข้อ 4)

---

## 4. ปรับเกณฑ์ go/stop: ก่อน vs หลัง

### 4.1 ตารางเทียบ (เกณฑ์เดิม = Stop / Go จากรายงานเดิม)

| Metric | เดิม (Stop / Go) | หลังวิจัยเพิ่ม | สถานะ | เหตุผล + แหล่ง |
|---|---|---|---|---|
| D1 | <22% / >=30% | **คงเดิม** เพิ่มเงื่อนไข n: อ่านแบ่ง 22 vs 30 ได้เมื่อ cohort >=~900 installs; ที่ n=300 error ±4.7-5.2 จุด → อ่านแบ่งไม่ได้ | คงไว้ + ผูก n | P50/P75 ของ GA [ยืนยัน]; 896 installs (GGA) + คำนวณ binomial [inference] |
| D7 | <4% / >=7% | **คงเดิม** ขยับ n: cohort >=~2,000 (ที่ 1,000 installs error ±1.2-1.6 จุด คร่อมเส้น 4 และ 7); ก่อนถึง n นี้ให้ตีความ D7 เป็น "provisional" | คงไว้ + ผูก n | P50/P75 GA [ยืนยัน]; Rockbite 2,000-5,000 [รอง]; binomial [inference] |
| D30 | <0.8% / >=1.8% | **คงเดิมแต่ demote เป็น directional เท่านั้น** (ห้ามใช้ stop/go): ที่ 1,000 installs ที่ 1% error ±0.6 จุด ครอบช่อง 0.8-1.8 เกือบทั้งช่อง; ที่ 2,000 ยังกว้าง ±0.4-0.6 | คงไว้ แต่ลดสถานะ | P50/P75 GA [ยืนยัน]; a16z ต้อง cohort >=60 วัน [รอง]; binomial [inference] |
| Crash (user-perceived) | >=1.09% / <0.5% | **คงเดิม** 1.09% = เส้น Google; **0.5% ยังเป็นข้อเสนอเอง** | 1.09% คงไว้ (ทางการ); 0.5% = analyst proposal | [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/9844486) [ยืนยัน] |
| ANR | >=0.47% / <0.2% | **คงเดิม** 0.47% = เส้น Google; **0.2% ยังเป็นข้อเสนอเอง** | 0.47% คงไว้ (ทางการ); 0.2% = analyst proposal | Google Play Console Help [ยืนยัน] |
| **Payer conversion** | <1% / >=3% | **เอาออกจาก gate** → "monitor only"; แทนด้วย (a) มีการซื้อเกิดขึ้นจริงอย่างน้อยหนึ่งครั้งใน closed beta และ (b) funnel เปิดร้าน → กดซื้อ → จ่ายสำเร็จ ทำงาน | **เปลี่ยน** | ไม่มี benchmark 2024-26 (GGA: never sourced); a16z 2-5% เป็นความเห็น; ข้อมูล 3% เป็นปี 2018-19 คนละนิยาม; Rockbite: payment metrics ต้อง 10,000-20,000 players; 1,000 installs ≈ 10-50 payers (ที่ 1% → ~10 คน, SD ~3) อ่านไม่ได้ [inference] |
| Tutorial completion | <60% / >=80% | **ยังเป็น analyst proposal** (ไม่มีแหล่งใดรองรับ); เปลี่ยนวิธีใช้: เก็บ step-level drop-off ใน 50-300 คนแรก แล้ว "ตั้งเส้นของเราเอง" จากจุดที่หลุดมากสุด | ยังเป็น proposal + เปลี่ยนวิธีตั้ง | ไม่พบ benchmark; Playio 50%/70% = [ไม่ยืนยัน] |
| Session length | <3 / >=5 นาที | **คงเดิม** (เป็น secondary signal); ให้ดู sessions/day คู่กัน (P75 5.3-5.7; midcore ~6-7) | คงไว้ | GA [ยืนยัน]; GDR Feb 2025 [รอง] |
| **(ใหม่) เกณฑ์ขนาด cohort** | (ไม่มี) | D1 >=~900 / D7 >=~2,000 / D30 ต้องหลักพันหลายชุด / payer ไม่ใช้เป็น gate | **เพิ่ม** | ที่มาตามแถวบน |
| **(ใหม่) gate "ขยายงบ UA"** (แยกจาก gate "เกมไปต่อ") | (ไม่มี; มีแค่ "อย่าซื้อ UA ก่อน D1/D7 ผ่าน") | ห้ามเพิ่มงบถ้า D1 <25% (Android) หรือ projected LTV < CPI; เป้า CPI = 30-70% ของ LTV (LTV:CPI ~1.4-3.3x) | **เพิ่ม (convention)** | GGA matrix [ไม่ยืนยัน/convention]; a16z "LTV > CPI" [รอง] |
| **(ใหม่) pre-register เกณฑ์** | (ไม่มี) | เขียนเกณฑ์ + ขนาด cohort ลงเอกสารโปรเจกต์ **ก่อน** เปิด Phase 2 และห้ามขยับหลังเห็นข้อมูล | **เพิ่ม** | a16z แนะนำตั้งเกณฑ์ล่วงหน้า [รอง] |

- **สิ่งที่ยังเป็น analyst proposal:** การเลือก P50 = stop line และ P75 = go line, 0.5% crash, 0.2% ANR, tutorial 60/80% — ไม่มีมาตรฐานอุตสาหกรรมรองรับ
- **สิ่งที่มีแหล่งทางการ:** เฉพาะ crash 1.09% และ ANR 0.47% (เส้น "bad behavior" ของ Google) และ percentile ตลาดของ GA (แต่เป็น "ตลาดรวมทุกแนว" ไม่ใช่เกณฑ์ผ่าน/ไม่ผ่าน)
- **ทำไมไม่ยกเกณฑ์ขึ้นตาม GGA (D7 stop <8%):** GGA anchored เกม casual/puzzle และตั้ง go ไว้ที่ top quartile; เกมเรา organic-first, cosmetic-only → ใช้เป็น gate "เกมต้องหยุด" จะโหดเกินหลักฐาน [inference]
- **เกณฑ์เดิมไม่ได้ "ผิด" แต่ "แยก gate ไม่ขาดที่ n เล็ก":** ที่ cohort ตัวอย่างเล็ก ๆ เกือบทุก gate ในตารางจะคร่อมเส้น → ต้องอ่านแนวโน้มข้ามรอบ ไม่ใช่ค่าเดียว

### 4.2 สิ่งที่ต้องแก้ใน roadmap (เทียบเฟสเดิม)

| เฟสเดิม | เดิมเขียนว่า | แก้เป็น | เหตุผล |
|---|---|---|---|
| 0. Pre-beta hardening | analytics + anonymous ID | เพิ่ม: event **step-level tutorial funnel**, **UTM/attribution ต่อช่องทาง** (KOL, Meta, OpenChat), **purchase-funnel events** | ต้องวัด CPI-equivalent และ drop-off เอง เพราะไม่มี benchmark ภายนอก |
| 0. | (ไม่มี) | pre-register ตาราง gate + ขนาด cohort | a16z |
| 2. Closed beta (50-300) | D1 >=22%, tutorial >=60% | ใช้ D1 เป็นสัญญาณทิศทางเท่านั้นที่ n นี้ (error ±4.7-5.2 จุด); gate จริงเป็น crash/ANR + P0 bug + economy exploit + tutorial step-drop | binomial [inference] |
| 2 → 3 | (ไม่มี) | เพิ่ม **small paid KOL test + paid CPI probe** (หัวข้อ 5) เพื่อสร้าง cohort ~1,000 และวัดราคาจริง | ปิด gap 2 |
| 3. Open beta | "payer >=1% (directional)", "D7 <4% หลัง 2 รอบ → stop UA" | ลบ payer ออกจาก gate; D7 stop ใช้ได้เมื่อ cohort >=~2,000 หรือ <4% ติดกัน 2 รอบ; เพิ่ม gate "ขยาย UA" แยก | Rockbite; GGA |
| 3. ช่องทาง | "KOL ไทยเล็ก ๆ (ไม่มีข้อมูลราคา)" | KOL micro/nano + **LINE OpenChat (24M MAU, ร่วมมือ admin)** ย้ายขึ้นมาตั้งแต่เฟส 2 | Relevant Audience |
| 3. Soft-launch market | ไทยเป็น beta market | **คงเดิม** (GGA 2026-08-27 แนะนำไทยเป็นตลาดนำของ SEA สำหรับ IAP-driven title [รอง]) | ไม่มีหลักฐานขัด |
| 4. ขยาย | ต้องมี LTV/CPI อ่านได้ | **คงเดิม**; ใช้ตัวเลข CPI จาก probe ไม่ใช่ benchmark | ไม่มี CPI ไทยที่ตรวจสอบได้ |
| Risk #4 Discoverability | "ไม่มีข้อมูลค่า KOL" | อัปเดต: มีกรอบ order-of-magnitude + ต้องขอ quote จริง; creative RPG บน Meta แออัด (Ragnarok) | SocialPeta |

---

## 5. ทำอะไรต่อได้จริงสำหรับ solo dev

> ประมาณเวลา/งบ = ประมาณการของผู้วิเคราะห์ [inference] ไม่ใช่ข้อเท็จจริงจากแหล่ง; ทุกข้อแบ่งให้จบใน 1-2 session

### 5.1 ตารางลำดับความคุ้ม

| ลำดับ | งาน | ปิด gap ไหน | ต้นทุน (ประมาณ) | แรง (ประมาณ) | คุ้มไหม |
|---|---|---|---|---|---|
| 1 | **เปิด PDF Adjust Gaming App Insights 2026 แล้วอ่านกราฟ genre D1 ด้วยตา** ([PDF](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)) | 3 (ได้ genre D1 หนึ่งจุดถ้ามี idle RPG/RPG) | ฟรี | 30-60 นาที | **ทำเลย**; ผลไม่แน่นอน (ผู้ช่วยวิจัยอ่านป้ายกราฟไม่ได้) และเป็นข้อมูล global/paid cohort ไม่ใช่ไทย |
| 2 | **ฝัง tracking ก่อน test:** UTM/attribution ต่อช่อง + step-level funnel + purchase funnel | 2, 3 | ฟรี (PostHog free 1M events/เดือน, [pricing](https://posthog.com/pricing)) | 1 session | **ต้องทำก่อนข้อ 3-4** ไม่งั้นวัด CPI/D1 รายช่องไม่ได้ |
| 3 | **Small paid KOL test:** ขอ quote 5-8 creators เกม (nano/micro, FB/TikTok/YouTube) ซื้อ 2-3 ราย ด้วย brief + unique link/โค้ดต่อราย; วัด installs, cost/install, D1 รายคน | 2 (ได้ราคาจริงของ gaming KOL) | จากกรอบ: micro 1,000-18,500 THB/โพสต์ → 3 โพสต์ ~3,000-55,000 THB; **เสนอเพดาน ~20,000-30,000 THB** [ข้อเสนอผู้วิเคราะห์] | ส่ง quote 1 session + ติดตาม 1-2 สัปดาห์ | **คุ้มสุด** ราคาถูก ได้ทั้งราคาและ funnel; ตามคำแนะนำ Relevant Audience (scoped brief เดียว) |
| 4 | **Paid CPI probe 2-3 สัปดาห์:** 1 channel (Meta ก่อน เพราะ creative RPG ใน SEA ~93% อยู่บน Meta), creative เดียว, Android ไทย; วัด CPI, D1, early ARPDAU (วิธีตาม GGA) | 2 (CPI จริง), 3 (D1 ของ cohort ที่ซื้อ) | **probe เล็ก ~5,000-10,000 THB** (ที่ CPI derived $1.33-2.00 ≈ 65-210 installs → ได้แค่ทิศทาง CPI); **cohort อ่าน D1 ได้ ~1,000 installs ≈ 49,000-74,000 THB** (ถ้า CPI จริง $3.19 ≈ 118,000 THB) [ทั้งหมด inference] | setup 1 session + ดูผลวันละ ~15 นาที | **ทำ probe เล็กก่อน** แล้วค่อยตัดสินใจ cohort ใหญ่ตามราคาจริง; ทำหลัง D1 closed beta ไม่ต่ำกว่า stop line (22%) เพื่อไม่ขัดกับกฎ "อย่าซื้อ UA ก่อน D1 ผ่าน" |
| 5 | **LINE OpenChat:** หา admin ห้องเกม/RPG ไทย (ห้องใหญ่ 20,000+ คน) ขอโพสต์/จัด playtest ฟรี | 2 (ช่องฟรี), 1 (อ่านความสนใจแนวเกมคร่าว ๆ) | ฟรี-ต่ำ | 1-2 session + ดูแลชุมชน | **คุ้ม** แต่ผลไม่มีหลักฐานภายนอก → วัดเองด้วย UTM |
| 6 | **GameAnalytics GameIntel:** เปิดดู demo/ราคา ([หน้า](https://gameanalytics.com/gameintel)) | 3 (อาจได้ genre percentile) | **ไม่ทราบ** (ยังไม่ได้เปิดหน้า) | ~1 ชั่วโมงเช็กราคา/ตัวอย่าง | **ซื้อเมื่อ:** มี D1/D7/D30 percentile แยก RPG/idle และราคา < งบ paid CPI probe (กฎตัดสินใจของผู้วิเคราะห์); ถ้าไม่เข้าเงื่อนไขให้ข้าม |
| 7 | **Sensor Tower / AppMagic (genre ไทย):** ขอราคา/ดูว่า free tier แสดง genre รายประเทศหรือไม่ | 1 | **ไม่ทราบ** (ไม่ได้ค้นราคา) | ~1 ชั่วโมง | **ยังไม่ซื้อ**; ต่อให้ได้ % genre ไทย ก็ไม่เปลี่ยน go/stop (ซึ่งขึ้นกับ D1/D7 ของเรา) → ทบทวนตอนเลือกตลาดขยาย (เฟส 4) หรือตอน pitch publisher |
| 8 | Soft Launch Bible (Lancaric) | 3 | ไม่ทราบ | — | **ต่ำสุด**: paywalled อ่านเนื้อหาไม่ได้ ([Substack](https://lancaric.substack.com/p/the-soft-launch-bible-full-2025-blueprint)) |

### 5.2 ลำดับที่แนะนำ (1 สัปดาห์แรก → beta)

- สัปดาห์ 1: ข้อ 1 (Adjust PDF) + ข้อ 2 (tracking) + ส่งขอ quote ข้อ 3
- ระหว่าง closed beta (เฟส 2): ข้อ 5 (OpenChat) + เก็บ funnel ของเราเอง
- ก่อนเปิด open beta: ข้อ 3 (KOL test) → ข้อ 4 (CPI probe) → ตัดสินใจขนาด cohort
- ข้อ 6-7: ตัดสินตามเงื่อนไขในตาราง ไม่ต้องรีบ

### 5.3 เมื่อได้ข้อมูลของเราเอง ให้แทนที่ตัวเลขชั่วคราว

| ตัวเลขชั่วคราวในรายงานนี้ | แทนด้วย |
|---|---|
| KOL 1,000-18,500 THB/โพสต์ | quote จริง 5-8 ราย |
| CPI ~$1.33-2.00 (derived) | CPI จาก probe |
| click→install 20-30% (สมมติฐาน) | CTR→install จาก probe |
| payer 1-5%, ARPPU $9.80 | ข้อมูล closed/open beta (อ่านเป็น directional) |
| tutorial 60/80% | เส้นที่ตั้งจาก step-drop ของเรา |

---

## สรุปสิ่งใหม่ที่ได้

- **ช่องว่าง 3 ข้อมีสถานะต่างกัน:** Gap 1 ปิดเชิงคุณภาพ, Gap 2 ปิดได้เฉพาะ "รู้ว่าต้องวัดเอง", Gap 3 ปิดโดยการยืนยันว่าไม่มีมาตรฐาน — ไม่มีข้อไหนที่ซื้อข้อมูลสาธารณะแล้วจะ "ปิด" ได้ทั้งหมด
- **ปัญหาจริงของ gate คือ sample size ไม่ใช่ตัวเลขเกณฑ์:** ถ้า cohort ไม่ถึง ~900/~2,000 ผล D1/D7 คร่อมเส้นอยู่ดี และ payer/D30 ใช้ตัดสินไม่ได้ในระดับ solo → roadmap ควรลงทุนใน cohort (ผ่าน KOL + probe) มากกว่าหา benchmark เพิ่ม
- **paid UA ไม่ใช่ช่องโต แต่เป็นเครื่องมือวัด:** อาศัย derived estimate ที่อ่อน ผลชี้ว่า IAP cosmetic-only น่าจะไม่คุ้ม CPI → ช่องทางหลักยังเป็น organic/ชุมชน (OpenChat, Facebook, KOL เล็ก) จนกว่าตัวเลขจริงจะบอกเป็นอย่างอื่น

---

## อ้างอิง

> วันที่ = วันที่เผยแพร่/ข้อมูลตามโน้ตวิจัย; "ไม่ระบุ" = หน้าไม่แสดงวันที่

**Benchmark เกม**

1. GameAnalytics, Mobile and PC Game Benchmarks 2026 (PDF ไฟล์ลงวันที่ 2026-01-27; ข้อมูลปี 2025) — https://investgame.net/wp-content/uploads/2026/01/2026-01-27-2026-mobile-pc-benchmarks_compressed.pdf
2. GameDev Reports, GameAnalytics mobile and PC benchmarks (2026-06-04) — https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game
3. GameDev Reports, GameAnalytics mobile benchmarks (ข้อมูลปี 2024, 2025-02) — https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
4. Adjust, Gaming App Insights Report 2026 (PDF) — https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf ; สรุป: https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report
5. Game Growth Advisor, Mobile game KPIs benchmarks 2026 (2026-03-17) — https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/
6. Game Growth Advisor, Soft launch complete guide (2025-12-16) — https://gamegrowthadvisor.com/blog/2025-12-16-mobile-soft-launch-complete-guide/
7. Game Growth Advisor, Midcore mobile game strategy (2026-05-18, อัปเดต 2026-08-01) — https://gamegrowthadvisor.com/blog/2026-05-18-midcore-mobile-game-strategy-ua-monetization-2026/
8. Game Growth Advisor, UA CPI benchmarks 2026 (2026-03-17, อัปเดต 2026-08-15) — https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/
9. Game Growth Advisor, SEA gaming market entry guide (2026-08-27) — https://gamegrowthadvisor.com/blog/2026-08-27-sea-gaming-market-entry-guide-2026/
10. PocketGamer.biz, Why market benchmarks matter (Rockbite Games, 2024-07-24) — https://www.pocketgamer.biz/why-market-benchmarks-matter-how-to-work-with-analytics-at-launch
11. a16z, Mobile game soft launch (2023-10-17) — https://a16z.com/mobile-game-soft-launch/
12. Playio, Retention by game genre (2025-12-19, แก้ 2026-06-21) — https://blog.playio.co/retention-by-game-genre
13. Playio, ARPPU in mobile games (2026-08) — https://blog.playio.co/arppu-mobile-games
14. Playio, Mobile game onboarding and retention (2026-08-02) — https://blog.playio.co/mobile-game-onboarding-retention
15. Playio, Mobile game CPI benchmarks 2026 (2026-09-02) — https://blog.playio.co/mobile-game-cpi-benchmarks-2026
16. Admiral Media, Mobile game marketing benchmarks (ไม่ระบุวันที่) — https://admiral.media/mobile-game-marketing-benchmarks/
17. Chimera VC, Checkpoint 2: the web game (2025-08-04) — https://chimeravc.substack.com/p/chimera-checkpoint-2-the-web-game
18. InvestGame, Mobile retention benchmarks (2026-01-20) — https://investgame.net/wp-content/uploads/2026/01/2026-01-20-Mobile_retention_benchmarks_2026.pdf
19. Liftoff/GameRefinery, 2023 Midcore Gaming Apps Report (ข้อมูลถึง พ.ค. 2023) — https://content.liftoff.io/hubfs/2023/Reports/2023%20Midcore%20Gaming%20Apps%20Report/2023%20Midcore%20Gaming%20Apps%20Report%20-%20EN.pdf
20. GameDev Reports, Liftoff and Singular casual games (2025) — https://gamedevreports.substack.com/p/liftoff-and-singular-casual-games
21. GameAnalytics GameIntel (ยังไม่ได้เปิด) — https://gameanalytics.com/gameintel
22. Matej Lancaric, Soft Launch Bible 2025 (paywalled) — https://lancaric.substack.com/p/the-soft-launch-bible-full-2025-blueprint
23. Google Play Console Help, bad behavior thresholds — https://support.google.com/googleplay/android-developer/answer/9844486
24. PostHog pricing — https://posthog.com/pricing

**ตลาดไทย / SEA**

25. GameDev Reports (Sensor Tower), SEA mobile Q1 2025 (2025-06-13) — https://gamedevreports.substack.com/p/sensor-tower-southeast-asia-mobile
26. Sensor Tower, Southeast Asia mobile gaming 2025 — https://sensortower.com/blog/southeast-asia-mobile-gaming-2025
27. Foxdata, 2025 SEA mobile gaming market insight (2025-07-18, อัปเดต 2026-01-30) — https://foxdata.com/en/blogs/2025-southeast-asia-mobile-gaming-market-insight-report/
28. 42matters, Top grossing mobile games Thailand (snapshot 2025-02-16) — https://42matters.com/top-grossing-mobile-games-thailand
29. Allcorrect, The gaming market in Thailand 2026 (2026-06-09) — https://allcorrectgames.com/insights/the-gaming-market-in-thailand-2026/
30. Gamemeca, Seven Knights Re:BIRTH (2025-09-24) — https://www.gamemeca.com/en/view.php?gid=1766513
31. GlobeNewswire, Ragnarok Twilight SEA launch (2025-11-03) — https://www.globenewswire.com/news-release/2025/11/03/3178991/0/en/Ragnarok-Twilight-Has-Successfully-Launched-in-Southeast-Asia.html
32. SocialPeta, 2026 SEA mobile game marketing report (2026-09-01) — https://socialpeta.com/en/blog/2026-southeast-asia-mobile-game-marketing-report
33. Statista/Rakuten Insight, Thailand most popular online game genre (fieldwork 2025-01) — https://statista.com/statistics/1116832/thailand-most-popular-genre-of-online-games
34. GMO Research, Thailand mobile gaming (fieldwork 2025-10-09 ถึง 10-15; เผยแพร่ 2025-11-28) — https://gmo-research.ai/en/resources/studies/2025-report-moblie-gaming-th
35. Digital in Asia, Thailand gaming market (Kasikorn, Bangkok Post) — https://digitalinasia.com/thailand-gaming-market/
36. The Nation Thailand, depa gaming market 2024 (2025-09-02) — https://www.nationthailand.com/business/tech/40054880
37. Antom, Thailand gaming payment trends (2025-11-12) — https://knowledge.antom.com/thailand-gaming-payment-trends-report-unveiling-southeast-asias-second-largest-gaming-market
38. Marketeer Online (2024-08-15) — https://marketeeronline.co/archives/370401
39. GlobeNewswire, Niko Partners 2025 SEA Gamer Insights (2025-10-06) — https://rss.globenewswire.com/news-release/2025/10/06/3161508/28124/en/2025-Southeast-Asia-Gamer-Insights-Diving-into-3-131-Surveys-and-Market-Trends.html
40. PocketGamer.biz, Strategy surge as RPG revenue tumbles H1 2025 (หัวข้อเท่านั้น) — https://www.pocketgamer.biz/strategy-games-surge-as-rpg-revenue-tumbles-h1-2025s-top-genres-revealed

**KOL / UA / ช่องทาง**

41. Relevant Audience, Influencer marketing Thailand guide (2026-08-27) — https://www.relevantaudience.com/social-media-marketing/influencer-marketing-thailand-guide/
42. BaoLiba, Thailand Facebook blogger promotion fee standards (2025-04-09) — https://baoliba-in2.pages.dev/posts/thailand-facebook-blogger-promotion-fee-standards-2025-04-09
43. Awisee, Influencer marketing in Thailand (2025-04-22) — https://awisee.com/blog/influencer-marketing-in-thailand/
44. ContentGrip, Influencer marketing cost: global vs Asia (2026-04-28) — https://contentgrip.com/influencer-marketing-cost/
45. The Reporter Asia, Maxion "Kyrie & Terra" (2025-10-04) — https://thereporter.asia/eng/?p=3879
46. Techsauce, mobile games growth hacking (2016-08-01) — https://techsauce.co/en/tech-and-biz/case-study-mobile-games-growth-hacking
47. Adamigo, Meta Ads CPM and CPC by country 2026 (ไม่ระบุวันที่) — https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026
48. Stackmatix, TikTok ads cost by country 2026 (2026-09-06) — https://stackmatix.com/blog/tiktok-ads-cost-by-country-2026
49. Relevant Audience, Meta Q3 2026 ad price (2026-10-23) — https://www.relevantaudience.com/meta/meta-q3-2026-ad-price-impressions-asia-pacific/
50. Relevant Audience, LINE OpenChat Thailand 24M MAU (ข้อมูล 2026-09-30; รายงาน 2026-10-07/11) — https://www.relevantaudience.com/social-media-marketing/line-openchat-thailand-24-million-monthly-users-third-tab/
