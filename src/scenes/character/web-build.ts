import type Phaser from "phaser";
import type { JobDef } from "../../data/jobs";
import type { Job2Def, job2Of } from "../../data/jobs2";
import type { job3Of } from "../../data/jobs3";
import type { TreeNode } from "../../data/tree";
import type { save } from "../../save";

type SaveData = ReturnType<typeof save>;

export type Col1 = {
	group: string;
	isUlt?: boolean;
	isS1?: boolean;
	cells: { n: TreeNode; row: number }[];
};

/** Shared state and inputs of the three skill-web tier builders. */
export interface WebBuild {
	s: SaveData;
	job: JobDef;
	j2: Job2Def;
	j2Options: ReturnType<typeof job2Of>;
	j3Def: ReturnType<typeof job3Of>;
	isJ3Active: boolean;
	path: NonNullable<SaveData["job3Path"]>;
	t1: NonNullable<SaveData["jobTree"]>;
	t2: NonNullable<SaveData["job2Tree"]>;
	t3: NonNullable<SaveData["job3Tree"]>;
	scrollC: Phaser.GameObjects.Container;
	spineG: Phaser.GameObjects.Graphics;
	x0: number;
	wAll: number;
	nh: number;
	rh: number;
	curY: number;
	cols1: Col1[];
	ult1CenterX: number;
	s1CenterX: number;
	t1BottomY: number;
	ult2CenterX: number;
	t2BottomY: number;
}
