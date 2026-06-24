import { safeVoid } from "@common/engine_safe"
import type { RuntimeClippingStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时裁剪节点组件，封装 Clipping 节点的显隐、透明度和触摸开关。 */
export class RuntimeClipping extends RuntimeUiComponentBase {
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
