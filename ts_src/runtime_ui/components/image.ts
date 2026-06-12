import { safeVoid } from "@common/engine_safe"
import type { RuntimeImageStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeImage {
  readonly node: EImage
  private readonly host: RuntimeUiHost

  constructor(host: RuntimeUiHost, node: EImage) {
    this.host = host
    this.node = node
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_image_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  setTextureByKey(imageKey: ImageKey, resetSize?: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_image_texture_by_key_with_auto_resize(this.node, imageKey, resetSize)
        },
        { tag: "runtime_ui_image_texture_key", logger: scopedLogger(this.host) },
      )
    })
  }

  setTexturePath(imagePath: string, resetSize?: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_image_texture_with_auto_resize(this.node, imagePath, resetSize)
        },
        { tag: "runtime_ui_image_texture_path", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeImageStyle): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          if (style?.color !== undefined) role.set_image_color(this.node, style.color, fixed(0))
          if (style?.textureKey !== undefined) {
            role.set_image_texture_by_key_with_auto_resize(this.node, style.textureKey, style.resetSize)
          }
          if (style?.texturePath !== undefined) {
            role.set_image_texture_with_auto_resize(this.node, style.texturePath, style.resetSize)
          }
        },
        { tag: "runtime_ui_image_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
