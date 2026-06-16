import { safeCall, safeCreateObstacle } from "@common/engine_safe"
import { TriggerHub } from "@common/trigger_hub"
import { createFastRunSystem, type FastRunSystem } from "./fast_run_system"
import { LEVEL_TERRAIN_FRAMES, LEVEL_TERRAIN_SPECS, type LevelTerrainSpec } from "./level_terrain"

const TAG = "ZLJ_MAIN"
const SPEED_TAG = "ZLJ_SPEED_UI"
const FLOOR_TAG = "ZLJ_RUNTIME_FLOOR"
const TILE_TAG = "ZLJ_RUNTIME_TILE"
const WALL_TAG = "ZLJ_RUNTIME_WALL"
const CEILING_TAG = "ZLJ_RUNTIME_CEILING"
const GRID_TAG = "ZLJ_RUNTIME_GRID"
const TERRAIN_TAG = "ZLJ_RUNTIME_TERRAIN"

const SPEED_DISPLAY_ID_TEXT = "1506247873"
const SPEED_DISPLAY_TARGETS = [
  {
    name: "速度文字",
    idText: "1506247873",
    fullId: "1519736575|1506247873",
  },
] as const
const DASHBOARD_CENTER_X = 640
const DASHBOARD_CENTER_Y = 760
const LEGACY_SPEED_UI_NODE_IDS = [
  "1519736575|1883038573",
  "1519736575|1349974473",
  "1519736575|1506247873",
  "1519736575|1880430446",
  "1519736575|1453382142",
  "1519736575|1338623457",
  "1519736575|1013743464",
  "1519736575|1540147645",
  "1519736575|1680243400",
] as const
const TOUCH_TYPES: ENodeTouchEventType[] = [0 as integer, 1 as integer, 2 as integer, 3 as integer]
const DEFAULT_SPEED = 40
const WALL_PREFAB_ID = 105205
const ORIGINAL_FLOOR_PREFAB_ID = 1201010
const LEVEL_FLOOR_PREFAB_ID = WALL_PREFAB_ID
const LEVEL_FLOOR_PAINT_AREA_COLORS = [
  35071 as Color,
  3795 as Color,
  255 as Color,
  16777215 as Color,
] as const
const FLOOR_BASE_Y = 0
const TILE_BASE_Y = 3
const TILE_HEIGHT = 3
const BIRTH_SPAWN_X = 949
const BIRTH_SPAWN_Y = 8
const BIRTH_SPAWN_Z = -36
const FIRST_LEVEL_TERRAIN_BASE_Y = 3
const WALL_BASE_Y = 2
const WALL_HEIGHT = 45
const CEILING_BASE_Y = 46.5
const MODULE_STEP_X = -100
const RUNTIME_COPY_COUNT = 17
const RUNTIME_FLOOR_CREATE_BATCH_SIZE = 2
const RUNTIME_WALL_CREATE_DELAY_SECONDS = 1
const RUNTIME_CEILING_CREATE_DELAY_SECONDS = 2
const RUNTIME_TILE_CREATE_DELAY_SECONDS = 3
const GRID_CELL_SIZE = 1
const GRID_LINE_Y = TILE_BASE_Y + TILE_HEIGHT + 0.05
const GRID_LINE_DURATION = 9999
const GRID_LINE_BATCH_SIZE = 220
const GRID_LINE_COLOR = "00E5FF"
const GRID_LINES_VISIBLE = false
const EXPANDED_FLOOR_START_MODULE_INDEX = 1
const EXPANDED_FLOOR_END_MODULE_INDEX = 10
const EXPANDED_RUNTIME_FLOOR_SX = 160
const EXPANDED_RUNTIME_FLOOR_SY = 3
const EXPANDED_RUNTIME_FLOOR_SZ = 100
const ORIGINAL_TERRAIN_FRAME_SX = 100
const ORIGINAL_TERRAIN_FRAME_SZ = 80
const SIDE_WALL_THICKNESS = 2
const SIDE_WALL_INSET = 0.5
const WEST_WALL_OPENING_GAP_SZ = 19
const FIRST_LEVEL_TERRAIN_MODULE_INDEX = 1
const SECOND_LEVEL_TERRAIN_MODULE_INDEX = 2
const THIRD_LEVEL_TERRAIN_MODULE_INDEX = 3
const FOURTH_LEVEL_TERRAIN_MODULE_INDEX = 4
const FIFTH_LEVEL_TERRAIN_MODULE_INDEX = 5
const SIXTH_LEVEL_TERRAIN_MODULE_INDEX = 6
const SEVENTH_LEVEL_TERRAIN_MODULE_INDEX = 7
const EIGHTH_LEVEL_TERRAIN_MODULE_INDEX = 8
const NINTH_LEVEL_TERRAIN_MODULE_INDEX = 9
const TENTH_LEVEL_TERRAIN_MODULE_INDEX = 10
const FIRST_LEVEL_TERRAIN_HEIGHT = 3
const RAISED_TERRAIN_BASE_Y = FIRST_LEVEL_TERRAIN_BASE_Y + FIRST_LEVEL_TERRAIN_HEIGHT
const EIGHTH_LEVEL_TERRAIN_CREATE_BATCH_SIZE = 8
const EIGHTH_LEVEL_SMALL_COLUMN_CENTER_RAISE_Y = 2.5
const EIGHTH_LEVEL_LONG_BAR_CENTER_RAISE_Y = 1.5
const EIGHTH_LEVEL_MECHANISM_MOVE_Z = 3.5
const EIGHTH_LEVEL_MECHANISM_SPLIT_Z = 50
const EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS = 1
const EIGHTH_LEVEL_MECHANISM_MOVE_FRAMES = 35
const FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP = 10
const FOURTH_LEVEL_COMPRESSOR_HEIGHT = 5
const FOURTH_LEVEL_COMPRESSOR_START_Y =
  FIRST_LEVEL_TERRAIN_BASE_Y + FIRST_LEVEL_TERRAIN_HEIGHT + FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP
const FOURTH_LEVEL_COMPRESSOR_DOWN_Y = FIRST_LEVEL_TERRAIN_BASE_Y + FIRST_LEVEL_TERRAIN_HEIGHT
const FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS = 3
const FOURTH_LEVEL_COMPRESSOR_DOWN_FRAMES = 12
const FOURTH_LEVEL_COMPRESSOR_UP_FRAMES = 18
const FOURTH_LEVEL_COMPRESSOR_HOLD_SECONDS = 0.8
const SIXTH_LEVEL_FLOOR_DOWN_Y = FLOOR_BASE_Y
const SIXTH_LEVEL_FLOOR_UP_Y = TILE_BASE_Y + 0.1
const SIXTH_LEVEL_FLOOR_MOVE_SECONDS = 2
const SIXTH_LEVEL_FLOOR_MOVE_FRAMES = 40
const SIXTH_LEVEL_FLOOR_HOLD_SECONDS = 0.4

type RuntimeFloor = {
  name: string
  x: number
  z: number
  sx: number
  sy: number
  sz: number
}

type RuntimeCeiling = {
  name: string
  x: number
  z: number
  sx: number
  sy: number
  sz: number
}

type RuntimeWall = {
  name: string
  side: "north" | "east" | "south" | "west"
  x: number
  z: number
  sx: number
  sz: number
}

type RuntimeTerrainPiece = {
  name: string
  startX: number
  startZ: number
  sx: number
  sy: number
  sz: number
  baseY?: number
  compressor?: boolean
  compressorDownY?: number
}

type RuntimeCompressorPiece = {
  name: string
  unit: unknown
  x: number
  z: number
  sx: number
  sy: number
  sz: number
  upY: number
  downY: number
}

type RuntimeMovingFloor = {
  name: string
  unit: unknown
  x: number
  z: number
  downY: number
  upY: number
}

type RuntimeEighthMechanismPart = {
  name: string
  unit: unknown
  x: number
  y: number
  z: number
  targetZ: number
}

type SpeedButton = {
  idText: string
  idNumber: ENode
  node: EButton
  delta: number
  width: number
  height: number
  overlay?: EButton
  runtimeButton?: EButton
}

type UiEventData = {
  role?: Role
  eui_node_id?: ENode
  custom_event_str1?: string
}

