import { safeCall, safeCreateCustomTriggerSpace, safeCreateObstacle } from "@common/engine_safe"
import { LEVEL_TERRAIN_SPECS, type LevelTerrainSpec } from "./level_terrain"
import {
  BIRTH_TILE_BASE_Y,
  EIGHTH_LEVEL_MECHANISM_MOVE_SECONDS,
  EIGHTH_LEVEL_MECHANISM_MOVE_Z,
  EIGHTH_LEVEL_TERRAIN_CREATE_BATCH_SIZE,
  EIGHTH_LEVEL_TERRAIN_MODULE_INDEX,
  FIRST_LEVEL_TERRAIN_BASE_Y,
  FIRST_LEVEL_TERRAIN_HEIGHT,
  FOURTH_LEVEL_COMPRESSOR_DOWN_Y,
  FOURTH_LEVEL_COMPRESSOR_START_Y,
  RUNTIME_COPY_COUNT,
  RUNTIME_FLOOR,
  TERRAIN_TAG,
  TILE_BASE_Y,
  TILE_HEIGHT,
  TILE_TAG,
  WALL_PREFAB_ID,
  type RuntimeFloor,
  type RuntimeTerrainPiece,
} from "./runtime_config"
import { registerRuntimeCompressorPiece, resetRuntimeCompressors, startRuntimeCompressors } from "./runtime_compressor"
import { createFallReturnTriggers } from "./runtime_fall_return"
import {
  getRuntimeTerrainPieceY,
  registerEighthLevelMechanismPart,
  resetEighthLevelMechanism,
  startEighthLevelMechanism,
} from "./runtime_eighth_mechanism"
import { registerNinthVanishingPlatform, resetNinthLevelMechanism } from "./runtime_ninth_mechanism"
import { startSecondLevelChaser } from "./runtime_second_chaser"
import { registerThirdLevelTimedPlatform, resetThirdLevelMechanism, startThirdLevelMechanism } from "./runtime_third_mechanism"
import { registerTenthCurrentPart, resetTenthCurrentMechanism, startTenthCurrentMechanism } from "./runtime_tenth_current"
import {
  getRuntimeFloorForModule,
  getRuntimeModuleCenterX,
  getRuntimeTerrainFrameForModule,
  runtimeModuleLabel,
  runtimeModuleName,
} from "./runtime_layout"
import { drawRuntimeTileGrid } from "./runtime_structure"

let runtimeTilesCreated = false
const TRAILING_CURRENT_PREFAB_ID = 3301506

