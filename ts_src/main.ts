import { safeCall, safeCreateObstacle } from "@common/engine_safe"
import { TriggerHub } from "@common/trigger_hub"
import { createFastRunSystem, type FastRunSystem } from "./fast_run_system"

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
const FIRST_LEVEL_TERRAIN_MODULE_INDEX = 1
const SECOND_LEVEL_TERRAIN_MODULE_INDEX = 2
const THIRD_LEVEL_TERRAIN_MODULE_INDEX = 3
const FOURTH_LEVEL_TERRAIN_MODULE_INDEX = 4
const FIFTH_LEVEL_TERRAIN_MODULE_INDEX = 5
const SIXTH_LEVEL_TERRAIN_MODULE_INDEX = 6
const SEVENTH_LEVEL_TERRAIN_MODULE_INDEX = 7
const EIGHTH_LEVEL_TERRAIN_MODULE_INDEX = 8
const FIRST_LEVEL_TERRAIN_HEIGHT = 3
const RAISED_TERRAIN_BASE_Y = FIRST_LEVEL_TERRAIN_BASE_Y + FIRST_LEVEL_TERRAIN_HEIGHT
const EIGHTH_LEVEL_TERRAIN_CREATE_BATCH_SIZE = 8
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

const FIRST_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "入口长平台40",
    startX: 0,
    startZ: 0,
    sx: 40,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 80,
  },
  {
    name: "中段平台35",
    startX: 50,
    startZ: 0,
    sx: 35,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 80,
  },
  {
    name: "终点短平台10",
    startX: 90,
    startZ: 0,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 80,
  },
]

const SECOND_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "右侧立体15x39_11",
    startX: 0,
    startZ: 20,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 39.11118076628725,
  },
  {
    name: "中间立体60x59_5",
    startX: 25,
    startZ: 10,
    sx: 60,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 59.5,
  },
  {
    name: "左侧立体10x30",
    startX: 90,
    startZ: 25,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 30,
  },
]

const THIRD_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "右侧立体15x40",
    startX: 85,
    startZ: 20,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 40,
  },
  {
    name: "右侧连通7_5x10",
    startX: 77.5,
    startZ: 35,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 10,
  },
  {
    name: "中间右列下段15x13_75",
    startX: 57.5,
    startZ: 5,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间中列下段15x13_75",
    startX: 37.5,
    startZ: 5,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间左列下段15x13_75",
    startX: 17.5,
    startZ: 5,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间右列二段15x13_75",
    startX: 57.5,
    startZ: 23.75,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间中列二段15x13_75",
    startX: 37.5,
    startZ: 23.75,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间左列二段15x13_75",
    startX: 17.5,
    startZ: 23.75,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间右列三段15x13_75",
    startX: 57.5,
    startZ: 42.5,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间中列三段15x13_75",
    startX: 37.5,
    startZ: 42.5,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间左列三段15x13_75",
    startX: 17.5,
    startZ: 42.5,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间右列上段15x13_75",
    startX: 57.5,
    startZ: 61.25,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间中列上段15x13_75",
    startX: 37.5,
    startZ: 61.25,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "中间左列上段15x13_75",
    startX: 17.5,
    startZ: 61.25,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 13.75,
  },
  {
    name: "左侧长条10x80",
    startX: 0,
    startZ: 0,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 80,
  },
]

const FOURTH_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "左侧立体10x80",
    startX: 0,
    startZ: 0,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 80,
  },
  {
    name: "右侧立体15x40",
    startX: 85,
    startZ: 20,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 40,
  },
  {
    name: "右侧连通7_5x10",
    startX: 77.5,
    startZ: 35,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 10,
  },
  {
    name: "中间主长条75x20",
    startX: 10,
    startZ: 30,
    sx: 75,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 20,
  },
  {
    name: "下方小平台10x7_5",
    startX: 45,
    startZ: 22.5,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 7.5,
  },
  {
    name: "上方小平台10x7_5",
    startX: 45,
    startZ: 50,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 7.5,
  },
  {
    name: "中间上方左压板30x20",
    startX: 10,
    startZ: 30,
    sx: 30,
    sy: FOURTH_LEVEL_COMPRESSOR_HEIGHT,
    sz: 20,
    baseY: FOURTH_LEVEL_COMPRESSOR_START_Y,
    compressorDownY: FOURTH_LEVEL_COMPRESSOR_DOWN_Y,
    compressor: true,
  },
  {
    name: "中间上方右压板35x20",
    startX: 50,
    startZ: 30,
    sx: 35,
    sy: FOURTH_LEVEL_COMPRESSOR_HEIGHT,
    sz: 20,
    baseY: FOURTH_LEVEL_COMPRESSOR_START_Y,
    compressorDownY: FOURTH_LEVEL_COMPRESSOR_DOWN_Y,
    compressor: true,
  },
]

