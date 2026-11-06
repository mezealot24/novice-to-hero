// D7-D10 packs in dungeon order (v78). Built packs (dungeon !== null) join DUNGEONS after D6.
import { D7 } from './d7'
import { D8 } from './d8'
import { D9 } from './d9'
import { D10 } from './d10'
import type { DungeonPack } from './pack'

export type { D7Kind, D7Mini } from './d7'
export type { D8Kind, D8Mini } from './d8'
export type { D9Kind, D9Mini } from './d9'
export type { D10Kind, D10Mini } from './d10'

export const PACKS: DungeonPack<string>[] = [D7, D8, D9, D10] as DungeonPack<string>[]
