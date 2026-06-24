import { safeVoid } from "@common/engine_safe"
import type { RuntimeUiLogger } from "../types"
import { fixed } from "../utils"

export type RuntimeDebugLineOptions = {
  /** 调试线起点。 */
  start: Vector3
  /** 调试线终点。 */
  end: Vector3
  /** 调试线颜色，运行时当前按 0xRRGGBB 传入。 */
  color?: Color
  /** 调试线持续秒数；需要常驻显示时由调用方按间隔重画。 */
  durationSeconds?: number
  /** 日志输出入口。 */
  logger?: RuntimeUiLogger
  /** safeVoid 日志 tag。 */
  tag?: string
}

const DEFAULT_RUNTIME_DEBUG_LINE_COLOR = 0xffffff as Color
const DEFAULT_RUNTIME_DEBUG_LINE_DURATION_SECONDS = 0.08

/**
 * 绘制运行时调试线。
 *
 * 当前游戏运行时没有暴露 DebugAPI，但仍保留了已废弃的 GameAPI.draw_line。
 * 所有玩法代码都应通过这个封装画线，避免后续引擎接口替换时大面积改业务代码。
 */
export function drawRuntimeDebugLine(options: RuntimeDebugLineOptions): boolean {
  const color = options.color !== undefined ? options.color : DEFAULT_RUNTIME_DEBUG_LINE_COLOR
  const durationSeconds =
    options.durationSeconds !== undefined ? options.durationSeconds : DEFAULT_RUNTIME_DEBUG_LINE_DURATION_SECONDS

  return safeVoid(
    () => {
      ;(GameAPI as any).draw_line(options.start, options.end, color, fixed(durationSeconds))
    },
    {
      tag: options.tag !== undefined ? options.tag : "runtime_ui_debug_line",
      logger: options.logger,
    },
  )
}