const FIFTH_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "上方横平台5x30",
    startX: 0,
    startZ: 25,
    sx: 5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 30,
  },
  {
    name: "下方横平台10x60",
    startX: 90,
    startZ: 10,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 60,
  },
  {
    name: "中下竖平台20x14",
    startX: 70,
    startZ: 33,
    sx: 20,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "中间方块12_5x14",
    startX: 30,
    startZ: 33,
    sx: 12.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "上方连接块5x14",
    startX: 5,
    startZ: 33,
    sx: 5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "左侧下块7_524x10",
    startX: 7.5,
    startZ: 5,
    sx: 7.523669876411105,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 10,
  },
  {
    name: "左侧中块7_5x8_5",
    startX: 27.5,
    startZ: 5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 8.5,
  },
  {
    name: "左侧上块7_5x10",
    startX: 50,
    startZ: 5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 10,
  },
  {
    name: "右侧下块7_5x9",
    startX: 29.024240179683595,
    startZ: 67.5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 9,
  },
  {
    name: "右侧中块7_5x9",
    startX: 47,
    startZ: 67.5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 9,
  },
  {
    name: "右侧上块7_5x9",
    startX: 70,
    startZ: 67.5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 9,
  },
]

const SIXTH_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "上方横平台5x30",
    startX: 0,
    startZ: 25,
    sx: 5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 30,
  },
  {
    name: "下方横平台10x60",
    startX: 90,
    startZ: 10,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 60,
  },
  {
    name: "中下竖平台20x14",
    startX: 70,
    startZ: 33,
    sx: 20,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "中间长平台60x14",
    startX: 10,
    startZ: 33,
    sx: 60,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "上方连接块5x14",
    startX: 5,
    startZ: 33,
    sx: 5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
]

const SEVENTH_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "左侧中段平台5x30",
    startX: 0,
    startZ: 25,
    sx: 5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 30,
  },
  {
    name: "右侧长平台10x60",
    startX: 90,
    startZ: 10,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 60,
  },
  {
    name: "中右平台15x14",
    startX: 75,
    startZ: 33,
    sx: 15,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "中间平台10x14",
    startX: 32.5,
    startZ: 33,
    sx: 10,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "左侧连接块5x14",
    startX: 5,
    startZ: 33,
    sx: 5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 14,
  },
  {
    name: "下方跳块7_5x10",
    startX: 46,
    startZ: 5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 10,
  },
  {
    name: "上方跳块7_5x9",
    startX: 14.02424017968361,
    startZ: 67.5,
    sx: 7.5,
    sy: FIRST_LEVEL_TERRAIN_HEIGHT,
    sz: 9,
  },
]

