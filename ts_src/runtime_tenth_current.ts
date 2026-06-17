import { safeCall } from "@common/engine_safe"
import { TENTH_LEVEL_TERRAIN_MODULE_INDEX, type RuntimeTerrainPiece } from "./runtime_config"
import { asFixed } from "./runtime_layout"

const TAG = "ZLJ_TENTH_CURRENT"
const CURRENT_PREFAB_ID = 3301506
const MOVING_SOURCE_PREFIX = "dxf_97B_"
const SURFACE_SECONDS = 2
const HIDDEN_RETURN_SECONDS = 2
const PHASE_STEPS = 40
const STEP_SECONDS = SURFACE_SECONDS / PHASE_STEPS
const MOVE_DISTANCE_X = 113.4
const HIDDEN_Y = 2.5

type TenthCurrentPart = {
  name: string
  unit: unknown
  startX: number
  surfaceY: number
  z: number
  endX: number
}

let started = false
let parts: TenthCurrentPart[] = []

export function resetTenthCurrentMechanism(): void {
  started = false
  parts = []
}

function isMovingCurrentPiece(piece: RuntimeTerrainPiece): boolean {
  if (piece.prefabId !== CURRENT_PREFAB_ID) {
    return false
  }
  return piece.name.indexOf(MOVING_SOURCE_PREFIX) === 0
}

export function registerTenthCurrentPart(
  moduleIndex: number,
  piece: RuntimeTerrainPiece,
  unit: unknown,
  name: string,
  x: number,
  y: number,
  z: number
): void {
  if (moduleIndex !== TENTH_LEVEL_TERRAIN_MODULE_INDEX || unit === null || unit === undefined) {
    return
  }
  if (!isMovingCurrentPiece(piece)) {
    return
  }
  const part: TenthCurrentPart = {
    name,
    unit,
    startX: x,
    surfaceY: y,
    z,
    endX: x - MOVE_DISTANCE_X,
  }
  parts.push(part)
  print(
    `[${TAG}] registered name=${name} start=(${x},${y},${z}) end_x=${part.endX} hidden_y=${HIDDEN_Y} cycle_seconds=${SURFACE_SECONDS + HIDDEN_RETURN_SECONDS}`
  )
}

function setPartPosition(part: TenthCurrentPart, x: number, y: number): void {
  safeCall(
    () => {
      ;(part.unit as any).set_position(math.Vector3(asFixed(x), asFixed(y), asFixed(part.z)))
    },
    { tag: `tenth_current_set_position_${part.name}`, fallback: undefined, logger: print }
  )
}

function setAllPartsAtSurfaceStart(): void {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    setPartPosition(part, part.startX, part.surfaceY)
  }
}

function setAllPartsAtHiddenEnd(): void {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    setPartPosition(part, part.endX, HIDDEN_Y)
  }
}

function animatePhase(surfaceForward: boolean, done: () => void): void {
  let step = 0
  const tick = (): void => {
    step += 1
    const t = step / PHASE_STEPS
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      const fromX = surfaceForward ? part.startX : part.endX
      const toX = surfaceForward ? part.endX : part.startX
      const y = surfaceForward ? part.surfaceY : HIDDEN_Y
      setPartPosition(part, fromX + (toX - fromX) * t, y)
    }
    if (step < PHASE_STEPS) {
      ;(LuaAPI as any).call_delay_time(asFixed(STEP_SECONDS), tick)
      return
    }
    done()
  }
  tick()
}

function runCycle(): void {
  print(`[${TAG}] surface forward begin parts=${parts.length} seconds=${SURFACE_SECONDS} move_x=-${MOVE_DISTANCE_X}`)
  animatePhase(true, () => {
    print(`[${TAG}] hidden return begin parts=${parts.length} seconds=${HIDDEN_RETURN_SECONDS} hidden_y=${HIDDEN_Y}`)
    setAllPartsAtHiddenEnd()
    animatePhase(false, () => {
      setAllPartsAtSurfaceStart()
      runCycle()
    })
  })
}

export function startTenthCurrentMechanism(): void {
  if (started) {
    return
  }
  started = true
  if (parts.length === 0) {
    print(`[${TAG}] skipped parts=0`)
    return
  }
  print(
    `[${TAG}] start parts=${parts.length} moving_prefix=${MOVING_SOURCE_PREFIX} cycle_seconds=${SURFACE_SECONDS + HIDDEN_RETURN_SECONDS} surface_seconds=${SURFACE_SECONDS} hidden_return_seconds=${HIDDEN_RETURN_SECONDS} move_distance_x=${MOVE_DISTANCE_X} hidden_y=${HIDDEN_Y}`
  )
  setAllPartsAtSurfaceStart()
  runCycle()
}

export function printTenthCurrentDebugSummary(source: string): void {
  const first = parts[0]
  if (first === undefined) {
    print(`[${TAG}] debug source=${source} started=${started} parts=0`)
    return
  }
  print(
    `[${TAG}] debug source=${source} started=${started} parts=${parts.length} first=${first.name} start=(${first.startX},${first.surfaceY},${first.z}) end_x=${first.endX} hidden_y=${HIDDEN_Y}`
  )
}