const SPEED_BUTTONS: SpeedButton[] = [
  {
    idText: "1880430446",
    idNumber: 1880430446 as unknown as ENode,
    node: "1519736575|1880430446" as unknown as EButton,
    delta: 10,
    width: 110,
    height: 101,
  },
  {
    idText: "1453382142",
    idNumber: 1453382142 as unknown as ENode,
    node: "1519736575|1453382142" as unknown as EButton,
    delta: -10,
    width: 96,
    height: 88,
  },
  {
    idText: "1338623457",
    idNumber: 1338623457 as unknown as ENode,
    node: "1519736575|1338623457" as unknown as EButton,
    delta: 1,
    width: 96,
    height: 88,
  },
  {
    idText: "1013743464",
    idNumber: 1013743464 as unknown as ENode,
    node: "1519736575|1013743464" as unknown as EButton,
    delta: -1,
    width: 96,
    height: 88,
  },
  {
    idText: "1540147645",
    idNumber: 1540147645 as unknown as ENode,
    node: "1519736575|1540147645" as unknown as EButton,
    delta: 100,
    width: 96,
    height: 88,
  },
  {
    idText: "1680243400",
    idNumber: 1680243400 as unknown as ENode,
    node: "1519736575|1680243400" as unknown as EButton,
    delta: -100,
    width: 96,
    height: 88,
  },
]

const RUNTIME_FLOOR: RuntimeFloor = {
  name: "地板",
  x: 949,
  z: -36,
  sx: 100,
  sy: 2,
  sz: 80,
}

const RUNTIME_WALLS: RuntimeWall[] = [
  {
    name: "北墙",
    side: "north",
    x: 949,
    z: -75.5,
    sx: 99,
    sz: 2,
  },
  {
    name: "东墙",
    side: "east",
    x: 998.5,
    z: -36,
    sx: 2,
    sz: 79,
  },
  {
    name: "南墙",
    side: "south",
    x: 949,
    z: 3.5,
    sx: 99,
    sz: 2,
  },
  {
    name: "西墙上段",
    side: "west",
    x: 899.5,
    z: -60.5,
    sx: 2,
    sz: 30,
  },
  {
    name: "西墙下段",
    side: "west",
    x: 899.5,
    z: -11.5,
    sx: 2,
    sz: 30,
  },
]

const RUNTIME_CEILING: RuntimeCeiling = {
  name: "天花板",
  x: 949,
  z: -36,
  sx: 100,
  sy: 1.5,
  sz: 80,
}

const FINAL_WEST_WALL: RuntimeWall = {
  name: "西墙封口",
  side: "west",
  x: 899.5,
  z: -36,
  sx: 2,
  sz: 79,
}

let fastRunSystem: FastRunSystem | undefined
let registered = false
let runtimeFloorsCreated = false
let runtimeTilesCreated = false
let runtimeWallsCreated = false
let runtimeCeilingCreated = false
let runtimeGridDrawStarted = false
let runtimeCompressorStarted = false
let runtimeSixthFloorMoveStarted = false
let runtimeEighthMechanismStarted = false
let currentSpeedValue = DEFAULT_SPEED
let displayTargetsLogged = false
const enabledRoles = new Map<string, boolean>()
const touchDebounce = new Map<string, boolean>()
const registeredOverlayButtons = new Map<string, boolean>()
const spawnAdjustedRoles = new Map<string, boolean>()
let runtimeCompressorPieces: RuntimeCompressorPiece[] = []
let runtimeSixthMovingFloor: RuntimeMovingFloor | undefined
let runtimeEighthMechanismParts: RuntimeEighthMechanismPart[] = []

function fastRunLogger(...args: unknown[]): void {
  const lastArg = args.length > 0 ? args[args.length - 1] : ""
  const text = tostring(lastArg)
  if (text.indexOf("[FastRunSystemVelocity]") >= 0) {
    return
  }
  print(text)
}

function runtimeModuleLabel(moduleIndex: number): string {
  return moduleIndex === 0 ? "出生地" : `第${moduleIndex}关`
}

function runtimeModuleName(name: string, moduleIndex: number): string {
  return `${runtimeModuleLabel(moduleIndex)}_${name}`
}

function isExpandedFloorModule(moduleIndex: number): boolean {
  return moduleIndex >= EXPANDED_FLOOR_START_MODULE_INDEX && moduleIndex <= EXPANDED_FLOOR_END_MODULE_INDEX
}

function getRuntimeFloorForModule(moduleIndex: number): RuntimeFloor {
  const frame = LEVEL_TERRAIN_FRAMES[moduleIndex]
  if (frame !== undefined) {
    return {
      name: RUNTIME_FLOOR.name,
      x: RUNTIME_FLOOR.x,
      z: RUNTIME_FLOOR.z,
      sx: frame.sx,
      sy: EXPANDED_RUNTIME_FLOOR_SY,
      sz: frame.sz,
    }
  }
  if (!isExpandedFloorModule(moduleIndex)) {
    return RUNTIME_FLOOR
  }
  return {
    name: RUNTIME_FLOOR.name,
    x: RUNTIME_FLOOR.x,
    z: RUNTIME_FLOOR.z,
    sx: EXPANDED_RUNTIME_FLOOR_SX,
    sy: EXPANDED_RUNTIME_FLOOR_SY,
    sz: EXPANDED_RUNTIME_FLOOR_SZ,
  }
}

function getRuntimeModuleCenterX(moduleIndex: number): number {
  return RUNTIME_FLOOR.x + MODULE_STEP_X * moduleIndex
}

function getRuntimeTerrainFrameForModule(moduleIndex: number, floor: RuntimeFloor): RuntimeFloor {
  return floor
}

function toRuntimeTerrainPiece(spec: LevelTerrainSpec): RuntimeTerrainPiece {
  if (spec.role === "fourth_compressor") {
    return {
      name: spec.name,
      startX: spec.startX,
      startZ: spec.startZ,
      sx: spec.sx,
      sy: spec.sy,
      sz: spec.sz,
      baseY: FOURTH_LEVEL_COMPRESSOR_START_Y,
      compressorDownY: FOURTH_LEVEL_COMPRESSOR_DOWN_Y,
      compressor: true,
    }
  }
  return {
    name: spec.name,
    startX: spec.startX,
    startZ: spec.startZ,
    sx: spec.sx,
    sy: spec.sy,
    sz: spec.sz,
  }
}

function getRuntimeTerrainPiecesForModule(moduleIndex: number): RuntimeTerrainPiece[] {
  const specs = LEVEL_TERRAIN_SPECS[moduleIndex]
  if (specs === undefined) {
    return []
  }
  const pieces: RuntimeTerrainPiece[] = []
  for (let i = 0; i < specs.length; i++) {
    pieces.push(toRuntimeTerrainPiece(specs[i]!))
  }
  return pieces
}

function applyLevelFloorAppearance(unit: unknown, name: string): void {
  if (unit === null || unit === undefined) {
    return
  }
  for (let i = 0; i < LEVEL_FLOOR_PAINT_AREA_COLORS.length; i++) {
    const area = (i + 1) as PaintArea
    const color = LEVEL_FLOOR_PAINT_AREA_COLORS[i]!
    safeCall(
      () => {
        ;(unit as any).set_paint_area_color(area, color)
      },
      { tag: `runtime_level_floor_paint_${name}_${i + 1}`, fallback: undefined, logger: print }
    )
  }
  safeCall(
    () => {
      ;(unit as any).set_mirror_reflect_enabled(false)
    },
    { tag: `runtime_level_floor_disable_mirror_${name}`, fallback: undefined, logger: print }
  )
  print(
    `[${FLOOR_TAG}] appearance applied name=${name} prefab=${LEVEL_FLOOR_PREFAB_ID} paint_area1=${LEVEL_FLOOR_PAINT_AREA_COLORS[0]} paint_area2=${LEVEL_FLOOR_PAINT_AREA_COLORS[1]} paint_area3=${LEVEL_FLOOR_PAINT_AREA_COLORS[2]} paint_area4=${LEVEL_FLOOR_PAINT_AREA_COLORS[3]} mirror=false`
  )
}

function setRuntimeMovingFloorPosition(floor: RuntimeMovingFloor, y: number): void {
  safeCall(
    () => {
      ;(floor.unit as any).set_position(math.Vector3(floor.x as Fixed, y as Fixed, floor.z as Fixed))
    },
    { tag: `runtime_sixth_floor_set_position_${floor.name}`, fallback: undefined, logger: print }
  )
}

