import { safeCall, safeCreateCustomTriggerSpace, safeCreateObstacle } from "@common/engine_safe"
import { EventBus } from "@common/event_bus"
import { TriggerHub } from "@common/trigger_hub"
import { FIRST_LEVEL_TERRAIN_BASE_Y, FIRST_LEVEL_TERRAIN_HEIGHT } from "./runtime_config"
import { eliminateUnitAndRebirthAtBirth } from "./runtime_rebirth"
import { asFixed, getRuntimeFloorForModule, getRuntimeModuleCenterX } from "./runtime_layout"
import { getOnlineRoles, roleKey } from "./runtime_roles"
import { GAME_EVENTS } from "./utils/GameEvents"

const TAG = "ZLJ_SECOND_CHASER"
const MODULE_INDEX = 2
const CHASER_PREFAB_ID = 1073774719
const DEATH_TRIGGER_PREFAB_ID = 3101010
const CHASER_SIZE = 2
const DEATH_TRIGGER_SIZE = 2.6
const CHASE_RADIUS = 50
const CHASE_SPEED = 20
const TICK_SECONDS = 0.1
const ROLL_RADIUS = CHASER_SIZE / 2
const CHASER_SURFACE_CLEARANCE = 0.15
const CHASER_BASE_Y = FIRST_LEVEL_TERRAIN_BASE_Y + FIRST_LEVEL_TERRAIN_HEIGHT + ROLL_RADIUS + CHASER_SURFACE_CLEARANCE
const CHASER_MASS = 1
const CHASER_ACCELERATION_SECONDS = 0.2
const CHASER_PUSH_FORCE = CHASER_MASS * (CHASE_SPEED / CHASER_ACCELERATION_SECONDS)
const CHASER_ROLL_TORQUE = CHASER_PUSH_FORCE * ROLL_RADIUS
const STOP_DISTANCE = 0.4
const HEIGHT_LOCK_TOLERANCE = 0.05
const PHYSICS_MOVE_EPSILON = 0.1
const RESET_HEIGHT_LOCK_DELAYS = [0.05, 0.2, 0.5] as const

const SPHERE_MARK_LOCAL_X = 54.967105
const SPHERE_MARK_LOCAL_Z = 51.164887

const MIDDLE_PLATFORM = {
  startX: 24,
  startZ: 12.5,
  sx: 104,
  sz: 74.375,
} as const

const EXIT_A_PLATFORM = {
  startX: 0,
  startZ: 31.25,
  sx: 16,
  sz: 37.5,
} as const

type Rect = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

type Position2 = {
  x: number
  z: number
}

type NearestRole = {
  key: string
  pos: Position2
  distanceSq: number
}

let started = false
let stopped = false
let chaserUnit: unknown
let chaserTrigger: unknown
let chaserPosition: Position2 | undefined
let debugTickCount = 0
let activeRoleKey: string | undefined
let physicsDebugCount = 0
let tickGeneration = 0
let chaserForceDriveEnabled = false

declare const EVENT: {
  ANY_LIFEENTITY_TRIGGER_SPACE: string
}
declare const Enums: { TriggerSpaceEventType: { ENTER: number }; RigidBodyType: { DYNAMIC: number } }

function vec3(x: number, y: number, z: number): unknown {
  return math.Vector3(asFixed(x), asFixed(y), asFixed(z))
}

function getModuleMinX(): number {
  const floor = getRuntimeFloorForModule(MODULE_INDEX)
  return getRuntimeModuleCenterX(MODULE_INDEX) - floor.sx / 2
}

function getModuleMinZ(): number {
  const floor = getRuntimeFloorForModule(MODULE_INDEX)
  return floor.z - floor.sz / 2
}

function localPointToWorld(localX: number, localZ: number): Position2 {
  return {
    x: getModuleMinX() + localX,
    z: getModuleMinZ() + localZ,
  }
}

function localRectToWorld(startX: number, startZ: number, sx: number, sz: number, inset: number): Rect {
  const min = localPointToWorld(startX, startZ)
  return {
    minX: min.x + inset,
    maxX: min.x + sx - inset,
    minZ: min.z + inset,
    maxZ: min.z + sz - inset,
  }
}

