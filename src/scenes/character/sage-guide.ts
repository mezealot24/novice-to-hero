import { COLORS, H, W } from "../../data/game-data";
import { activeJob3, JOB3 } from "../../data/jobs3";
import { heroStats, totalBase } from "../../data/meta";
import {
	doubleCastAt,
	doubleCastMul,
	KIT2,
	KIT3,
	magicPower,
	profOffMul,
	sageAutoChance,
	sageFireChance,
	sageIceChance,
	sageLightChance,
	sageRodGain,
} from "../../data/skill-math";
import { branchPts } from "../../data/tree";
import { save } from "../../save";
import { button, panel, txt, UI } from "../../ui";
import type { CharacterScene } from "../CharacterScene";
import { clipW } from "./node-detail";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Interactive Sage & Professor (Awakening) Playstyle & Elemental Reaction Guide Modal. */
export function sageGuideModal(scene: CharacterScene) {
	const tab = scene.showSageGuide ?? "sage";
	const close = () => {
		scene.showSageGuide = undefined;
		scene.render();
	};

	const c = scene.add.container(0, 0).setDepth(30000);
	scene.modal = c;

	const dim = scene.add
		.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.82)
		.setInteractive();
	dim.on("pointerup", close);

	const x = 60,
		y = 34,
		w = W - 120,
		h = H - 68;
	c.add([
		dim,
		panel(scene, x, y, w, h, 0x141834, COLORS.gold, 14),
		scene.add.zone(x, y, w, h).setOrigin(0).setInteractive(),
	]);

	// Header + Tabs + Close
	c.add(
		clipW(
			txt(
				scene,
				x + 20,
				y + 14,
				"📖 คู่มือเซจ & ปฏิกิริยาธาตุ (Sage / Professor)",
				20,
				UI.gold,
				true,
			),
			w - 380,
		),
	);

	c.add(
		button(
			scene,
			x + w - 252,
			y + 26,
			128,
			32,
			"📖 เซจ (ขั้น 2)",
			() => {
				scene.showSageGuide = "sage";
				scene.render();
			},
			{
				size: 12.5,
				fill: tab === "sage" ? COLORS.gold : 0x3b4269,
				color: tab === "sage" ? UI.ink : UI.text,
			},
		),
	);
	c.add(
		button(
			scene,
			x + w - 116,
			y + 26,
			128,
			32,
			"🎓 โปรเฟสเซอร์ (3)",
			() => {
				scene.showSageGuide = "professor";
				scene.render();
			},
			{
				size: 12.5,
				fill: tab === "professor" ? COLORS.gold : 0x3b4269,
				color: tab === "professor" ? UI.ink : UI.text,
			},
		),
	);
	c.add(
		button(scene, x + w - 24, y + 26, 34, 32, "✕", close, {
			size: 16,
			fill: 0x5a5f8a,
			color: UI.text,
		}),
	);

	const s = save();
	const st = heroStats(s);
	const base = totalBase(s);
	const t2 = s.job2Tree ?? {};
	const bodyY = y + 54;
	const colW = (w - 52) / 2;
	const leftX = x + 18;
	const rightX = leftX + colW + 16;

	if (tab === "sage") {
		renderSageTab(scene, c, leftX, rightX, bodyY, colW, h - 72, st, base, t2);
	} else {
		renderProfessorTab(
			scene,
			c,
			leftX,
			rightX,
			bodyY,
			colW,
			h - 72,
			s,
			st,
			t2,
		);
	}
}

function addCard(
	scene: CharacterScene,
	c: Phaser.GameObjects.Container,
	x: number,
	y: number,
	w: number,
	h: number,
	title: string,
	borderColor = UI.line,
) {
	c.add(panel(scene, x, y, w, h, 0x101326, borderColor, 10));
	c.add(clipW(txt(scene, x + 12, y + 9, title, 14, UI.gold, true), w - 24));
}