function animateRuntimeMovingFloor(
  floor: RuntimeMovingFloor,
  fromY: number,
  toY: number,
  frames: number,
  done?: () => void
): void {
  let frame = 0
  const stepSeconds = SIXTH_LEVEL_FLOOR_MOVE_SECONDS / frames
  const step = (): void => {
    frame += 1
    const t = frame / frames
    const y = fromY + (toY - fromY) * t
    setRuntimeMovingFloorPosition(floor, y)
    if (frame < frames) {
      ;(LuaAPI as any).call_delay_time(asFixed(stepSeconds), step)
      return
    }
    if (done !== undefined) {
      done()
    }
  }
  step()
}

function scheduleSixthLevelFloorCycle(): void {
  const floor = runtimeSixthMovingFloor
  if (floor === undefined) {
    return
  }
  print(
    `[${FLOOR_TAG}] sixth_floor_move up name=${floor.name} from_y=${floor.downY} to_y=${floor.upY} duration=${SIXTH_LEVEL_FLOOR_MOVE_SECONDS}`
  )
  animateRuntimeMovingFloor(floor, floor.downY, floor.upY, SIXTH_LEVEL_FLOOR_MOVE_FRAMES, () => {
    ;(LuaAPI as any).call_delay_time(asFixed(SIXTH_LEVEL_FLOOR_HOLD_SECONDS), () => {
      print(
        `[${FLOOR_TAG}] sixth_floor_move down name=${floor.name} from_y=${floor.upY} to_y=${floor.downY} duration=${SIXTH_LEVEL_FLOOR_MOVE_SECONDS}`
      )
      animateRuntimeMovingFloor(floor, floor.upY, floor.downY, SIXTH_LEVEL_FLOOR_MOVE_FRAMES, () => {
        ;(LuaAPI as any).call_delay_time(asFixed(SIXTH_LEVEL_FLOOR_HOLD_SECONDS), scheduleSixthLevelFloorCycle)
      })
    })
  })
}

function startSixthLevelFloorMove(): void {
  if (runtimeSixthFloorMoveStarted) {
    return
  }
  runtimeSixthFloorMoveStarted = true
  if (runtimeSixthMovingFloor === undefined) {
    print(`[${FLOOR_TAG}] sixth_floor_move skipped floor=undefined`)
    return
  }
  const floor = runtimeSixthMovingFloor
  print(
    `[${FLOOR_TAG}] sixth_floor_move start name=${floor.name} down_y=${floor.downY} up_y=${floor.upY} duration=${SIXTH_LEVEL_FLOOR_MOVE_SECONDS} frames=${SIXTH_LEVEL_FLOOR_MOVE_FRAMES}`
  )
  scheduleSixthLevelFloorCycle()
}

function createRuntimeFloorCopies(): void {
  if (runtimeFloorsCreated) {
    return
  }
  runtimeFloorsCreated = true

  const floor = RUNTIME_FLOOR
  print(
    `[${FLOOR_TAG}] create begin copies=${RUNTIME_COPY_COUNT} total_modules=${RUNTIME_COPY_COUNT + 1} module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 original_prefab=${ORIGINAL_FLOOR_PREFAB_ID} level_prefab=${LEVEL_FLOOR_PREFAB_ID} base_y=${FLOOR_BASE_Y} expanded_modules=${EXPANDED_FLOOR_START_MODULE_INDEX}..${EXPANDED_FLOOR_END_MODULE_INDEX} expanded_size=(${EXPANDED_RUNTIME_FLOOR_SX},${EXPANDED_RUNTIME_FLOOR_SY},${EXPANDED_RUNTIME_FLOOR_SZ})`
  )
  print(
    `[${FLOOR_TAG}] existing name=${runtimeModuleName(floor.name, 0)} unit=2134777966 base=(${floor.x},${FLOOR_BASE_Y},${floor.z}) scale=(${floor.sx},${floor.sy},${floor.sz}) source=editor`
  )

  let moduleIndex = 1
  const createBatch = (): void => {
    let createdThisFrame = 0
    while (moduleIndex <= RUNTIME_COPY_COUNT && createdThisFrame < RUNTIME_FLOOR_CREATE_BATCH_SIZE) {
      const moduleFloor = getRuntimeFloorForModule(moduleIndex)
      const x = getRuntimeModuleCenterX(moduleIndex)
      const unit = safeCreateObstacle(
        LEVEL_FLOOR_PREFAB_ID,
        math.Vector3(x as Fixed, FLOOR_BASE_Y as Fixed, floor.z as Fixed),
        math.Vector3(moduleFloor.sx as Fixed, moduleFloor.sy as Fixed, moduleFloor.sz as Fixed),
        { tag: `runtime_floor_create_${runtimeModuleName(floor.name, moduleIndex)}`, logger: print }
      )
      const name = runtimeModuleName(floor.name, moduleIndex)
      applyLevelFloorAppearance(unit, runtimeModuleName(floor.name, moduleIndex))
      if (moduleIndex === SIXTH_LEVEL_TERRAIN_MODULE_INDEX && unit !== null && unit !== undefined) {
        runtimeSixthMovingFloor = {
          name,
          unit,
          x,
          z: floor.z,
          downY: SIXTH_LEVEL_FLOOR_DOWN_Y,
          upY: SIXTH_LEVEL_FLOOR_UP_Y,
        }
        startSixthLevelFloorMove()
      }
      print(
        `[${FLOOR_TAG}] created name=${name} unit=${tostring(unit)} prefab=${LEVEL_FLOOR_PREFAB_ID} base=(${x},${FLOOR_BASE_Y},${floor.z}) scale=(${moduleFloor.sx},${moduleFloor.sy},${moduleFloor.sz}) expanded=${isExpandedFloorModule(moduleIndex)} batch_size=${RUNTIME_FLOOR_CREATE_BATCH_SIZE}`
      )
      moduleIndex += 1
      createdThisFrame += 1
    }
    if (moduleIndex <= RUNTIME_COPY_COUNT) {
      ;(LuaAPI as any).call_delay_frame(1, createBatch)
      return
    }
    print(`[${FLOOR_TAG}] create complete copies=${RUNTIME_COPY_COUNT} prefab=${LEVEL_FLOOR_PREFAB_ID}`)
  }
  createBatch()
}

function createRuntimeTiles(): void {
  if (runtimeTilesCreated) {
    return
  }
  runtimeTilesCreated = true
  runtimeCompressorPieces = []
  runtimeCompressorStarted = false
  runtimeEighthMechanismParts = []
  runtimeEighthMechanismStarted = false

  const floor = RUNTIME_FLOOR
  print(
    `[${TILE_TAG}] create begin modules=${RUNTIME_COPY_COUNT} full_tiles=${RUNTIME_COPY_COUNT} dxf_levels=1..10 module_1=第1关 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${TILE_BASE_Y} terrain_source=split_level_files original_floor=kept birth_tile=editor`
  )
  for (let moduleIndex = 1; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const moduleFloor = getRuntimeFloorForModule(moduleIndex)
    const terrainFloor = getRuntimeTerrainFrameForModule(moduleIndex, moduleFloor)
    const x = getRuntimeModuleCenterX(moduleIndex)
    const dxfTerrainPieces = getRuntimeTerrainPiecesForModule(moduleIndex)
    if (dxfTerrainPieces.length > 0) {
      const pattern = `dxf_solid_only_level_${moduleIndex}`
      const gapSummary = `dxf_confirmed frame=${terrainFloor.sx}x${terrainFloor.sz} pieces=${dxfTerrainPieces.length} source=LEVEL_TERRAIN_SPECS`
      if (moduleIndex === EIGHTH_LEVEL_TERRAIN_MODULE_INDEX) {
        createRuntimeTerrainBatched(
          terrainFloor,
          x,
          moduleIndex,
          dxfTerrainPieces,
          pattern,
          `${gapSummary} mechanism=raised_crossbars_and_long_plates move_z=${EIGHTH_LEVEL_MECHANISM_MOVE_Z} move_seconds=${EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS}`,
          EIGHTH_LEVEL_TERRAIN_CREATE_BATCH_SIZE
        )
      } else {
        createRuntimeTerrain(terrainFloor, x, moduleIndex, dxfTerrainPieces, pattern, gapSummary)
      }
      continue
    }
    const name = runtimeModuleName("地砖", moduleIndex)
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, TILE_BASE_Y as Fixed, floor.z as Fixed),
      math.Vector3(moduleFloor.sx as Fixed, TILE_HEIGHT as Fixed, moduleFloor.sz as Fixed),
      { tag: `runtime_tile_create_${name}`, logger: print }
    )
    if (unit !== null) {
      safeCall(
        () => {
          ;(unit as any).set_mirror_reflect_enabled(false)
        },
        { tag: `runtime_tile_disable_mirror_${name}`, fallback: undefined, logger: print }
      )
    }
    print(
      `[${TILE_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${TILE_BASE_Y},${floor.z}) scale=(${moduleFloor.sx},${TILE_HEIGHT},${moduleFloor.sz}) terrain_original=true mirror=false`
    )
  }

  drawRuntimeTileGrid()
  startRuntimeCompressors()
}