const EIGHTH_LEVEL_TERRAIN_PIECES: RuntimeTerrainPiece[] = [
  {
    name: "实体34A_5x35",
    startX: 0,
    startZ: 30,
    sx: 5,
    sy: 3,
    sz: 35,
  },
  {
    name: "实体62D_70x20",
    startX: 5,
    startZ: 40,
    sx: 70,
    sy: 3,
    sz: 20,
  },
  {
    name: "实体632_70x4",
    startX: 5,
    startZ: 40,
    sx: 70,
    sy: 5,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体689_70x4",
    startX: 5,
    startZ: 56,
    sx: 70,
    sy: 5,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体685_27_5x1_8",
    startX: 9.5,
    startZ: 48,
    sx: 27.5,
    sy: 3,
    sz: 1.8,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6C1_27_5x1_8",
    startX: 9.5,
    startZ: 50.2,
    sx: 27.5,
    sy: 3,
    sz: 1.8,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体675_0_5x4",
    startX: 10.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6B9_0_5x4",
    startX: 10.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体626_7_5x10",
    startX: 11,
    startZ: 5,
    sx: 7.5,
    sy: 3,
    sz: 10,
  },
  {
    name: "实体671_0_5x4",
    startX: 15.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6B5_0_5x4",
    startX: 15.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体66D_0_5x4",
    startX: 20.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6B1_0_5x4",
    startX: 20.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体669_0_5x4",
    startX: 25.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6AD_0_5x4",
    startX: 25.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体665_0_5x4",
    startX: 30.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6A9_0_5x4",
    startX: 30.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体661_0_5x4",
    startX: 35.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6A5_0_5x4",
    startX: 35.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体575_7_5x10",
    startX: 41,
    startZ: 5,
    sx: 7.5,
    sy: 3,
    sz: 10,
  },
  {
    name: "实体681_27_5x1_8",
    startX: 44.5,
    startZ: 48,
    sx: 27.5,
    sy: 3,
    sz: 1.8,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6BD_27_5x1_8",
    startX: 44.5,
    startZ: 50.2,
    sx: 27.5,
    sy: 3,
    sz: 1.8,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体65D_0_5x4",
    startX: 45.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体6A1_0_5x4",
    startX: 45.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体659_0_5x4",
    startX: 50.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体69D_0_5x4",
    startX: 50.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体655_0_5x4",
    startX: 55.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体699_0_5x4",
    startX: 55.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体651_0_5x4",
    startX: 60.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体695_0_5x4",
    startX: 60.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体645_0_5x4",
    startX: 65.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体649_0_5x4",
    startX: 65.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体64D_0_5x4",
    startX: 65.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体691_0_5x4",
    startX: 65.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体640_0_5x4",
    startX: 70.5,
    startZ: 44,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体68D_0_5x4",
    startX: 70.5,
    startZ: 52,
    sx: 0.5,
    sy: 1,
    sz: 4,
    baseY: RAISED_TERRAIN_BASE_Y,
  },
  {
    name: "实体40F_15x54",
    startX: 75,
    startZ: 13,
    sx: 15,
    sy: 3,
    sz: 54,
  },
  {
    name: "实体406_10x60",
    startX: 90,
    startZ: 10,
    sx: 10,
    sy: 3,
    sz: 60,
  },
]

