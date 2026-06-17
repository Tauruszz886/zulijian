import { safeCall, safeCreateCustomTriggerSpace, safeCreateObstacle } from "@common/engine_safe"
import { TriggerHub } from "@common/trigger_hub"

const TAG = "ZLJ_RUNTIME_MIDDLE_LAYER"
const LAYER_PREFAB_ID = 105205
const RETURN_TRIGGER_PREFAB_ID = 3101010
const BIRTH_SPAWN_X = 949
const BIRTH_SPAWN_Y = 8
const BIRTH_SPAWN_Z = -36
const LAYER_SY = 1
const TRIGGER_SY = 0.6
const DOWN_Y = 2
const UP_Y = 3.1
const MOVE_SECONDS = 2
const MOVE_FRAMES = 40
const HOLD_SECONDS = 0.4

export const FIFTH_MIDDLE_LAYER_CREATE_DELAY_SECONDS = 3.5

type RuntimeFloor = {
  z: number
  sx: number
  sz: number
}

type MiddleLayerSpec = {
  name: string
  startX: number
  startZ: number
  sx: number
  sz: number
}

type MiddleLayerPart = {
  name: string
  unit: unknown
  trigger: unknown
  x: number
  z: number
}

type CreateOptions = {
  floor: RuntimeFloor
  moduleCenterX: number
  moduleLabel: string
}

declare function print(v: unknown): void
declare function tostring(v: unknown): string
declare const EVENT: {
  TIMEOUT: string
  ANY_LIFEENTITY_TRIGGER_SPACE: string
}
declare const Enums: { TriggerSpaceEventType: { ENTER: number } }
declare const LuaAPI: unknown
declare const math: unknown

const SPECS: readonly MiddleLayerSpec[] = [
  { name: "夹层A", startX: 0, startZ: 0, sx: 16, sz: 31.25 },
  { name: "夹层B", startX: 0, startZ: 68.75, sx: 16, sz: 31.25 },
  { name: "夹层C", startX: 16, startZ: 0, sx: 128, sz: 41.25 },
  { name: "夹层D", startX: 16, startZ: 58.75, sx: 128, sz: 41.25 },
  { name: "夹层E", startX: 144, startZ: 0, sx: 16, sz: 12.5 },
  { name: "夹层F", startX: 144, startZ: 87.5, sx: 16, sz: 12.5 },
]

let created = false
let moving = false
let parts: MiddleLayerPart[] = []
const returnDebounce = new Map<string, boolean>()

function fixed(v: number): Fixed {
  return (v + 0.1 - 0.1) as Fixed
}

function vec3(x: number, y: number, z: number): unknown {
  return (math as any).Vector3(fixed(x), fixed(y), fixed(z))
}

function triggerY(layerY: number): number {
  return layerY + LAYER_SY / 2 + TRIGGER_SY / 2
}

function setPartY(part: MiddleLayerPart, y: number): void {
  safeCall(
    () => {
      ;(part.unit as any).set_position(vec3(part.x, y, part.z))
    },
    { tag: `middle_layer_set_${part.name}`, fallback: undefined, logger: print }
  )
  if (part.trigger !== null && part.trigger !== undefined) {
    safeCall(
      () => {
        ;(part.trigger as any).set_position(vec3(part.x, triggerY(y), part.z))
      },
      { tag: `middle_layer_trigger_set_${part.name}`, fallback: undefined, logger: print }
    )
  }
}

function animate(toUp: boolean, done?: () => void): void {
  if (parts.length === 0) {
    if (done !== undefined) done()
    return
  }
  let frame = 0
  const stepSeconds = MOVE_SECONDS / MOVE_FRAMES
  const step = (): void => {
    frame += 1
    const t = frame / MOVE_FRAMES
    const fromY = toUp ? DOWN_Y : UP_Y
    const toY = toUp ? UP_Y : DOWN_Y
    const y = fromY + (toY - fromY) * t
    for (let i = 0; i < parts.length; i++) {
      setPartY(parts[i]!, y)
    }
    if (frame < MOVE_FRAMES) {
      ;(LuaAPI as any).call_delay_time(fixed(stepSeconds), step)
      return
    }
    if (done !== undefined) done()
  }
  step()
}

function cycle(toUp: boolean): void {
  print(`[${TAG}] move begin direction=${toUp ? "up" : "down"} parts=${parts.length} from_y=${toUp ? DOWN_Y : UP_Y} to_y=${toUp ? UP_Y : DOWN_Y} seconds=${MOVE_SECONDS}`)
  animate(toUp, () => {
    ;(LuaAPI as any).call_delay_time(fixed(HOLD_SECONDS), () => cycle(!toUp))
  })
}

