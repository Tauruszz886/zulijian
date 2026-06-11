import { safeCall, safeVoid } from "@common/engine_safe"

type PhysicsCcdTarget = {
  enable_physics_ccd?: (this: void, enable: boolean) => void
}

type UnitCcdTarget = {
  enable_unit_ccd?: (this: void) => void
}

type HorizontalDirection = {
  x: number
  z: number
}

type ObstacleCheckLine = {
  start: Vector3
  end: Vector3
}

/**
 * 快速跑动的前方障碍检测配置。
 *
 * 这里只负责用射线判断是否阻挡移动，不负责 UI 提示、飘字或调试弹窗。
 * 如果地图需要表现“前方受阻”，在业务层根据自己的交互规则单独实现。
 */
export type FastRunSystemObstacleOptions = {
  /** 是否启用前方障碍检测；关闭后只按摇杆方向写水平速度。 */
  enabled?: boolean
  /** 从角色当前位置向移动方向检测的距离，单位按引擎世界坐标处理。 */
  distance?: number
  /** GameAPI.raycast_test 使用的碰撞 mask。 */
  collisionMask?: integer
  /** 默认三条横向射线的半宽；未传 sideOffsets 时使用 [-radius, 0, radius]。 */
  radius?: number
  /** 默认低位射线高度；未传 heightOffsets 时参与默认高度列表。 */
  lowHeight?: number
  /** 默认高位射线高度；未传 heightOffsets 时参与默认高度列表。 */
  highHeight?: number
  /** 自定义横向偏移列表，传入后会覆盖 radius 生成的默认三条射线。 */
  sideOffsets?: number[]
  /** 自定义高度列表，传入后会覆盖 lowHeight/highHeight。 */
  heightOffsets?: number[]
  /** 射线日志间隔 tick；0 表示不打印射线日志。 */
  logIntervalTicks?: integer
}

/**
 * FastRunSystem 对外配置。
 *
 * 本 kit 是移动运行时，不做调试 UI 表现：不要在这里添加 GameAPI/GlobalAPI tips。
 * 日志只通过 logger 输出，地图侧需要提示时应在业务层组合。
 */
export type FastRunSystemOptions = {
  /** 速度更新间隔。默认 0.033，约 30 FPS。 */
  tickSeconds?: number
  /** 摇杆满输入时写入角色的目标水平速度。 */
  horizontalSpeed?: number
  /** 摇杆死区；输入长度小于等于该值时视为停止。 */
  joystickDeadZone?: number
  /** 角色最大线速度，用于放开引擎默认上限。 */
  maxLinearVelocity?: number
  /** 是否尝试开启 GameAPI 级 physics CCD。 */
  enableGlobalPhysicsCcd?: boolean
  /** 是否尝试给每个 Role 开启 physics CCD。 */
  enableRolePhysicsCcd?: boolean
  /** 是否尝试给每个受控 Unit 开启 unit CCD。 */
  enableUnitCcd?: boolean
  /** 前方障碍检测配置。 */
  obstacle?: FastRunSystemObstacleOptions
  /** 日志输出入口；默认 print。 */
  logger?: (msg: string) => void
}

type ResolvedFastRunSystemObstacleOptions = {
  enabled: boolean
  distance: number
  collisionMask: integer
  radius: number
  lowHeight: number
  highHeight: number
  sideOffsets?: number[]
  heightOffsets?: number[]
  logIntervalTicks: integer
}

type ResolvedFastRunSystemOptions = {
  tickSeconds: number
  horizontalSpeed: number
  joystickDeadZone: number
  maxLinearVelocity: number
  enableGlobalPhysicsCcd: boolean
  enableRolePhysicsCcd: boolean
  enableUnitCcd: boolean
  obstacle: ResolvedFastRunSystemObstacleOptions
  logger: (msg: string) => void
}

export const DEFAULT_FAST_RUN_SYSTEM_OPTIONS: FastRunSystemOptions = {
  tickSeconds: 0.033,
  horizontalSpeed: 5,
  joystickDeadZone: 0.05,
  maxLinearVelocity: 1000,
  enableGlobalPhysicsCcd: true,
  enableRolePhysicsCcd: true,
  enableUnitCcd: true,
  obstacle: {
    enabled: true,
    distance: 2,
    collisionMask: 1073741823 as integer,
    radius: 0.8,
    lowHeight: 0.6,
    highHeight: 1.6,
    logIntervalTicks: 0 as integer,
  },
}