function clamp(value: number, min: number, max: number): number {
  return math.max(min, math.min(max, value))
}

function clampToRect(pos: Position2, rect: Rect): Position2 {
  return {
    x: clamp(pos.x, rect.minX, rect.maxX),
    z: clamp(pos.z, rect.minZ, rect.maxZ),
  }
}

function isInsideRect(pos: Position2, rect: Rect): boolean {
  return pos.x >= rect.minX && pos.x <= rect.maxX && pos.z >= rect.minZ && pos.z <= rect.maxZ
}

function getRolePosition(role: Role): Position2 | undefined {
  const character = safeCall(
    () => {
      return (role as any).get_ctrl_unit()
    },
    { tag: "second_chaser_get_ctrl_unit", fallback: null, logger: print }
  )
  if (character === null || character === undefined) {
    return undefined
  }
  const pos = safeCall(
    () => {
      return (character as any).get_position()
    },
    { tag: "second_chaser_get_role_position", fallback: null, logger: print }
  )
  if (pos === null || pos === undefined) {
    return undefined
  }
  return { x: (pos as any).x as number, z: (pos as any).z as number }
}

function findActiveRoleOnAPlatform(aPlatform: Rect): { key: string; pos: Position2 } | undefined {
  if (activeRoleKey === undefined) {
    return undefined
  }
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const key = roleKey(roles[i]!)
    if (key !== activeRoleKey) {
      continue
    }
    const pos = getRolePosition(roles[i]!)
    if (pos !== undefined && isInsideRect(pos, aPlatform)) {
      return { key, pos }
    }
  }
  return undefined
}

function findNearestRoleInRange(center: Position2): Position2 | undefined {
  const nearest = findNearestRole(center)
  if (nearest === undefined || nearest.distanceSq > CHASE_RADIUS * CHASE_RADIUS) {
    return undefined
  }
  return nearest.pos
}

function findNearestRole(center: Position2): NearestRole | undefined {
  const roles = getOnlineRoles()
  let nearest: Position2 | undefined
  let nearestKey: string | undefined
  let nearestDistanceSq = 999999999
  for (let i = 0; i < roles.length; i++) {
    const pos = getRolePosition(roles[i]!)
    if (pos === undefined) {
      continue
    }
    const dx = pos.x - center.x
    const dz = pos.z - center.z
    const distanceSq = dx * dx + dz * dz
    if (distanceSq <= nearestDistanceSq) {
      nearest = pos
      nearestKey = roleKey(roles[i]!)
      nearestDistanceSq = distanceSq
    }
  }
  if (nearest === undefined || nearestKey === undefined) {
    return undefined
  }
  return { key: nearestKey, pos: nearest, distanceSq: nearestDistanceSq }
}

function setChaserPosition(pos: Position2): void {
  if (chaserUnit === null || chaserUnit === undefined) {
    return
  }
  chaserPosition = pos
  safeCall(
    () => {
      ;(chaserUnit as any).set_position(vec3(pos.x, CHASER_BASE_Y, pos.z))
    },
    { tag: "second_chaser_set_position", fallback: undefined, logger: print }
  )
  if (chaserTrigger !== null && chaserTrigger !== undefined) {
    safeCall(
      () => {
        ;(chaserTrigger as any).set_position(vec3(pos.x, CHASER_BASE_Y, pos.z))
      },
      { tag: "second_chaser_set_trigger_position", fallback: undefined, logger: print }
    )
  }
}

function keepChaserGravityOff(source: string): void {
  if (chaserUnit === null || chaserUnit === undefined) {
    return
  }
  safeCall(
    () => {
      const target = chaserUnit as any
      if (target.disable_gravity !== undefined && target.disable_gravity !== null) {
        target.disable_gravity()
      }
    },
    { tag: `second_chaser_disable_gravity_${source}`, fallback: undefined, logger: print }
  )
}

