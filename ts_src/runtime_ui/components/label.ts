import { safeVoid } from "@common/engine_safe"
import type { RuntimeLabelStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeLabel {
  readonly node: ELabel
  private readonly host: RuntimeUiHost

  constructor(host: RuntimeUiHost, node: ELabel) {
    this.host = host
    this.node = node
  }

  setText(text: string): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_label_text(this.node, text)
        },
        { tag: "runtime_ui_label_text", logger: scopedLogger(this.host) },
      )
    })
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_label_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeLabelStyle): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          if (style?.fontSize !== undefined) role.set_label_font_size(this.node, style.fontSize, fixed(0))
          if (style?.color !== undefined) role.set_label_color(this.node, style.color, fixed(0))
          if (style?.backgroundColor !== undefined) role.set_label_background_color(this.node, style.backgroundColor, fixed(0))
          if (style?.backgroundOpacity !== undefined) {
            role.set_label_background_opacity(this.node, fixed(style.backgroundOpacity), fixed(0))
          }
          if (style?.outlineEnabled !== undefined) role.set_label_outline_enabled(this.node, style.outlineEnabled)
          if (style?.outlineColor !== undefined) role.set_label_outline_color(this.node, style.outlineColor)
          if (style?.outlineOpacity !== undefined) role.set_label_outline_opacity(this.node, fixed(style.outlineOpacity))
          if (style?.outlineWidth !== undefined) role.set_label_outline_width(this.node, fixed(style.outlineWidth))
          if (style?.shadowEnabled !== undefined) role.set_label_shadow_enabled(this.node, style.shadowEnabled)
          if (style?.shadowColor !== undefined) role.set_label_shadow_color(this.node, style.shadowColor)
          if (style?.shadowXOffset !== undefined) role.set_label_shadow_x_offset(this.node, fixed(style.shadowXOffset))
          if (style?.shadowYOffset !== undefined) role.set_label_shadow_y_offset(this.node, fixed(style.shadowYOffset))
        },
        { tag: "runtime_ui_label_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