function defaultLogger(msg: string): void {
  print(msg)
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function horizontalLength(x: number, z: number): number {
  return math.sqrt(x * x + z * z) as number
}

function mergeOptions(options?: FastRunSystemOptions): ResolvedFastRunSystemOptions {
  const baseObstacle = DEFAULT_FAST_RUN_SYSTEM_OPTIONS.obstacle!
  const obstacle = options?.obstacle

  return {
    tickSeconds: options?.tickSeconds !== undefined ? options.tickSeconds : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.tickSeconds!,
    horizontalSpeed:
      options?.horizontalSpeed !== undefined ? options.horizontalSpeed : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.horizontalSpeed!,
    joystickDeadZone:
      options?.joystickDeadZone !== undefined
        ? options.joystickDeadZone
        : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.joystickDeadZone!,
    maxLinearVelocity:
      options?.maxLinearVelocity !== undefined
        ? options.maxLinearVelocity
        : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.maxLinearVelocity!,
    enableGlobalPhysicsCcd:
      options?.enableGlobalPhysicsCcd !== undefined
        ? options.enableGlobalPhysicsCcd
        : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.enableGlobalPhysicsCcd!,
    enableRolePhysicsCcd:
      options?.enableRolePhysicsCcd !== undefined
        ? options.enableRolePhysicsCcd
        : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.enableRolePhysicsCcd!,
    enableUnitCcd:
      options?.enableUnitCcd !== undefined ? options.enableUnitCcd : DEFAULT_FAST_RUN_SYSTEM_OPTIONS.enableUnitCcd!,
    obstacle: {
      enabled: obstacle?.enabled !== undefined ? obstacle.enabled : baseObstacle.enabled!,
      distance: obstacle?.distance !== undefined ? obstacle.distance : baseObstacle.distance!,
      collisionMask:
        obstacle?.collisionMask !== undefined ? obstacle.collisionMask : (baseObstacle.collisionMask as integer),
      radius: obstacle?.radius !== undefined ? obstacle.radius : baseObstacle.radius!,
      lowHeight: obstacle?.lowHeight !== undefined ? obstacle.lowHeight : baseObstacle.lowHeight!,
      highHeight: obstacle?.highHeight !== undefined ? obstacle.highHeight : baseObstacle.highHeight!,
      sideOffsets: obstacle?.sideOffsets,
      heightOffsets: obstacle?.heightOffsets,
      logIntervalTicks:
        obstacle?.logIntervalTicks !== undefined ? obstacle.logIntervalTicks : (baseObstacle.logIntervalTicks as integer),
    },
    logger: options?.logger !== undefined ? options.logger : defaultLogger,
  }
}

function enablePhysicsCcd(target: unknown): boolean {
  try {
    const enable = (target as PhysicsCcdTarget).enable_physics_ccd
    if (enable === undefined || enable === null) return false
    enable(true)
    return true
  } catch (_e) {
    return false
  }
}

function enableUnitCcd(unit: Unit): boolean {
  try {
    const enable = (unit as unknown as UnitCcdTarget).enable_unit_ccd
    if (enable === undefined || enable === null) return false
    enable()
    return true
  } catch (_e) {
    return false
  }
}

/**
 * 快速跑动系统。
 *
 * start 后会循环读取所有有效角色的摇杆输入，并直接写角色水平线速度。
 * stop 只会停止后续 tick，不会还原角色当前速度；如需停下角色，由地图业务自行处理。
 */
export class FastRunSystem {
  private readonly options: ResolvedFastRunSystemOptions
  private tickIndex: integer = 0
  private running = false

  constructor(options?: FastRunSystemOptions) {
    this.options = mergeOptions(options)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.configureCharacters()
    this.options.logger(
      `[FastRunSystem] start tick=${this.options.tickSeconds} horizontal_speed=${this.options.horizontalSpeed} dead_zone=${this.options.joystickDeadZone}`,
    )
    this.updateLoop()
  }

  stop(): void {
    this.running = false
    this.options.logger("[FastRunSystem] stop")
  }

  isRunning(): boolean {
    return this.running
  }

  getHorizontalSpeed(): number {
    return this.options.horizontalSpeed
  }

  setHorizontalSpeed(speed: number): void {
    const nextSpeed = speed < 0 ? 0 : speed
    this.options.horizontalSpeed = nextSpeed
    if (nextSpeed > this.options.maxLinearVelocity) {
      this.options.maxLinearVelocity = nextSpeed
      this.configureCharacters()
    }
    this.options.logger(
      `[FastRunSystem] horizontal_speed updated horizontal_speed=${this.options.horizontalSpeed} max_linear_velocity=${this.options.maxLinearVelocity}`,
    )
  }

  configureCharacters(): void {
    const ccdOk = this.options.enableGlobalPhysicsCcd ? enablePhysicsCcd(GameAPI) : false

    let roleCount: integer = 0
    let rolePhysicsCcdOk: integer = 0
    let unitCcdOk: integer = 0
    let maxLinearVelocityOk: integer = 0
    const roles = safeCall(
      () => {
        return GameAPI.get_all_valid_roles()
      },
      { tag: "fast_run_get_roles", logger: this.options.logger },
    )
    if (roles === undefined) {
      this.options.logger("[FastRunSystem] configure failed")
      return
    }

    for (const role of roles) {
      roleCount = roleCount + 1
      if (this.options.enableRolePhysicsCcd && enablePhysicsCcd(role)) {
        rolePhysicsCcdOk = rolePhysicsCcdOk + 1
      }

      const character = role.get_ctrl_unit()
      if (this.options.enableUnitCcd && enableUnitCcd(character)) {
        unitCcdOk = unitCcdOk + 1
      }

      if (
        safeVoid(
          () => {
            character.set_max_linear_velocity(math.tofixed(this.options.maxLinearVelocity))
          },
          { tag: "fast_run_set_max_linear_velocity", logger: this.options.logger },
        )
      ) {
        maxLinearVelocityOk = maxLinearVelocityOk + 1
      }
    }

    this.options.logger(
      `[FastRunSystem] configure ccd=${tostring(ccdOk)} roles=${roleCount} role_physics_ccd_ok=${rolePhysicsCcdOk} unit_ccd_ok=${unitCcdOk} max_linear_velocity=${this.options.maxLinearVelocity} max_linear_velocity_ok=${maxLinearVelocityOk}`,
    )
  }

  updateOnce(): void {
    const roles = safeCall(
      () => {
        return GameAPI.get_all_valid_roles()
      },
      { tag: "fast_run_update_get_roles", logger: this.options.logger },
    )
    if (roles === undefined) return

    for (const role of roles) {
      this.applyJoystickLinearVelocity(role)
    }

    this.tickIndex = (this.tickIndex + 1) as integer
  }

  private updateLoop(): void {
    if (!this.running) return
    this.updateOnce()
    LuaAPI.call_delay_time(math.tofixed(this.options.tickSeconds), () => {
      this.updateLoop()
    })
  }

  private normalizeHorizontalDirection(x: number, z: number): HorizontalDirection | null {
    const len = horizontalLength(x, z)
    if (len <= this.options.joystickDeadZone) return null
    const invLen = 1 / len
    return { x: x * invLen, z: z * invLen }
  }

  private getObstacleCheckDirection(character: Character, inputX: number, inputZ: number): HorizontalDirection | null {
    const joystickDirection = this.normalizeHorizontalDirection(inputX, inputZ)
    if (joystickDirection !== null) return joystickDirection

    return safeCall(
      () => {
        const forward = character.get_local_direction(Enums.DirectionType.FORWARD)
        return this.normalizeHorizontalDirection(forward.x as number, forward.z as number)
      },
      { tag: "fast_run_get_forward", fallback: null, logger: this.options.logger },
    ) as HorizontalDirection | null
  }

  private hasObstacleAhead(character: Character, dirX: number, dirZ: number): boolean {
    if (!this.options.obstacle.enabled) return false
    return this.hasObstacleAheadByMultiRaycast(character, dirX, dirZ)
  }

  private getObstacleCheckLineWithOffset(
    character: Character,
    dirX: number,
    dirZ: number,
    sideOffset: number,
    heightOffset: number,
  ): ObstacleCheckLine {
    const position = character.get_position()
    const rightX = dirZ
    const rightZ = -dirX
    const startX = position.x + rightX * sideOffset
    const startZ = position.z + rightZ * sideOffset
    const y = position.y + heightOffset
    return {
      start: math.Vector3(startX, y, startZ),
      end: math.Vector3(startX + dirX * this.options.obstacle.distance, y, startZ + dirZ * this.options.obstacle.distance),
    }
  }

  private getSideOffsets(): number[] {
    const offsets = this.options.obstacle.sideOffsets
    if (offsets !== undefined) return offsets
    return [-this.options.obstacle.radius, 0, this.options.obstacle.radius]
  }

  private getHeightOffsets(): number[] {
    const offsets = this.options.obstacle.heightOffsets
    if (offsets !== undefined) return offsets
    return [this.options.obstacle.lowHeight, this.options.obstacle.highHeight]
  }

  private hasObstacleAheadByMultiRaycast(character: Character, dirX: number, dirZ: number): boolean {
    const sideOffsets = this.getSideOffsets()
    const heightOffsets = this.getHeightOffsets()
    let hitAny = false
    let rayIndex = 0

    for (const heightOffset of heightOffsets) {
      for (const sideOffset of sideOffsets) {
        const line = this.getObstacleCheckLineWithOffset(character, dirX, dirZ, sideOffset, heightOffset)
        let hit = false
        safeVoid(
          () => {
            GameAPI.raycast_test(line.start, line.end, this.options.obstacle.collisionMask, true, () => {
              hit = true
              return true
            })
          },
          { tag: "fast_run_obstacle_raycast", logger: this.options.logger },
        )

        if (this.shouldLogObstacleRaycast()) {
          this.options.logger(
            `[FastRunSystemRaycast] index=${rayIndex} side=${sideOffset} height=${heightOffset} start=(${tostring(line.start.x)},${tostring(line.start.y)},${tostring(line.start.z)}) end=(${tostring(line.end.x)},${tostring(line.end.y)},${tostring(line.end.z)}) mask=${this.options.obstacle.collisionMask} hit=${tostring(hit)}`,
          )
        }

        if (hit) hitAny = true
        rayIndex = rayIndex + 1
      }
    }

    return hitAny
  }

  private shouldLogObstacleRaycast(): boolean {
    const interval = this.options.obstacle.logIntervalTicks
    return interval > 0 && this.tickIndex % interval === 0
  }

  private applyJoystickLinearVelocity(role: Role): void {
    const character = role.get_ctrl_unit()
    const joystick = character.get_joystick_direction()
    const inputX = joystick.x as number
    const inputZ = joystick.z as number
    const inputLen = horizontalLength(inputX, inputZ)
    const checkDirection = this.getObstacleCheckDirection(character, inputX, inputZ)
    const blocked = checkDirection !== null ? this.hasObstacleAhead(character, checkDirection.x, checkDirection.z) : false

    let velocityX = 0
    let velocityZ = 0
    if (inputLen > this.options.joystickDeadZone) {
      const inputScale = clamp01(inputLen)
      const invLen = 1 / inputLen
      const dirX = inputX * invLen
      const dirZ = inputZ * invLen
      if (blocked) {
        const currentVelocity = character.get_linear_velocity()
        character.set_linear_velocity(math.Vector3(0 as Fixed, currentVelocity.y, 0 as Fixed))
        if (this.tickIndex % 15 === 0) {
          this.options.logger(
            `[FastRunSystemVelocity] blocked input=(${tostring(joystick.x)},${tostring(joystick.y)},${tostring(joystick.z)}) check_distance=${this.options.obstacle.distance}`,
          )
        }
        return
      }
      velocityX = dirX * this.options.horizontalSpeed * inputScale
      velocityZ = dirZ * this.options.horizontalSpeed * inputScale
    }
    const currentVelocity = character.get_linear_velocity()
    character.set_linear_velocity(math.Vector3(velocityX as Fixed, currentVelocity.y, velocityZ as Fixed))

    if (this.tickIndex % 15 === 0) {
      this.options.logger(
        `[FastRunSystemVelocity] input=(${tostring(joystick.x)},${tostring(joystick.y)},${tostring(joystick.z)}) velocity=(${tostring(velocityX)},${tostring(currentVelocity.y)},${tostring(velocityZ)})`,
      )
    }
  }

}

export function createFastRunSystem(options?: FastRunSystemOptions): FastRunSystem {
  return new FastRunSystem(options)
}

export function startFastRunSystem(options?: FastRunSystemOptions): FastRunSystem {
  const system = new FastRunSystem(options)
  system.start()
  return system
}
