import {
  DEFAULT_FAST_RUN_COMPONENT_OPTIONS,
  FastRunComponent,
  type FastRunComponentOptions,
  type FastRunGroundOptions,
  type FastRunObstacleOptions,
} from "./FastRunComponent"
import {
  FastRunTestDashboard,
  resolveFastRunTestModeOptions,
  type FastRunSystemTestModeOptions,
} from "./FastRunTestDashboard"

export type FastRunComponentConfig = Omit<FastRunComponentOptions, "role">

/**
 * FastRunSystem 对外配置。
 *
 * System 是管理层，不绑定某个玩家。外部需要给某个玩家启用快速跑时，
 * 调用 addComponent(role, options) 创建该玩家自己的 FastRunComponent。
 */
export type FastRunSystemOptions = FastRunComponentConfig & {
  /** 测试模式配置；开启后由 System 创建 Dashboard。 */
  testMode?: FastRunSystemTestModeOptions
}

type FastRunComponentRegistryEntry = {
  roleId: RoleID
  component: FastRunComponent
}

export type FastRunSystemGroundOptions = FastRunGroundOptions
export type FastRunSystemObstacleOptions = FastRunObstacleOptions

function defaultLogger(this: void, msg: string): void {
  print(msg)
}

function mergeComponentOptions(
  role: Role,
  defaults: FastRunComponentConfig,
  overrides?: FastRunComponentConfig,
): FastRunComponentOptions {
  return {
    ...defaults,
    ...(overrides !== undefined ? overrides : {}),
    role,
  }
}

/**
 * 快速跑动系统。
 *
 * System 只管理 FastRunComponent 的生命周期和测试 Dashboard，不直接代表某个玩家。
 * setEnabled(false) 会停用所有组件 tick 和 Dashboard，但不会还原角色当前速度；如需停下角色，由地图业务自行处理。
 */
export class FastRunSystem {
  private readonly componentDefaults: FastRunComponentConfig
  private readonly components: FastRunComponentRegistryEntry[] = []
  private readonly testMode: FastRunSystemTestModeOptions
  private readonly tickSeconds: number
  private readonly logger: (this: void, msg: string) => void
  private enabled = false
  private dashboardRoleId: RoleID | null = null
  private testDashboard: FastRunTestDashboard | null = null

  constructor(options?: FastRunSystemOptions) {
    this.componentDefaults = {
      tickSeconds:
        options?.tickSeconds !== undefined ? options.tickSeconds : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.tickSeconds,
      maxSpeed: options?.maxSpeed !== undefined ? options.maxSpeed : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.maxSpeed,
      initialSpeed:
        options?.initialSpeed !== undefined ? options.initialSpeed : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.initialSpeed,
      groundAcceleration:
        options?.groundAcceleration !== undefined
          ? options.groundAcceleration
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.groundAcceleration,
      groundDeceleration:
        options?.groundDeceleration !== undefined
          ? options.groundDeceleration
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.groundDeceleration,
      airAcceleration:
        options?.airAcceleration !== undefined
          ? options.airAcceleration
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.airAcceleration,
      airDeceleration:
        options?.airDeceleration !== undefined
          ? options.airDeceleration
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.airDeceleration,
      joystickDeadZone:
        options?.joystickDeadZone !== undefined
          ? options.joystickDeadZone
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.joystickDeadZone,
      maxLinearVelocity:
        options?.maxLinearVelocity !== undefined
          ? options.maxLinearVelocity
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.maxLinearVelocity,
      enableGlobalPhysicsCcd:
        options?.enableGlobalPhysicsCcd !== undefined
          ? options.enableGlobalPhysicsCcd
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.enableGlobalPhysicsCcd,
      enableRolePhysicsCcd:
        options?.enableRolePhysicsCcd !== undefined
          ? options.enableRolePhysicsCcd
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.enableRolePhysicsCcd,
      enableUnitCcd:
        options?.enableUnitCcd !== undefined
          ? options.enableUnitCcd
          : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.enableUnitCcd,
      ground: options?.ground !== undefined ? options.ground : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.ground,
      obstacle: options?.obstacle !== undefined ? options.obstacle : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.obstacle,
      rayDebug: options?.rayDebug !== undefined ? options.rayDebug : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.rayDebug,
      logger: options?.logger !== undefined ? options.logger : defaultLogger,
    }
    this.testMode = resolveFastRunTestModeOptions(options?.testMode)
    this.tickSeconds =
      options?.tickSeconds !== undefined ? options.tickSeconds : DEFAULT_FAST_RUN_COMPONENT_OPTIONS.tickSeconds!
    this.logger = options?.logger !== undefined ? options.logger : defaultLogger
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) {
      this.disableTestMode()
      this.setAllComponentsEnabled(false)
      this.logger("[FastRunSystem] disabled")
      return
    }

