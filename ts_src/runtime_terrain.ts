import { safeCall, safeCreateObstacle } from "@common/engine_safe"
import { LEVEL_TERRAIN_SPECS, type LevelTerrainSpec } from "./level_terrain"
import {
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
import {
  getRuntimeTerrainPieceY,
  registerEighthLevelMechanismPart,
  resetEighthLevelMechanism,
  startEighthLevelMechanism,
} from "./runtime_eighth_mechanism"
import {
  getRuntimeFloorForModule,
  getRuntimeModuleCenterX,
  getRuntimeTerrainFrameForModule,
  runtimeModuleLabel,
  runtimeModuleName,
} from "./runtime_layout"
import { drawRuntimeTileGrid } from "./runtime_structure"

let runtimeTilesCreated = false

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
    const y = getRuntimeTerrainPieceY(moduleIndex, piece, FIRST_LEVEL_TERRAIN_BASE_Y)
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
      const y = getRuntimeTerrainPieceY(moduleIndex, piece, FIRST_LEVEL_TERRAIN_BASE_Y)
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

export function createRuntimeTiles(): void {
  if (runtimeTilesCreated) {
    return
  }
  runtimeTilesCreated = true
  resetRuntimeCompressors()
  resetEighthLevelMechanism()

  print(
    `[${TILE_TAG}] create begin modules=${RUNTIME_COPY_COUNT + 1} full_or_dxf_tiles=${RUNTIME_COPY_COUNT + 1} dxf_levels=1..10 module_0=出生地 last_module=第${RUNTIME_COPY_COUNT}关 prefab=${WALL_PREFAB_ID} base_y=${TILE_BASE_Y} terrain_source=split_level_files birth_tile=runtime`
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
    const unit = safeCreateObstacle(
      WALL_PREFAB_ID,
      math.Vector3(x as Fixed, TILE_BASE_Y as Fixed, RUNTIME_FLOOR.z as Fixed),
      math.Vector3(moduleFloor.sx as Fixed, TILE_HEIGHT as Fixed, moduleFloor.sz as Fixed),
      { tag: `runtime_tile_create_${name}`, logger: print }
    )
    disableMirrorReflect(unit, `runtime_tile_disable_mirror_${name}`)
    print(
      `[${TILE_TAG}] created name=${name} unit=${tostring(unit)} base=(${x},${TILE_BASE_Y},${RUNTIME_FLOOR.z}) scale=(${moduleFloor.sx},${TILE_HEIGHT},${moduleFloor.sz}) terrain_original=true mirror=false`
    )
  }

  drawRuntimeTileGrid()
  startRuntimeCompressors()
}
