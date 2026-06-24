import { safeVoid } from "@common/engine_safe"
import type { RuntimeProgressTimerStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时环形/计时进度组件，封装 ProgressTimer 节点的范围、当前值、动画值和触摸样式。 */
export class RuntimeProgressTimer extends RuntimeUiComponentBase<EProgressbar> {
  setRange(min: integer, max: integer): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_progressbar_min(this.node, min)
          role.set_progressbar_max(this.node, max)
        },
        { tag: "runtime_ui_progress_timer_range", logger: scopedLogger(this.host) },
      )
    })
  }

  setValue(current: integer): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_progressbar_current(this.node, current)
        },
        { tag: "runtime_ui_progress_timer_current", logger: scopedLogger(this.host) },
      )
    })
  }

  setValueAnimated(current: integer, transitionSeconds: number): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_progressbar_transition(this.node, current, fixed(transitionSeconds))
        },
        { tag: "runtime_ui_progress_timer_transition", logger: scopedLogger(this.host) },
      )
    })
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_progress_timer_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeProgressTimerStyle): void {
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_node_touch_enabled(this.node, touchEnabled)
          if (style?.min !== undefined) role.set_progressbar_min(this.node, style.min)
          if (style?.max !== undefined) role.set_progressbar_max(this.node, style.max)
          if (style?.current !== undefined) role.set_progressbar_current(this.node, style.current)
        },
        { tag: "runtime_ui_progress_timer_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