function renderSageTab(
	scene: CharacterScene,
	c: Phaser.GameObjects.Container,
	lx: number,
	rx: number,
	y: number,
	cw: number,
	ch: number,
	st: ReturnType<typeof heroStats>,
	base: ReturnType<typeof totalBase>,
	t2: Record<string, number>,
) {
	const S = KIT2.sage;
	const offMul = profOffMul(st);

	// Left Top: 3-step Combat Loop
	const loopH = 216;
	addCard(scene, c, lx, y, cw, loopH, "🔄 ลูปการเล่นเซจ (อ่านจบเล่นเป็นทันที)", COLORS.gold);
	const steps = [
		`1️⃣ ตีปกติ = ฟาด + ร่ายเวทฟรี\nทักษะ 1 "ศาสตราวุธธาตุ" เป็นติดตัว เมื่อตีปกติจะจ่าย Mana ${S.s1Cost} อัตโนมัติ ฟาดแรง +${pct(S.s1InfuseBonus)} และร่าย Auto Spell ฟรีทันที (ไม่เสียเทิร์น)`,
		`2️⃣ เลือกธาตุหลักตอนลงดัน = พลังเต็ม 100%\nเวทเสริมที่ตรงกับธาตุหลักจะติดบ่อยและแรง 100% ส่วนอีก 2 ธาตุยังช่วยเสริมได้ในระดับ ${pct(offMul)}`,
		`3️⃣ กด 🗡️ Endow + 🚫 Spell Breaker\nEndow เคลือบธาตุอาวุธ เพิ่มแรงตี/Auto/เวทเสริม +${pct(S.endowAmp)} · Ult ใช้ลบบัฟมอน + ขัดบอสชาร์จ + ขโมย Mana ${S.ultMana + st.j2UltMana}`,
	];
	let sy = y + 34;
	for (const step of steps) {
		const t = txt(scene, lx + 12, sy, step, 11.5, UI.text)
			.setWordWrapWidth(cw - 24, true)
			.setLineSpacing(2);
		c.add(t);
		sy += t.height + 8;
	}

	// Left Bottom: Live Sage Numbers
	const statY = y + loopH + 10;
	const statH = ch - loopH - 10;
	addCard(scene, c, lx, statY, cw, statH, "📊 ค่าพลังเซจของคุณตอนนี้");
	const autoCh = pct(sageAutoChance(st, base.int, false));
	const fireCh = st.j2FirePerk > 0 ? pct(sageFireChance(st, base.int, "fire", false)) : "ยังไม่เรียน";
	const lightCh = st.j2LightPerk > 0 ? pct(sageLightChance(st, base.int, "lightning", false)) : "ยังไม่เรียน";
	const iceCh = st.j2IcePerk > 0 ? pct(sageIceChance(st, "ice", false)) : "ยังไม่เรียน";
	const rod = st.j2MagicRod > 0 ? sageRodGain(st, base.vit) : { mana: 0, shield: 0 };

	const statLines: [string, string][] = [
		["📖 โอกาส Auto Spell (ไม่รวม Endow)", `${autoCh} · ยิง ${1 + st.j2AutoBolts} ลูก`],
		["🔥 Fire Bolt on Hit (ถ้าเลือกธาตุไฟ)", fireCh],
		["⚡ Chain Lightning (ถ้าเลือกธาตุสายฟ้า)", lightCh],
		["❄️ Permafrost (ถ้าเลือกธาตุน้ำแข็ง)", iceCh],
		["🔮 Magic Rod (เมื่อโดนเวท)", st.j2MagicRod > 0 ? `Mana +${rod.mana} · โล่ ${rod.shield}` : "ยังไม่เรียน"],
		["🎯 คริเวท / คริสกิล / ตัวคูณคริเสริม", `${pct(st.spellCrit)} / ${pct(st.skillCrit)} / +${pct(st.procCritMul)}`],
	];
	statLines.forEach(([k, v], i) => {
		const ry = statY + 36 + i * 26;
		c.add(clipW(txt(scene, lx + 12, ry, k, 11.5, "#b8c0e8"), cw * 0.56));
		c.add(clipW(txt(scene, lx + cw - 12, ry, v, 11.5, UI.green, true).setOrigin(1, 0), cw * 0.42));
	});

	// Right: 5 Branch Summary with live points
	addCard(scene, c, rx, y, cw, ch, "🌟 สรุป 5 สายใยขั้น 2 (แต้มที่ลงตอนนี้)");
	const branches: { id: string; icon: string; name: string; desc: string }[] = [
		{
			id: "sg_a",
			icon: "📖",
			name: "Auto Spell & คริเวท",
			desc: "เพิ่มโอกาส Auto Spell + ดาเมจคริเวทเสริม · ★ Hindsight ทำให้ร่ายติดได้ทั้งตอนคอมโบและสวนกลับ",
		},
		{
			id: "sg_f",
			icon: "🔥",
			name: "Fire Bolt ×hit (คอมโบไฟ)",
			desc: `ตีโดนมีโอกาสยิง Fire Bolt ซ้ำสูงสุด ${S.perk.fireMaxBolts} ลูก + เผา · ★ Inferno Overdrive ยิงครบ ${S.perk.fireMaxBolts} ลูกใน 1 เทิร์นระเบิดไฟหมู่`,
		},
		{
			id: "sg_l",
			icon: "⚡",
			name: "Chain Lightning (สายฟ้าชิ่ง)",
			desc: "ตีโดนปล่อยสายฟ้าชิ่ง 2–3 เป้า + มึน (เหลือศัตรู 1 ตัว = แรง ×4!) · ★ Overload Tempest ฟื้น Mana & ดาเมจ %HP",
		},
		{
			id: "sg_i",
			icon: "❄️",
			name: "Permafrost (แช่แข็ง)",
			desc: `ตีโดนสะสมน้ำแข็งครบ ${S.perk.iceMax} ขั้นแล้วแตกแช่แข็ง + บวกคริ · ★ Absolute Permafrost แตกใส่ทุกตัวคริ 100%`,
		},
		{
			id: "sg_r",
			icon: "🛡️",
			name: "Magic Rod & กายปราชญ์",
			desc: "โดนเวทแล้วดูดเป็น Mana + โล่เวท พร้อมเพิ่ม HP/ATK/MATK · ★ ดูดเวทแรกของเวฟฟรีและสวนกลับทันที",
		},
	];
	let by = y + 36;
	for (const br of branches) {
		const pts = branchPts(t2, br.id);
		const boxH = 74;
		c.add(panel(scene, rx + 10, by, cw - 20, boxH, 0x171c36, pts > 0 ? COLORS.gold : 0x2e3558, 8));
		c.add(
			clipW(
				txt(scene, rx + 20, by + 7, `${br.icon} ${br.name}`, 12.5, pts > 0 ? UI.gold : UI.text, true),
				cw - 115,
			),
		);
		c.add(
			txt(
				scene,
				rx + cw - 20,
				by + 7,
				`${pts} แต้ม`,
				11.5,
				pts > 0 ? UI.green : UI.sub,
				true,
			).setOrigin(1, 0),
		);
		c.add(
			txt(scene, rx + 20, by + 26, br.desc, 10.5, "#d4d8f0")
				.setWordWrapWidth(cw - 40, true)
				.setLineSpacing(2),
		);
		by += boxH + 8;
	}
}

