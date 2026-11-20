import { COLORS } from "../../data/game-data";
import { gradeStars, gradeCap } from "../../data/craft";
import {
	ASPECTS,
	describeItemEffects,
	itemConversionsOf,
	itemEffectsOf,
	type AspectId,
	type SaveExt,
} from "../../data/item-effects";
import {
	canWearAs,
	forged,
	forgeTag,
	gradeOf,
	isBroken,
	refineOf,
	EQUIP_SLOTS,
	offhandLocked,
	slotKind,
	type EquipSlot,
	type Item,
	COSTUMES,
	itemStatLine,
	splitStatLine,
	ITEMS,
	itemById,
	slotCount,
	socketed,
	wearText,
	wornItems,
} from "../../data/meta";
import { ITEM_SETS, setBonuses } from "../../data/sets";
import { guardCardsOff } from "../card-guard";
import {
	canUnequip,
	cardsOffOnEquip,
	cardsOffOnUnequip,
	equip,
	equipBlock,
	persist,
	save,
	unequip,
} from "../../save";
import { UNIQUE } from "../../data/uniques";
import {
	button,
	fit,
	go,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import { fitHeroScale, heroTex } from "../../gfx/hero-visual";
import type { CharacterScene } from "../CharacterScene";
import { clip } from "./node-detail";

function itemPowerBadges(s: SaveExt, it: Item): string {
	const inSet = Boolean(
		it.setId || ITEM_SETS.some((st) => st.memberIds?.includes(it.id)),
	);
	return `${s.awakened?.[it.id] ? "🌟" : ""}${s.imbue?.[it.id] ? "🔮" : ""}${inSet ? "🧩" : ""}`;
}

// ---------- tab 1: equipment screen (RO style): 3 slots left, hero in the middle, 3 slots right ----------
export function equipTab(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	const locked = offhandLocked(s);
	const costume = COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0];
	// hero in the middle
	b.add(panel(scene, 528, 112, 220, 196, 0x23284a, UI.line, 14));
	const eqSpr = scene.add.image(638, 186, heroTex(s)).setTint(costume.tint);
	b.add(eqSpr.setScale(fitHeroScale(eqSpr.width, eqSpr.height, 3, 154)));
	const onC = scene.slot === "costume";
	b.add(
		button(
			scene,
			638,
			284,
			200,
			30,
			`👗 ${costume.name}`,
			() => {
				scene.slot = "costume";
				scene.bagPage = 0;
				scene.render();
			},
			{
				size: 13,
				fill: onC ? COLORS.gold : 0x5a5f8a,
				color: onC ? UI.ink : UI.text,
			},
		),
	);
	EQUIP_SLOTS.forEach((sl, i) => {
		const x = i < 3 ? 330 : 756,
			y = 112 + (i % 3) * 66,
			on = sl.id === scene.slot;
		const twin = sl.id === "offhand" && locked;
		const it = itemById(s.equipped[twin ? "weapon" : sl.id]),
			n = twin ? 0 : slotCount(it, gradeOf(s, it.id));
		const g = scene.add.graphics();
		g.fillStyle(on ? 0x34396a : UI.panel, 1).fillRoundedRect(
			x,
			y,
			190,
			60,
			12,
		);
		g.lineStyle(on ? 3 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(
			x,
			y,
			190,
			60,
			12,
		);
		b.add(g);
		const slotBadges = twin ? "" : itemPowerBadges(s as SaveExt, it);
		b.add(
			txt(
				scene,
				x + 10,
				y + 4,
				`${sl.icon} ${sl.name}${slotBadges ? ` ${slotBadges}` : ""}`,
				11,
				UI.sub,
			),
		);
		if (n)
			b.add(
				txt(
					scene,
					x + 182,
					y + 4,
					`🃏${socketed(s, it).length}/${n}`,
					11,
					UI.gold,
				).setOrigin(1, 0),
			);
		const r = refineOf(s, it.id),
			tag = twin
				? ""
				: [
						gradeOf(s, it.id) > 1
							? r
								? `★${gradeOf(s, it.id)}`
								: gradeStars(gradeOf(s, it.id), gradeCap(it))
							: "",
						r ? `+${r}` : "",
					]
						.filter(Boolean)
						.join(" ");
		if (tag)
			b.add(
				txt(scene, x + (n ? 140 : 182), y + 4, tag, 11, "#ffd36b").setOrigin(
					1,
					0,
				),
			);
		b.add(
			txt(
				scene,
				x + 10,
				y + 19,
				clip(`${it.icon} ${it.name}`, 15),
				15,
				it.id.startsWith("none") ? UI.sub : UI.text,
				true,
			),
		);
		const warn = twin
			? ""
			: isBroken(s, it.id)
				? "💔 แตก ไม่ได้ค่าพลัง (ซ่อมที่โรงตีเหล็ก)"
				: !canWearAs(it, s)
					? `⚠ ${wearText(it)} เท่านั้น`
					: "";
		const curse =
			!twin && !warn && !!splitStatLine(forged(s, it), !!it.unique).curse;
		if (twin)
			b.add(
				txt(
					scene,
					x + 10,
					y + 41,
					"🔒 อาวุธ 2 มือ: ใช้ทั้งสองมือ",
					10,
					"#ffd36b",
				),
			);
		else
			b.add(
				txt(
					scene,
					x + 10,
					y + 41,
					clip(
						warn ||
							`${curse ? "💀" : ""}${itemStatLine(forged(s, it))}` ||
							it.desc,
						30,
					),
					10,
					warn ? UI.red : curse ? "#ffa06b" : UI.green,
				),
			);
		const z = scene.add
			.zone(x + 95, y + 30, 190, 60)
			.setInteractive({ useHandCursor: true });
		z.on("pointerup", () => {
			scene.slot = sl.id;
			scene.bagPage = 0;
			scene.render();
		});
		b.add(z);
	});

	const cur = EQUIP_SLOTS.find((q) => q.id === scene.slot);
	b.add(
		txt(
			scene,
			330,
			314,
			scene.slot === "costume"
				? "👗 ชุดที่มี (ซื้อเพิ่มที่ร้านเพชร)"
				: `${cur!.icon} ${cur!.name}: ของที่มีในกระเป๋า${scene.slot === "offhand" && locked ? " · 🔒 ถืออาวุธ 2 มือ แทนมือรอง" : ""}`,
			14,
			UI.sub,
		),
	);
	const slot = scene.slot;
	if (slot !== "costume")
		b.add(
			button(scene, 896, 314, 100, 28, "✋ ถอด", () => takeOff(scene, slot), {
				size: 13,
				fill: 0x8a6fd1,
				color: UI.text,
			}).setEnabled(canUnequip(s, slot)),
		);
	const list =
		slot === "costume"
			? COSTUMES.filter((c) => s.costumes.includes(c.id)).map((c) => ({
					id: c.id,
					label: c.name,
					badges: "",
					desc: "ไม่มีค่าพลัง",
					worn: s.costume === c.id,
					tint: c.tint,
					other: "",
				}))
			: ITEMS.filter(
					(it) => it.slot === slotKind(slot) && s.owned.includes(it.id),
				)
					.sort((a, c) => Number(!canWearAs(a, s)) - Number(!canWearAs(c, s)))
					.map((it) => {
						const other =
							slot === "acc" || slot === "acc2"
								? s.equipped[slot === "acc" ? "acc2" : "acc"] === it.id &&
									it.id !== "none"
									? "ใส่อีกข้าง"
									: ""
								: "";
						const lock2h =
							slot === "offhand" && locked && it.id !== "none_off";
						const badges = itemPowerBadges(s as SaveExt, it);
						const fxFirst = describeItemEffects(
							itemEffectsOf(s as SaveExt, it),
							itemConversionsOf(s as SaveExt, it),
						)[0];
						const statPart =
							`${splitStatLine(forged(s, it), !!it.unique).curse ? "💀" : ""}${itemStatLine(forged(s, it))}` ||
							it.desc;
						return {
							id: it.id,
							label: `${it.icon} ${it.name}${forgeTag(s, it.id)}`,
							badges,
							desc: lock2h
								? "🔒 ถืออาวุธ 2 มืออยู่ ใส่ไม่ได้"
								: !canWearAs(it, s)
									? `⚠ ${wearText(it)} เท่านั้น`
									: isBroken(s, it.id)
										? "💔 แตก: ไม่ได้ค่าพลังจนกว่าจะซ่อม"
										: fxFirst
											? `${statPart} · ${fxFirst}`
											: statPart,
							worn: s.equipped[slot] === it.id,
							tint: 0,
							off: !canWearAs(it, s) || lock2h,
							other,
							curse: !!it.unique && !!splitStatLine(forged(s, it)).curse,
						};
					});
	const per = 6,
		pages = Math.max(1, Math.ceil(list.length / per));
	scene.bagPage = Math.min(scene.bagPage, pages - 1);
	if (pages > 1) {
		b.add(
			button(
				scene,
				700,
				545,
				44,
				34,
				"◀",
				() => {
					scene.bagPage--;
					scene.render();
				},
				{ size: 15 },
			).setEnabled(scene.bagPage > 0),
		);
		b.add(
			txt(
				scene,
				745,
				545,
				`${scene.bagPage + 1}/${pages}`,
				14,
				UI.text,
				true,
			).setOrigin(0.5),
		);
		b.add(
			button(
				scene,
				790,
				545,
				44,
				34,
				"▶",
				() => {
					scene.bagPage++;
					scene.render();
				},
				{ size: 15 },
			).setEnabled(scene.bagPage < pages - 1),
		);
	}
	list
		.slice(scene.bagPage * per, scene.bagPage * per + per)
		.forEach((it, i) => {
			const x = 330 + (i % 2) * 308,
				y = 336 + Math.floor(i / 2) * 58;
			b.add(
				panel(
					scene,
					x,
					y,
					300,
					52,
					UI.panel,
					it.worn ? COLORS.gold : UI.line,
					10,
				),
			);
			if (it.tint)
				b.add(
					scene.add
						.image(x + 24, y + 26, "novice")
						.setScale(0.85)
						.setTint(it.tint),
				);
			const badges = "badges" in it ? it.badges : "";
			b.add(
				txt(
					scene,
					x + (it.tint ? 48 : 12),
					y + 5,
					clip(it.label, badges ? 14 : 17),
					15,
					UI.text,
					true,
				),
			);
			if (badges)
				b.add(
					txt(scene, x + 216, y + 6, badges, 11, UI.gold).setOrigin(1, 0),
				);
			b.add(
				txt(
					scene,
					x + (it.tint ? 48 : 12),
					y + 28,
					clip(it.desc, 30),
					11,
					"off" in it && it.off
						? UI.red
						: "curse" in it && it.curse
							? "#ffa06b"
							: UI.green,
				)
					.setWordWrapWidth(196)
					.setLineSpacing(0),
			);
			const takeOffRow = it.worn && slot !== "costume" && canUnequip(s, slot);
			b.add(
				button(
					scene,
					x + 258,
					y + 26,
					72,
					36,
					takeOffRow
						? "ถอด"
						: it.worn
							? "ใส่อยู่"
							: it.other
								? "ย้ายมา"
								: "ใส่",
					() => {
						if (slot === "costume") s.costume = it.id;
						else if (takeOffRow) {
							takeOff(scene, slot);
							return;
						} else {
							const why = equipBlock(s, it.id, slot);
							if (why) {
								toast(
									scene,
									why === "twohand"
										? "ถืออาวุธ 2 มืออยู่ ใส่มือรองไม่ได้ค่ะ เปลี่ยนเป็นอาวุธ 1 มือก่อนนะคะ"
										: why === "unique"
											? `ใส่ของยูนีคได้พร้อมกันสูงสุด ${UNIQUE.maxEquipped} ชิ้นค่ะ ถอดชิ้นอื่นก่อนนะคะ`
											: "ใส่ช่องนี้ไม่ได้ค่ะ",
									UI.red,
								);
								return;
							}
							const pushed =
								slot === "weapon" &&
								itemById(it.id).twoHand &&
								canUnequip(s, "offhand")
									? itemById(s.equipped.offhand)
									: null;
							const wear = itemById(it.id);
							guardCardsOff(
								scene,
								cardsOffOnEquip(s, it.id, slot),
								`เปลี่ยนเป็น ${wear.icon} ${wear.name}?`,
								"เปลี่ยนเลย",
								() => {
									equip(s, it.id, slot);
									if (pushed)
										toast(
											scene,
											`ถือ 2 มือ: เก็บ ${pushed.icon} ${pushed.name} กลับกระเป๋าแล้วค่ะ`,
										);
									persist();
									scene.redraw();
								},
							);
							return;
						}
						persist();
						scene.redraw();
					},
					{ size: 14 },
				).setEnabled(takeOffRow || (!it.worn && !("off" in it && it.off))),
			);
		});
	if (list.length <= 1)
		b.add(
			txt(
				scene,
				638,
				440,
				slot === "costume"
					? "ยังไม่มีชุดอื่น"
					: "ยังไม่มีของชิ้นอื่น\nเก็บ zeny จากดันแล้วไปร้านค้านะคะ",
				15,
				UI.sub,
			)
				.setOrigin(0.5)
				.setAlign("center"),
		);
	const selIt =
		slot === "costume"
			? undefined
			: itemById(s.equipped[slot === "offhand" && locked ? "weapon" : slot]);
	const { active } = setBonuses(wornItems(s));
	b.add(panel(scene, 330, 510, 340, 56, 0x181c36, UI.line, 10));
	let inspectLine = "👗 ชุดคอสตูม (ตกแต่งตัวละคร)";
	if (selIt) {
		if (selIt.id.startsWith("none")) {
			inspectLine = "ยังไม่ได้สวมใส่ในช่องนี้";
		} else {
			const ext = s as SaveExt;
			const aspId = ext.imbue?.[selIt.id] as AspectId | undefined;
			const asp = aspId ? ASPECTS[aspId] : undefined;
			const tags = [
				ext.awakened?.[selIt.id] ? "🌟ปลุกพลัง" : "",
				asp ? `${asp.icon}${asp.name}` : "",
				...describeItemEffects(
					itemEffectsOf(ext, selIt),
					itemConversionsOf(ext, selIt),
				),
			].filter(Boolean);
			inspectLine = `${selIt.icon} ${selIt.name}: ${tags.length ? tags.join(" · ") : "ยังไม่มีรูน/เอฟเฟกต์พิเศษ"}`;
		}
	}
	b.add(
		fit(
			txt(scene, 340, 514, inspectLine, 11, "#d8c2ff").setWordWrapWidth(320),
			16,
		),
	);
	const setLine = active.length
		? active
				.map((a) => {
					const maxP =
						a.nextTier?.pieces ??
						a.set.tiers[a.set.tiers.length - 1]?.pieces ??
						a.count;
					const latest = a.activeTiers[a.activeTiers.length - 1];
					return `${a.set.icon}${a.set.name} ${a.count}/${maxP}${latest ? ` (${latest.label})` : " (ยังไม่ถึงขั้น)"}`;
				})
				.join(" · ")
		: "🧩 เซตที่ใส่: ยังไม่เปิดโบนัส (ใส่ของเซตเดียวกัน 2+ ชิ้น)";
	b.add(
		fit(
			txt(scene, 340, 533, setLine, 10, active.length ? UI.gold : UI.sub)
				.setWordWrapWidth(320)
				.setLineSpacing(1),
			28,
		),
	);
	b.add(
		button(
			scene,
			876,
			545,
			140,
			34,
			slot === "costume" ? "💎 ร้านเพชร" : "🛒 ร้านค้า",
			() => go(scene, slot === "costume" ? "gemshop" : "shop"),
			{ size: 15, fill: 0x5a5f8a, color: UI.text },
		),
	);
}

export function takeOff(scene: CharacterScene, slot: EquipSlot) {
	const s = save(),
		it = itemById(s.equipped[slot]),
		off = cardsOffOnUnequip(s, slot);
	const act = () => {
		if (!unequip(s, slot)) return;
		persist();
		if (!off.length) toast(scene, `ถอด ${it.icon} ${it.name} แล้ว เก็บไว้ในกระเป๋าค่ะ`);
		scene.redraw();
	};
	guardCardsOff(scene, off, `ถอด ${it.icon} ${it.name}?`, "ถอดเลย", act);
}
