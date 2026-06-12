import { safeCall, safeCreateObstacle } from "@common/engine_safe"
import { TriggerHub } from "@common/trigger_hub"
import { startFastRunSystem, type FastRunSystem } from "./fast_run_system"

const TAG = "ZLJ_MAIN"
const SPEED_TAG = "ZLJ_SPEED_UI"
const FLOOR_TAG = "ZLJ_RUNTIME_FLOOR"
const WALL_TAG = "ZLJ_RUNTIME_WALL"
const CEILING_TAG = "ZLJ_RUNTIME_CEILING"

const SPEED_DISPLAY_ID_TEXT = "1506247873"
const SPEED_DISPLAY_TARGETS = [
  {
    name: "速度文字",
    idText: "1506247873",
    fullId: "1519736575|1506247873",
  },
] as const
const TOUCH_TYPES: ENodeTouchEventType[] = [0 as integer, 1 as integer, 2 as integer, 3 as integer]
const DEFAULT_SPEED = 40
const FLOOR_PREFAB_ID = 1201010
const WALL_PREFAB_ID = 105205
const FLOOR_BASE_Y = 0
const WALL_BASE_Y = 2
const WALL_HEIGHT = 25
const CEILING_BASE_Y = 26.5
const MODULE_STEP_X = -100
const RUNTIME_COPY_COUNT = 11

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
  name: "runtime_floor_2134777966",
  x: 949,
  z: -36,
  sx: 100,
  sy: 2,
  sz: 80,
}

const RUNTIME_WALLS: RuntimeWall[] = [
  {
    name: "runtime_wall_north_2134777966",
    side: "north",
    x: 949,
    z: -75.5,
    sx: 99,
    sz: 2,
  },
  {
    name: "runtime_wall_east_2134777966",
    side: "east",
    x: 998.5,
    z: -36,
    sx: 2,
    sz: 79,
  },
  {
    name: "runtime_wall_south_2134777966",
    side: "south",
    x: 949,
    z: 3.5,
    sx: 99,
    sz: 2,
  },
  {
    name: "runtime_wall_west_nw_to_gap_2134777966",
    side: "west",
    x: 899.5,
    z: -60.5,
    sx: 2,
    sz: 30,
  },
  {
    name: "runtime_wall_west_gap_to_sw_2134777966",
    side: "west",
    x: 899.5,
    z: -11.5,
    sx: 2,
    sz: 30,
  },
]

const RUNTIME_CEILING: RuntimeCeiling = {
  name: "runtime_ceiling_2134777966",
  x: 949,
  z: -36,
  sx: 100,
  sy: 1.5,
  sz: 80,
}

let fastRunSystem: FastRunSystem | undefined
let registered = false
let runtimeFloorsCreated = false
let runtimeWallsCreated = false
let runtimeCeilingCreated = false
let currentSpeedValue = DEFAULT_SPEED
let displayTargetsLogged = false
const enabledRoles = new Map<string, boolean>()
const touchDebounce = new Map<string, boolean>()
const registeredOverlayButtons = new Map<string, boolean>()

function fastRunLogger(...args: unknown[]): void {
  const lastArg = args.length > 0 ? args[args.length - 1] : ""
  const text = tostring(lastArg)
  if (text.indexOf("[FastRunSystemVelocity]") >= 0) {
    return
  }
  print(text)
}

function runtimeModuleName(name: string, moduleIndex: number): string {
  return moduleIndex === 0 ? name : `${name}_copy_${moduleIndex}`
}

function createRuntimeFloorCopies(): void {
  if (runtimeFloorsCreated) {
    return
  }
  runtimeFloorsCreated = true

  const floor = RUNTIME_FLOOR
  print(
    `[${FLOOR_TAG}] create begin copies=${RUNTIME_COPY_COUNT} prefab=${FLOOR_PREFAB_ID} base_y=${FLOOR_BASE_Y} step_x=${MODULE_STEP_X}`
  )
  for (let moduleIndex = 1; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const x = floor.x + MODULE_STEP_X * moduleIndex
    const unit = safeCreateObstacle(
      FLOOR_PREFAB_ID,
      math.Vector3(x as Fixed, FLOOR_BASE_Y as Fixed, floor.z as Fixed),
      math.Vector3(floor.sx as Fixed, floor.sy as Fixed, floor.sz as Fixed),
      { tag: `runtime_floor_create_${runtimeModuleName(floor.name, moduleIndex)}`, logger: print }
    )
    print(
      `[${FLOOR_TAG}] created name=${runtimeModuleName(floor.name, moduleIndex)} unit=${tostring(unit)} base=(${x},${FLOOR_BASE_Y},${floor.z}) scale=(${floor.sx},${floor.sy},${floor.sz})`
    )
  }
}

function createRuntimeWalls(): void {
  if (runtimeWallsCreated) {
    return
  }
  runtimeWallsCreated = true

  const wallCount = RUNTIME_WALLS.length * (RUNTIME_COPY_COUNT + 1) - RUNTIME_COPY_COUNT
  print(
    `[${WALL_TAG}] create begin count=${wallCount} modules=${RUNTIME_COPY_COUNT + 1} prefab=${WALL_PREFAB_ID} base_y=${WALL_BASE_Y} height=${WALL_HEIGHT} step_x=${MODULE_STEP_X} shared_opening=west_gap`
  )
  for (let moduleIndex = 0; moduleIndex <= RUNTIME_COPY_COUNT; moduleIndex++) {
    const offsetX = MODULE_STEP_X * moduleIndex
    for (let i = 0; i < RUNTIME_WALLS.length; i++) {
      const wall = RUNTIME_WALLS[i]!
      if (wall.side === "east" && moduleIndex > 0) {
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
  }
}

function createRuntimeCeiling(): void {
  if (runtimeCeilingCreated) {
    return
  }
  runtimeCeilingCreated = true

  const ceiling = RUNTIME_CEILING
  print(
    `[${CEILING_TAG}] create begin count=${RUNTIME_COPY_COUNT + 1} prefab=${WALL_PREFAB_ID} base_y=${CEILING_BASE_Y} step_x=${MODULE_STEP_X}`
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

function startSystems(): void {
  if (fastRunSystem !== undefined && fastRunSystem.isRunning()) {
    return
  }

  fastRunSystem = startFastRunSystem({
    horizontalSpeed: DEFAULT_SPEED,
    maxLinearVelocity: 1000,
    obstacle: {
      enabled: true,
      distance: 2,
      logIntervalTicks: 0 as integer,
    },
    logger: fastRunLogger,
  })
  print(`[${SPEED_TAG}] fast_run_system started speed=${DEFAULT_SPEED}`)
}

function getSpeed(): number {
  return currentSpeedValue
}

function setSpeed(speed: number): number {
  startSystems()
  const next = math.floor(speed < 0 ? 0 : speed) as number
  currentSpeedValue = next
  if (fastRunSystem !== undefined) {
    fastRunSystem.setHorizontalSpeed(next)
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

function enableUiForOnlineRoles(): void {
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
  createRuntimeWalls()
  createRuntimeCeiling()
  startSystems()
  registerSpeedUiEvents()
  enableUiForOnlineRoles()
  TriggerHub.register([EVENT.TIMEOUT, 1], () => enableUiForOnlineRoles(), {
    safe: true,
    safeCallback: true,
    tag: "speed_ui_enable_delay",
    logger: print,
  })
})

startSystems()
registerSpeedUiEvents()
enableUiForOnlineRoles()
