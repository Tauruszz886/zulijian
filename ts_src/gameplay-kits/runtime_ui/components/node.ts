import { safeVoid } from "@common/engine_safe"
import type { RuntimeNodeStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时通用节点组件，封装任意 ENode 的显隐、透明度和触摸开关。 */
export class RuntimeNode extends RuntimeUiComponentBase {
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