    this.logger("[FastRunSystem] enabled")
    this.setAllComponentsEnabled(true)
    this.enableTestMode()
    this.updateDashboardLoop()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  addComponent(role: Role, options?: FastRunComponentConfig): FastRunComponent {
    const roleId = role.get_roleid()
    const existing = this.getComponentByRoleId(roleId)
    if (existing !== null) {
      this.logger(`[FastRunSystem] add skipped: component already exists role_id=${tostring(roleId)}`)
      return existing
    }

    const component = new FastRunComponent(mergeComponentOptions(role, this.componentDefaults, options))
    this.components.push({ roleId, component })
    if (this.dashboardRoleId === null) {
      this.dashboardRoleId = roleId
    }

    if (this.enabled) {
      component.setEnabled(true)
    }

    this.logger(`[FastRunSystem] component added role_id=${tostring(roleId)} count=${this.components.length}`)
    this.updateDashboardValues()
    return component
  }

  removeComponent(roleOrId: Role | RoleID): boolean {
    const roleId = this.resolveRoleId(roleOrId)
    for (let index = 0; index < this.components.length; index = index + 1) {
      const entry = this.components[index]
      if (entry.roleId === roleId) {
        entry.component.setEnabled(false)
        this.components.splice(index, 1)
        if (this.dashboardRoleId === roleId) {
          this.dashboardRoleId = this.components.length > 0 ? this.components[0].roleId : null
        }
        this.logger(`[FastRunSystem] component removed role_id=${tostring(roleId)} count=${this.components.length}`)
        this.updateDashboardValues()
        return true
      }
    }
    return false
  }

  clearComponents(): void {
    this.setAllComponentsEnabled(false)
    while (this.components.length > 0) {
      this.components.pop()
    }
    this.dashboardRoleId = null
    this.updateDashboardValues()
  }

  getComponent(roleOrId: Role | RoleID): FastRunComponent | null {
    return this.getComponentByRoleId(this.resolveRoleId(roleOrId))
  }

  getComponentCount(): integer {
    return this.components.length as integer
  }

  setDashboardTarget(roleOrId: Role | RoleID): boolean {
    const roleId = this.resolveRoleId(roleOrId)
    if (this.getComponentByRoleId(roleId) === null) return false
    this.dashboardRoleId = roleId
    this.updateDashboardValues()
    return true
  }

  getDashboardComponent(): FastRunComponent | null {
    if (this.dashboardRoleId !== null) {
      const component = this.getComponentByRoleId(this.dashboardRoleId)
      if (component !== null) return component
    }
    if (this.components.length <= 0) return null
    return this.components[0].component
  }

  getCurrentSpeed(): number {
    const component = this.getDashboardComponent()
    return component !== null ? component.getCurrentSpeed() : 0
  }

  getMaxSpeed(): number {
    const component = this.getDashboardComponent()
    return component !== null ? component.getMaxSpeed() : 0
  }

  setMaxSpeed(speed: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.setMaxSpeed(speed)
    this.updateDashboardValues()
  }

  increaseMaxSpeed(delta: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.increaseMaxSpeed(delta)
    this.updateDashboardValues()
  }

  getGroundAcceleration(): number {
    const component = this.getDashboardComponent()
    return component !== null ? component.getGroundAcceleration() : 0
  }

  setGroundAcceleration(groundAcceleration: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.setGroundAcceleration(groundAcceleration)
    this.updateDashboardValues()
  }

  increaseGroundAcceleration(delta: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.increaseGroundAcceleration(delta)
    this.updateDashboardValues()
  }

  getGroundDeceleration(): number {
    const component = this.getDashboardComponent()
    return component !== null ? component.getGroundDeceleration() : 0
  }

  setGroundDeceleration(groundDeceleration: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.setGroundDeceleration(groundDeceleration)
    this.updateDashboardValues()
  }

