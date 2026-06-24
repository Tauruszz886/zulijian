import { safeVoid } from "@common/engine_safe"
import type { RuntimeAbilityButtonStyle, RuntimeUiClickHandler, RuntimeUiClickOptions, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时技能按钮组件，封装引擎 AbilityButton 的文本、显隐、点击和基础样式。 */
export class RuntimeAbilityButton extends RuntimeUiComponentBase<EButton> {
  setText(text: string): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_button_text(this.node, text)
        },
        { tag: "runtime_ui_ability_button_text", logger: scopedLogger(this.host) },
      )
    })
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_ability_button_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  onClick(handler: RuntimeUiClickHandler, options?: RuntimeUiClickOptions): number | null {
    return this.host.registerClick(this.node, handler, options)
  }

  offClick(regId: number): boolean {
    return this.host.unregisterClick(regId)
  }

  applyStyle(style?: RuntimeAbilityButtonStyle): void {
    const enabled = style?.enabled !== undefined ? style.enabled : true
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_button_enabled(this.node, enabled)
          role.set_node_touch_enabled(this.node, touchEnabled)
          if (style?.fontSize !== undefined) role.set_button_font_size(this.node, fixed(style.fontSize))
          if (style?.textColor !== undefined) role.set_button_text_color(this.node, style.textColor)
          if (style?.normalImageKey !== undefined) role.set_button_normal_image(this.node, style.normalImageKey)
          if (style?.pressedImageKey !== undefined) role.set_button_pressed_image(this.node, style.pressedImageKey)
        },
        { tag: "runtime_ui_ability_button_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