let fastRunSystem: FastRunSystem | undefined
let registered = false
let runtimeFloorsCreated = false
let runtimeTilesCreated = false
let runtimeWallsCreated = false
let runtimeCeilingCreated = false
let runtimeGridDrawStarted = false
let runtimeCompressorStarted = false
let runtimeSixthFloorMoveStarted = false
let currentSpeedValue = DEFAULT_SPEED
let displayTargetsLogged = false
const enabledRoles = new Map<string, boolean>()
const touchDebounce = new Map<string, boolean>()
const registeredOverlayButtons = new Map<string, boolean>()
const spawnAdjustedRoles = new Map<string, boolean>()
let runtimeCompressorPieces: RuntimeCompressorPiece[] = []
let runtimeSixthMovingFloor: RuntimeMovingFloor | undefined

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
    `[${FLOOR_TAG}] create begin copies=${RUNTIME_COPY_COUNT} total_modules=${RUNTIME_COPY_COUNT + 1} module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 original_prefab=${ORIGINAL_FLOOR_PREFAB_ID} level_prefab=${LEVEL_FLOOR_PREFAB_ID} base_y=${FLOOR_BASE_Y} step_x=${MODULE_STEP_X}`
  )
  print(
    `[${FLOOR_TAG}] existing name=${runtimeModuleName(floor.name, 0)} unit=2134777966 base=(${floor.x},${FLOOR_BASE_Y},${floor.z}) scale=(${floor.sx},${floor.sy},${floor.sz}) source=editor`
  )

  let moduleIndex = 1
  const createBatch = (): void => {
    let createdThisFrame = 0
    while (moduleIndex <= RUNTIME_COPY_COUNT && createdThisFrame < RUNTIME_FLOOR_CREATE_BATCH_SIZE) {
      const x = floor.x + MODULE_STEP_X * moduleIndex
      const unit = safeCreateObstacle(
        LEVEL_FLOOR_PREFAB_ID,
        math.Vector3(x as Fixed, FLOOR_BASE_Y as Fixed, floor.z as Fixed),
        math.Vector3(floor.sx as Fixed, floor.sy as Fixed, floor.sz as Fixed),
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
        `[${FLOOR_TAG}] created name=${name} unit=${tostring(unit)} prefab=${LEVEL_FLOOR_PREFAB_ID} base=(${x},${FLOOR_BASE_Y},${floor.z}) scale=(${floor.sx},${floor.sy},${floor.sz}) batch_size=${RUNTIME_FLOOR_CREATE_BATCH_SIZE}`
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

  const floor = RUNTIME_FLOOR
  print(
    `[${TILE_TAG}] create begin modules=${RUNTIME_COPY_COUNT} full_tiles=${RUNTIME_COPY_COUNT} first_level_terrain_pieces=${FIRST_LEVEL_TERRAIN_PIECES.length} module_1=第1关 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${TILE_BASE_Y} step_x=${MODULE_STEP_X} original_floor=kept birth_tile=editor`
  )
  for (let moduleIndex = 1; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const x = floor.x + MODULE_STEP_X * moduleIndex
    if (moduleIndex === FIRST_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        FIRST_LEVEL_TERRAIN_MODULE_INDEX,
        FIRST_LEVEL_TERRAIN_PIECES,
        "40_gap10_35_gap5_10",
        "x_gap1=839..849_width10_x_gap2=884..889_width5"
      )
      continue
    }
    if (moduleIndex === SECOND_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        SECOND_LEVEL_TERRAIN_MODULE_INDEX,
        SECOND_LEVEL_TERRAIN_PIECES,
        "solid_only_15x39_11_60x59_5_10x30",
        "solid_dims_only aux_lines_ignored right_z=-56..-16.88881923371275 center_z=-66..-6.5 left_z=-51..-21"
      )
      continue
    }
    if (moduleIndex === THIRD_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        THIRD_LEVEL_TERRAIN_MODULE_INDEX,
        THIRD_LEVEL_TERRAIN_PIECES,
        "solid_only_third_level_right_step_center_4x3_left_strip",
        "solid_dims_only aux_lines_ignored right_step=15x40+7.5x10 center_grid=4x3_each15x13.75_gap5 left_strip=10x80"
      )
      continue
    }
    if (moduleIndex === FOURTH_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        FOURTH_LEVEL_TERRAIN_MODULE_INDEX,
        FOURTH_LEVEL_TERRAIN_PIECES,
        "solid_only_fourth_level2_from_dxf",
        "solid_dims_only aux_lines_ignored dxf_outer=100x80 flat=6 press_plates=2 plates_above_middle gap_y=10 h=5 left_plate=30x20 right_plate=35x20"
      )
      continue
    }
    if (moduleIndex === FIFTH_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        FIFTH_LEVEL_TERRAIN_MODULE_INDEX,
        FIFTH_LEVEL_TERRAIN_PIECES,
        "solid_only_fifth_level_from_dxf",
        "solid_dims_only aux_lines_ignored dxf_outer=100x80 pieces=11 plan_view_match=true main_path=5x30+5x14+12.5x14+20x14+10x60 side_blocks=6"
      )
      continue
    }
    if (moduleIndex === SIXTH_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        SIXTH_LEVEL_TERRAIN_MODULE_INDEX,
        SIXTH_LEVEL_TERRAIN_PIECES,
        "solid_only_sixth_level_from_dxf",
        "solid_dims_only aux_lines_ignored dxf_outer=100x80 pieces=5 main_path=5x30+5x14+60x14+20x14+10x60"
      )
      continue
    }
    if (moduleIndex === SEVENTH_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrain(
        floor,
        x,
        SEVENTH_LEVEL_TERRAIN_MODULE_INDEX,
        SEVENTH_LEVEL_TERRAIN_PIECES,
        "solid_only_seventh_level_from_dxf",
        "solid_dims_only aux_lines_ignored dxf_outer=100x80 pieces=7 path=5x30+5x14+10x14+15x14+10x60 jump_blocks=7.5x10+7.5x9"
      )
      continue
    }
    if (moduleIndex === EIGHTH_LEVEL_TERRAIN_MODULE_INDEX) {
      createRuntimeTerrainBatched(
        floor,
        x,
        EIGHTH_LEVEL_TERRAIN_MODULE_INDEX,
        EIGHTH_LEVEL_TERRAIN_PIECES,
        "solid_only_eighth_level_from_dxf",
        "solid_dims_only aux_lines_ignored dxf_outer=100x80 pieces=38 entry=10x60+15x54 parsed_connection=true raised_on_top=true",
        EIGHTH_LEVEL_TERRAIN_CREATE_BATCH_SIZE
      )
      continue
    }
    const name = runtimeModuleName("地砖", moduleIndex)
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, TILE_BASE_Y as Fixed, floor.z as Fixed),
      math.Vector3(floor.sx as Fixed, TILE_HEIGHT as Fixed, floor.sz as Fixed),
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
      `[${TILE_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${TILE_BASE_Y},${floor.z}) scale=(${floor.sx},${TILE_HEIGHT},${floor.sz}) mirror=false`
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
    moduleIndex === EIGHTH_LEVEL_TERRAIN_MODULE_INDEX
  )
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
    const y = piece.baseY === undefined ? FIRST_LEVEL_TERRAIN_BASE_Y : piece.baseY
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
      const y = piece.baseY === undefined ? FIRST_LEVEL_TERRAIN_BASE_Y : piece.baseY
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

