import { safeCall, safeVoid } from "@common/engine_safe"
import { EMath } from "../../emath"
import { drawRuntimeDebugLine } from "../../runtime_ui"
import { calculateFastRunMaxAirMoveDistance } from "../utils/FastRunAirDistance"
import {
  resolveFastRunComponentOptions,
  type FastRunComponentOptions,
  type ResolvedFastRunComponentOptions,
} from "./FastRunComponentOptions"
import { evaluateFastRunExpression } from "../utils/FastRunExpression"
import { type HorizontalDirection } from "./FastRunMotion"
import { enablePhysicsCcd, enableUnitCcd } from "./FastRunPhysics"
import { checkFastRunGrounded, hasFastRunObstacleAhead } from "./FastRunRaycast"

const STOPPED_SPEED_EPSILON = 0.001
const IDLE_ANIM_KEY = 21300 as AnimKey
const IDLE_ANIM_START_TIME = math.tofixed(0)
const IDLE_ANIM_PLAY_TIME = math.tofixed(3600)
const IDLE_ANIM_PLAY_RATE = math.tofixed(1)

export { DEFAULT_FAST_RUN_COMPONENT_OPTIONS } from "./FastRunComponentOptions"
export type {
  FastRunComponentOptions,
  FastRunGroundOptions,
  FastRunObstacleOptions,
  FastRunRayDebugOptions,
} from "./FastRunComponentOptions"

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
  private currentSpeed: Fixed
  private currentVelocityX: Fixed
  private currentVelocityZ: Fixed
  private grounded = true
  private lastHorizontalDirection: HorizontalDirection = { x: 0, z: 1 }
  private idleAnimationStopIssued = false

  constructor(options: FastRunComponentOptions) {
    this.options = resolveFastRunComponentOptions(options)
    this.currentSpeed = EMath.clampMin(this.options.initialSpeed, 0)
    this.currentVelocityX = this.lastHorizontalDirection.x * this.currentSpeed
    this.currentVelocityZ = this.lastHorizontalDirection.z * this.currentSpeed
    this.clampCurrentVelocityToMaxSpeed()
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
      `[FastRunComponent] enabled tick_seconds=${this.options.tickSeconds} tick_frames=${this.options.tickFrames} max_speed=${this.options.maxSpeed} ground_acceleration=${this.options.groundAcceleration} ground_deceleration=${this.options.groundDeceleration} air_acceleration=${this.options.airAcceleration} air_deceleration=${this.options.airDeceleration} dead_zone=${this.options.joystickDeadZone}`,
    )
    this.updateLoop()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  getCurrentSpeed(): Fixed {
    return this.currentSpeed
  }

  getMaxSpeed(): Fixed {
    return this.options.maxSpeed
  }

  setMaxSpeed(speed: Fixed): void {
    this.options.maxSpeed = EMath.clampMin(speed, 0)
    this.clampCurrentVelocityToMaxSpeed()
  }

  increaseMaxSpeed(delta: Fixed): void {
    this.setMaxSpeed(this.options.maxSpeed + delta)
  }

  getGroundAcceleration(): Fixed {
    return this.evaluateMotionExpression(this.options.groundAccelerationExpression, this.options.groundAcceleration, "ground_acceleration")
  }

  setGroundAcceleration(groundAcceleration: Fixed): void {
    this.options.groundAcceleration = EMath.clampMin(groundAcceleration, 0)
    this.options.groundAccelerationExpression = EMath.formatFixed2(this.options.groundAcceleration)
  }

  increaseGroundAcceleration(delta: Fixed): void {
    this.setGroundAcceleration(this.getGroundAcceleration() + delta)
  }

  getGroundAccelerationExpression(): string {
    return this.options.groundAccelerationExpression
  }

  setGroundAccelerationExpression(expression: string): boolean {
    return this.setMotionExpression("ground_acceleration", expression, (value) => {
      this.options.groundAccelerationExpression = expression
      this.options.groundAcceleration = EMath.clampMin(value, 0)
    })
  }

  getGroundDeceleration(): Fixed {
    return this.evaluateMotionExpression(this.options.groundDecelerationExpression, this.options.groundDeceleration, "ground_deceleration")
  }

  setGroundDeceleration(groundDeceleration: Fixed): void {
    this.options.groundDeceleration = EMath.clampMin(groundDeceleration, 0)
    this.options.groundDecelerationExpression = EMath.formatFixed2(this.options.groundDeceleration)
  }

  increaseGroundDeceleration(delta: Fixed): void {
    this.setGroundDeceleration(this.getGroundDeceleration() + delta)
  }

  getGroundDecelerationExpression(): string {
    return this.options.groundDecelerationExpression
  }

  setGroundDecelerationExpression(expression: string): boolean {
    return this.setMotionExpression("ground_deceleration", expression, (value) => {
      this.options.groundDecelerationExpression = expression
      this.options.groundDeceleration = EMath.clampMin(value, 0)
    })
  }

  getAirAcceleration(): Fixed {
    return this.evaluateMotionExpression(this.options.airAccelerationExpression, this.options.airAcceleration, "air_acceleration")
  }

  setAirAcceleration(airAcceleration: Fixed): void {
    this.options.airAcceleration = EMath.clampMin(airAcceleration, 0)
    this.options.airAccelerationExpression = EMath.formatFixed2(this.options.airAcceleration)
  }

  increaseAirAcceleration(delta: Fixed): void {
    this.setAirAcceleration(this.getAirAcceleration() + delta)
  }

  getAirAccelerationExpression(): string {
    return this.options.airAccelerationExpression
  }

  setAirAccelerationExpression(expression: string): boolean {
    return this.setMotionExpression("air_acceleration", expression, (value) => {
      this.options.airAccelerationExpression = expression
      this.options.airAcceleration = EMath.clampMin(value, 0)
    })
  }

  getAirDeceleration(): Fixed {
    return this.evaluateMotionExpression(this.options.airDecelerationExpression, this.options.airDeceleration, "air_deceleration")
  }

  setAirDeceleration(airDeceleration: Fixed): void {
    this.options.airDeceleration = EMath.clampMin(airDeceleration, 0)
    this.options.airDecelerationExpression = EMath.formatFixed2(this.options.airDeceleration)
  }

  increaseAirDeceleration(delta: Fixed): void {
    this.setAirDeceleration(this.getAirDeceleration() + delta)
  }

  getAirDecelerationExpression(): string {
    return this.options.airDecelerationExpression
  }

  setAirDecelerationExpression(expression: string): boolean {
    return this.setMotionExpression("air_deceleration", expression, (value) => {
      this.options.airDecelerationExpression = expression
      this.options.airDeceleration = EMath.clampMin(value, 0)
    })
  }

  isRayDebugEnabled(): boolean {
    return this.options.rayDebug.enabled
  }

  setRayDebugEnabled(enabled: boolean): void {
    this.options.rayDebug.enabled = enabled
  }

  isGrounded(): boolean {
    return this.grounded
  }

  calculateMaxAirMoveDistance(hangTimeSeconds: Fixed, initialSpeed?: Fixed): Fixed {
    return calculateFastRunMaxAirMoveDistance({
      maxSpeed: this.options.maxSpeed,
      airAcceleration: this.getAirAcceleration(),
      hangTimeSeconds,
      initialSpeed,
    })
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
    LuaAPI.call_delay_frame(this.options.tickFrames, () => {
      this.updateLoop()
    })
  }

  private normalizeHorizontalDirection(x: Fixed, z: Fixed): HorizontalDirection | null {
    const len = EMath.horizontalLength(x, z)
    if (len <= this.options.joystickDeadZone) return null
    const invLen = 1 / len
    return { x: x * invLen, z: z * invLen }
  }

  private getObstacleCheckDirection(character: Character, inputX: Fixed, inputZ: Fixed): HorizontalDirection | null {
    const joystickDirection = this.normalizeHorizontalDirection(inputX, inputZ)
    if (joystickDirection !== null) return joystickDirection

    return safeCall(
      () => {
        const forward = character.get_local_direction(Enums.DirectionType.FORWARD)
        return this.normalizeHorizontalDirection(forward.x as Fixed, forward.z as Fixed)
      },
      { tag: "fast_run_get_forward", fallback: null, logger: this.options.logger },
    ) as HorizontalDirection | null
  }

  private hasObstacleAhead(character: Character, dirX: Fixed, dirZ: Fixed): boolean {
    return hasFastRunObstacleAhead(character, dirX, dirZ, {
      obstacle: this.options.obstacle,
      ground: this.options.ground,
      rayDebug: this.options.rayDebug,
      tickIndex: this.tickIndex,
      logger: this.options.logger,
      drawLine: (start, end, color) => {
        this.drawDebugLine(start, end, color)
      },
    })
  }

  private checkGrounded(character: Character): boolean {
    return checkFastRunGrounded(character, {
      obstacle: this.options.obstacle,
      ground: this.options.ground,
      rayDebug: this.options.rayDebug,
      tickIndex: this.tickIndex,
      logger: this.options.logger,
      drawLine: (start, end, color) => {
        this.drawDebugLine(start, end, color)
      },
    })
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

  private evaluateMotionExpression(expression: string, fallback: Fixed, tag: string): Fixed {
    const result = evaluateFastRunExpression(expression, this.currentSpeed)
    if (!result.ok) {
      this.options.logger(`[FastRunComponent] expression failed tag=${tag} expr=${expression} err=${result.error}`)
      return EMath.clampMin(fallback, 0)
    }
    return EMath.clampMin(result.value, 0)
  }

  private setMotionExpression(tag: string, expression: string, apply: (value: Fixed) => void): boolean {
    const result = evaluateFastRunExpression(expression, this.currentSpeed)
    if (!result.ok) {
      this.options.logger(`[FastRunComponent] set expression failed tag=${tag} expr=${expression} err=${result.error}`)
      return false
    }

    apply(result.value)
    return true
  }

  private setCurrentHorizontalVelocity(x: Fixed, z: Fixed): void {
    const speed = EMath.horizontalLength(x, z)
    if (speed <= STOPPED_SPEED_EPSILON) {
      this.currentVelocityX = 0
      this.currentVelocityZ = 0
      this.currentSpeed = 0
      return
    }

    this.currentVelocityX = x
    this.currentVelocityZ = z
    this.currentSpeed = speed
  }

  private clampCurrentVelocityToMaxSpeed(): void {
    const speed = EMath.horizontalLength(this.currentVelocityX, this.currentVelocityZ)
    if (speed <= STOPPED_SPEED_EPSILON) {
      this.setCurrentHorizontalVelocity(0, 0)
      return
    }

    const maxSpeed = EMath.clampMin(this.options.maxSpeed, 0)
    if (speed <= maxSpeed) {
      this.currentSpeed = speed
      return
    }

    const scale = maxSpeed / speed
    this.setCurrentHorizontalVelocity(this.currentVelocityX * scale, this.currentVelocityZ * scale)
  }

  private syncIdleAnimationState(character: Character): void {
    if (this.currentSpeed > STOPPED_SPEED_EPSILON) {
      if (this.idleAnimationStopIssued) {
        safeVoid(
          () => {
            character.stop_play_body_anim_by_id(IDLE_ANIM_KEY)
          },
          { tag: "fast_run_stop_idle_animation", logger: this.options.logger },
        )
      }
      this.idleAnimationStopIssued = false
      return
    }

    if (this.idleAnimationStopIssued) return
    this.idleAnimationStopIssued = true

    // 物理速度归零后，运行时偶尔不会立刻退出移动骨骼动画；这里在进入静止状态时强制切到 idle 动画。
    // 运行时桥接不接受中间参数传 nil，所以 start_time/play_time/play_rate/is_loop 都传具体值。
    safeVoid(
      () => {
        character.force_play_animation_by_anim_key(
          IDLE_ANIM_KEY,
          IDLE_ANIM_START_TIME,
          IDLE_ANIM_PLAY_TIME,
          IDLE_ANIM_PLAY_RATE,
          true,
        )
      },
      { tag: "fast_run_play_idle_animation", logger: this.options.logger },
    )
  }

  private applyJoystickLinearVelocity(character: Character): void {
    // 只读取水平摇杆分量。FastRun 不改 Y 轴速度，跳跃、下落和外部竖直速度仍交给引擎处理。
    const joystick = character.get_joystick_direction()
    const inputX = joystick.x as Fixed
    const inputZ = joystick.z as Fixed

    // inputLen 是摇杆水平输入强度：0 表示无输入，1 表示满输入；超过 1 时后面会 clamp。
    const inputLen = EMath.horizontalLength(inputX, inputZ)

    // inputDirection 是归一化后的摇杆方向；死区内返回 null，后续会按“没有输入”减速。
    const inputDirection = this.normalizeHorizontalDirection(inputX, inputZ)

    // 障碍检测需要一个方向：有摇杆时用摇杆方向，没有摇杆时用角色朝向，避免贴墙静止时检测方向丢失。
    const checkDirection = this.getObstacleCheckDirection(character, inputX, inputZ)
    const blocked = checkDirection !== null ? this.hasObstacleAhead(character, checkDirection.x, checkDirection.z) : false

    // 保留当前 Y 轴速度，只覆盖水平 X/Z。这样 FastRun 不会吞掉跳跃、坠落或其他竖直物理效果。
    const currentVelocity = character.get_linear_velocity()

    // 每帧根据脚下射线选择地面/空中参数。空中通常给更小的加速度，让空中转向更弱。
    this.grounded = this.checkGrounded(character)
    const acceleration = this.grounded ? this.getGroundAcceleration() : this.getAirAcceleration()
    const deceleration = this.grounded ? this.getGroundDeceleration() : this.getAirDeceleration()

    // 默认目标速度是 0：没有摇杆输入、输入在死区内、或前方被障碍挡住时，都向 0 减速。
    let targetVelocityX = 0
    let targetVelocityZ = 0

    // maxDelta 是“这一帧最多允许水平速度向量变化多少”。
    // 没有有效输入时使用减速度：速度变化量 = deceleration * tickSeconds。
    let maxDelta = deceleration * this.options.tickSeconds
    if (inputDirection !== null && !blocked) {
      // 有有效输入时，目标速度向量 = 摇杆方向 * 目标速度标量。
      // 目标速度标量 = maxSpeed * 摇杆强度；轻推摇杆会得到更低的目标速度。
      const targetSpeed = this.options.maxSpeed * EMath.clamp01(inputLen)
      targetVelocityX = inputDirection.x * targetSpeed
      targetVelocityZ = inputDirection.z * targetSpeed

      // 有有效输入时使用加速度：速度变化量 = acceleration * tickSeconds。
      maxDelta = acceleration * this.options.tickSeconds
      this.lastHorizontalDirection = inputDirection
    }

    // 当前速度向量是组件上一次写入的水平速度，目标速度向量由本帧输入/阻挡结果计算得出。
    // moveVectorTowards 会沿着“当前速度 -> 目标速度”的方向移动，单帧最多移动 maxDelta。
    // 这就是“速度向量逐步靠近目标速度向量”：转向、加速、刹车都走同一套向量计算。
    const nextVelocity = EMath.moveVectorTowards(
      this.currentVelocityX,
      this.currentVelocityZ,
      targetVelocityX,
      targetVelocityZ,
      maxDelta,
    )
    this.setCurrentHorizontalVelocity(nextVelocity.x, nextVelocity.z)
    // nextVelocity 是本帧算出的最终水平速度候选值；写入角色前再夹到 maxSpeed，防止初始值或外部调参越界。
    this.clampCurrentVelocityToMaxSpeed()

    const velocityDirection = this.normalizeHorizontalDirection(this.currentVelocityX, this.currentVelocityZ)
    if (velocityDirection !== null) {
      this.lastHorizontalDirection = velocityDirection
    }

    character.set_linear_velocity(
      math.Vector3(this.currentVelocityX as Fixed, currentVelocity.y, this.currentVelocityZ as Fixed),
    )
    this.syncIdleAnimationState(character)
  }
}

export function createFastRunComponent(options: FastRunComponentOptions): FastRunComponent {
  return new FastRunComponent(options)
}