function getFullTileBaseY(moduleIndex: number): number {
  return moduleIndex === 0 ? BIRTH_TILE_BASE_Y : TILE_BASE_Y
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
      prefabId: spec.prefabId,
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
    baseY: spec.baseY,
    prefabId: spec.prefabId,
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

function createTerrainUnit(prefabId: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, name: string): unknown {
  const pos = math.Vector3(x as Fixed, y as Fixed, z as Fixed)
  const scale = math.Vector3(sx as Fixed, sy as Fixed, sz as Fixed)
  if (prefabId === TRAILING_CURRENT_PREFAB_ID) {
    return safeCreateCustomTriggerSpace(prefabId, pos, scale, {
      tag: `runtime_terrain_trigger_create_${name}`,
      logger: print,
    })
  }
  return safeCreateObstacle(prefabId, pos, scale, {
    tag: `runtime_terrain_create_${name}`,
    logger: print,
  })
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
  let trailingCurrentCount = 0
  let trailingCurrentMinX = 999999
  let trailingCurrentMaxX = -999999
  let trailingCurrentMinZ = 999999
  let trailingCurrentMaxZ = -999999
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!
    const y = getRuntimeTerrainPieceY(moduleIndex, piece, FIRST_LEVEL_TERRAIN_BASE_Y)
    const x = moduleMinX + piece.startX + piece.sx / 2
    const z = moduleMinZ + piece.startZ + piece.sz / 2
    const name = runtimeModuleName(piece.name, moduleIndex)
    const prefabId = piece.prefabId === undefined ? WALL_PREFAB_ID : piece.prefabId
    if (prefabId === TRAILING_CURRENT_PREFAB_ID) {
      trailingCurrentCount += 1
      trailingCurrentMinX = math.min(trailingCurrentMinX, moduleMinX + piece.startX)
      trailingCurrentMaxX = math.max(trailingCurrentMaxX, moduleMinX + piece.startX + piece.sx)
      trailingCurrentMinZ = math.min(trailingCurrentMinZ, moduleMinZ + piece.startZ)
      trailingCurrentMaxZ = math.max(trailingCurrentMaxZ, moduleMinZ + piece.startZ + piece.sz)
    }
    const unit = createTerrainUnit(
      prefabId,
      x,
      y,
      z,
      piece.sx,
      piece.sy,
      piece.sz,
      name
    )
    disableMirrorReflect(unit, `runtime_terrain_disable_mirror_${name}`)
    if (piece.compressor === true && unit !== null) {
      registerRuntimeCompressorPiece({
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
    registerNinthVanishingPlatform(moduleIndex, piece, unit, name, x, z)
    registerThirdLevelTimedPlatform(moduleIndex, piece, unit, name, x, y, z)
    registerTenthCurrentPart(moduleIndex, piece, unit, name, x, y, z)
    print(
      `[${TERRAIN_TAG}] created name=${name} unit=${tostring(unit)} prefab=${prefabId} kind=${prefabId === TRAILING_CURRENT_PREFAB_ID ? "custom_trigger" : "obstacle"} base=(${x},${y},${z}) scale=(${piece.sx},${piece.sy},${piece.sz}) x_range=${moduleMinX + piece.startX}..${moduleMinX + piece.startX + piece.sx} z_range=${moduleMinZ + piece.startZ}..${moduleMinZ + piece.startZ + piece.sz} mirror=false compressor=${piece.compressor === true}`
    )
  }
  if (trailingCurrentCount > 0) {
    print(
      `[${TERRAIN_TAG}] trailing_current_summary module=${runtimeModuleLabel(moduleIndex)} prefab=${TRAILING_CURRENT_PREFAB_ID} count=${trailingCurrentCount} x_range=${trailingCurrentMinX}..${trailingCurrentMaxX} z_range=${trailingCurrentMinZ}..${trailingCurrentMaxZ}`
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
      const y = getRuntimeTerrainPieceY(moduleIndex, piece, FIRST_LEVEL_TERRAIN_BASE_Y)
      const x = moduleMinX + piece.startX + piece.sx / 2
      const z = moduleMinZ + piece.startZ + piece.sz / 2
      const name = runtimeModuleName(piece.name, moduleIndex)
      const prefabId = piece.prefabId === undefined ? WALL_PREFAB_ID : piece.prefabId
      const unit = safeCreateObstacle(
        prefabId,
        math.Vector3(x as Fixed, y as Fixed, z as Fixed),
        math.Vector3(piece.sx as Fixed, piece.sy as Fixed, piece.sz as Fixed),
        { tag: `runtime_terrain_create_${name}`, logger: print }
      )
      disableMirrorReflect(unit, `runtime_terrain_disable_mirror_${name}`)
      registerEighthLevelMechanismPart(moduleIndex, piece, unit, name, x, y, z)
      print(
        `[${TERRAIN_TAG}] created name=${name} unit=${tostring(unit)} prefab=${prefabId} base=(${x},${y},${z}) scale=(${piece.sx},${piece.sy},${piece.sz}) x_range=${moduleMinX + piece.startX}..${moduleMinX + piece.startX + piece.sx} z_range=${moduleMinZ + piece.startZ}..${moduleMinZ + piece.startZ + piece.sz} mirror=false compressor=false batch=${math.floor(index / batchSize) + 1}`
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

export function createRuntimeTiles(): void {
  if (runtimeTilesCreated) {
    return
  }
  runtimeTilesCreated = true
  resetRuntimeCompressors()
  resetEighthLevelMechanism()
  resetNinthLevelMechanism()
  resetThirdLevelMechanism()
  resetTenthCurrentMechanism()

  print(
    `[${TILE_TAG}] create begin modules=${RUNTIME_COPY_COUNT + 1} full_or_dxf_tiles=${RUNTIME_COPY_COUNT + 1} dxf_levels=1..10 module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${TILE_BASE_Y} birth_base_y=${BIRTH_TILE_BASE_Y} terrain_source=split_level_files birth_tile=runtime`
  )
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
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
    const tileY = getFullTileBaseY(moduleIndex)
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, tileY as Fixed, RUNTIME_FLOOR.z as Fixed),
      math.Vector3(moduleFloor.sx as Fixed, TILE_HEIGHT as Fixed, moduleFloor.sz as Fixed),
      { tag: `runtime_tile_create_${name}`, logger: print }
    )
    disableMirrorReflect(unit, `runtime_tile_disable_mirror_${name}`)
    print(
      `[${TILE_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${tileY},${RUNTIME_FLOOR.z}) scale=(${moduleFloor.sx},${TILE_HEIGHT},${moduleFloor.sz}) terrain_original=true mirror=false`
    )
  }

  drawRuntimeTileGrid()
  startRuntimeCompressors()
  startThirdLevelMechanism()
  startTenthCurrentMechanism()
  startSecondLevelChaser()
  createFallReturnTriggers()
}
