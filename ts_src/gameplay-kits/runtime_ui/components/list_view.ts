import { safeVoid } from "@common/engine_safe"
import type { RuntimeListViewStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"
import { RuntimeUiComponentBase } from "./base"

/** 运行时列表视图组件，封装 ListView 节点的显隐、透明度和触摸开关。 */
export class RuntimeListView extends RuntimeUiComponentBase {
  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_list_view_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeListViewStyle): void {
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_node_touch_enabled(this.node, touchEnabled)
        },
        { tag: "runtime_ui_list_view_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
