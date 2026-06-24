import { safeVoid } from "@common/engine_safe"
import type { RuntimeEffectStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时 UI 动效组件，封装特效节点的播放、停止、重置和基础显示样式。 */
export class RuntimeEffect extends RuntimeUiComponentBase<EEffectNode> {
  play(): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.play_ui_effect(this.node)
        },
        { tag: "runtime_ui_effect_play", logger: scopedLogger(this.host) },
      )
    })
  }

  stop(): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.stop_ui_effect(this.node)
        },
        { tag: "runtime_ui_effect_stop", logger: scopedLogger(this.host) },
      )
    })
  }

  resetAnimation(): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.reset_animation(this.node)
        },
        { tag: "runtime_ui_effect_reset", logger: scopedLogger(this.host) },
      )
    })
  }

  setAnimationState(animationName: string, state: EAnimationState): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_animation_state(this.node, animationName, state)
        },
        { tag: "runtime_ui_effect_animation_state", logger: scopedLogger(this.host) },
      )
    })
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_effect_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeEffectStyle): void {
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_node_touch_enabled(this.node, touchEnabled)
          if (style?.animationName !== undefined && style?.animationState !== undefined) {
            role.set_animation_state(this.node, style.animationName, style.animationState)
          }
          if (style?.playOnApply === true) {
            role.play_ui_effect(this.node)
          }
        },
        { tag: "runtime_ui_effect_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
