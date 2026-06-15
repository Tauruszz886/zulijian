import { safeCall, safeVoid } from "@common/engine_safe"
import { drawRuntimeDebugLine } from "../runtime_ui"
import { evaluateFastRunExpression } from "./FastRunExpression"

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

export type FastRunRayDebugOptions = {
  /** 是否绘制组件内部使用的地面/障碍射线。 */
  enabled?: boolean
  /** 调试线持续时间；通常略大于 tickSeconds，连续绘制时看起来就是常驻线。 */
  duration?: number
  /** 脚下检测命中颜色。 */
  groundHitColor?: Color
  /** 脚下检测未命中颜色。 */
  groundMissColor?: Color
  /** 前方障碍检测命中颜色。 */
  obstacleHitColor?: Color
  /** 前方障碍检测未命中颜色。 */
  obstacleMissColor?: Color
}

/**
 * 快速跑动的前方障碍检测配置。
 *
 * 这里只负责用射线判断是否阻挡移动，不负责 UI 提示、飘字或调试弹窗。
 * 如果地图需要表现“前方受阻”，在业务层根据自己的交互规则单独实现。
 */
export type FastRunObstacleOptions = {
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
 * 脚下地面检测配置。
 *
 * FastRunComponent 用这个检测决定当前使用地面参数还是空中参数。
 */
export type FastRunGroundOptions = {
  /** 是否启用脚下射线检测；关闭时始终按在地面处理。 */
  enabled?: boolean
  /** 射线起点相对角色位置的 Y 偏移，避免从脚底临界点开始导致漏检。 */
  startHeight?: number
  /** 从角色位置向下检测的距离。 */
  distance?: number
  /** GameAPI.raycast_test 使用的碰撞 mask。 */
  collisionMask?: integer
  /** 射线日志间隔 tick；0 表示不打印射线日志。 */
  logIntervalTicks?: integer
}

/**
 * 单角色快速跑动组件配置。
 *
 * 组件只绑定一个 Role，不会在 tick 中遍历所有有效角色。
 * 地图业务如果要给多个角色启用快速跑动，应给每个角色分别创建一个 FastRunComponent。
 */
export type FastRunComponentOptions = {
  /** 被该组件控制的角色。 */
  role: Role
  /** 速度更新间隔。默认 0.033，约 30 FPS。 */
  tickSeconds?: number
  /** 摇杆满输入时组件允许达到的最大水平速度。 */
  maxSpeed?: number
  /** 组件启动时的当前水平速度。 */
  initialSpeed?: number
  /** 在地面推动摇杆时，当前速度向目标速度靠近的加速度。 */
  groundAcceleration?: number
  /** 地面加速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  groundAccelerationExpression?: string
  /** 在地面没有摇杆输入或前方受阻时，当前速度向 0 靠近的减速度。 */
  groundDeceleration?: number
  /** 地面减速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  groundDecelerationExpression?: string
  /** 空中推动摇杆时使用的加速度；通常应小于 groundAcceleration。 */
  airAcceleration?: number
  /** 空中加速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  airAccelerationExpression?: string
  /** 空中没有摇杆输入或前方受阻时使用的减速度。 */
  airDeceleration?: number
  /** 空中减速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  airDecelerationExpression?: string
  /** 摇杆死区；输入长度小于等于该值时视为停止输入。 */
  joystickDeadZone?: number
  /** 角色最大线速度，用于放开引擎默认上限。 */
  maxLinearVelocity?: number
  /** 是否尝试开启 GameAPI 级 physics CCD。 */
  enableGlobalPhysicsCcd?: boolean
  /** 是否尝试给当前 Role 开启 physics CCD。 */
  enableRolePhysicsCcd?: boolean
  /** 是否尝试给当前受控 Unit 开启 unit CCD。 */
  enableUnitCcd?: boolean
  /** 脚下地面检测配置。 */
  ground?: FastRunGroundOptions
  /** 前方障碍检测配置。 */
  obstacle?: FastRunObstacleOptions
  /** 调试绘制配置；只用于开发期观察射线，不影响移动逻辑。 */
  rayDebug?: FastRunRayDebugOptions
  /** 日志输出入口；默认 print。 */
  logger?: (this: void, msg: string) => void
}

type ResolvedFastRunObstacleOptions = {
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

type ResolvedFastRunGroundOptions = {
  enabled: boolean
  startHeight: number
  distance: number
  collisionMask: integer
  logIntervalTicks: integer
}

type ResolvedFastRunRayDebugOptions = {
  enabled: boolean
  duration: number
  groundHitColor: Color
  groundMissColor: Color
  obstacleHitColor: Color
  obstacleMissColor: Color
}

type ResolvedFastRunComponentOptions = {
  role: Role
  tickSeconds: number
  maxSpeed: number
  initialSpeed: number
  groundAcceleration: number
  groundAccelerationExpression: string
  groundDeceleration: number
  groundDecelerationExpression: string
  airAcceleration: number
  airAccelerationExpression: string
  airDeceleration: number
  airDecelerationExpression: string
  joystickDeadZone: number
  maxLinearVelocity: number
  enableGlobalPhysicsCcd: boolean
  enableRolePhysicsCcd: boolean
  enableUnitCcd: boolean
  ground: ResolvedFastRunGroundOptions
  obstacle: ResolvedFastRunObstacleOptions
  rayDebug: ResolvedFastRunRayDebugOptions
  logger: (this: void, msg: string) => void
}

export const DEFAULT_FAST_RUN_COMPONENT_OPTIONS: Omit<FastRunComponentOptions, "role"> = {
  tickSeconds: 0.033,
  maxSpeed: 20,
  initialSpeed: 0,
  groundAcceleration: 60,
  groundAccelerationExpression: "60",
  groundDeceleration: 80,
  groundDecelerationExpression: "80",
  airAcceleration: 20,
  airAccelerationExpression: "20",
  airDeceleration: 20,
  airDecelerationExpression: "20",
  joystickDeadZone: 0.05,
  maxLinearVelocity: 1000,
  enableGlobalPhysicsCcd: true,
  enableRolePhysicsCcd: true,
  enableUnitCcd: true,
  ground: {
    enabled: true,
    startHeight: 0.2,
    distance: 1.2,
    collisionMask: 1073741823 as integer,
    logIntervalTicks: 0 as integer,
  },
  obstacle: {
    enabled: true,
    distance: 2,
    collisionMask: 1073741823 as integer,
    radius: 0.8,
    lowHeight: 0.6,
    highHeight: 1.6,
    logIntervalTicks: 0 as integer,
  },
  rayDebug: {
    enabled: false,
    duration: 0.08,
    groundHitColor: 0x00ff00 as Color,
    groundMissColor: 0x0088ff as Color,
    obstacleHitColor: 0xff3333 as Color,
    obstacleMissColor: 0xffff00 as Color,
  },
}

function defaultLogger(this: void, msg: string): void {
  print(msg)
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function clampMin(value: number, minValue: number): number {
  return value < minValue ? minValue : value
}

function clampNumber(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) return minValue
  if (value > maxValue) return maxValue
  return value
}

function horizontalLength(x: number, z: number): number {
  return math.sqrt(x * x + z * z) as number
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (current < target) return current + math.min(target - current, maxDelta)
  if (current > target) return current - math.min(current - target, maxDelta)
  return current
}

function formatExpressionNumber(value: number): string {
  return tostring(math.floor(value * 100 + 0.5) / 100)
}

function mergeOptions(options: FastRunComponentOptions): ResolvedFastRunComponentOptions {
  const base = DEFAULT_FAST_RUN_COMPONENT_OPTIONS
  const baseGround = base.ground!
  const baseObstacle = base.obstacle!
  const baseRayDebug = base.rayDebug!
  const ground = options.ground
  const obstacle = options.obstacle
  const rayDebug = options.rayDebug

  return {
    role: options.role,
    tickSeconds: options.tickSeconds !== undefined ? options.tickSeconds : base.tickSeconds!,
    maxSpeed: options.maxSpeed !== undefined ? options.maxSpeed : base.maxSpeed!,
    initialSpeed: options.initialSpeed !== undefined ? options.initialSpeed : base.initialSpeed!,
    groundAcceleration:
      options.groundAcceleration !== undefined ? options.groundAcceleration : base.groundAcceleration!,
    groundAccelerationExpression:
      options.groundAccelerationExpression !== undefined
        ? options.groundAccelerationExpression
        : options.groundAcceleration !== undefined
          ? formatExpressionNumber(options.groundAcceleration)
          : base.groundAccelerationExpression!,
    groundDeceleration:
      options.groundDeceleration !== undefined ? options.groundDeceleration : base.groundDeceleration!,
    groundDecelerationExpression:
      options.groundDecelerationExpression !== undefined
        ? options.groundDecelerationExpression
        : options.groundDeceleration !== undefined
          ? formatExpressionNumber(options.groundDeceleration)
          : base.groundDecelerationExpression!,
    airAcceleration: options.airAcceleration !== undefined ? options.airAcceleration : base.airAcceleration!,
    airAccelerationExpression:
      options.airAccelerationExpression !== undefined
        ? options.airAccelerationExpression
        : options.airAcceleration !== undefined
          ? formatExpressionNumber(options.airAcceleration)
          : base.airAccelerationExpression!,
    airDeceleration: options.airDeceleration !== undefined ? options.airDeceleration : base.airDeceleration!,
    airDecelerationExpression:
      options.airDecelerationExpression !== undefined
        ? options.airDecelerationExpression
        : options.airDeceleration !== undefined
          ? formatExpressionNumber(options.airDeceleration)
          : base.airDecelerationExpression!,
    joystickDeadZone:
      options.joystickDeadZone !== undefined ? options.joystickDeadZone : base.joystickDeadZone!,
    maxLinearVelocity:
      options.maxLinearVelocity !== undefined ? options.maxLinearVelocity : base.maxLinearVelocity!,
    enableGlobalPhysicsCcd:
      options.enableGlobalPhysicsCcd !== undefined ? options.enableGlobalPhysicsCcd : base.enableGlobalPhysicsCcd!,
    enableRolePhysicsCcd:
      options.enableRolePhysicsCcd !== undefined ? options.enableRolePhysicsCcd : base.enableRolePhysicsCcd!,
    enableUnitCcd: options.enableUnitCcd !== undefined ? options.enableUnitCcd : base.enableUnitCcd!,
    ground: {
      enabled: ground?.enabled !== undefined ? ground.enabled : baseGround.enabled!,
      startHeight: ground?.startHeight !== undefined ? ground.startHeight : baseGround.startHeight!,
      distance: ground?.distance !== undefined ? ground.distance : baseGround.distance!,
      collisionMask:
        ground?.collisionMask !== undefined ? ground.collisionMask : (baseGround.collisionMask as integer),
      logIntervalTicks:
        ground?.logIntervalTicks !== undefined ? ground.logIntervalTicks : (baseGround.logIntervalTicks as integer),
    },
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
    rayDebug: {
      enabled: rayDebug?.enabled !== undefined ? rayDebug.enabled : baseRayDebug.enabled!,
      duration: rayDebug?.duration !== undefined ? rayDebug.duration : baseRayDebug.duration!,
      groundHitColor:
        rayDebug?.groundHitColor !== undefined ? rayDebug.groundHitColor : (baseRayDebug.groundHitColor as Color),
      groundMissColor:
        rayDebug?.groundMissColor !== undefined ? rayDebug.groundMissColor : (baseRayDebug.groundMissColor as Color),
      obstacleHitColor:
        rayDebug?.obstacleHitColor !== undefined ? rayDebug.obstacleHitColor : (baseRayDebug.obstacleHitColor as Color),
      obstacleMissColor:
        rayDebug?.obstacleMissColor !== undefined
          ? rayDebug.obstacleMissColor
          : (baseRayDebug.obstacleMissColor as Color),
    },
    logger: options.logger !== undefined ? options.logger : defaultLogger,
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
 * 单角色快速跑动组件。
 *
 * setEnabled(true) 后只读取构造参数传入的 role 摇杆输入，并维护该角色的当前水平速度。
 * setEnabled(false) 只停止后续 tick，不会还原角色当前速度；如需停下角色，由地图业务自行处理。
 */
export class FastRunComponent {
  private readonly options: ResolvedFastRunComponentOptions
  private tickIndex: integer = 0
  private enabled = false
  private currentSpeed: number
  private lastHorizontalDirection: HorizontalDirection = { x: 0, z: 1 }

  constructor(options: FastRunComponentOptions) {
    this.options = mergeOptions(options)
    this.currentSpeed = clampMin(this.options.initialSpeed, 0)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) {
      this.options.logger("[FastRunComponent] disabled")
      return
    }

    this.configureCharacter()
    this.options.logger(
      `[FastRunComponent] enabled tick=${this.options.tickSeconds} max_speed=${this.options.maxSpeed} ground_acceleration=${this.options.groundAcceleration} ground_deceleration=${this.options.groundDeceleration} air_acceleration=${this.options.airAcceleration} air_deceleration=${this.options.airDeceleration} dead_zone=${this.options.joystickDeadZone}`,
    )
    this.updateLoop()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  getCurrentSpeed(): number {
    return this.currentSpeed
  }

  getMaxSpeed(): number {
    return this.options.maxSpeed
  }

  setMaxSpeed(speed: number): void {
    this.options.maxSpeed = clampMin(speed, 0)
    this.currentSpeed = clampNumber(this.currentSpeed, 0, this.options.maxSpeed)
  }

  increaseMaxSpeed(delta: number): void {
    this.setMaxSpeed(this.options.maxSpeed + delta)
  }

  getGroundAcceleration(): number {
    return this.evaluateMotionExpression(this.options.groundAccelerationExpression, this.options.groundAcceleration, "ground_acceleration")
  }

  setGroundAcceleration(groundAcceleration: number): void {
    this.options.groundAcceleration = clampMin(groundAcceleration, 0)
    this.options.groundAccelerationExpression = formatExpressionNumber(this.options.groundAcceleration)
  }

  increaseGroundAcceleration(delta: number): void {
    this.setGroundAcceleration(this.getGroundAcceleration() + delta)
  }

  getGroundAccelerationExpression(): string {
    return this.options.groundAccelerationExpression
  }

  setGroundAccelerationExpression(expression: string): boolean {
    return this.setMotionExpression("ground_acceleration", expression, (value) => {
      this.options.groundAccelerationExpression = expression
      this.options.groundAcceleration = clampMin(value, 0)
    })
  }

  getGroundDeceleration(): number {
    return this.evaluateMotionExpression(this.options.groundDecelerationExpression, this.options.groundDeceleration, "ground_deceleration")
  }

  setGroundDeceleration(groundDeceleration: number): void {
    this.options.groundDeceleration = clampMin(groundDeceleration, 0)
    this.options.groundDecelerationExpression = formatExpressionNumber(this.options.groundDeceleration)
  }

  increaseGroundDeceleration(delta: number): void {
    this.setGroundDeceleration(this.getGroundDeceleration() + delta)
  }

  getGroundDecelerationExpression(): string {
    return this.options.groundDecelerationExpression
  }

  setGroundDecelerationExpression(expression: string): boolean {
    return this.setMotionExpression("ground_deceleration", expression, (value) => {
      this.options.groundDecelerationExpression = expression
      this.options.groundDeceleration = clampMin(value, 0)
    })
  }

  getAirAcceleration(): number {
    return this.evaluateMotionExpression(this.options.airAccelerationExpression, this.options.airAcceleration, "air_acceleration")
  }

  setAirAcceleration(airAcceleration: number): void {
    this.options.airAcceleration = clampMin(airAcceleration, 0)
    this.options.airAccelerationExpression = formatExpressionNumber(this.options.airAcceleration)
  }

  increaseAirAcceleration(delta: number): void {
    this.setAirAcceleration(this.getAirAcceleration() + delta)
  }

  getAirAccelerationExpression(): string {
    return this.options.airAccelerationExpression
  }

  setAirAccelerationExpression(expression: string): boolean {
    return this.setMotionExpression("air_acceleration", expression, (value) => {
      this.options.airAccelerationExpression = expression
      this.options.airAcceleration = clampMin(value, 0)
    })
  }

  getAirDeceleration(): number {
    return this.evaluateMotionExpression(this.options.airDecelerationExpression, this.options.airDeceleration, "air_deceleration")
  }

  setAirDeceleration(airDeceleration: number): void {
    this.options.airDeceleration = clampMin(airDeceleration, 0)
    this.options.airDecelerationExpression = formatExpressionNumber(this.options.airDeceleration)
  }

  increaseAirDeceleration(delta: number): void {
    this.setAirDeceleration(this.getAirDeceleration() + delta)
  }

  getAirDecelerationExpression(): string {
    return this.options.airDecelerationExpression
  }

  setAirDecelerationExpression(expression: string): boolean {
    return this.setMotionExpression("air_deceleration", expression, (value) => {
      this.options.airDecelerationExpression = expression
      this.options.airDeceleration = clampMin(value, 0)
    })
  }

  isRayDebugEnabled(): boolean {
    return this.options.rayDebug.enabled
  }

  setRayDebugEnabled(enabled: boolean): void {
    this.options.rayDebug.enabled = enabled
  }

  configureCharacter(): void {
    const ccdOk = this.options.enableGlobalPhysicsCcd ? enablePhysicsCcd(GameAPI) : false
    let rolePhysicsCcdOk = false
    let unitCcdOk = false
    let maxLinearVelocityOk = false

    if (this.options.enableRolePhysicsCcd) {
      rolePhysicsCcdOk = enablePhysicsCcd(this.options.role)
    }

    const character = this.getCharacter()
    if (character !== null) {
      if (this.options.enableUnitCcd) {
        unitCcdOk = enableUnitCcd(character)
      }

      maxLinearVelocityOk = safeVoid(
        () => {
          character.set_max_linear_velocity(math.tofixed(this.options.maxLinearVelocity))
        },
        { tag: "fast_run_set_max_linear_velocity", logger: this.options.logger },
      )
    }

    this.options.logger(
      `[FastRunComponent] configure ccd=${tostring(ccdOk)} role_physics_ccd_ok=${tostring(rolePhysicsCcdOk)} unit_ccd_ok=${tostring(unitCcdOk)} max_linear_velocity=${this.options.maxLinearVelocity} max_linear_velocity_ok=${tostring(maxLinearVelocityOk)}`,
    )
  }

  updateOnce(): void {
    const character = this.getCharacter()
    if (character === null) return
    this.applyJoystickLinearVelocity(character)
    this.tickIndex = (this.tickIndex + 1) as integer
  }

  private getCharacter(): Character | null {
    return safeCall(
      () => {
        return this.options.role.get_ctrl_unit()
      },
      { tag: "fast_run_get_ctrl_unit", fallback: null, logger: this.options.logger },
    ) as Character | null
  }

  private updateLoop(): void {
    if (!this.enabled) return
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

  private getCurrentVelocityDirection(character: Character): HorizontalDirection | null {
    return safeCall(
      () => {
        const velocity = character.get_linear_velocity()
        return this.normalizeHorizontalDirection(velocity.x as number, velocity.z as number)
      },
      { tag: "fast_run_get_velocity_direction", fallback: null, logger: this.options.logger },
    ) as HorizontalDirection | null
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
            `[FastRunComponentObstacleRaycast] index=${rayIndex} side=${sideOffset} height=${heightOffset} start=(${tostring(line.start.x)},${tostring(line.start.y)},${tostring(line.start.z)}) end=(${tostring(line.end.x)},${tostring(line.end.y)},${tostring(line.end.z)}) mask=${this.options.obstacle.collisionMask} hit=${tostring(hit)}`,
          )
        }

        this.drawDebugLine(line.start, line.end, hit ? this.options.rayDebug.obstacleHitColor : this.options.rayDebug.obstacleMissColor)

        if (hit) hitAny = true
        rayIndex = rayIndex + 1
      }
    }

    return hitAny
  }

  private isGrounded(character: Character): boolean {
    if (!this.options.ground.enabled) return true

    const position = character.get_position()
    const start = math.Vector3(position.x, position.y + this.options.ground.startHeight, position.z)
    const end = math.Vector3(position.x, position.y - this.options.ground.distance, position.z)
    let hit = false

    safeVoid(
      () => {
        GameAPI.raycast_test(start, end, this.options.ground.collisionMask, true, () => {
          hit = true
          return true
        })
      },
      { tag: "fast_run_ground_raycast", logger: this.options.logger },
    )

    if (this.shouldLogGroundRaycast()) {
      this.options.logger(
        `[FastRunComponentGroundRaycast] start=(${tostring(start.x)},${tostring(start.y)},${tostring(start.z)}) end=(${tostring(end.x)},${tostring(end.y)},${tostring(end.z)}) mask=${this.options.ground.collisionMask} hit=${tostring(hit)}`,
      )
    }

    this.drawDebugLine(start, end, hit ? this.options.rayDebug.groundHitColor : this.options.rayDebug.groundMissColor)

    return hit
  }

  private drawDebugLine(start: Vector3, end: Vector3, color: Color): void {
    if (!this.options.rayDebug.enabled) return
    drawRuntimeDebugLine({
      start,
      end,
      color,
      durationSeconds: this.options.rayDebug.duration,
      logger: this.options.logger,
      tag: "fast_run_debug_draw_line",
    })
  }

  private shouldLogObstacleRaycast(): boolean {
    const interval = this.options.obstacle.logIntervalTicks
    return interval > 0 && this.tickIndex % interval === 0
  }

  private shouldLogGroundRaycast(): boolean {
    const interval = this.options.ground.logIntervalTicks
    return interval > 0 && this.tickIndex % interval === 0
  }

  private evaluateMotionExpression(expression: string, fallback: number, tag: string): number {
    const result = evaluateFastRunExpression(expression, this.currentSpeed)
    if (!result.ok) {
      this.options.logger(`[FastRunComponent] expression failed tag=${tag} expr=${expression} err=${result.error}`)
      return clampMin(fallback, 0)
    }
    return clampMin(result.value, 0)
  }

  private setMotionExpression(tag: string, expression: string, apply: (value: number) => void): boolean {
    const result = evaluateFastRunExpression(expression, this.currentSpeed)
    if (!result.ok) {
      this.options.logger(`[FastRunComponent] set expression failed tag=${tag} expr=${expression} err=${result.error}`)
      return false
    }

    apply(result.value)
    return true
  }

  private applyJoystickLinearVelocity(character: Character): void {
    const joystick = character.get_joystick_direction()
    const inputX = joystick.x as number
    const inputZ = joystick.z as number
    const inputLen = horizontalLength(inputX, inputZ)
    const inputDirection = this.normalizeHorizontalDirection(inputX, inputZ)
    const checkDirection = this.getObstacleCheckDirection(character, inputX, inputZ)
    const blocked = checkDirection !== null ? this.hasObstacleAhead(character, checkDirection.x, checkDirection.z) : false
    const currentVelocity = character.get_linear_velocity()
    const grounded = this.isGrounded(character)
    const acceleration = grounded ? this.getGroundAcceleration() : this.getAirAcceleration()
    const deceleration = grounded ? this.getGroundDeceleration() : this.getAirDeceleration()

    let direction = inputDirection
    if (direction !== null && !blocked) {
      const targetSpeed = this.options.maxSpeed * clamp01(inputLen)
      this.currentSpeed = moveTowards(this.currentSpeed, targetSpeed, acceleration * this.options.tickSeconds)
      this.lastHorizontalDirection = direction
    } else {
      const velocityDirection = this.getCurrentVelocityDirection(character)
      direction = velocityDirection !== null ? velocityDirection : this.lastHorizontalDirection
      this.currentSpeed = moveTowards(this.currentSpeed, 0, deceleration * this.options.tickSeconds)
    }

    if (this.currentSpeed <= 0.001) {
      this.currentSpeed = 0
    }

    const velocityX = direction !== null ? direction.x * this.currentSpeed : 0
    const velocityZ = direction !== null ? direction.z * this.currentSpeed : 0
    character.set_linear_velocity(math.Vector3(velocityX as Fixed, currentVelocity.y, velocityZ as Fixed))
  }
}

export function createFastRunComponent(options: FastRunComponentOptions): FastRunComponent {
  return new FastRunComponent(options)
}