function disableMirrorReflect(unit: unknown, tag: string): void {
  if (unit === null || unit === undefined) {
    return
  }
  safeCall(
    () => {
      ;(unit as any).set_mirror_reflect_enabled(false)
    },
    { tag, fallback: undefined, logger: print }
  )
}

function isTerrainCutoutModule(moduleIndex: number): boolean {
  return (
    moduleIndex === FIRST_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === SECOND_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === THIRD_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === FOURTH_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === FIFTH_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === SIXTH_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === SEVENTH_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === EIGHTH_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === NINTH_LEVEL_TERRAIN_MODULE_INDEX ||
    moduleIndex === TENTH_LEVEL_TERRAIN_MODULE_INDEX
  )
}

function getRuntimeTerrainPieceY(moduleIndex: number, piece: RuntimeTerrainPiece): number {
  const y = piece.baseY === undefined ? FIRST_LEVEL_TERRAIN_BASE_Y : piece.baseY
  if (moduleIndex !== EIGHTH_LEVEL_TERRAIN_MODULE_INDEX) {
    return y
  }
  if (piece.sx === 0.5 && piece.sz === 4) {
    return y + EIGHTH_LEVEL_SMALL_COLUMN_CENTER_RAISE_Y
  }
  if (piece.sz === 1.8) {
    return y + EIGHTH_LEVEL_LONG_BAR_CENTER_RAISE_Y
  }
  return y
}

function getEighthLevelMechanismTargetZ(piece: RuntimeTerrainPiece, z: number): number | undefined {
  const isSmallCrossbar = piece.sx === 0.5 && piece.sz === 4
  const isLongPlate = piece.sz === 1.8
  if (!isSmallCrossbar && !isLongPlate) {
    return undefined
  }
  const moveZ = piece.startZ < EIGHTH_LEVEL_MECHANISM_SPLIT_Z ? -EIGHTH_LEVEL_MECHANISM_MOVE_Z : EIGHTH_LEVEL_MECHANISM_MOVE_Z
  return z + moveZ
}

function registerEighthLevelMechanismPart(
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

function startEighthLevelMechanism(): void {
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

function createRuntimeTerrain(
  floor: RuntimeFloor,
  moduleCenterX: number,
  moduleIndex: number,
  pieces: RuntimeTerrainPiece[],
  pattern: string,
  gapSummary: string
): void {
  const moduleMinX = moduleCenterX - floor.sx / 2
  const moduleMinZ = floor.z - floor.sz / 2
  print(
    `[${TERRAIN_TAG}] create begin module=${runtimeModuleLabel(moduleIndex)} prefab=${WALL_PREFAB_ID} module_center=(${moduleCenterX},${FIRST_LEVEL_TERRAIN_BASE_Y},${floor.z}) module_size=(${floor.sx},${floor.sz}) pieces=${pieces.length} pattern=${pattern} base_y=${FIRST_LEVEL_TERRAIN_BASE_Y} scale_y=${FIRST_LEVEL_TERRAIN_HEIGHT}`
  )
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!
    const y = getRuntimeTerrainPieceY(moduleIndex, piece)
    const x = moduleMinX + piece.startX + piece.sx / 2
    const z = moduleMinZ + piece.startZ + piece.sz / 2
    const name = runtimeModuleName(piece.name, moduleIndex)
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, y as Fixed, z as Fixed),
      math.Vector3(piece.sx as Fixed, piece.sy as Fixed, piece.sz as Fixed),
      { tag: `runtime_terrain_create_${name}`, logger: print }
    )
    disableMirrorReflect(unit, `runtime_terrain_disable_mirror_${name}`)
    if (piece.compressor === true && unit !== null) {
      runtimeCompressorPieces.push({
        name,
        unit,
        x,
        z,
        sx: piece.sx,
        sy: piece.sy,
        sz: piece.sz,
        upY: y,
        downY: piece.compressorDownY === undefined ? FOURTH_LEVEL_COMPRESSOR_DOWN_Y : piece.compressorDownY,
      })
    }
    print(
      `[${TERRAIN_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${y},${z}) scale=(${piece.sx},${piece.sy},${piece.sz}) x_range=${moduleMinX + piece.startX}..${moduleMinX + piece.startX + piece.sx} z_range=${moduleMinZ + piece.startZ}..${moduleMinZ + piece.startZ + piece.sz} mirror=false compressor=${piece.compressor === true}`
    )
  }
  print(`[${TERRAIN_TAG}] gaps module=${runtimeModuleLabel(moduleIndex)} ${gapSummary}`)
}

function createRuntimeTerrainBatched(
  floor: RuntimeFloor,
  moduleCenterX: number,
  moduleIndex: number,
  pieces: RuntimeTerrainPiece[],
  pattern: string,
  gapSummary: string,
  batchSize: number
): void {
  const moduleMinX = moduleCenterX - floor.sx / 2
  const moduleMinZ = floor.z - floor.sz / 2
  print(
    `[${TERRAIN_TAG}] create begin module=${runtimeModuleLabel(moduleIndex)} prefab=${WALL_PREFAB_ID} module_center=(${moduleCenterX},${FIRST_LEVEL_TERRAIN_BASE_Y},${floor.z}) module_size=(${floor.sx},${floor.sz}) pieces=${pieces.length} pattern=${pattern} base_y=${FIRST_LEVEL_TERRAIN_BASE_Y} scale_y=mixed batch_size=${batchSize}`
  )

  let index = 0
  const createBatch = (): void => {
    let createdThisFrame = 0
    while (index < pieces.length && createdThisFrame < batchSize) {
      const piece = pieces[index]!
      const y = getRuntimeTerrainPieceY(moduleIndex, piece)
      const x = moduleMinX + piece.startX + piece.sx / 2
      const z = moduleMinZ + piece.startZ + piece.sz / 2
      const name = runtimeModuleName(piece.name, moduleIndex)
      const unit = safeCreateObstacle(
        WALL_PREFAB_ID,
        math.Vector3(x as Fixed, y as Fixed, z as Fixed),
        math.Vector3(piece.sx as Fixed, piece.sy as Fixed, piece.sz as Fixed),
        { tag: `runtime_terrain_create_${name}`, logger: print }
      )
      disableMirrorReflect(unit, `runtime_terrain_disable_mirror_${name}`)
      registerEighthLevelMechanismPart(moduleIndex, piece, unit, name, x, y, z)
      print(
        `[${TERRAIN_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${y},${z}) scale=(${piece.sx},${piece.sy},${piece.sz}) x_range=${moduleMinX + piece.startX}..${moduleMinX + piece.startX + piece.sx} z_range=${moduleMinZ + piece.startZ}..${moduleMinZ + piece.startZ + piece.sz} mirror=false compressor=false batch=${math.floor(index / batchSize) + 1}`
      )
      index += 1
      createdThisFrame += 1
    }

    if (index < pieces.length) {
      ;(LuaAPI as any).call_delay_frame(1, createBatch)
      return
    }

    print(`[${TERRAIN_TAG}] gaps module=${runtimeModuleLabel(moduleIndex)} ${gapSummary}`)
    startEighthLevelMechanism()
  }

  createBatch()
}

function setRuntimeCompressorPosition(piece: RuntimeCompressorPiece, y: number): void {
  safeCall(
    () => {
      ;(piece.unit as any).set_position(math.Vector3(piece.x as Fixed, y as Fixed, piece.z as Fixed))
    },
    { tag: `runtime_compressor_set_position_${piece.name}`, fallback: undefined, logger: print }
  )
}

