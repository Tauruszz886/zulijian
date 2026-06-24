import { safeVoid } from "@common/engine_safe"
import type {
  ResolvedFastRunGroundOptions,
  ResolvedFastRunObstacleOptions,
  ResolvedFastRunRayDebugOptions,
} from "./FastRunComponentOptions"

type FastRunRaycastLogger = (this: void, msg: string) => void

type FastRunDrawDebugLine = (this: void, start: Vector3, end: Vector3, color: Color) => void

type ObstacleCheckLine = {
  start: Vector3
  end: Vector3
}

export type FastRunRaycastContext = {
  obstacle: ResolvedFastRunObstacleOptions
  ground: ResolvedFastRunGroundOptions
  rayDebug: ResolvedFastRunRayDebugOptions
  tickIndex: integer
  logger: FastRunRaycastLogger
  drawLine: FastRunDrawDebugLine
}

function shouldLog(interval: integer, tickIndex: integer): boolean {
  return interval > 0 && tickIndex % interval === 0
}

function getSideOffsets(obstacle: ResolvedFastRunObstacleOptions): Fixed[] {
  const offsets = obstacle.sideOffsets
  if (offsets !== undefined) return offsets
  return [-obstacle.radius, 0, obstacle.radius]
}

function getHeightOffsets(obstacle: ResolvedFastRunObstacleOptions): Fixed[] {
  const offsets = obstacle.heightOffsets
  if (offsets !== undefined) return offsets
  return [obstacle.lowHeight, obstacle.highHeight]
}

function getObstacleCheckLineWithOffset(
  character: Character,
  obstacle: ResolvedFastRunObstacleOptions,
  dirX: Fixed,
  dirZ: Fixed,
  sideOffset: Fixed,
  heightOffset: Fixed,
): ObstacleCheckLine {
  const position = character.get_position()
  const rightX = dirZ
  const rightZ = -dirX
  const startX = position.x + rightX * sideOffset
  const startZ = position.z + rightZ * sideOffset
  const y = position.y + heightOffset
  return {
    start: math.Vector3(startX, y, startZ),
    end: math.Vector3(startX + dirX * obstacle.distance, y, startZ + dirZ * obstacle.distance),
  }
}

export function hasFastRunObstacleAhead(
  character: Character,
  dirX: Fixed,
  dirZ: Fixed,
  context: FastRunRaycastContext,
): boolean {
  const obstacle = context.obstacle
  if (!obstacle.enabled) return false

  const sideOffsets = getSideOffsets(obstacle)
  const heightOffsets = getHeightOffsets(obstacle)
  let hitAny = false
  let rayIndex = 0

  for (const heightOffset of heightOffsets) {
    for (const sideOffset of sideOffsets) {
      const line = getObstacleCheckLineWithOffset(character, obstacle, dirX, dirZ, sideOffset, heightOffset)
      let hit = false
      safeVoid(
        () => {
          GameAPI.raycast_test(line.start, line.end, obstacle.collisionMask, true, () => {
            hit = true
            return true
          })
        },
        { tag: "fast_run_obstacle_raycast", logger: context.logger },
      )

      if (shouldLog(obstacle.logIntervalTicks, context.tickIndex)) {
        context.logger(
          `[FastRunComponentObstacleRaycast] index=${rayIndex} side=${sideOffset} height=${heightOffset} start=(${tostring(line.start.x)},${tostring(line.start.y)},${tostring(line.start.z)}) end=(${tostring(line.end.x)},${tostring(line.end.y)},${tostring(line.end.z)}) mask=${obstacle.collisionMask} hit=${tostring(hit)}`,
        )
      }

      context.drawLine(line.start, line.end, hit ? context.rayDebug.obstacleHitColor : context.rayDebug.obstacleMissColor)

      if (hit) hitAny = true
      rayIndex = rayIndex + 1
    }
  }

  return hitAny
}

export function checkFastRunGrounded(character: Character, context: FastRunRaycastContext): boolean {
  const ground = context.ground
  if (!ground.enabled) return true

  const position = character.get_position()
  const start = math.Vector3(position.x, position.y + ground.startHeight, position.z)
  const end = math.Vector3(position.x, position.y - ground.distance, position.z)
  let hit = false

  safeVoid(
    () => {
      GameAPI.raycast_test(start, end, ground.collisionMask, true, () => {
        hit = true
        return true
      })
    },
    { tag: "fast_run_ground_raycast", logger: context.logger },
  )

  if (shouldLog(ground.logIntervalTicks, context.tickIndex)) {
    context.logger(
      `[FastRunComponentGroundRaycast] start=(${tostring(start.x)},${tostring(start.y)},${tostring(start.z)}) end=(${tostring(end.x)},${tostring(end.y)},${tostring(end.z)}) mask=${ground.collisionMask} hit=${tostring(hit)}`,
    )
  }

  context.drawLine(start, end, hit ? context.rayDebug.groundHitColor : context.rayDebug.groundMissColor)

  return hit
}
