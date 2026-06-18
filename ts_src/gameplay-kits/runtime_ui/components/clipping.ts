import { safeVoid } from "@common/engine_safe"
import type { RuntimeClippingStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeClipping {
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
        { tag: "runtime_ui_clipping_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeClippingStyle): void {
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_node_touch_enabled(this.node, touchEnabled)
        },
        { tag: "runtime_ui_clipping_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