function animateRuntimeCompressorPiece(piece: RuntimeCompressorPiece, fromY: number, toY: number, frames: number, done?: () => void): void {
  let frame = 0
  const step = (): void => {
    frame += 1
    const t = frame / frames
    const y = fromY + (toY - fromY) * t
    setRuntimeCompressorPosition(piece, y)
    if (frame < frames) {
      ;(LuaAPI as any).call_delay_frame(1, step)
      return
    }
    if (done !== undefined) {
      done()
    }
  }
  step()
}

function animateRuntimeCompressors(direction: "drop" | "rise", frames: number, done?: () => void): void {
  if (runtimeCompressorPieces.length === 0) {
    if (done !== undefined) {
      done()
    }
    return
  }
  let remaining = runtimeCompressorPieces.length
  for (let i = 0; i < runtimeCompressorPieces.length; i++) {
    const piece = runtimeCompressorPieces[i]!
    const fromY = direction === "drop" ? piece.upY : piece.downY
    const toY = direction === "drop" ? piece.downY : piece.upY
    animateRuntimeCompressorPiece(piece, fromY, toY, frames, () => {
      remaining -= 1
      if (remaining <= 0 && done !== undefined) {
        done()
      }
    })
  }
}

function scheduleRuntimeCompressorCycle(): void {
  ;(LuaAPI as any).call_delay_time(asFixed(FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS), () => {
    print(
      `[ZLJ_RUNTIME_COMPRESSOR] drop begin pieces=${runtimeCompressorPieces.length} wait=${FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS} plate_y=${FOURTH_LEVEL_COMPRESSOR_START_Y}->${FOURTH_LEVEL_COMPRESSOR_DOWN_Y} float_gap=${FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP}`
    )
    animateRuntimeCompressors("drop", FOURTH_LEVEL_COMPRESSOR_DOWN_FRAMES, () => {
      ;(LuaAPI as any).call_delay_time(asFixed(FOURTH_LEVEL_COMPRESSOR_HOLD_SECONDS), () => {
        print(
          `[ZLJ_RUNTIME_COMPRESSOR] rise begin pieces=${runtimeCompressorPieces.length} plate_y=${FOURTH_LEVEL_COMPRESSOR_DOWN_Y}->${FOURTH_LEVEL_COMPRESSOR_START_Y} float_gap=${FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP}`
        )
        animateRuntimeCompressors("rise", FOURTH_LEVEL_COMPRESSOR_UP_FRAMES, scheduleRuntimeCompressorCycle)
      })
    })
  })
}

function startRuntimeCompressors(): void {
  if (runtimeCompressorStarted) {
    return
  }
  runtimeCompressorStarted = true
  if (runtimeCompressorPieces.length === 0) {
    print("[ZLJ_RUNTIME_COMPRESSOR] skipped pieces=0")
    return
  }
  print(
    `[ZLJ_RUNTIME_COMPRESSOR] start pieces=${runtimeCompressorPieces.length} plate_up_y=${FOURTH_LEVEL_COMPRESSOR_START_Y} plate_down_y=${FOURTH_LEVEL_COMPRESSOR_DOWN_Y} float_gap=${FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP} plate_height=${FOURTH_LEVEL_COMPRESSOR_HEIGHT} cycle_wait=${FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS}`
  )
  scheduleRuntimeCompressorCycle()
}

function createRuntimeWallUnit(wall: RuntimeWall, moduleIndex: number, xOffset = 0): void {
  const x = wall.x + xOffset
  const name = runtimeModuleName(wall.name, moduleIndex)
  const unit = safeCreateObstacle(
    WALL_PREFAB_ID,
    math.Vector3(x as Fixed, WALL_BASE_Y as Fixed, wall.z as Fixed),
    math.Vector3(wall.sx as Fixed, WALL_HEIGHT as Fixed, wall.sz as Fixed),
    { tag: `runtime_wall_create_${name}`, logger: print }
  )
  print(
    `[${WALL_TAG}] created name=${name} unit=${tostring(unit)} pos=(${x},${WALL_BASE_Y},${wall.z}) scale=(${wall.sx},${WALL_HEIGHT},${wall.sz})`
  )
}

function getRuntimeWallsForModule(moduleIndex: number): RuntimeWall[] {
  const floor = getRuntimeFloorForModule(moduleIndex)
  const centerX = getRuntimeModuleCenterX(moduleIndex)
  const centerZ = floor.z
  const minX = centerX - floor.sx / 2
  const maxX = centerX + floor.sx / 2
  const minZ = centerZ - floor.sz / 2
  const maxZ = centerZ + floor.sz / 2
  const wallMinZ = minZ + SIDE_WALL_INSET
  const wallMaxZ = maxZ - SIDE_WALL_INSET
  const openingMinZ = centerZ - WEST_WALL_OPENING_GAP_SZ / 2
  const openingMaxZ = centerZ + WEST_WALL_OPENING_GAP_SZ / 2
  const northWestLength = openingMinZ - wallMinZ
  const southWestLength = wallMaxZ - openingMaxZ
  return [
    {
      name: "北墙",
      side: "north",
      x: centerX,
      z: wallMinZ,
      sx: floor.sx - SIDE_WALL_INSET * 2,
      sz: SIDE_WALL_THICKNESS,
    },
    {
      name: "东墙",
      side: "east",
      x: maxX - SIDE_WALL_INSET,
      z: centerZ,
      sx: SIDE_WALL_THICKNESS,
      sz: floor.sz - SIDE_WALL_INSET * 2,
    },
    {
      name: "南墙",
      side: "south",
      x: centerX,
      z: wallMaxZ,
      sx: floor.sx - SIDE_WALL_INSET * 2,
      sz: SIDE_WALL_THICKNESS,
    },
    {
      name: "西墙上段",
      side: "west",
      x: minX + SIDE_WALL_INSET,
      z: wallMinZ + northWestLength / 2,
      sx: SIDE_WALL_THICKNESS,
      sz: northWestLength,
    },
    {
      name: "西墙下段",
      side: "west",
      x: minX + SIDE_WALL_INSET,
      z: openingMaxZ + southWestLength / 2,
      sx: SIDE_WALL_THICKNESS,
      sz: southWestLength,
    },
  ]
}

function getRuntimeFinalWestWall(): RuntimeWall {
  const floor = getRuntimeFloorForModule(RUNTIME_COPY_COUNT)
  const centerX = getRuntimeModuleCenterX(RUNTIME_COPY_COUNT)
  const minX = centerX - floor.sx / 2
  return {
    name: "西墙封口",
    side: "west",
    x: minX + SIDE_WALL_INSET,
    z: floor.z,
    sx: SIDE_WALL_THICKNESS,
    sz: floor.sz - SIDE_WALL_INSET * 2,
  }
}

function createRuntimeWalls(): void {
  if (runtimeWallsCreated) {
    return
  }
  runtimeWallsCreated = true

  let wallCount = 0
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const walls = getRuntimeWallsForModule(moduleIndex)
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i]!
      if (wall.side === "east" && moduleIndex > 0) {
        continue
      }
      if (wall.side === "west" && moduleIndex === RUNTIME_COPY_COUNT) {
        continue
      }
      wallCount += 1
    }
    if (moduleIndex === RUNTIME_COPY_COUNT) {
      wallCount += 1
    }
  }
  print(
    `[${WALL_TAG}] create begin count=${wallCount} modules=${RUNTIME_COPY_COUNT + 1} module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${WALL_BASE_Y} height=${WALL_HEIGHT} expanded_modules=${EXPANDED_FLOOR_START_MODULE_INDEX}..${EXPANDED_FLOOR_END_MODULE_INDEX} shared_opening=west_gap`
  )
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const walls = getRuntimeWallsForModule(moduleIndex)
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i]!
      if (wall.side === "east" && moduleIndex > 0) {
        continue
      }
      if (wall.side === "west" && moduleIndex === RUNTIME_COPY_COUNT) {
        continue
      }
      createRuntimeWallUnit(wall, moduleIndex)
    }
    if (moduleIndex === RUNTIME_COPY_COUNT) {
      createRuntimeWallUnit(getRuntimeFinalWestWall(), moduleIndex)
    }
  }
}

