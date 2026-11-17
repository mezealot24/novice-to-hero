// D7-D14 packs in dungeon order (v78+). Built packs (dungeon !== null) join DUNGEONS after D6.
import { D7 } from './d7'
import { D8 } from './d8'
import { D9 } from './d9'
import { D10 } from './d10'
import { D11 } from './d11'
import { D12 } from './d12'
import { D13 } from './d13'
import { D14 } from './d14'
import type { DungeonPack } from './pack'

export type { D7Kind, D7Mini } from './d7'
export type { D8Kind, D8Mini } from './d8'
export type { D9Kind, D9Mini } from './d9'
export type { D10Kind, D10Mini } from './d10'
export type { D11Kind, D11Mini } from './d11'
export type { D12Kind, D12Mini } from './d12'
export type { D13Kind, D13Mini } from './d13'
export type { D14Kind, D14Mini } from './d14'

export const PACKS: DungeonPack<string>[] = [D7, D8, D9, D10, D11, D12, D13, D14] as DungeonPack<string>[]
