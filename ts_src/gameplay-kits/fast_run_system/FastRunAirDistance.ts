export type FastRunAirMoveDistanceOptions = {
  /** 最大水平速度。 */
  maxSpeed: number
  /** 空中水平加速度。 */
  airAcceleration: number
  /** 空中滞留时间，单位秒。 */
  hangTimeSeconds: number
  /** 起跳进入空中时已有的水平速度；默认从 0 开始估算。 */
  initialSpeed?: number
}

function clampMin(value: number, minValue: number): number {
  return value < minValue ? minValue : value
}

function clampNumber(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) return minValue
  if (value > maxValue) return maxValue
  return value
}

export function calculateFastRunMaxAirMoveDistance(options: FastRunAirMoveDistanceOptions): number {
  const maxSpeed = clampMin(options.maxSpeed, 0)
  const airAcceleration = clampMin(options.airAcceleration, 0)
  const hangTimeSeconds = clampMin(options.hangTimeSeconds, 0)
  const initialSpeed = clampNumber(options.initialSpeed !== undefined ? options.initialSpeed : 0, 0, maxSpeed)

  if (hangTimeSeconds <= 0 || maxSpeed <= 0) return 0
  if (airAcceleration <= 0) return initialSpeed * hangTimeSeconds

  const timeToMaxSpeed = (maxSpeed - initialSpeed) / airAcceleration
  if (hangTimeSeconds <= timeToMaxSpeed) {
    return initialSpeed * hangTimeSeconds + 0.5 * airAcceleration * hangTimeSeconds * hangTimeSeconds
  }

  const accelerationDistance = initialSpeed * timeToMaxSpeed + 0.5 * airAcceleration * timeToMaxSpeed * timeToMaxSpeed
  return accelerationDistance + maxSpeed * (hangTimeSeconds - timeToMaxSpeed)
}