function createRuntimeCeiling(): void {
  if (runtimeCeilingCreated) {
    return
  }
  runtimeCeilingCreated = true

  const ceiling = RUNTIME_CEILING
  print(
    `[${CEILING_TAG}] create begin count=${RUNTIME_COPY_COUNT + 1} module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${CEILING_BASE_Y} expanded_modules=${EXPANDED_FLOOR_START_MODULE_INDEX}..${EXPANDED_FLOOR_END_MODULE_INDEX}`
  )
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const moduleFloor = getRuntimeFloorForModule(moduleIndex)
    const x = getRuntimeModuleCenterX(moduleIndex)
    const name = runtimeModuleName(ceiling.name, moduleIndex)
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, CEILING_BASE_Y as Fixed, ceiling.z as Fixed),
      math.Vector3(moduleFloor.sx as Fixed, ceiling.sy as Fixed, moduleFloor.sz as Fixed),
      { tag: `runtime_ceiling_create_${name}`, logger: print }
    )
    print(
      `[${CEILING_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${CEILING_BASE_Y},${ceiling.z}) scale=(${moduleFloor.sx},${ceiling.sy},${moduleFloor.sz}) expanded=${isExpandedFloorModule(moduleIndex)}`
    )
  }
}

function asFixed(value: number): Fixed {
  return (value + 0.1 - 0.1) as Fixed
}

function drawRuntimeGridLine(startX: number, startZ: number, endX: number, endZ: number, color: unknown): void {
  ;(GameAPI as any).draw_line(
    math.Vector3(asFixed(startX), asFixed(GRID_LINE_Y), asFixed(startZ)),
    math.Vector3(asFixed(endX), asFixed(GRID_LINE_Y), asFixed(endZ)),
    color,
    asFixed(GRID_LINE_DURATION)
  )
}

function drawRuntimeGridBatch(xMin: number, xMax: number, zMin: number, zMax: number, nextLineIndex: number, totalLines: number, color: unknown): void {
  const xLineCount = math.floor((xMax - xMin) / GRID_CELL_SIZE) + 1
  let lineIndex = nextLineIndex
  const endLineIndex = lineIndex + GRID_LINE_BATCH_SIZE

  while (lineIndex < totalLines && lineIndex < endLineIndex) {
    if (lineIndex < xLineCount) {
      const x = xMin + lineIndex * GRID_CELL_SIZE
      drawRuntimeGridLine(x, zMin, x, zMax, color)
    } else {
      const rowIndex = lineIndex - xLineCount
      const z = zMin + rowIndex * GRID_CELL_SIZE
      drawRuntimeGridLine(xMin, z, xMax, z, color)
    }
    lineIndex += 1
  }

  if (lineIndex < totalLines) {
    ;(LuaAPI as any).call_delay_frame(1, () => {
      drawRuntimeGridBatch(xMin, xMax, zMin, zMax, lineIndex, totalLines, color)
    })
    return
  }

  print(
    `[${GRID_TAG}] draw done lines=${totalLines} batch_size=${GRID_LINE_BATCH_SIZE} y=${GRID_LINE_Y} duration=${GRID_LINE_DURATION} color=${GRID_LINE_COLOR}`
  )
}

function drawRuntimeTileGrid(): void {
  if (runtimeGridDrawStarted) {
    return
  }
  runtimeGridDrawStarted = true
  if (!GRID_LINES_VISIBLE) {
    print(`[${GRID_TAG}] hidden visible=false component=false`)
    return
  }

  const floor = RUNTIME_FLOOR
  const firstCenterX = floor.x
  const lastCenterX = floor.x + MODULE_STEP_X * RUNTIME_COPY_COUNT
  const xMin = math.min(firstCenterX, lastCenterX) - floor.sx / 2
  const xMax = math.max(firstCenterX, lastCenterX) + floor.sx / 2
  const zMin = floor.z - floor.sz / 2
  const zMax = floor.z + floor.sz / 2
  const xLineCount = math.floor((xMax - xMin) / GRID_CELL_SIZE) + 1
  const zLineCount = math.floor((zMax - zMin) / GRID_CELL_SIZE) + 1
  const totalLines = xLineCount + zLineCount
  const color = (GlobalAPI as any).str_to_color(GRID_LINE_COLOR)

  print(
    `[${GRID_TAG}] draw begin modules=${RUNTIME_COPY_COUNT + 1} x=${xMin}..${xMax} z=${zMin}..${zMax} cell=${GRID_CELL_SIZE} y=${GRID_LINE_Y} x_lines=${xLineCount} z_lines=${zLineCount} total=${totalLines} component=false`
  )
  drawRuntimeGridBatch(xMin, xMax, zMin, zMax, 0, totalLines, color)
}

function startSystems(): void {
  if (fastRunSystem !== undefined && fastRunSystem.isEnabled()) {
    ensureFastRunComponentsForOnlineRoles()
    return
  }

  fastRunSystem = createFastRunSystem({
    maxSpeed: DEFAULT_SPEED,
    initialSpeed: DEFAULT_SPEED,
    groundAcceleration: 1000,
    groundDeceleration: 1000,
    airAcceleration: 1000,
    airDeceleration: 1000,
    maxLinearVelocity: 1000,
    obstacle: {
      enabled: true,
      distance: 2,
      logIntervalTicks: 0 as integer,
    },
    testMode: {
      enabled: true,
      parentNodeName: "画布1",
      x: DASHBOARD_CENTER_X,
      y: DASHBOARD_CENTER_Y,
      maxSpeed: 1000,
    },
    logger: fastRunLogger,
  })
  fastRunSystem.setEnabled(true)
  ensureFastRunComponentsForOnlineRoles()
  print(`[${SPEED_TAG}] fast_run_system started speed=${DEFAULT_SPEED}`)
}

function hideLegacySpeedUiForRole(role: Role): void {
  for (let i = 0; i < LEGACY_SPEED_UI_NODE_IDS.length; i++) {
    const idText = LEGACY_SPEED_UI_NODE_IDS[i]!
    const node = idText as unknown as ENode
    safeCall(
      () => {
        role.set_node_visible(node, false)
      },
      { tag: `legacy_speed_ui_hide_${idText}`, fallback: undefined, logger: print }
    )
    safeCall(
      () => {
        ;(role as any).set_node_touch_enabled(node, false)
      },
      { tag: `legacy_speed_ui_touch_off_${idText}`, fallback: undefined, logger: print }
    )
  }
}

function hideLegacySpeedUiForOnlineRoles(): void {
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]
    if (role !== undefined) {
      hideLegacySpeedUiForRole(role)
    }
  }
  print(`[${SPEED_TAG}] legacy ui hidden nodes=${LEGACY_SPEED_UI_NODE_IDS.length} roles=${roles.length}`)
}

function ensureFastRunComponentForRole(role: Role): void {
  if (fastRunSystem === undefined) {
    return
  }
  if (fastRunSystem.getComponent(role) !== null) {
    const component = fastRunSystem.getComponent(role)
    if (component !== null) {
      component.setMaxSpeed(currentSpeedValue)
    }
    print(
      `[${SPEED_TAG}] fast_run_component exists role=${tostring(role)} speed=${currentSpeedValue} count=${fastRunSystem.getComponentCount()}`
    )
    return
  }
  fastRunSystem.addComponent(role, {
    maxSpeed: currentSpeedValue,
    initialSpeed: currentSpeedValue,
  })
  print(
    `[${SPEED_TAG}] fast_run_component added role=${tostring(role)} speed=${currentSpeedValue} count=${fastRunSystem.getComponentCount()}`
  )
}

function ensureFastRunComponentsForOnlineRoles(): void {
  if (fastRunSystem === undefined) {
    return
  }
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]
    if (role !== undefined) {
      ensureFastRunComponentForRole(role)
    }
  }
}

function getSpeed(): number {
  return currentSpeedValue
}

function setSpeed(speed: number): number {
  startSystems()
  const next = math.floor(speed < 0 ? 0 : speed) as number
  currentSpeedValue = next
  if (fastRunSystem !== undefined) {
    fastRunSystem.setMaxSpeed(next)
    const roles = getOnlineRoles()
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      if (role !== undefined) {
        const component = fastRunSystem.getComponent(role)
        if (component !== null) {
          component.setMaxSpeed(next)
        }
      }
    }
    print(`[${SPEED_TAG}] fast_run_speed synced speed=${next} components=${fastRunSystem.getComponentCount()}`)
  }
  return next
}

