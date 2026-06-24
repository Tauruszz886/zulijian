import { EMath } from "../../emath"

export type FastRunAirMoveDistanceOptions = {
  /** 最大水平速度。 */
  maxSpeed: Fixed
  /** 空中水平加速度。 */
  airAcceleration: Fixed
  /** 空中滞留时间，单位秒。 */
  hangTimeSeconds: Fixed
  /** 起跳进入空中时已有的水平速度；默认从 0 开始估算。 */
  initialSpeed?: Fixed
}

export function calculateFastRunMaxAirMoveDistance(options: FastRunAirMoveDistanceOptions): Fixed {
  const maxSpeed = EMath.clampMin(options.maxSpeed, 0)
  const airAcceleration = EMath.clampMin(options.airAcceleration, 0)
  const hangTimeSeconds = EMath.clampMin(options.hangTimeSeconds, 0)
  const initialSpeed = EMath.clamp(options.initialSpeed !== undefined ? options.initialSpeed : 0, 0, maxSpeed)

  if (hangTimeSeconds <= 0 || maxSpeed <= 0) return 0
  if (airAcceleration <= 0) return initialSpeed * hangTimeSeconds

  const timeToMaxSpeed = (maxSpeed - initialSpeed) / airAcceleration
  if (hangTimeSeconds <= timeToMaxSpeed) {
    return initialSpeed * hangTimeSeconds + 0.5 * airAcceleration * hangTimeSeconds * hangTimeSeconds
  }

  const accelerationDistance = initialSpeed * timeToMaxSpeed + 0.5 * airAcceleration * timeToMaxSpeed * timeToMaxSpeed
  return accelerationDistance + maxSpeed * (hangTimeSeconds - timeToMaxSpeed)
}