function startMove(moduleLabel: string): void {
  if (moving) return
  moving = true
  if (parts.length === 0) {
    print(`[${TAG}] move skipped parts=0`)
    return
  }
  print(`[${TAG}] move start module=${moduleLabel} parts=${parts.length} down_y=${DOWN_Y} up_y=${UP_Y} trigger_prefab=${RETURN_TRIGGER_PREFAB_ID}`)
  cycle(true)
}

function returnToBirth(unit: unknown, source: string): void {
  if (unit === null || unit === undefined) {
    print(`[${TAG}] return skipped source=${source} unit=nil`)
    return
  }
  const key = tostring(unit)
  if (returnDebounce.get(key) === true) return
  returnDebounce.set(key, true)
  safeCall(
    () => {
      ;(unit as any).set_position(vec3(BIRTH_SPAWN_X, BIRTH_SPAWN_Y, BIRTH_SPAWN_Z))
    },
    { tag: `middle_layer_return_${source}`, fallback: undefined, logger: print }
  )
  print(`[${TAG}] return_to_birth source=${source} unit=${key} pos=(${BIRTH_SPAWN_X},${BIRTH_SPAWN_Y},${BIRTH_SPAWN_Z})`)
  TriggerHub.register([EVENT.TIMEOUT, 1], () => returnDebounce.delete(key), {
    safe: true,
    safeCallback: true,
    tag: `middle_layer_return_debounce_${key}`,
    logger: print,
  })
}

function handleTriggerData(data: unknown, source: string): void {
  const eventData = data as { event_unit?: unknown; unit?: unknown } | undefined
  returnToBirth(eventData?.event_unit !== undefined ? eventData.event_unit : eventData?.unit, source)
}

function registerReturnTrigger(trigger: unknown, name: string): void {
  if (trigger === null || trigger === undefined) {
    print(`[${TAG}] trigger register skipped name=${name} trigger=nil`)
    return
  }
  const triggerId = safeCall(
    () => {
      return (trigger as any).get_id()
    },
    { tag: `middle_layer_trigger_id_${name}`, fallback: null, logger: print }
  )
  if (triggerId !== null && triggerId !== undefined) {
    TriggerHub.register(
      [EVENT.ANY_LIFEENTITY_TRIGGER_SPACE, Enums.TriggerSpaceEventType.ENTER, triggerId],
      (_eventName: unknown, _actor: unknown, data: unknown) => handleTriggerData(data, `global:${name}:${tostring(triggerId)}`),
      { safe: true, safeCallback: true, tag: `middle_layer_return_global_${name}`, logger: print }
    )
  }
  print(`[${TAG}] trigger registered name=${name} trigger=${tostring(trigger)} id=${tostring(triggerId)}`)
}

export function createFifthMiddleLayer(options: CreateOptions): void {
  if (created) return
  created = true
  moving = false
  parts = []

  const moduleMinX = options.moduleCenterX - options.floor.sx / 2
  const moduleMinZ = options.floor.z - options.floor.sz / 2
  print(`[${TAG}] create begin module=${options.moduleLabel} parts=${SPECS.length} layer_prefab=${LAYER_PREFAB_ID} trigger_prefab=${RETURN_TRIGGER_PREFAB_ID} down_y=${DOWN_Y} up_y=${UP_Y}`)
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]!
    const x = moduleMinX + spec.startX + spec.sx / 2
    const z = moduleMinZ + spec.startZ + spec.sz / 2
    const name = `${options.moduleLabel}_${spec.name}`
    const unit = safeCreateObstacle(
      LAYER_PREFAB_ID,
      vec3(x, DOWN_Y, z),
      vec3(spec.sx, LAYER_SY, spec.sz),
      { tag: `middle_layer_create_${name}`, logger: print }
    )
    const trigger = safeCreateCustomTriggerSpace(
      RETURN_TRIGGER_PREFAB_ID,
      vec3(x, triggerY(DOWN_Y), z),
      vec3(spec.sx, TRIGGER_SY, spec.sz),
      { tag: `middle_layer_trigger_create_${name}`, logger: print }
    )
    registerReturnTrigger(trigger, name)
    if (unit !== null && unit !== undefined) {
      parts.push({ name, unit, trigger, x, z })
    }
    print(`[${TAG}] created name=${name} unit=${tostring(unit)} trigger=${tostring(trigger)} pos=(${x},${DOWN_Y},${z}) scale=(${spec.sx},${LAYER_SY},${spec.sz}) trigger_y=${triggerY(DOWN_Y)} x_range=${moduleMinX + spec.startX}..${moduleMinX + spec.startX + spec.sx} z_range=${moduleMinZ + spec.startZ}..${moduleMinZ + spec.startZ + spec.sz}`)
  }
  startMove(options.moduleLabel)
}