function roleKey(role: Role | undefined): string {
  return role !== undefined ? tostring(role) : "global"
}

function pushUniqueLabel(labels: ELabel[], seen: Map<string, boolean>, label: unknown, source: string): void {
  if (label === undefined) {
    return
  }
  const key = tostring(label)
  if (key.length === 0 || seen.get(key) === true) {
    return
  }
  seen.set(key, true)
  labels.push(label as ELabel)
  if (!displayTargetsLogged) {
    print(`[${SPEED_TAG}] display candidate source=${source} node=${key}`)
  }
}

function getSpeedDisplayLabels(): ELabel[] {
  const labels: ELabel[] = []
  const seen = new Map<string, boolean>()

  for (let i = 0; i < SPEED_DISPLAY_TARGETS.length; i++) {
    const target = SPEED_DISPLAY_TARGETS[i]!
    const queried = safeCall(
      () => {
        return (LuaAPI as any).query_ui_node(target.name)
      },
      { tag: `speed_ui_query_${target.name}`, fallback: undefined, logger: print }
    )
    pushUniqueLabel(labels, seen, queried, `query:${target.name}`)
  }

  displayTargetsLogged = true
  return labels
}

function setSpeedDisplay(role: Role | undefined, speed: number): void {
  if (role === undefined) {
    print(`[${SPEED_TAG}] display skipped no role speed=${speed}`)
    return
  }

  const labels = getSpeedDisplayLabels()
  if (labels.length === 0) {
    print(`[${SPEED_TAG}] display label missing id=${SPEED_DISPLAY_ID_TEXT}`)
    return
  }

  const text = tostring(speed)
  let okCount = 0
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!
    const ok = safeCall(
      () => {
        role.set_label_text(label, text)
        return true
      },
      { tag: `speed_ui_set_display_${tostring(label)}`, fallback: false, logger: print }
    )
    if (ok === true) {
      okCount += 1
      safeCall(
        () => {
          role.set_node_visible(label as unknown as ENode, true)
        },
        { tag: `speed_ui_display_visible_${tostring(label)}`, fallback: undefined, logger: print }
      )
    }
  }
  print(`[${SPEED_TAG}] display updated role=${tostring(role)} speed=${text} ok=${okCount}/${labels.length}`)
}

function syncSpeedValueToRole(role: Role | undefined): void {
  const speed = setSpeed(currentSpeedValue)
  setSpeedDisplay(role, speed)
}

function enableNodeForRole(role: Role, nodeIdText: string, isButton: boolean, touchEnabled: boolean): void {
  const node = nodeIdText as unknown as ENode
  safeCall(
    () => {
      ;(role as any).set_node_visible(node, true)
    },
    { tag: `speed_ui_visible_${nodeIdText}`, fallback: undefined, logger: print }
  )
  safeCall(
    () => {
      ;(role as any).set_node_touch_enabled(node, touchEnabled)
    },
    { tag: `speed_ui_touch_${nodeIdText}`, fallback: undefined, logger: print }
  )
  if (isButton) {
    safeCall(
      () => {
        ;(role as any).set_button_enabled(nodeIdText as unknown as EButton, true)
      },
      { tag: `speed_ui_button_${nodeIdText}`, fallback: undefined, logger: print }
    )
  }
}

function enableNodeObjectForRole(role: Role, node: ENode, tagText: string, isButton: boolean, touchEnabled: boolean): void {
  safeCall(
    () => {
      ;(GameAPI as any).set_node_visible(node, true)
    },
    { tag: `speed_ui_visible_${tagText}`, fallback: undefined, logger: print }
  )
  if (isButton) {
    safeCall(
      () => {
        ;(GameAPI as any).enable_button(node as unknown as EButton, true)
      },
      { tag: `speed_ui_button_${tagText}`, fallback: undefined, logger: print }
    )
  }
}

function buttonLabel(button: SpeedButton): string {
  return button.delta > 0 ? `+${tostring(button.delta)}` : tostring(button.delta)
}

function getUiEventData(a?: unknown, b?: unknown, c?: unknown): UiEventData {
  if (c !== undefined) {
    return c as UiEventData
  }
  if (a !== undefined && typeof a === "object") {
    return a as UiEventData
  }
  if (b !== undefined && typeof b === "object") {
    return b as UiEventData
  }
  return {}
}

function setButtonText(role: Role, button: EButton, text: string, tag: string): void {
  safeCall(
    () => {
      ;(GameAPI as any).set_button_text(button, text)
    },
    { tag, fallback: undefined, logger: print }
  )
}

function syncSpeedDisplayForRole(role: Role): void {
  setSpeedDisplay(role, currentSpeedValue)
}

function enableUiForRole(role: Role): void {
  const key = roleKey(role)
  if (enabledRoles.get(key) === true) {
    syncSpeedDisplayForRole(role)
    return
  }

  const labels = getSpeedDisplayLabels()
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!
    enableNodeObjectForRole(role, label as unknown as ENode, `display_${tostring(label)}`, false, false)
  }
  for (let i = 0; i < SPEED_BUTTONS.length; i++) {
    const button = SPEED_BUTTONS[i]!
    enableNodeObjectForRole(role, button.node as unknown as ENode, `static_${button.idText}_${tostring(button.node)}`, true, true)
    setButtonText(role, button.node, buttonLabel(button), `speed_ui_static_text_${button.idText}`)
    if (button.runtimeButton !== undefined) {
      enableNodeObjectForRole(
        role,
        button.runtimeButton as unknown as ENode,
        `runtime_${button.idText}_${tostring(button.runtimeButton)}`,
        true,
        true
      )
      setButtonText(role, button.runtimeButton, buttonLabel(button), `speed_ui_runtime_text_${button.idText}`)
    }
  }
  syncSpeedDisplayForRole(role)

  enabledRoles.set(key, true)
  print(`[${SPEED_TAG}] enabled role=${key} speed=${getSpeed()} buttons=${SPEED_BUTTONS.length}`)
}

function getOnlineRoles(): Role[] {
  const roles = safeCall(
    () => {
      return GameAPI.get_all_valid_roles()
    },
    { tag: "speed_ui_get_roles", fallback: [] as Role[], logger: print }
  )
  return roles !== undefined ? roles : []
}

function adjustRoleSpawnToBirthTile(role: Role): void {
  const key = roleKey(role)
  if (spawnAdjustedRoles.get(key) === true) {
    return
  }
  const character = safeCall(
    () => {
      const getCtrlUnit = (role as any).get_ctrl_unit
      return getCtrlUnit()
    },
    { tag: `birth_spawn_get_ctrl_${key}`, fallback: null, logger: print }
  ) as Character | null
  if (character === null || character === undefined) {
    print(`[${TAG}] birth spawn skipped role=${key} character=nil`)
    return
  }
  safeCall(
    () => {
      ;(character as any).set_position(math.Vector3(BIRTH_SPAWN_X as Fixed, BIRTH_SPAWN_Y as Fixed, BIRTH_SPAWN_Z as Fixed))
    },
    { tag: `birth_spawn_set_position_${key}`, fallback: undefined, logger: print }
  )
  spawnAdjustedRoles.set(key, true)
  print(`[${TAG}] birth spawn adjusted role=${key} pos=(${BIRTH_SPAWN_X},${BIRTH_SPAWN_Y},${BIRTH_SPAWN_Z})`)
}

function adjustOnlineRolesSpawnToBirthTile(): void {
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]
    if (role !== undefined) {
      adjustRoleSpawnToBirthTile(role)
    }
  }
}

function enableUiForOnlineRoles(): void {
  startSystems()
  ensureFastRunComponentsForOnlineRoles()
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]
    if (role !== undefined) {
      enableUiForRole(role)
    }
  }
}

function syncSpeedDisplayForOnlineRoles(): void {
  const speed = currentSpeedValue
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]
    if (role !== undefined) {
      setSpeedDisplay(role, speed)
    }
  }
}

function shouldHandleTouch(role: Role | undefined, nodeIdText: string): boolean {
  const key = `${roleKey(role)}:${nodeIdText}`
  if (touchDebounce.get(key) === true) {
    return false
  }

  touchDebounce.set(key, true)
  TriggerHub.register(
    [EVENT.TIMEOUT, 0.12],
    () => {
      touchDebounce.delete(key)
    },
    {
      safe: true,
      safeCallback: true,
      tag: "speed_ui_touch_debounce",
      logger: print,
    }
  )
  return true
}

