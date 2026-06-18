import { safeVoid } from "@common/engine_safe"
import type { RuntimeNodeStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeNode {
  readonly node: ENode
  private readonly host: RuntimeUiHost

  constructor(host: RuntimeUiHost, node: ENode) {
    this.host = host
    this.node = node
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_node_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeNodeStyle): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          if (style?.touchEnabled !== undefined) role.set_node_touch_enabled(this.node, style.touchEnabled)
        },
        { tag: "runtime_ui_node_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
