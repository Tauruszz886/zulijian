import { safeCall } from "@common/engine_safe"
import {
  EIGHTH_LEVEL_FIXED_HIGH_BAR_HEIGHT,
  EIGHTH_LEVEL_MECHANISM_CENTER_RAISE_Y,
  EIGHTH_LEVEL_MECHANISM_MOVE_FRAMES,
  EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS,
  EIGHTH_LEVEL_MECHANISM_MOVE_Z,
  EIGHTH_LEVEL_MECHANISM_SPLIT_Z,
  EIGHTH_LEVEL_TERRAIN_MODULE_INDEX,
  type RuntimeTerrainPiece,
} from "./runtime_config"

type RuntimeEighthMechanismPart = {
  name: string
  unit: unknown
  x: number
  y: number
  z: number
  targetZ: number
}

let runtimeEighthMechanismStarted = false
let runtimeEighthMechanismParts: RuntimeEighthMechanismPart[] = []

export function resetEighthLevelMechanism(): void {
  runtimeEighthMechanismParts = []
  runtimeEighthMechanismStarted = false
}

function isEighthLevelSmallCrossbar(piece: RuntimeTerrainPiece): boolean {
  return piece.sx === 0.5 && piece.sz === 4
}

function isEighthLevelMovingLongPlate(piece: RuntimeTerrainPiece): boolean {
  return piece.sz === 1.8
}

function isEighthLevelFixedHighBar(piece: RuntimeTerrainPiece): boolean {
  return piece.sx === 112 && piece.sy === EIGHTH_LEVEL_FIXED_HIGH_BAR_HEIGHT && piece.sz === 4
}

export function getRuntimeTerrainPieceY(moduleIndex: number, piece: RuntimeTerrainPiece, defaultY: number): number {
  const y = piece.baseY === undefined ? defaultY : piece.baseY
  if (moduleIndex !== EIGHTH_LEVEL_TERRAIN_MODULE_INDEX) {
    return y
  }
  if (isEighthLevelSmallCrossbar(piece) || isEighthLevelMovingLongPlate(piece) || isEighthLevelFixedHighBar(piece)) {
    return y + EIGHTH_LEVEL_MECHANISM_CENTER_RAISE_Y
  }
  return y
}

function getEighthLevelMechanismTargetZ(piece: RuntimeTerrainPiece, z: number): number | undefined {
  const isSmallCrossbar = isEighthLevelSmallCrossbar(piece)
  const isLongPlate = isEighthLevelMovingLongPlate(piece)
  if (!isSmallCrossbar && !isLongPlate) {
    return undefined
  }
  const moveZ = piece.startZ < EIGHTH_LEVEL_MECHANISM_SPLIT_Z ? -EIGHTH_LEVEL_MECHANISM_MOVE_Z : EIGHTH_LEVEL_MECHANISM_MOVE_Z
  return z + moveZ
}

export function registerEighthLevelMechanismPart(
  moduleIndex: number,
  piece: RuntimeTerrainPiece,
  unit: unknown,
  name: string,
  x: number,
  y: number,
  z: number
): void {
  if (moduleIndex !== EIGHTH_LEVEL_TERRAIN_MODULE_INDEX || unit === null || unit === undefined) {
    return
  }
  const targetZ = getEighthLevelMechanismTargetZ(piece, z)
  if (targetZ === undefined) {
    return
  }
  runtimeEighthMechanismParts.push({ name, unit, x, y, z, targetZ })
  print(
    `[ZLJ_EIGHTH_MECHANISM] registered name=${name} start=(${x},${y},${z}) target_z=${targetZ} move_z=${targetZ - z} move_seconds=${EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS}`
  )
}

function setEighthLevelMechanismPartPosition(part: RuntimeEighthMechanismPart, z: number): void {
  safeCall(
    () => {
      ;(part.unit as any).set_position(math.Vector3(part.x as Fixed, part.y as Fixed, z as Fixed))
    },
    { tag: `eighth_mechanism_set_position_${part.name}`, fallback: undefined, logger: print }
  )
}

function animateEighthLevelMechanism(toTarget: boolean, done?: () => void): void {
  if (runtimeEighthMechanismParts.length === 0) {
    if (done !== undefined) {
      done()
    }
    return
  }
  let frame = 0
  const step = (): void => {
    frame += 1
    const t = frame / EIGHTH_LEVEL_MECHANISM_MOVE_FRAMES
    for (let i = 0; i < runtimeEighthMechanismParts.length; i++) {
      const part = runtimeEighthMechanismParts[i]!
      const fromZ = toTarget ? part.z : part.targetZ
      const toZ = toTarget ? part.targetZ : part.z
      setEighthLevelMechanismPartPosition(part, fromZ + (toZ - fromZ) * t)
    }
    if (frame < EIGHTH_LEVEL_MECHANISM_MOVE_FRAMES) {
      ;(LuaAPI as any).call_delay_frame(1, step)
      return
    }
    if (done !== undefined) {
      done()
    }
  }
  step()
}

function scheduleEighthLevelMechanismCycle(toTarget: boolean): void {
  print(
    `[ZLJ_EIGHTH_MECHANISM] move begin direction=${toTarget ? "to_beam" : "return"} parts=${runtimeEighthMechanismParts.length} distance=${EIGHTH_LEVEL_MECHANISM_MOVE_Z} seconds=${EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS}`
  )
  animateEighthLevelMechanism(toTarget, () => {
    scheduleEighthLevelMechanismCycle(!toTarget)
  })
}

export function startEighthLevelMechanism(): void {
  if (runtimeEighthMechanismStarted) {
    return
  }
  runtimeEighthMechanismStarted = true
  if (runtimeEighthMechanismParts.length === 0) {
    print("[ZLJ_EIGHTH_MECHANISM] skipped parts=0")
    return
  }
  print(
    `[ZLJ_EIGHTH_MECHANISM] start parts=${runtimeEighthMechanismParts.length} groups=4 visible_crossbars_per_group=6 distance=${EIGHTH_LEVEL_MECHANISM_MOVE_Z} seconds=${EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS} axis=Z`
  )
  scheduleEighthLevelMechanismCycle(true)
}