function findButtonByNodeId(nodeIdText: string): SpeedButton | undefined {
  let normalizedNodeIdText = nodeIdText
  const prefix = "defaultcanvasnode"
  if (normalizedNodeIdText.indexOf(prefix) === 0) {
    normalizedNodeIdText = normalizedNodeIdText.substring(prefix.length)
  }

  for (let i = 0; i < SPEED_BUTTONS.length; i++) {
    const button = SPEED_BUTTONS[i]!
    if (button.idText === normalizedNodeIdText) {
      return button
    }
  }
  return undefined
}

function applyDelta(role: Role | undefined, button: SpeedButton, source: string): void {
  print(`[${SPEED_TAG}] touch source=${source} node=${button.idText} delta=${button.delta} role=${tostring(role)}`)
  if (!shouldHandleTouch(role, button.idText)) {
    print(`[${SPEED_TAG}] touch skipped debounce node=${button.idText} role=${tostring(role)}`)
    return
  }

  if (role !== undefined) {
    enableUiForRole(role)
  }

  const before = currentSpeedValue
  const after = setSpeed(before + button.delta)
  syncSpeedDisplayForOnlineRoles()
  showRoleTip(role, `speed ${before}->${after}`)
  print(`[${SPEED_TAG}] apply node=${button.idText} delta=${button.delta} before=${before} after=${after} source=${source} role=${tostring(role)}`)
}

function registerTouchForButton(button: SpeedButton): void {
  const variants: ENode[] = [
    button.idText as unknown as ENode,
    button.idNumber,
    (`defaultcanvasnode${button.idText}`) as unknown as ENode,
  ]
  for (let v = 0; v < variants.length; v++) {
    const node = variants[v]!
    TriggerHub.register(
      [EVENT.EUI_NODE_TOUCH_EVENT, node],
      (a?: unknown, b?: unknown, c?: unknown) => {
        const data = getUiEventData(a, b, c)
        applyDelta(data?.role, button, `node:${tostring(node)} eventNode=${tostring(data?.eui_node_id)}`)
      },
      {
        safe: true,
        safeCallback: true,
        tag: `speed_ui_touch_node_${button.idText}_${tostring(node)}`,
        logger: print,
      }
    )

    for (let i = 0; i < TOUCH_TYPES.length; i++) {
      const touchType = TOUCH_TYPES[i]!
      TriggerHub.register(
        [EVENT.EUI_NODE_TOUCH_EVENT, node, touchType],
        (a?: unknown, b?: unknown, c?: unknown) => {
          const data = getUiEventData(a, b, c)
          applyDelta(data?.role, button, `typed:${tostring(node)}:${tostring(touchType)} eventNode=${tostring(data?.eui_node_id)}`)
        },
        {
          safe: true,
          safeCallback: true,
          tag: `speed_ui_touch_${button.idText}_${tostring(node)}_${tostring(touchType)}`,
          logger: print,
        }
      )
    }
  }

  const customEventNames = [
    button.idText,
    `defaultcanvasnode${button.idText}`,
    button.delta > 0 ? `+${tostring(button.delta)}` : tostring(button.delta),
  ]
  for (let i = 0; i < customEventNames.length; i++) {
    const eventName = customEventNames[i]!
    TriggerHub.register(
      [EVENT.UI_CUSTOM_EVENT, eventName],
      (a?: unknown, b?: unknown, c?: unknown) => {
        const data = getUiEventData(a, b, c)
        if (data?.eui_node_id !== undefined) {
          const eventButton = findButtonByNodeId(tostring(data.eui_node_id))
          if (eventButton !== undefined && eventButton.idText !== button.idText) {
            return
          }
        }
        applyDelta(data?.role, button, `custom:${eventName} eventNode=${tostring(data?.eui_node_id)}`)
      },
      {
        safe: true,
        safeCallback: true,
        tag: `speed_ui_custom_${button.idText}_${eventName}`,
        logger: print,
      }
    )
  }
}

function registerButtonTouch(button: SpeedButton, overlay: EButton, sourceName: string): void {
  const overlayKey = tostring(overlay)
  if (registeredOverlayButtons.get(overlayKey) === true) {
    return
  }
  registeredOverlayButtons.set(overlayKey, true)

  for (let i = 0; i < TOUCH_TYPES.length; i++) {
    const touchType = TOUCH_TYPES[i]!
    const eventDesc = [EVENT.EUI_NODE_TOUCH_EVENT, overlay, touchType]
    const tag = `speed_ui_${sourceName}_touch_${button.idText}_${overlayKey}_${tostring(touchType)}`
    const regId = safeCall(
      () => {
        return LuaAPI.global_register_trigger_event(eventDesc, (eventName: unknown, actor: unknown, data: unknown) => {
          const eventData = getUiEventData(eventName, actor, data)
          print(
            `[${SPEED_TAG}] raw touch source=${sourceName} button=${overlayKey} touch_type=${tostring(touchType)} event=${tostring(
              eventName
            )} actor=${tostring(actor)} data=${tostring(data)}`
          )
          applyDelta(
            eventData?.role,
            button,
            `${sourceName}:${overlayKey}:${tostring(touchType)} eventNode=${tostring(eventData?.eui_node_id)}`
          )
        })
      },
      { tag, fallback: 0 as integer, logger: print }
    )
    print(
      `[${SPEED_TAG}] touch registered source=${sourceName} node=${button.idText} button=${overlayKey} touch_type=${tostring(
        touchType
      )} reg=${tostring(regId)}`
    )
  }
}

function showRoleTip(role: Role | undefined, text: string): void {
  if (role === undefined) {
    return
  }
  safeCall(
    () => {
      role.show_tips(text, math.tofixed(1.2))
    },
    {
      tag: "speed_ui_show_tip",
      fallback: undefined,
      logger: print,
    }
  )
}

function registerSpeedUiEvents(): void {
  if (registered) {
    return
  }

  for (let i = 0; i < SPEED_BUTTONS.length; i++) {
    const button = SPEED_BUTTONS[i]!
    registerButtonTouch(button, button.node, "static")
  }

  registered = true
  print(`[${SPEED_TAG}] registered v4 display=${SPEED_DISPLAY_ID_TEXT} buttons=${SPEED_BUTTONS.length} listeners=static_full_id speed=${getSpeed()}`)
}

print(`[${TAG}] loaded`)

LuaAPI.global_register_trigger_event([EVENT.GAME_INIT], () => {
  print(`[${TAG}] game init`)
  createRuntimeFloorCopies()
  TriggerHub.register([EVENT.TIMEOUT, RUNTIME_WALL_CREATE_DELAY_SECONDS], () => createRuntimeWalls(), {
    safe: true,
    safeCallback: true,
    tag: "runtime_walls_create_delay",
    logger: print,
  })
  TriggerHub.register([EVENT.TIMEOUT, RUNTIME_CEILING_CREATE_DELAY_SECONDS], () => createRuntimeCeiling(), {
    safe: true,
    safeCallback: true,
    tag: "runtime_ceiling_create_delay",
    logger: print,
  })
  TriggerHub.register([EVENT.TIMEOUT, RUNTIME_TILE_CREATE_DELAY_SECONDS], () => createRuntimeTiles(), {
    safe: true,
    safeCallback: true,
    tag: "runtime_tiles_create_delay",
    logger: print,
  })
  startSystems()
  hideLegacySpeedUiForOnlineRoles()
  TriggerHub.register([EVENT.TIMEOUT, 1], () => {
    startSystems()
    hideLegacySpeedUiForOnlineRoles()
    adjustOnlineRolesSpawnToBirthTile()
  }, {
    safe: true,
    safeCallback: true,
    tag: "legacy_speed_ui_hide_delay",
    logger: print,
  })
  TriggerHub.register([EVENT.TIMEOUT, 0.2], () => adjustOnlineRolesSpawnToBirthTile(), {
    safe: true,
    safeCallback: true,
    tag: "birth_spawn_adjust_delay_0_2",
    logger: print,
  })
  TriggerHub.register([EVENT.TIMEOUT, 2], () => adjustOnlineRolesSpawnToBirthTile(), {
    safe: true,
    safeCallback: true,
    tag: "birth_spawn_adjust_delay_2",
    logger: print,
  })
})