function lockChaserOnSurface(pos: Position2, source: string): void {
  stopChaserPhysics()
  setChaserPosition(pos)
  stopChaserPhysics()
  keepChaserGravityOff(source)
  print(`[${TAG}] lock_surface source=${source} pos=(${pos.x},${CHASER_BASE_Y},${pos.z}) clearance=${CHASER_SURFACE_CLEARANCE}`)
}

function scheduleResetHeightLocks(pos: Position2, source: string): void {
  for (let i = 0; i < RESET_HEIGHT_LOCK_DELAYS.length; i++) {
    const delay = RESET_HEIGHT_LOCK_DELAYS[i]!
    safeCall(
      () => {
        ;(LuaAPI as any).call_delay_time(asFixed(delay), () => {
          if (!started) {
            return
          }
          lockChaserOnSurface(pos, `${source}_delay_${delay}`)
        })
      },
      { tag: `second_chaser_reset_lock_delay_${i}`, fallback: undefined, logger: print }
    )
  }
}

function updateChaserPositionFromPhysics(): Position2 | undefined {
  if (chaserUnit === null || chaserUnit === undefined) {
    return chaserPosition
  }
  const pos = safeCall(
    () => {
      return (chaserUnit as any).get_position()
    },
    { tag: "second_chaser_get_position", fallback: null, logger: print }
  )
  if (pos === null || pos === undefined) {
    return chaserPosition
  }
  chaserPosition = { x: (pos as any).x as number, z: (pos as any).z as number }
  const y = (pos as any).y as number
  if (math.abs(y - CHASER_BASE_Y) > HEIGHT_LOCK_TOLERANCE) {
    safeCall(
      () => {
        ;(chaserUnit as any).set_position(vec3(chaserPosition!.x, CHASER_BASE_Y, chaserPosition!.z))
      },
      { tag: "second_chaser_lock_height", fallback: undefined, logger: print }
    )
    safeCall(
      () => {
        const velocity = (chaserUnit as any).get_linear_velocity()
        ;(chaserUnit as any).set_linear_velocity(vec3((velocity as any).x as number, 0, (velocity as any).z as number))
      },
      { tag: "second_chaser_lock_vertical_velocity", fallback: undefined, logger: print }
    )
  }
  if (chaserTrigger !== null && chaserTrigger !== undefined) {
    safeCall(
      () => {
        ;(chaserTrigger as any).set_position(vec3(chaserPosition!.x, CHASER_BASE_Y, chaserPosition!.z))
      },
      { tag: "second_chaser_set_trigger_position", fallback: undefined, logger: print }
    )
  }
  return chaserPosition
}

function configureChaserPhysics(unit: unknown): void {
  const target = unit as any
  const hasRigidBodySwitch = target.set_rigid_body_type !== undefined
  const hasPhysicsSwitch = target.enable_physics !== undefined
  chaserForceDriveEnabled = hasRigidBodySwitch && hasPhysicsSwitch
  if (hasRigidBodySwitch) {
    safeCall(
      () => {
        target.set_rigid_body_type(Enums.RigidBodyType.DYNAMIC)
      },
      { tag: "second_chaser_set_rigid_body_dynamic", fallback: undefined, logger: print }
    )
  } else {
    print(`[${TAG}] physics_switch_unavailable method=set_rigid_body_type prefab=${CHASER_PREFAB_ID}`)
  }
  if (hasPhysicsSwitch) {
    safeCall(
      () => {
        target.enable_physics(true)
      },
      { tag: "second_chaser_enable_physics", fallback: undefined, logger: print }
    )
  } else {
    print(`[${TAG}] physics_switch_unavailable method=enable_physics prefab=${CHASER_PREFAB_ID}`)
  }
  if (target.enable_collision !== undefined) {
    safeCall(
      () => {
        target.enable_collision(true)
      },
      { tag: "second_chaser_enable_collision", fallback: undefined, logger: print }
    )
  }
  if (target.disable_gravity !== undefined) {
    safeCall(
      () => {
        target.disable_gravity()
      },
      { tag: "second_chaser_disable_gravity", fallback: undefined, logger: print }
    )
  }
  if (chaserForceDriveEnabled) {
    safeCall(
      () => {
        target.set_current_mass(asFixed(CHASER_MASS))
      },
      { tag: "second_chaser_set_mass", fallback: undefined, logger: print }
    )
    safeCall(
      () => {
        target.set_max_linear_velocity(asFixed(CHASE_SPEED))
      },
      { tag: "second_chaser_set_max_linear_velocity", fallback: undefined, logger: print }
    )
  }
  print(
    `[${TAG}] physics_config mass=${CHASER_MASS} target_speed=${CHASE_SPEED} accel_time=${CHASER_ACCELERATION_SECONDS} push_force=${CHASER_PUSH_FORCE} roll_torque=${CHASER_ROLL_TORQUE} force_drive=${chaserForceDriveEnabled}`
  )
}