function renderProfessorTab(
	scene: CharacterScene,
	c: Phaser.GameObjects.Container,
	lx: number,
	rx: number,
	y: number,
	cw: number,
	ch: number,
	s: ReturnType<typeof save>,
	st: ReturnType<typeof heroStats>,
	t2: Record<string, number>,
) {
	const P = KIT3.professor;
	const pm = magicPower(st);
	const isProf = activeJob3(s) === "professor";
	const vKey = s.job3Var ?? "a";
	const vDef = JOB3.professor.variants[vKey];

	// Left: Element Marks + 3 Reactions
	addCard(scene, c, lx, y, cw, ch, "⚗️ ระบบตราธาตุ & 3 ปฏิกิริยาธาตุ", COLORS.gold);
	const intro = txt(
		scene,
		lx + 12,
		y + 34,
		"เมื่อเวทธาตุ 🔥 / ⚡ / ❄️ โดนมอน จะแปะ 🏷️ ตราธาตุ ค้างไว้ 2 เทิร์น — พออีกธาตุมาชนจะเกิด ปฏิกิริยาธาตุ ทันที!",
		11.5,
		UI.text,
	)
		.setWordWrapWidth(cw - 24, true)
		.setLineSpacing(2);
	c.add(intro);

	const reactions: { title: string; color: string; desc: string }[] = [
		{
			title: "♨️ Vaporize / ระเหย (🔥 + ❄️)",
			color: "#ffb884",
			desc: `ระเบิดเป้าหมายเดียวแรง ${P.vapMul}x พลังเวท (~${Math.round(pm * P.vapMul)} ดาเมจ)\nถ้ามอนถูกแช่แข็งอยู่ จะแรงขึ้นอีก ×${P.vapFrozen} (~${Math.round(pm * P.vapMul * P.vapFrozen)}) แล้วล้างแช่แข็ง`,
		},
		{
			title: "💥 Overload / โอเวอร์โหลด (🔥 + ⚡)",
			color: "#ff8fb1",
			desc: `ระเบิดหมู่โดนมอนทุกตัว ${P.ovlMul}x พลังเวท (~${Math.round(pm * P.ovlMul)}/ตัว)\nพร้อม ทำลายเกราะ ${P.ovlBreak} เทิร์น`,
		},
		{
			title: "🧲 Superconduct / ซูเปอร์คอนดักต์ (⚡ + ❄️)",
			color: "#8ce0ff",
			desc: `ฟาดเป้าหมาย ${P.supMul}x พลังเวท (~${Math.round(pm * P.supMul)}) + ลด DEF/M.DEF ${pct(P.supShred)} นาน ${P.supTurns} เทิร์น\nและ ดันเกจบอส -${P.supPush}`,
		},
	];
	let ry = y + 38 + intro.height + 10;
	for (const r of reactions) {
		const boxH = 88;
		c.add(panel(scene, lx + 10, ry, cw - 20, boxH, 0x171c36, 0x3b4470, 8));
		c.add(clipW(txt(scene, lx + 20, ry + 8, r.title, 13, r.color, true), cw - 40));
		c.add(
			txt(scene, lx + 20, ry + 29, r.desc, 11, UI.text)
				.setWordWrapWidth(cw - 40, true)
				.setLineSpacing(2.5),
		);
		ry += boxH + 10;
	}

	// Right Top: Double Casting & Variant
	const topH = 176;
	addCard(scene, c, rx, y, cw, topH, "🎓 Double Casting & แบบทักษะ 3");
	const dcThresh = pct(doubleCastAt(st));
	const dcPower = pct(doubleCastMul(st));
	const dcLines = [
		`• ธาตุรองแรงขึ้น: ${pct(KIT2.sage.perk.offMul)} → ${pct(P.offMulJ3)}`,
		`• Double Casting: เมื่อ Mana ≥ ${dcThresh} การเกิดปฏิกิริยาจะจ่าย Mana ${P.dcCost} เพื่อยิงซ้ำแรง ${dcPower}`,
		`• แบบทักษะ 3 ${isProf ? "(ใช้อยู่)" : "(เลือกได้หลังตื่นรู้)"}: ${vDef.icon} ${vDef.name}`,
		`  ${vDef.desc}`,
	];
	c.add(
		txt(scene, rx + 12, y + 34, dcLines.join("\n"), 11, UI.text)
			.setWordWrapWidth(cw - 24, true)
			.setLineSpacing(3),
	);

	// Right Bottom: Legacy (⚔️ ตำนาน) Live Points Breakdown
	const legY = y + topH + 10;
	const legH = ch - topH - 10;
	addCard(scene, c, rx, legY, cw, legH, "⚔️ สายตำนาน: โบนัสจากแต้มขั้น 2 ของคุณ");
	const fPts = branchPts(t2, "sg_f");
	const lPts = branchPts(t2, "sg_l");
	const iPts = branchPts(t2, "sg_i");
	const aPts = branchPts(t2, "sg_a");

	const legRows: [string, string, boolean][] = [
		[
			`🔥 Fire Bolt (${fPts} แต้ม)`,
			`เผา +${Math.floor(fPts / P.legFireStep)} (ทุก ${P.legFireStep} แต้ม, ตันที่ Lv ตำราเพลิง)`,
			fPts >= P.legFireStep,
		],
		[
			`⚡ Chain Lightning (${lPts} แต้ม)`,
			`ชิ่ง +${Math.floor(lPts / P.legLightStep)} เป้า (ทุก ${P.legLightStep} แต้ม, ตันที่ Lv ตำราอัสนี)`,
			lPts >= P.legLightStep,
		],
		[
			`❄️ Permafrost (${iPts} แต้ม)`,
			`ซ้อน +${Math.floor(iPts / P.legIceStep)} ขั้น (ทุก ${P.legIceStep} แต้ม, ตันที่ Lv ตำราเยือกแข็ง)`,
			iPts >= P.legIceStep,
		],
		[
			`📖 Auto Spell (${aPts} แต้ม)`,
			`ใช้กับ 👊 Spell Fist (ต้อง ≥ ${P.heirNeed} แต้มสำหรับ ★ สืบสาน)`,
			aPts >= P.heirNeed,
		],
	];
	let ly = legY + 36;
	for (const [label, val, active] of legRows) {
		c.add(clipW(txt(scene, rx + 12, ly, label, 11.5, active ? UI.gold : "#b8c0e8", true), cw - 24));
		c.add(clipW(txt(scene, rx + 20, ly + 16, val, 10.5, active ? UI.green : UI.sub), cw - 32));
		ly += 38;
	}
}
