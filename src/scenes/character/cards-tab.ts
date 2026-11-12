import Phaser from "phaser";
import { COLORS, DUNGEONS } from "../../data/game-data";
import {
	CARD_RULES,
	cardIcon,
	cardName,
	EQUIP_CARDS,
	TIER_COLOR,
	type EquipCard,
} from "../../data/cards";
import {
	canWearAs,
	gradeOf,
	cardFits,
	EQUIP_SLOTS,
	cardStatLine,
	itemById,
	slotCount,
	socketed,
	SLOTS,
} from "../../data/meta";
import {
	persist,
	save,
	socketCard,
	unsocketCard,
} from "../../save";
import {
	button,
	confirm,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import type { CharacterScene } from "../CharacterScene";
import { clip } from "./node-detail";

// ---------- tab 2: equipment cards ----------
export function cardTab(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	EQUIP_SLOTS.forEach((sl, i) => {
		const it = itemById(s.equipped[sl.id]),
			n = slotCount(it, gradeOf(s, it.id)),
			cards = socketed(s, it),
			y = 108 + i * 31;
		b.add(panel(scene, 330, y, 616, 28, UI.panel, UI.line, 8));
		b.add(txt(scene, 340, y + 6, sl.icon, 13));
		b.add(
			txt(
				scene,
				364,
				y + 6,
				clip(`${it.icon} ${it.name}`, 16),
				13,
				canWearAs(it, s) ? UI.text : UI.red,
				true,
			),
		);
		if (!n)
			b.add(
				txt(
					scene,
					520,
					y + 7,
					it.id.startsWith("none") ? "ยังไม่ได้ใส่ของ" : "ไม่มีช่องการ์ด",
					12,
					UI.sub,
				),
			);
		for (let k = 0; k < n; k++) {
			const cd = cards[k],
				x = 610 + k * 172;
			if (cd)
				b.add(
					button(
						scene,
						x,
						y + 14,
						166,
						24,
						`${cardIcon(cd)} ${clip(cardName(cd).replace(/^การ์ด(มินิบอส| MVP)?/, ""), 11)}  ✕`,
						() => {
							unsocketCard(s, it.id, k);
							persist();
							toast(scene, `ถอด${cardName(cd)}กลับเข้ากระเป๋าแล้ว`);
							scene.redraw();
						},
						{ size: 12, fill: 0x5a5f8a, color: TIER_COLOR[cd.tier] },
					),
				);
			else
				b.add(
					txt(scene, x, y + 14, "[ ช่องว่าง ]", 12, UI.sub).setOrigin(0.5),
				);
		}
	});
	b.add(
		button(
			scene,
			860,
			306,
			168,
			30,
			scene.cardBook ? "🎒 การ์ดในกระเป๋า" : "📖 สมุดการ์ด",
			() => {
				scene.cardBook = !scene.cardBook;
				scene.cardPage = 0;
				scene.render();
			},
			{ size: 14, fill: 0x5a5f8a, color: UI.text },
		),
	);
	if (scene.cardBook) cardBookView(scene);
	else cardBagView(scene);
}

export function cardBagView(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	const bag = s.cards ?? {};
	const list = EQUIP_CARDS.filter((cd) => (bag[cd.id] ?? 0) > 0);
	b.add(
		txt(
			scene,
			330,
			298,
			'การ์ดในกระเป๋า · กด "ใส่" = ใส่ช่องว่างแรกที่การ์ดนี้ใส่ได้',
			13,
			UI.sub,
		),
	);
	if (!list.length) {
		b.add(
			txt(
				scene,
				640,
				420,
				"ยังไม่มีการ์ดในกระเป๋าค่ะ\nล้มมอนในดันแล้วมีโอกาสได้การ์ดของมอนตัวนั้น\n(ตีตัวเดิมไปเรื่อยๆ ยังไงก็ได้แน่นอน)",
				15,
				UI.sub,
			)
				.setOrigin(0.5)
				.setAlign("center"),
		);
		return;
	}
	const per = 6,
		pages = Math.ceil(list.length / per);
	scene.cardPage = Math.min(scene.cardPage, pages - 1);
	if (pages > 1) {
		b.add(
			button(
				scene,
				700,
				548,
				44,
				30,
				"◀",
				() => {
					scene.cardPage--;
					scene.render();
				},
				{ size: 15 },
			).setEnabled(scene.cardPage > 0),
		);
		b.add(
			txt(
				scene,
				745,
				548,
				`${scene.cardPage + 1}/${pages}`,
				14,
				UI.text,
				true,
			).setOrigin(0.5),
		);
		b.add(
			button(
				scene,
				790,
				548,
				44,
				30,
				"▶",
				() => {
					scene.cardPage++;
					scene.render();
				},
				{ size: 15 },
			).setEnabled(scene.cardPage < pages - 1),
		);
	}
	list
		.slice(scene.cardPage * per, scene.cardPage * per + per)
		.forEach((cd, i) => {
			const x = 330 + (i % 2) * 310,
				y = 326 + Math.floor(i / 2) * 70;
			const fits = EQUIP_SLOTS.map((q) => itemById(s.equipped[q.id])).filter(
				(w) => cardFits(cd, w) && canWearAs(w, s),
			);
			const it =
				fits.find(
					(w) => slotCount(w, gradeOf(s, w.id)) > socketed(s, w).length,
				) ??
				fits[0] ??
				itemById(s.equipped[cd.slot === "acc" ? "acc" : "armor"]);
			const free = slotCount(it, gradeOf(s, it.id)) - socketed(s, it).length;
			b.add(
				panel(
					scene,
					x,
					y,
					302,
					64,
					UI.panel,
					Phaser.Display.Color.HexStringToColor(TIER_COLOR[cd.tier]).color,
					10,
				),
			);
			b.add(
				txt(
					scene,
					x + 10,
					y + 5,
					`${cardIcon(cd)} ${clip(cardName(cd), 20)} ×${bag[cd.id]}`,
					14,
					TIER_COLOR[cd.tier],
					true,
				),
			);
			b.add(
				txt(
					scene,
					x + 10,
					y + 25,
					`${SLOTS.find((q) => q.id === cd.slot)!.icon} ${clip(cardStatLine(cd), 70)}`,
					10,
					UI.green,
				)
					.setWordWrapWidth(212)
					.setLineSpacing(0),
			);
			b.add(
				button(
					scene,
					x + 262,
					y + 18,
					70,
					28,
					"ใส่",
					() => {
						if (
							!socketCard(s, it.id, cd.id, slotCount(it, gradeOf(s, it.id)))
						) {
							toast(
								scene,
								slotCount(it, gradeOf(s, it.id))
									? "ช่องเต็มแล้ว ถอดการ์ดเก่าก่อนนะคะ"
									: `${it.name} ไม่มีช่องการ์ดค่ะ`,
								UI.red,
							);
							return;
						}
						persist();
						toast(scene, `ใส่${cardName(cd)}ใน ${it.name} แล้ว!`);
						scene.redraw();
					},
					{ size: 14 },
				).setEnabled(free > 0),
			);
			const sell = CARD_RULES.sell[cd.tier];
			b.add(
				button(
					scene,
					x + 262,
					y + 48,
					70,
					24,
					`ขาย ${sell}z`,
					() =>
						confirm(
							scene,
							`ขาย${cardName(cd)} 1 ใบ?`,
							`ได้ ${sell} zeny · สมุดการ์ดยังจำไว้ ไม่หาย`,
							"ขาย",
							() => {
								bag[cd.id]--;
								if (bag[cd.id] <= 0) delete bag[cd.id];
								s.zeny += sell;
								persist();
								scene.redraw();
							},
						),
					{ size: 11, fill: 0x5a5f8a, color: UI.text },
				),
			);
		});
}

export function cardBookView(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	const seen = new Set(s.cardSeen ?? []);
	b.add(
		txt(
			scene,
			330,
			298,
			`สมุดการ์ด · เจอแล้ว ${EQUIP_CARDS.filter((cd) => seen.has(cd.id)).length}/${EQUIP_CARDS.length} ใบ`,
			13,
			UI.sub,
		),
	);
	DUNGEONS.forEach((dg, i) => {
		const many = DUNGEONS.length > 6;
		b.add(
			button(
				scene,
				many ? 344 + i * 33 : 352 + i * 56,
				334,
				many ? 31 : 50,
				28,
				many ? `D${i + 1}` : `ดัน${i + 1}`,
				() => {
					scene.bookDg = i;
					scene.render();
				},
				{
					size: 12,
					fill: i === scene.bookDg ? COLORS.gold : 0x5a5f8a,
					color: i === scene.bookDg ? UI.ink : UI.text,
				},
			),
		);
	});
	const dg = DUNGEONS[scene.bookDg];
	b.add(
		button(
			scene,
			720,
			334,
			110,
			28,
			scene.bookV2 ? "การ์ดหลัก" : "การ์ดสายอาชีพ",
			() => {
				scene.bookV2 = !scene.bookV2;
				scene.render();
			},
			{ size: 12, fill: 0x5a5f8a, color: UI.text },
		),
	);
	b.add(txt(scene, 940, 334, dg.name, 13, UI.gold, true).setOrigin(1, 0.5));
	const list: EquipCard[] = EQUIP_CARDS.filter(
		(cd) => cd.dungeon === dg.id && !!cd.v2 === scene.bookV2,
	);
	list.forEach((cd, i) => {
		const x = 330 + (i % 3) * 206,
			y = 354 + Math.floor(i / 3) * 62,
			got = seen.has(cd.id);
		b.add(
			panel(
				scene,
				x,
				y,
				200,
				56,
				got ? UI.panel : 0x1d2140,
				got
					? Phaser.Display.Color.HexStringToColor(TIER_COLOR[cd.tier]).color
					: UI.line,
				8,
			),
		);
		b.add(
			txt(
				scene,
				x + 8,
				y + 4,
				got
					? `${cardIcon(cd)} ${clip(cardName(cd), 17)}`
					: `❓ ${cd.tier === "normal" ? "???" : cd.tier === "mini" ? "??? (มินิบอส)" : "??? (บอส)"}`,
				13,
				got ? TIER_COLOR[cd.tier] : UI.sub,
				true,
			),
		);
		b.add(
			txt(
				scene,
				x + 8,
				y + 25,
				got
					? `${SLOTS.find((q) => q.id === cd.slot)!.icon} ${clip(cardStatLine(cd), 30)}`
					: `ดรอปใน${dg.name}`,
				10,
				got ? UI.green : UI.sub,
			),
		);
		if (got && cd.forJobs)
			b.add(
				txt(
					scene,
					x + 8,
					y + 39,
					clip(`เหมาะกับ ${cd.forJobs}`, 30),
					10,
					UI.sub,
				),
			);
	});
}
