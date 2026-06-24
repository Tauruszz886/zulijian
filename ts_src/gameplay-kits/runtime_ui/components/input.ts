import { safeVoid } from "@common/engine_safe"
import type { RuntimeInputStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时输入框组件，封装 InputField 节点的文本缓存、显隐和触摸样式。 */
export class RuntimeInput extends RuntimeUiComponentBase<EInputField> {
  private text = ""

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
