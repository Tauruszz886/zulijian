import { TriggerHub } from "@common/trigger_hub"
import { createFifthMiddleLayer, FIFTH_MIDDLE_LAYER_CREATE_DELAY_SECONDS } from "./fifth_middle_layer"
import { FIFTH_LEVEL_TERRAIN_MODULE_INDEX, RUNTIME_CEILING_CREATE_DELAY_SECONDS, RUNTIME_TILE_CREATE_DELAY_SECONDS, RUNTIME_WALL_CREATE_DELAY_SECONDS, TAG } from "./runtime_config"
import { getRuntimeFloorForModule, getRuntimeModuleCenterX, runtimeModuleLabel } from "./runtime_layout"
import { adjustOnlineRolesSpawnToBirthTile } from "./runtime_spawn"
import { createRuntimeCeiling, createRuntimeFloorCopies, createRuntimeWalls } from "./runtime_structure"
import { createRuntimeTiles } from "./runtime_terrain"
import { hideLegacySpeedUiForOnlineRoles, startSystems } from "./runtime_speed"

function scheduleRuntimeCreation(): void {
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
  TriggerHub.register(
    [EVENT.TIMEOUT, FIFTH_MIDDLE_LAYER_CREATE_DELAY_SECONDS],
    () => {
      createFifthMiddleLayer({
        floor: getRuntimeFloorForModule(FIFTH_LEVEL_TERRAIN_MODULE_INDEX),
        moduleCenterX: getRuntimeModuleCenterX(FIFTH_LEVEL_TERRAIN_MODULE_INDEX),
        moduleLabel: runtimeModuleLabel(FIFTH_LEVEL_TERRAIN_MODULE_INDEX),
      })
    },
    {
      safe: true,
      safeCallback: true,
      tag: "runtime_middle_layer_create_delay",
      logger: print,
    }
  )
}

function schedulePlayerRuntime(): void {
  startSystems()
  hideLegacySpeedUiForOnlineRoles()
  TriggerHub.register(
    [EVENT.TIMEOUT, 1],
    () => {
      startSystems()
      hideLegacySpeedUiForOnlineRoles()
      adjustOnlineRolesSpawnToBirthTile()
    },
    {
      safe: true,
      safeCallback: true,
      tag: "player_runtime_delay",
      logger: print,
    }
  )
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
}

print(`[${TAG}] loaded`)

LuaAPI.global_register_trigger_event([EVENT.GAME_INIT], () => {
  print(`[${TAG}] game init`)
  scheduleRuntimeCreation()
  schedulePlayerRuntime()
})