function stopChaserPhysics(): void {
  if (chaserUnit === null || chaserUnit === undefined) {
    return
  }
  safeCall(
    () => {
      ;(chaserUnit as any).set_linear_velocity(vec3(0, 0, 0))
    },
    { tag: "second_chaser_stop_linear_velocity", fallback: undefined, logger: print }
  )
  safeCall(
    () => {
      ;(chaserUnit as any).set_angular_velocity(vec3(0, 0, 0))
    },
    { tag: "second_chaser_stop_angular_velocity", fallback: undefined, logger: print }
  )
}

function driveChaserToward(current: Position2, target: Position2, allowedRect: Rect): void {
  if (chaserUnit === null || chaserUnit === undefined) {
    return
  }
  if (!isInsideRect(current, allowedRect)) {
    const clamped = clampToRect(current, allowedRect)
    setChaserPosition(clamped)
    stopChaserPhysics()
    return
  }

  const clampedTarget = clampToRect(target, allowedRect)
  const dx = clampedTarget.x - current.x
  const dz = clampedTarget.z - current.z
  const distance = math.sqrt(dx * dx + dz * dz)
  if (distance <= STOP_DISTANCE) {
    stopChaserPhysics()
    return
  }

  const dirX = dx / distance
  const dirZ = dz / distance
  const rollOmega = CHASE_SPEED / ROLL_RADIUS
  const horizontalVelocity = vec3(dirX * CHASE_SPEED, 0, dirZ * CHASE_SPEED)
  if (chaserForceDriveEnabled) {
    safeCall(
      () => {
        ;(chaserUnit as any).apply_force(vec3(dirX * CHASER_PUSH_FORCE, 0, dirZ * CHASER_PUSH_FORCE))
      },
      { tag: "second_chaser_apply_force", fallback: undefined, logger: print }
    )
    safeCall(
      () => {
        ;(chaserUnit as any).apply_torque(vec3(-dirZ * CHASER_ROLL_TORQUE, 0, dirX * CHASER_ROLL_TORQUE))
      },
      { tag: "second_chaser_apply_torque", fallback: undefined, logger: print }
    )
  }
  safeCall(
    () => {
      ;(chaserUnit as any).set_angular_velocity(vec3(-dirZ * rollOmega, 0, dirX * rollOmega))
    },
    { tag: "second_chaser_set_angular_velocity", fallback: undefined, logger: print }
  )
  safeCall(
    () => {
      ;(chaserUnit as any).set_linear_velocity(horizontalVelocity)
    },
    { tag: "second_chaser_set_linear_velocity", fallback: undefined, logger: print }
  )

  const velocity = safeCall(
    () => {
      return (chaserUnit as any).get_linear_velocity()
    },
    { tag: "second_chaser_get_linear_velocity", fallback: null, logger: print }
  )
  if (velocity !== null && velocity !== undefined) {
    const vx = (velocity as any).x as number
    const vz = (velocity as any).z as number
    const horizontalSpeed = math.sqrt(vx * vx + vz * vz)
    if (horizontalSpeed <= PHYSICS_MOVE_EPSILON) {
      const step = math.min(CHASE_SPEED * TICK_SECONDS, distance)
      const next = clampToRect({ x: current.x + dirX * step, z: current.z + dirZ * step }, allowedRect)
      setChaserPosition(next)
    } else if (horizontalSpeed > CHASE_SPEED) {
      safeCall(
        () => {
          ;(chaserUnit as any).set_linear_velocity(horizontalVelocity)
        },
        { tag: "second_chaser_clamp_linear_velocity", fallback: undefined, logger: print }
      )
    }
    physicsDebugCount += 1
    if (physicsDebugCount % 10 === 0) {
      print(
        `[${TAG}] physics_drive pos=(${current.x},${CHASER_BASE_Y},${current.z}) target=(${target.x},${target.z}) speed=${horizontalSpeed} force=${CHASER_PUSH_FORCE} force_drive=${chaserForceDriveEnabled} omega=${rollOmega} fallback=${horizontalSpeed <= PHYSICS_MOVE_EPSILON}`
      )
    }
  } else {
    const step = math.min(CHASE_SPEED * TICK_SECONDS, distance)
    const next = clampToRect({ x: current.x + dirX * step, z: current.z + dirZ * step }, allowedRect)
    setChaserPosition(next)
  }
}

