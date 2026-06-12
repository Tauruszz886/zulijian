import { safeVoid } from "@common/engine_safe"
import type { RuntimeInputStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeInput {
  readonly node: EInputField
  private readonly host: RuntimeUiHost
  private text = ""

  constructor(host: RuntimeUiHost, node: EInputField) {
    this.host = host
    this.node = node
  }

  setText(text: string): void {
    this.text = text
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_input_field_text(this.node, text)
        },
        { tag: "runtime_ui_input_text", logger: scopedLogger(this.host) },
      )
    })
  }

  getText(): string {
    return this.text
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_input_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeInputStyle): void {
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_node_touch_enabled(this.node, touchEnabled)
        },
        { tag: "runtime_ui_input_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
