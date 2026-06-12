import { safeVoid } from "@common/engine_safe"
import type { RuntimeButtonStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeButton {
  readonly node: EButton
  private readonly host: RuntimeUiHost

  constructor(host: RuntimeUiHost, node: EButton) {
    this.host = host
    this.node = node
  }

  setText(text: string): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_button_text(this.node, text)
        },
        { tag: "runtime_ui_button_text", logger: scopedLogger(this.host) },
      )
    })
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_button_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeButtonStyle): void {
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
        },
        { tag: "runtime_ui_button_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