function extractTriggerUnit(data: unknown): unknown {
  const eventData = data as { event_unit?: unknown; unit?: unknown } | undefined
  return eventData?.event_unit !== undefined ? eventData.event_unit : eventData?.unit
}

function registerChaserDeathTrigger(trigger: unknown): void {
  if (trigger === null || trigger === undefined) {
    print(`[${TAG}] death trigger skipped trigger=nil`)
    return
  }
  const triggerId = safeCall(
    () => {
      return (trigger as any).get_id()
    },
    { tag: "second_chaser_death_trigger_id", fallback: null, logger: print }
  )
  if (triggerId === null || triggerId === undefined) {
    print(`[${TAG}] death trigger skipped id=nil`)
    return
  }
  TriggerHub.register(
    [EVENT.ANY_LIFEENTITY_TRIGGER_SPACE, Enums.TriggerSpaceEventType.ENTER, triggerId],
    (_eventName: unknown, _actor: unknown, data: unknown) => {
      eliminateUnitAndRebirthAtBirth(extractTriggerUnit(data), `second_chaser:${tostring(triggerId)}`)
    },
    {
      safe: true,
      safeCallback: true,
      tag: "second_chaser_death",
      logger: print,
    }
  )
  print(`[${TAG}] death trigger registered id=${tostring(triggerId)} prefab=${DEATH_TRIGGER_PREFAB_ID}`)
}

function tick(generation: number): void {
  if (!started || generation !== tickGeneration || stopped || chaserPosition === undefined) {
    return
  }
  debugTickCount += 1
  const currentPosition = updateChaserPositionFromPhysics()
  if (currentPosition === undefined) {
    return
  }

  const aPlatform = localRectToWorld(
    EXIT_A_PLATFORM.startX,
    EXIT_A_PLATFORM.startZ,
    EXIT_A_PLATFORM.sx,
    EXIT_A_PLATFORM.sz,
    0
  )
  const activeRoleOnA = findActiveRoleOnAPlatform(aPlatform)
  if (activeRoleOnA !== undefined) {
    stopped = true
    stopChaserPhysics()
    print(
      `[${TAG}] stopped player_on_a_platform role=${activeRoleOnA.key} role_pos=(${activeRoleOnA.pos.x},${activeRoleOnA.pos.z}) chaser_pos=(${currentPosition.x},${CHASER_BASE_Y},${currentPosition.z})`
    )
    return
  }

  const allowedRect = localRectToWorld(
    MIDDLE_PLATFORM.startX,
    MIDDLE_PLATFORM.startZ,
    MIDDLE_PLATFORM.sx,
    MIDDLE_PLATFORM.sz,
    CHASER_SIZE / 2
  )
  const nearest = findNearestRole(currentPosition)
  if (debugTickCount % 10 === 0) {
    if (nearest === undefined) {
      print(`[${TAG}] tick pos=(${currentPosition.x},${CHASER_BASE_Y},${currentPosition.z}) nearest=nil radius=${CHASE_RADIUS}`)
    } else {
      print(
        `[${TAG}] tick pos=(${currentPosition.x},${CHASER_BASE_Y},${currentPosition.z}) nearest=(${nearest.pos.x},${nearest.pos.z}) distance=${math.sqrt(nearest.distanceSq)} in_range=${nearest.distanceSq <= CHASE_RADIUS * CHASE_RADIUS}`
      )
    }
  }
  if (nearest !== undefined && nearest.distanceSq <= CHASE_RADIUS * CHASE_RADIUS) {
    activeRoleKey = nearest.key
    driveChaserToward(currentPosition, nearest.pos, allowedRect)
  } else {
    stopChaserPhysics()
  }

  ;(LuaAPI as any).call_delay_time(asFixed(TICK_SECONDS), () => tick(generation))
}