  increaseGroundDeceleration(delta: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.increaseGroundDeceleration(delta)
    this.updateDashboardValues()
  }

  getAirAcceleration(): number {
    const component = this.getDashboardComponent()
    return component !== null ? component.getAirAcceleration() : 0
  }

  setAirAcceleration(airAcceleration: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.setAirAcceleration(airAcceleration)
    this.updateDashboardValues()
  }

  increaseAirAcceleration(delta: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.increaseAirAcceleration(delta)
    this.updateDashboardValues()
  }

  getAirDeceleration(): number {
    const component = this.getDashboardComponent()
    return component !== null ? component.getAirDeceleration() : 0
  }

  setAirDeceleration(airDeceleration: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.setAirDeceleration(airDeceleration)
    this.updateDashboardValues()
  }

  increaseAirDeceleration(delta: number): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.increaseAirDeceleration(delta)
    this.updateDashboardValues()
  }

  isRayDebugEnabled(): boolean {
    const component = this.getDashboardComponent()
    return component !== null ? component.isRayDebugEnabled() : false
  }

  setRayDebugEnabled(enabled: boolean): void {
    const component = this.getDashboardComponent()
    if (component === null) return
    component.setRayDebugEnabled(enabled)
    this.updateDashboardValues()
  }

  private resolveRoleId(roleOrId: Role | RoleID): RoleID {
    if (type(roleOrId) === "number") return roleOrId as RoleID
    return (roleOrId as Role).get_roleid()
  }

  private getComponentByRoleId(roleId: RoleID): FastRunComponent | null {
    for (const entry of this.components) {
      if (entry.roleId === roleId) return entry.component
    }
    return null
  }

  private setAllComponentsEnabled(enabled: boolean): void {
    for (const entry of this.components) {
      entry.component.setEnabled(enabled)
    }
  }

  private enableTestMode(): void {
    if (this.testMode.enabled !== true) return
    if (this.testDashboard !== null) return

    this.testDashboard = new FastRunTestDashboard(this.testMode, {
      getCurrentSpeed: () => {
        return this.getCurrentSpeed()
      },
      getMaxSpeed: () => {
        return this.getMaxSpeed()
      },
      setMaxSpeed: (speed: number) => {
        this.setMaxSpeed(speed)
      },
      getGroundAcceleration: () => {
        return this.getGroundAcceleration()
      },
      setGroundAcceleration: (groundAcceleration: number) => {
        this.setGroundAcceleration(groundAcceleration)
      },
      getGroundDeceleration: () => {
        return this.getGroundDeceleration()
      },
      setGroundDeceleration: (groundDeceleration: number) => {
        this.setGroundDeceleration(groundDeceleration)
      },
      getAirAcceleration: () => {
        return this.getAirAcceleration()
      },
      setAirAcceleration: (airAcceleration: number) => {
        this.setAirAcceleration(airAcceleration)
      },
      getAirDeceleration: () => {
        return this.getAirDeceleration()
      },
      setAirDeceleration: (airDeceleration: number) => {
        this.setAirDeceleration(airDeceleration)
      },
      isRayDebugEnabled: () => {
        return this.isRayDebugEnabled()
      },
      setRayDebugEnabled: (enabled: boolean) => {
        this.setRayDebugEnabled(enabled)
      },
      logger: this.logger,
    })

    // 运行时 EUI 在 main.lua 刚加载时创建可能拿到句柄但不渲染；延迟到首帧后再创建。
    LuaAPI.call_delay_time(math.tofixed(1), () => {
      if (!this.enabled || this.testDashboard === null) return
      this.testDashboard.setEnabled(true)
    })
  }

  private disableTestMode(): void {
    if (this.testDashboard === null) return
    this.testDashboard.setEnabled(false)
    this.testDashboard = null
  }

  private updateDashboardLoop(): void {
    if (!this.enabled) return
    this.updateDashboardValues()
    LuaAPI.call_delay_time(math.tofixed(this.tickSeconds), () => {
      this.updateDashboardLoop()
    })
  }

  private updateDashboardValues(): void {
    if (this.testDashboard === null) return
    this.testDashboard.updateValues()
  }
}

export function createFastRunSystem(options?: FastRunSystemOptions): FastRunSystem {
  return new FastRunSystem(options)
}
