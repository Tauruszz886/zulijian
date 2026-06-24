import { EMath } from "../../emath"

export type FastRunRayDebugOptions = {
  /** 是否绘制组件内部使用的地面/障碍射线。 */
  enabled?: boolean
  /** 调试线持续时间；调试线 API 本身按秒计时。 */
  duration?: Fixed
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
  distance?: Fixed
  /** GameAPI.raycast_test 使用的碰撞 mask。 */
  collisionMask?: integer
  /** 默认三条横向射线的半宽；未传 sideOffsets 时使用 [-radius, 0, radius]。 */
  radius?: Fixed
  /** 默认低位射线高度；未传 heightOffsets 时参与默认高度列表。 */
  lowHeight?: Fixed
  /** 默认高位射线高度；未传 heightOffsets 时参与默认高度列表。 */
  highHeight?: Fixed
  /** 自定义横向偏移列表，传入后会覆盖 radius 生成的默认三条射线。 */
  sideOffsets?: Fixed[]
  /** 自定义高度列表，传入后会覆盖 lowHeight/highHeight。 */
  heightOffsets?: Fixed[]
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
  startHeight?: Fixed
  /** 从角色位置向下检测的距离。 */
  distance?: Fixed
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
  tickSeconds?: Fixed
  /** tick 调度间隔帧数。默认 1，表示每帧更新；调度不要用时间。 */
  tickFrames?: integer
  /** 摇杆满输入时组件允许达到的最大水平速度。 */
  maxSpeed?: Fixed
  /** 组件启动时的当前水平速度。 */
  initialSpeed?: Fixed
  /** 在地面推动摇杆时，当前速度向目标速度靠近的加速度。 */
  groundAcceleration?: Fixed
  /** 地面加速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  groundAccelerationExpression?: string
  /** 在地面没有摇杆输入或前方受阻时，当前速度向 0 靠近的减速度。 */
  groundDeceleration?: Fixed
  /** 地面减速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  groundDecelerationExpression?: string
  /** 空中推动摇杆时使用的加速度；通常应小于 groundAcceleration。 */
  airAcceleration?: Fixed
  /** 空中加速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  airAccelerationExpression?: string
  /** 空中没有摇杆输入或前方受阻时使用的减速度。 */
  airDeceleration?: Fixed
  /** 空中减速度表达式；s 表示当前速度，支持数字和 + - * /。 */
  airDecelerationExpression?: string
  /** 摇杆死区；输入长度小于等于该值时视为停止输入。 */
  joystickDeadZone?: Fixed
  /** 角色最大线速度，用于放开引擎默认上限。 */
  maxLinearVelocity?: Fixed
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

export type ResolvedFastRunObstacleOptions = {
  enabled: boolean
  distance: Fixed
  collisionMask: integer
  radius: Fixed
  lowHeight: Fixed
  highHeight: Fixed
  sideOffsets?: Fixed[]
  heightOffsets?: Fixed[]
  logIntervalTicks: integer
}

export type ResolvedFastRunGroundOptions = {
  enabled: boolean
  startHeight: Fixed
  distance: Fixed
  collisionMask: integer
  logIntervalTicks: integer
}

export type ResolvedFastRunRayDebugOptions = {
  enabled: boolean
  duration: Fixed
  groundHitColor: Color
  groundMissColor: Color
  obstacleHitColor: Color
  obstacleMissColor: Color
}

export type ResolvedFastRunComponentOptions = {
  role: Role
  tickSeconds: Fixed
  tickFrames: integer
  maxSpeed: Fixed
  initialSpeed: Fixed
  groundAcceleration: Fixed
  groundAccelerationExpression: string
  groundDeceleration: Fixed
  groundDecelerationExpression: string
  airAcceleration: Fixed
  airAccelerationExpression: string
  airDeceleration: Fixed
  airDecelerationExpression: string
  joystickDeadZone: Fixed
  maxLinearVelocity: Fixed
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
  tickFrames: 1 as integer,
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

export function resolveFastRunComponentOptions(options: FastRunComponentOptions): ResolvedFastRunComponentOptions {
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
    tickFrames: options.tickFrames !== undefined ? options.tickFrames : (base.tickFrames as integer),
    maxSpeed: options.maxSpeed !== undefined ? options.maxSpeed : base.maxSpeed!,
    initialSpeed: options.initialSpeed !== undefined ? options.initialSpeed : base.initialSpeed!,
    groundAcceleration:
      options.groundAcceleration !== undefined ? options.groundAcceleration : base.groundAcceleration!,
    groundAccelerationExpression:
      options.groundAccelerationExpression !== undefined
        ? options.groundAccelerationExpression
        : options.groundAcceleration !== undefined
          ? EMath.formatFixed2(options.groundAcceleration)
          : base.groundAccelerationExpression!,
    groundDeceleration:
      options.groundDeceleration !== undefined ? options.groundDeceleration : base.groundDeceleration!,
    groundDecelerationExpression:
      options.groundDecelerationExpression !== undefined
        ? options.groundDecelerationExpression
        : options.groundDeceleration !== undefined
          ? EMath.formatFixed2(options.groundDeceleration)
          : base.groundDecelerationExpression!,
    airAcceleration: options.airAcceleration !== undefined ? options.airAcceleration : base.airAcceleration!,
    airAccelerationExpression:
      options.airAccelerationExpression !== undefined
        ? options.airAccelerationExpression
        : options.airAcceleration !== undefined
          ? EMath.formatFixed2(options.airAcceleration)
          : base.airAccelerationExpression!,
    airDeceleration: options.airDeceleration !== undefined ? options.airDeceleration : base.airDeceleration!,
    airDecelerationExpression:
      options.airDecelerationExpression !== undefined
        ? options.airDecelerationExpression
        : options.airDeceleration !== undefined
          ? EMath.formatFixed2(options.airDeceleration)
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