export function startSecondLevelChaser(): void {
  if (started) {
    return
  }
  started = true
  stopped = false
  activeRoleKey = undefined
  chaserTrigger = undefined
  physicsDebugCount = 0
  tickGeneration += 1

  const allowedRect = localRectToWorld(
    MIDDLE_PLATFORM.startX,
    MIDDLE_PLATFORM.startZ,
    MIDDLE_PLATFORM.sx,
    MIDDLE_PLATFORM.sz,
    CHASER_SIZE / 2
  )
  const startPos = clampToRect(localPointToWorld(SPHERE_MARK_LOCAL_X, SPHERE_MARK_LOCAL_Z), allowedRect)
  chaserPosition = startPos
  chaserUnit = safeCreateObstacle(
    CHASER_PREFAB_ID,
    vec3(startPos.x, CHASER_BASE_Y, startPos.z),
    vec3(CHASER_SIZE, CHASER_SIZE, CHASER_SIZE),
    { tag: "second_chaser_create", logger: print }
  )
  if (chaserUnit === null || chaserUnit === undefined) {
    print(`[${TAG}] create failed prefab=${CHASER_PREFAB_ID}`)
    return
  }
  configureChaserPhysics(chaserUnit)
  chaserTrigger = safeCreateCustomTriggerSpace(
    DEATH_TRIGGER_PREFAB_ID,
    vec3(startPos.x, CHASER_BASE_Y, startPos.z),
    vec3(DEATH_TRIGGER_SIZE, DEATH_TRIGGER_SIZE, DEATH_TRIGGER_SIZE),
    { tag: "second_chaser_death_trigger_create", logger: print }
  )
  registerChaserDeathTrigger(chaserTrigger)

  print(
    `[${TAG}] start prefab=${CHASER_PREFAB_ID} pos=(${startPos.x},${CHASER_BASE_Y},${startPos.z}) size=${CHASER_SIZE} radius=${CHASE_RADIUS} speed=${CHASE_SPEED} mass=${CHASER_MASS} trigger_prefab=${DEATH_TRIGGER_PREFAB_ID} trigger_size=${DEATH_TRIGGER_SIZE} middle_bounds=(${allowedRect.minX}..${allowedRect.maxX},${allowedRect.minZ}..${allowedRect.maxZ}) stop_on_a=true`
  )
  tick(tickGeneration)
}

function resetSecondChaserToInitial(source: string): void {
  if (!started) {
    return
  }
  const allowedRect = localRectToWorld(
    MIDDLE_PLATFORM.startX,
    MIDDLE_PLATFORM.startZ,
    MIDDLE_PLATFORM.sx,
    MIDDLE_PLATFORM.sz,
    CHASER_SIZE / 2
  )
  const startPos = clampToRect(localPointToWorld(SPHERE_MARK_LOCAL_X, SPHERE_MARK_LOCAL_Z), allowedRect)
  stopped = false
  activeRoleKey = undefined
  physicsDebugCount = 0
  tickGeneration += 1
  stopChaserPhysics()
  lockChaserOnSurface(startPos, `reset_${source}`)
  scheduleResetHeightLocks(startPos, `reset_${source}`)
  print(`[${TAG}] reset_to_initial source=${source} pos=(${startPos.x},${CHASER_BASE_Y},${startPos.z})`)
  tick(tickGeneration)
}

EventBus.on(GAME_EVENTS.PLAYER_DIED_TO_REBIRTH, (_unit: unknown, source: unknown) => {
  resetSecondChaserToInitial(tostring(source))
})
