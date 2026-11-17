import Phaser from "phaser";
import { COLORS, H, W } from "../../data/game-data";
import {
	canSpendInTier,
	persist,
	save,
	spendPointInTier,
} from "../../save";
import {
	lockReason3,
	BRANCHES,
	lockReason,
	nodeTierOf,
	nodeById,
	type TreeNode,
} from "../../data/tree";
import { JOBS } from "../../data/jobs";
import { JOB2, job2Of, PETS, type Job2Id, type PetId } from "../../data/jobs2";
import { activeJob3, job3Of } from "../../data/jobs3";
import { heroStats, totalBase } from "../../data/meta";
import { PET_DOSSIER_I18N } from "../../data/pet-dossier";
import {
	BM_STANCE,
	KIT2,
	KIT3,
	SAGE_S1,
	boarCutOf,
	boarRageKOf,
	boarRecoverTurnsOf,
	boarShareOf,
	falconPower,
	frenzyCapOf,
	hawkBlitzMul,
	hawkChance,
	preyMarkOf,
	preyTurnsOf,
} from "../../data/skill-math";
import {
	button,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import type { CharacterScene } from "../CharacterScene";
import { nodeDetail, clipW } from "./node-detail";

/** Evaluates the currently selected node across Tier 1, 2, or 3 and renders the bottom action drawer + downward point spending. */
export function renderSelectedNodeFooter(scene: CharacterScene) {
	scene.footerC?.destroy();
	const fc = scene.add.container(0, 0);
	scene.footerC = fc;
	scene.body!.add(fc);

	const s = save();
	if (scene.selPet && s.job2 === "beastmaster") {
		renderPetDossier(scene, fc, scene.selPet);
		return;
	}
	const n = nodeById(scene.selNode) ?? nodeById(`${s.job}_s1p`)!;
	const tier = nodeTierOf(n);
	const j2Options = job2Of(s.job);
	const activeJ2Id: Job2Id =
		s.job2 ?? j2Options[scene.previewJob2Idx % j2Options.length].id;
	const j2 = JOB2[activeJ2Id];
	const j3Def = job3Of(activeJ2Id);
	const isJ3Active = !!activeJob3(s) && activeJob3(s) === j3Def?.id;
	const path = s.job3Path ?? "pure";

	const tMap =
		tier === 3
			? (s.job3Tree ??= {})
			: tier === 2
				? (s.job2Tree ??= {})
				: (s.jobTree ??= {});
	const lv = tMap[n.id] ?? 0;
	let why = "";
	if (tier === 1) why = lockReason(tMap, s.job, n);
	else if (tier === 2)
		why = s.job2
			? lockReason(tMap, s.job, n, j2.id)
			: `ปลดล็อกเมื่อเปลี่ยนอาชีพเป็น ${j2.name}`;
	else
		why =
			isJ3Active && j3Def
				? lockReason3(tMap, s.job, n, j3Def.id, path)
				: `ปลดล็อกเมื่อตื่นรู้เป็น ${j3Def?.name ?? "ขั้น 3"}`;

	const spendInfo = canSpendInTier(s, tier);
	const can = spendInfo.can && !why;

	const s3 = n.branch.endsWith("_s3");
	const root2 =
		tier === 2 && n.kind === "pow2" ? (s3 ? j2.skill3 : j2.ult) : undefined;
	const tag =
		tier === 1
			? n.kind === "s2root"
				? "ทักษะ 2 · ขั้น 1"
				: "ขั้น 1"
			: tier === 2
				? n.kind === "pow2"
					? s3
						? "ทักษะ 3 · ขั้น 2"
						: "Ult วิวัฒน์ · ขั้น 2"
					: n.tier === 4
						? "★ ปลายสาย · ขั้น 2"
						: "ขั้น 2"
				: n.kind === "pow3"
					? "Ult วิวัฒน์ 2 · ขั้น 3"
					: n.tier === 4
						? "★ ปลายสาย · ขั้น 3"
						: "ขั้น 3";

	const isUltNode =
		n.branch.endsWith("_ult") ||
		n.branch.endsWith("_u2") ||
		n.branch.endsWith("_u3") ||
		BRANCHES.find((b) => b.id === n.branch)?.line === "ult";
	// tier-1 roots (ทักษะ 1 / Ult): show what the base skill actually does (e.g. Cleric's heal OR smite 2 front)
	const isSageS1 = s.job2 === "sage" && n.branch.endsWith("_s1") && n.kind === "pow";
	const sk1 =
		tier === 1 && n.kind === "pow"
			? n.branch.endsWith("_s1")
				? isSageS1
					? {
							icon: SAGE_S1.icon,
							name: `${SAGE_S1.name} (ติดตัว)`,
							desc: `ตีปกติ + คอมโบได้ทุกเทิร์น (ไม่แย่ง Auto Attack) · ถ้ามี Mana ≥ ${KIT2.sage.s1Cost} จะจ่ายอัตโนมัติเพื่อเสริมแรงตี +${Math.round(KIT2.sage.s1InfuseBonus * 100)}% และกระตุ้น Auto Spell + On-Hit Perk ทันที`,
						}
					: JOBS[s.job].auto
				: JOBS[s.job].ult
			: undefined;
	const displayNode = isSageS1 ? { ...n, icon: SAGE_S1.icon, name: `${SAGE_S1.name} (ติดตัว)` } : n;
	const isSageS3 = n.branch === "sage_s3";
	const rootDesc = sk1
		? `${sk1.icon} ${sk1.name}: ${sk1.desc}`
		: tier === 3 && n.kind === "pow3" && j3Def
			? `✨ ${j3Def.ultName}: ${j3Def.ultDesc} (รวมผล Ult ขั้น 1+2 ทั้งหมด)`
			: root2
				? `${root2.icon} ${root2.name}: ${root2.desc}${!s3 ? " (รวมผล Ult ขั้น 1 ทั้งหมด)" : ""}`
				: isSageS3
					? `${j2.skill3.icon} ${j2.skill3.name}: ${j2.skill3.desc}`
					: isUltNode
						? "🔥 สาย Ultimate: ส่งผลสะสมต่อเนื่องตั้งแต่คลาส 1 ถึงคลาสปัจจุบัน"
						: "";

	const tier2Arg: boolean | 3 = tier === 3 ? 3 : tier === 2;
	const btnLabel = !lv
		? spendInfo.borrowed
			? `เรียน (ขั้น${spendInfo.fromTier})`
			: "เรียน"
		: spendInfo.borrowed
			? `+1 (ขั้น${spendInfo.fromTier})`
			: "+1";

	nodeFooter(
		scene,
		displayNode,
		lv,
		why,
		tag,
		rootDesc,
		can,
		() => {
			const check = canSpendInTier(s, tier);
			if (!check.can) return;
			const curWhy =
				tier === 1
					? lockReason(tMap, s.job, n)
					: tier === 2
						? lockReason(tMap, s.job, n, j2.id)
						: j3Def
							? lockReason3(tMap, s.job, n, j3Def.id, path)
							: "ล็อก";
			if (curWhy) return;
			const usedTier = spendPointInTier(s, tier);
			if (!usedTier) return;
			tMap[n.id] = (tMap[n.id] ?? 0) + 1;
			persist();
			if (usedTier > tier) {
				toast(
					scene,
					`✨ ใช้แต้มขั้น ${usedTier} อัป "${n.name}" (โบนัสข้ามชั้น +1.5%!)`,
					"#d7bfff",
				);
			}
			scene.redraw();
		},
		tier2Arg,
		btnLabel,
		spendInfo.borrowed,
	);
}

/** Left panel of the unified skill web: picked node (name, Lv bar, now / next / lock) + 📋 detail modal + learn. */
export function nodeFooter(
	scene: CharacterScene,
	n: TreeNode,
	lv: number,
	why: string | null | undefined,
	tag: string,
	rootDesc: string,
	can: boolean,
	learn: () => void,
	tier2: boolean | 3,
	btnLabel = lv ? "+1" : "เรียน",
	borrowed = false,
) {
	const b = scene.footerC ?? scene.body!,
		locked = !!why && why !== "เต็มแล้ว",
		isMax = lv >= n.max;
	const x = 28,
		w = 274,
		top = 132,
		btnY = 528;

	const isSageOrProf =
		n.id.startsWith("sg_") ||
		n.id.startsWith("pf_") ||
		n.branch.startsWith("sage_");
	// name + tier tag + level bar
	b.add(clipW(txt(scene, x, top, `${n.icon} ${n.name}`, 17, UI.gold, true), w));
	b.add(
		clipW(
			txt(scene, x, top + 24, `Lv ${lv}/${n.max}${tag ? ` · ${tag}` : ""}`, 11.5, UI.sub, true),
			isSageOrProf ? w - 84 : w,
		),
	);
	if (isSageOrProf) {
		b.add(
			button(
				scene,
				x + w - 40,
				top + 30,
				78,
				20,
				n.id.startsWith("pf_") ? "⚗️ คู่มือธาตุ" : "📖 คู่มือเซจ",
				() => {
					scene.showSageGuide = n.id.startsWith("pf_") ? "professor" : "sage";
					scene.render();
				},
				{ size: 10, fill: 0x3b667d, color: UI.text },
			),
		);
	}
	const bar = scene.add.graphics();
	bar.fillStyle(0x0f1220, 1).fillRoundedRect(x, top + 44, w, 7, 3);
	if (lv > 0)
		bar
			.fillStyle(isMax ? COLORS.gold : 0x4a8cd4, 1)
			.fillRoundedRect(x, top + 44, Math.max(7, (w * lv) / n.max), 7, 3);
	b.add(bar);

	// sections (shrink-to-fit above the buttons)
	const secs: { head: string; body: string; color: string }[] = [];
	if (rootDesc) secs.push({ head: "📖 ตัวสกิล", body: rootDesc, color: UI.text });
	secs.push(
		lv
			? { head: `✅ ตอนนี้ (Lv ${lv})`, body: n.desc(lv), color: UI.text }
			: { head: "⬆️ Lv 1", body: n.desc(1), color: UI.green },
	);
	if (lv && !isMax)
		secs.push({
			head: `⬆️ ถัดไป (Lv ${lv + 1})${borrowed ? " · ⚡ใช้แต้มคลาสสูง" : ""}`,
			body: n.desc(lv + 1),
			color: borrowed ? "#d7bfff" : UI.green,
		});
	if (isMax) secs.push({ head: "✅ เต็มแล้ว", body: "", color: UI.green });
	if (locked) secs.push({ head: "🔒 ยังเรียนไม่ได้", body: why ?? "", color: "#ffb0b0" });

	// 🔢 real numbers: what the next point changes (or, when maxed / nothing changes, the current totals)
	const rows = nodeDetail(save(), n, tier2).rows.filter(
		(r) => !r.section && r.label !== "ใช้",
	);
	const changed = rows.filter((r) => r.next !== undefined && r.next !== r.now);
	const show = (changed.length ? changed : rows).slice(0, 3);
	const numH = show.length ? 22 + show.length * 34 : 0;
	const numTop = btnY - 26 - numH;
	if (show.length) {
		const bg = scene.add.graphics();
		bg.fillStyle(0x0d1020, 0.75).fillRoundedRect(x - 4, numTop - 2, w + 8, numH, 6);
		b.add(bg);
		b.add(
			txt(
				scene,
				x + 2,
				numTop + 2,
				changed.length && lv < n.max
					? `🔢 ผลรวมตอนนี้ → Lv ${lv + 1}`
					: "🔢 ผลรวมตอนนี้",
				11.5,
				UI.gold,
				true,
			),
		);
		show.forEach((r, i) => {
			const ry = numTop + 22 + i * 34;
			b.add(clipW(txt(scene, x + 2, ry, r.label, 10.5, "#b8c0e8"), w - 4));
			const nowT = clipW(txt(scene, x + 2, ry + 14, r.now, 12.5, UI.text, true), w - 4);
			b.add(nowT);
			if (changed.length && r.next !== undefined && r.next !== r.now) {
				const nx = x + 2 + nowT.width + 6;
				b.add(
					clipW(
						txt(scene, nx, ry + 14, `→ ${r.next}`, 12.5, UI.green, true),
						Math.max(20, x + w - nx),
					),
				);
			}
		});
	}

	let size = 13,
		made: Phaser.GameObjects.Text[] = [];
	for (; ; size -= 0.5) {
		made.forEach((m) => m.destroy());
		made = [];
		let ty = top + 62;
		for (const sc of secs) {
			const hd = txt(scene, x, ty, sc.head, size, UI.gold, true);
			ty += hd.height + 1;
			made.push(hd);
			if (sc.body) {
				const bd = txt(scene, x, ty, sc.body, size - 0.5, sc.color)
					.setWordWrapWidth(w, true)
					.setLineSpacing(2);
				ty += bd.height;
				made.push(bd);
			}
			ty += 8;
		}
		if (ty <= numTop - 6 || size <= 9.5) break;
	}
	b.add(made);

	b.add(
		button(
			scene,
			x + 62,
			btnY,
			124,
			40,
			"📋 ตัวเลขจริง",
			() => {
				scene.showDetail = true;
				scene.render();
			},
			{ size: 12.5, fill: 0x474c72, color: UI.text },
		),
	);
	b.add(
		button(scene, x + w - 70, btnY, 140, 40, btnLabel, learn, {
			size: borrowed ? 12.5 : 15,
			fill: borrowed ? 0x7b5ce6 : COLORS.gold,
			color: borrowed ? "#ffffff" : UI.ink,
		}).setEnabled(can),
	);
	if (scene.showDetail)
		nodeModal(scene, n, lv, why, tag, rootDesc, can, learn, tier2, btnLabel);
}

/** Live derived metrics for the Beastmaster Pet Partner Dossier numbers box (reads heroStats with the target pet active). */
function petDossierNumRows(
	s: ReturnType<typeof save>,
	pet: PetId,
): { label: string; value: string }[] {
	const sim = { ...s, pet };
	const stPet = heroStats(sim);
	const basePet = totalBase(sim);
	const B = KIT2.beastmaster;
	const packScale =
		B.packPow *
		(1 + stPet.j2PetPow) *
		(stPet.j2Pack3 > 0 ? 1 + B.tree.pack3Pow : 1);

	if (pet === "hawk") {
		const chance = hawkChance(stPet, basePet.luk);
		const cap =
			B.hawkCap +
			stPet.j2HawkCapAdd +
			(stPet.j3Rn > 0 ? KIT3.ranger.hawkCapAdd : 0);
		const blitzDmg = Math.round(
			falconPower(stPet, basePet.int, basePet.dex) *
				hawkBlitzMul(stPet) *
				packScale,
		);
		return [
			{
				label: `โอกาสโฉบ Blitz (LUK ${basePet.luk})`,
				value: `${(chance * 100).toFixed(1)}% (เพดาน ${Math.round(cap * 100)}%)`,
			},
			{
				label: "พลังโฉบ/ฮิต (INT+M.ATK True)",
				value: `${blitzDmg} · 🏷️ Mark +${Math.round(preyMarkOf(stPet) * 100)}% (${preyTurnsOf(stPet)} เทิร์น)`,
			},
			{
				label: "สถิตเหยี่ยว (HIT / คริ)",
				value: `HIT ${Math.round(stPet.hit)} · คริ ${(stPet.crit * 100).toFixed(1)}%`,
			},
		];
	}

	if (pet === "boar") {
		const boarHpPct =
			B.boarHp + stPet.j2BoarHp + (stPet.j2BoarEvo > 0 ? B.boarEvoHp : 0);
		const boarHp = Math.round(stPet.maxHp * boarHpPct);
		return [
			{
				label: `HP หมูป่า (${Math.round(boarHpPct * 100)}% HP ฮีโร่)`,
				value: `${boarHp} · รับแทน ${Math.round(boarShareOf(stPet) * 100)}% (−${Math.round(boarCutOf(stPet) * 100)}%)`,
			},
			{
				label: "แรงฮึด Grit / ฟื้นสลบ",
				value: `×${Math.round(boarRageKOf(stPet))} · ฟื้น ${boarRecoverTurnsOf(stPet)} เทิร์น`,
			},
			{
				label: "สถิตหมูป่า (P.DEF / โล่แรง)",
				value: `DEF ${Math.round(stPet.def)} · โล่ +${Math.round(stPet.shieldAmp * 100)}%`,
			},
		];
	}

	const wolfAtkMul =
		(B.wolfMul + stPet.j2WolfMul + (stPet.j2WolfEvo > 0 ? B.wolfEvoMul : 0)) *
		packScale;
	const wolfHit = Math.round(stPet.atk * wolfAtkMul);
	return [
		{
			label: `กัดต่อฮิต (${Math.round(wolfAtkMul * 100)}% P.ATK)`,
			value: `${wolfHit} (P.ATK ${Math.round(stPet.atk)})`,
		},
		{
			label: "เลือดไหล Bleed / คลั่ง Frenzy",
			value: `+${B.wolfBleed + stPet.j2WolfBleed} ชั้น · สูงสุด ${frenzyCapOf(stPet)} ชั้น`,
		},
		{
			label: `สถิตหมาป่า (ดูดเลือด Bleed ≥${BM_STANCE.wolf.woundMinStacks})`,
			value: `${Math.round(BM_STANCE.wolf.woundLeech * 100)}% · เร็วฝูง +${Math.round(stPet.j2WolfSpeed * 100)}%`,
		},
	];
}

/** Equips a Beastmaster partner pet, saves, shows confirmation toast, and redraws CharacterScene. */
export function equipPetPartner(scene: CharacterScene, pet: PetId) {
	const s = save();
	if ((s.pet ?? "hawk") === pet) return;
	s.pet = pet;
	persist();
	scene.selPet = pet;
	const petDef = PETS[pet];
	const entry = PET_DOSSIER_I18N[pet];
	toast(
		scene,
		`🏹 สถิตคู่หูพราน: ${petDef.icon} ${petDef.name} (${entry.stanceName})\nสัตว์ทั้ง 3 ตัวร่วมสู้ทุกเวฟเสมอ`,
	);
	scene.redraw();
}

/** Left sidebar Pet Partner Dossier card: header, active/inactive badge, Partner Stance, bm_s4 crit reaction, live numbers, and confirm button. */
export function renderPetDossier(
	scene: CharacterScene,
	fc: Phaser.GameObjects.Container,
	pet: PetId,
) {
	const s = save();
	const entry = PET_DOSSIER_I18N[pet];
	const petDef = PETS[pet];
	const isActive = (s.pet ?? "hawk") === pet;
	const hasS4 = (s.job2Tree?.bm_s4 ?? 0) > 0;
	const evoNode = pet === "hawk" ? "bm_h4" : pet === "boar" ? "bm_b4" : "bm_w4";
	const evo = (s.job2Tree?.[evoNode] ?? 0) > 0;
	const x = 28,
		w = 274,
		top = 132,
		btnY = 528;

	// Header: partner name (with evo title if ★ unlocked), title, roleTag, and active/inactive badge
	const headerTitle = evo ? `${entry.name} (${petDef.evo})` : entry.name;
	fc.add(
		clipW(
			txt(scene, x, top, `${headerTitle} · ${entry.title}`, 15.5, UI.gold, true),
			w,
		),
	);
	fc.add(clipW(txt(scene, x, top + 21, entry.roleTag, 10.5, "#b8c0e8"), w));

	const badgeG = scene.add.graphics();
	badgeG
		.fillStyle(isActive ? 0x1b3a28 : 0x1e2544, 0.95)
		.fillRoundedRect(x - 2, top + 38, w + 4, 20, 5);
	badgeG
		.lineStyle(1, isActive ? 0x6fd08c : 0x4a5a8a, 0.9)
		.strokeRoundedRect(x - 2, top + 38, w + 4, 20, 5);
	fc.add(badgeG);
	fc.add(
		clipW(
			txt(
				scene,
				x + 6,
				top + 41,
				isActive ? entry.activeBadge : entry.inactiveBadge,
				10.5,
				isActive ? UI.green : "#ffd984",
				true,
			),
			w - 10,
		),
	);

	// Dynamic numbers box above bottom buttons (respects numTop = btnY - 26 - numH)
	const show = petDossierNumRows(s, pet).slice(0, 3);
	const numH = show.length ? 22 + show.length * 34 : 0;
	const numTop = btnY - 26 - numH;
	if (show.length) {
		const bg = scene.add.graphics();
		bg.fillStyle(0x0d1020, 0.75).fillRoundedRect(x - 4, numTop - 2, w + 8, numH, 6);
		fc.add(bg);
		fc.add(
			txt(
				scene,
				x + 2,
				numTop + 2,
				isActive ? "🔢 ค่าพลังคู่หูตอนนี้" : "🔢 ค่าพลังถ้าตั้งเป็นคู่หู",
				11.5,
				isActive ? UI.gold : UI.green,
				true,
			),
		);
		show.forEach((r, i) => {
			const ry = numTop + 22 + i * 34;
			fc.add(clipW(txt(scene, x + 2, ry, r.label, 10.5, "#b8c0e8"), w - 4));
			fc.add(
				clipW(
					txt(
						scene,
						x + 2,
						ry + 14,
						r.value,
						12,
						isActive ? UI.text : UI.green,
						true,
					),
					w - 4,
				),
			);
		});
	}

	// Auto-shrinking dossier body above the numbers box
	const secs: { head: string; body: string; color: string }[] = [
		{
			head: entry.stanceName,
			body: entry.stanceDesc,
			color: isActive ? UI.text : UI.green,
		},
		{
			head: `⚡ เคาน์เตอร์คริ (★ พรานแห่งป่า · ${hasS4 ? "✅ เปิดใช้" : "🔒 ยังไม่เรียน"})`,
			body: entry.critReaction,
			color: hasS4 ? UI.text : UI.sub,
		},
		{
			head: "🐾 บทบาทในฝูง (สู้ครบ 3 ตัวทุกเวฟ)",
			body: entry.packContribution,
			color: "#d8d4f0",
		},
	];
	let size = 12.5,
		made: Phaser.GameObjects.Text[] = [];
	for (; ; size -= 0.5) {
		made.forEach((m) => m.destroy());
		made = [];
		let ty = top + 64;
		for (const sc of secs) {
			const hd = txt(scene, x, ty, sc.head, size, UI.gold, true)
				.setWordWrapWidth(w, true)
				.setLineSpacing(2);
			ty += hd.height + 1;
			made.push(hd);
			if (sc.body) {
				const bd = txt(
					scene,
					x,
					ty,
					sc.body,
					Math.max(8.5, size - 0.5),
					sc.color,
				)
					.setWordWrapWidth(w, true)
					.setLineSpacing(2);
				ty += bd.height;
				made.push(bd);
			}
			ty += 6;
		}
		if (ty <= numTop - 6 || size <= 9) break;
	}
	fc.add(made);

	// Bottom action buttons: return to skill node OR confirm/equip partner
	fc.add(
		button(
			scene,
			x + 62,
			btnY,
			124,
			40,
			"← กลับดูสกิล",
			() => {
				scene.selPet = undefined;
				scene.render();
			},
			{ size: 12.5, fill: 0x474c72, color: UI.text },
		),
	);
	fc.add(
		button(
			scene,
			x + w - 70,
			btnY,
			140,
			40,
			isActive ? "✅ ประจำการอยู่" : "🏹 ตั้งเป็นคู่หู",
			() => equipPetPartner(scene, pet),
			{
				size: isActive ? 13 : 14.5,
				fill: COLORS.gold,
				color: UI.ink,
			},
		).setEnabled(!isActive),
	);
}

/** Node detail modal (all 3 tiers): full text now / next level + Cumulative Ult evolution + real numbers (nodeDetail). */
export function nodeModal(
	scene: CharacterScene,
	n: TreeNode,
	lv: number,
	why: string | null | undefined,
	tag: string,
	rootDesc: string,
	can: boolean,
	learn: () => void,
	tier2: boolean | 3,
	btnLabel = lv ? "+1 แต้ม" : "เรียน",
) {
	const s = save();
	const d = nodeDetail(s, n, tier2);
	const close = () => {
		scene.showDetail = false;
		scene.render();
	};
	const c = scene.add.container(0, 0).setDepth(30000);
	scene.modal = c;
	const dim = scene.add
		.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.8)
		.setInteractive();
	dim.on("pointerup", close);
	const x = 70,
		y = 40,
		w = W - 140,
		h = H - 80;
	c.add([
		dim,
		panel(scene, x, y, w, h, 0x141834, COLORS.gold, 14),
		scene.add.zone(x, y, w, h).setOrigin(0).setInteractive(),
	]);
	c.add(
		clipW(
			txt(scene, x + 20, y + 14, `${n.icon} ${n.name}`, 22, UI.gold, true),
			w - 260,
		),
	);
	c.add(
		txt(
			scene,
			x + 20,
			y + 46,
			`Lv ${lv}/${n.max}${tag ? ` · ${tag}` : ""}`,
			13,
			UI.sub,
			true,
		),
	);
	c.add(
		button(scene, x + w - 34, y + 30, 44, 40, "✕", close, {
			size: 18,
			fill: 0x5a5f8a,
			color: UI.text,
		}),
	);

	// left: words + Cumulative Ultimate lineage if inspecting an Ultimate node
	const lx = x + 20,
		hasRows = d.rows.length > 0, // no numbers -> text spans the whole modal
		lw = hasRows ? 300 : w - 40;
	const words: { head: string; body: string; color: string }[] = [];
	if (rootDesc)
		words.push({ head: "📖 ตัวสกิล", body: rootDesc, color: UI.text });
	words.push({
		head: lv ? `✅ ตอนนี้ (Lv ${lv})` : "⬜ ยังไม่เรียน",
		body: lv ? n.desc(lv) : "—",
		color: lv ? UI.text : UI.sub,
	});
	if (lv < n.max)
		words.push({
			head: `⬆️ Lv ${lv + 1}`,
			body: n.desc(lv + 1),
			color: UI.green,
		});
	if (why && why !== "เต็มแล้ว")
		words.push({ head: "🔒 ยังเรียนไม่ได้", body: why, color: "#ffb0b0" });

	// Ult lineage (ขั้น 1 → ปัจจุบัน) lives in the left "🔥 รวมผล Ult" panel — not repeated here (space)
	let size = hasRows ? 14 : 16,
		made: Phaser.GameObjects.Text[] = [];
	for (; ; size--) {
		made.forEach((m) => m.destroy());
		made = [];
		let ty = y + 78;
		for (const wd of words) {
			const hd = txt(scene, lx, ty, wd.head, size, UI.gold, true);
			ty += hd.height + 2;
			const bd = txt(scene, lx, ty, wd.body, Math.max(9.5, size - 1), wd.color)
				.setWordWrapWidth(lw, true)
				.setLineSpacing(2);
			ty += bd.height + 10;
			made.push(hd, bd);
		}
		if (ty <= y + h - 68 || size <= 10) break;
	}
	c.add(made);

	// right: numbers
	if (hasRows) {
		const rx = x + 340,
			rw = w - 360,
			c1 = rx + rw - 236,
			c2 = rx + rw - 116;
		c.add(
			scene.add.rectangle(rx - 10, y + 76, 1, h - 150, 0x454c80).setOrigin(0),
		);
		c.add(
			txt(scene, rx, y + 80, "🔢 ตัวเลขจริง (รวมผลข้ามคลาส)", 14, UI.gold, true),
		);
		c.add(txt(scene, c1, y + 82, "ตอนนี้", 12, UI.text, true));
		c.add(
			txt(
				scene,
				c2,
				y + 82,
				lv < n.max ? `Lv ${lv + 1}` : "เต็ม",
				12,
				lv < n.max ? UI.green : UI.sub,
				true,
			),
		);
		const rowH = 21,
			maxRows = Math.floor((h - 190) / rowH),
			rows = d.rows.slice(0, maxRows);
		rows.forEach((r, i) => {
			const ry = y + 106 + i * rowH;
			if (r.section) {
				c.add(clipW(txt(scene, rx, ry, r.label, 12, UI.gold, true), rw));
				return;
			}
			const changed = r.next !== undefined && r.next !== r.now;
			if (i % 2)
				c.add(
					scene.add
						.rectangle(rx - 4, ry - 2, rw + 4, rowH, 0xffffff, 0.04)
						.setOrigin(0),
				);
			c.add(clipW(txt(scene, rx + 8, ry, r.label, 12, "#d8d4f0"), c1 - rx - 16));
			c.add(
				clipW(
					txt(scene, c1, ry, r.now, 12, UI.text),
					r.next === undefined ? rx + rw - c1 : c2 - c1 - 8,
				),
			);
			if (r.next !== undefined)
				c.add(
					clipW(
						txt(scene, c2, ry, r.next, 12, changed ? UI.green : UI.sub, changed),
						rx + rw - c2,
					),
				);
		});
		if (d.rows.length > rows.length)
			c.add(
				txt(
					scene,
					rx,
					y + 106 + rows.length * rowH,
					`… และอีก ${d.rows.length - rows.length} บรรทัด`,
					11,
					UI.sub,
				),
			);
	}
	c.add(
		txt(scene, x + 20, y + h - 52, d.note, 10, UI.sub).setWordWrapWidth(
			w - 200,
			true,
		),
	);
	c.add(
		button(scene, x + w - 80, y + h - 36, 130, 44, btnLabel, learn, {
			size: 15,
		}).setEnabled(can),
	);
}