function createRuntimeWalls(): void {
  if (runtimeWallsCreated) {
    return
  }
  runtimeWallsCreated = true

  const wallCount = RUNTIME_WALLS.length * (RUNTIME_COPY_COUNT + 1) - RUNTIME_COPY_COUNT - 1
  print(
    `[${WALL_TAG}] create begin count=${wallCount} modules=${RUNTIME_COPY_COUNT + 1} module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${WALL_BASE_Y} height=${WALL_HEIGHT} step_x=${MODULE_STEP_X} shared_opening=west_gap`
  )
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const offsetX = MODULE_STEP_X * moduleIndex
    for (let i = 0; i < RUNTIME_WALLS.length; i++) {
      const wall = RUNTIME_WALLS[i]!
      if (wall.side === "east" && moduleIndex > 0) {
        continue
      }
      if (wall.side === "west" && moduleIndex === RUNTIME_COPY_COUNT) {
        continue
      }
      const x = wall.x + offsetX
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
    if (moduleIndex === RUNTIME_COPY_COUNT) {
      const wall = FINAL_WEST_WALL
      const x = wall.x + offsetX
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
  }
}

function createRuntimeCeiling(): void {
  if (runtimeCeilingCreated) {
    return
  }
  runtimeCeilingCreated = true

  const ceiling = RUNTIME_CEILING
  print(
    `[${CEILING_TAG}] create begin count=${RUNTIME_COPY_COUNT + 1} module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${CEILING_BASE_Y} step_x=${MODULE_STEP_X}`
  )
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const x = ceiling.x + MODULE_STEP_X * moduleIndex
    const name = runtimeModuleName(ceiling.name, moduleIndex)
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, CEILING_BASE_Y as Fixed, ceiling.z as Fixed),
      math.Vector3(ceiling.sx as Fixed, ceiling.sy as Fixed, ceiling.sz as Fixed),
      { tag: `runtime_ceiling_create_${name}`, logger: print }
    )
    print(
      `[${CEILING_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${CEILING_BASE_Y},${ceiling.z}) scale=(${ceiling.sx},${ceiling.sy},${ceiling.sz})`
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
