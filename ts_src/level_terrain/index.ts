export type { LevelTerrainFrame, LevelTerrainSpec } from "./types"
import type { LevelTerrainSpec } from "./types"
export { LEVEL_TERRAIN_FRAMES } from "./frames"
import { LEVEL_01_TERRAIN } from "./level_01"
import { LEVEL_02_TERRAIN } from "./level_02"
import { LEVEL_03_TERRAIN } from "./level_03"
import { LEVEL_04_TERRAIN } from "./level_04"
import { LEVEL_05_TERRAIN } from "./level_05"
import { LEVEL_06_TERRAIN } from "./level_06"
import { LEVEL_07_TERRAIN } from "./level_07"
import { LEVEL_08_TERRAIN } from "./level_08"
import { LEVEL_09_TERRAIN } from "./level_09"
import { LEVEL_10_TERRAIN } from "./level_10"

export const LEVEL_TERRAIN_SPECS: Record<number, readonly LevelTerrainSpec[]> = {
  1: LEVEL_01_TERRAIN,
  2: LEVEL_02_TERRAIN,
  3: LEVEL_03_TERRAIN,
  4: LEVEL_04_TERRAIN,
  5: LEVEL_05_TERRAIN,
  6: LEVEL_06_TERRAIN,
  7: LEVEL_07_TERRAIN,
  8: LEVEL_08_TERRAIN,
  9: LEVEL_09_TERRAIN,
  10: LEVEL_10_TERRAIN,
}
