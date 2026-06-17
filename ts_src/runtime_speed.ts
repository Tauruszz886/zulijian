import { safeCall } from "@common/engine_safe"
import { createFastRunSystem, type FastRunSystem } from "./fast_run_system"
import { DASHBOARD_CENTER_X, DASHBOARD_CENTER_Y, DEFAULT_SPEED, SPEED_TAG } from "./runtime_config"
import { getOnlineRoles } from "./runtime_roles"

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

let fastRunSystem: FastRunSystem | undefined
let currentSpeedValue = DEFAULT_SPEED

function fastRunLogger(...args: unknown[]): void {
  const lastArg = args.length > 0 ? args[args.length - 1] : ""
  const text = tostring(lastArg)
  if (text.indexOf("[FastRunSystemVelocity]") >= 0) {
    return
  }
  print(text)
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

export function startSystems(): void {
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

export function hideLegacySpeedUiForOnlineRoles(): void {
  const roles = getOnlineRoles()
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i]
    if (role !== undefined) {
      hideLegacySpeedUiForRole(role)
    }
  }
  print(`[${SPEED_TAG}] legacy ui hidden nodes=${LEGACY_SPEED_UI_NODE_IDS.length} roles=${roles.length}`)
}
