import { safeVoid } from "@common/engine_safe"
import type { RuntimeBagSlotStyle, RuntimeUiHost } from "../types"
import { fixed, scopedLogger } from "../utils"

export class RuntimeBagSlot {
  readonly node: EBagSlot
  private readonly host: RuntimeUiHost

  constructor(host: RuntimeUiHost, node: EBagSlot) {
    this.host = host
    this.node = node
  }

  setRelatedLifeEntity(lifeEntity: LifeEntity): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_bagslot_related_lifeentity(this.node, lifeEntity)
        },
        { tag: "runtime_ui_bag_slot_lifeentity", logger: scopedLogger(this.host) },
      )
    })
  }

  setVisible(visible: boolean): void {
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_node_visible(this.node, visible)
        },
        { tag: "runtime_ui_bag_slot_visible", logger: scopedLogger(this.host) },
      )
    })
  }

  applyStyle(style?: RuntimeBagSlotStyle): void {
    const touchEnabled = style?.touchEnabled !== undefined ? style.touchEnabled : true
    this.host.forEachRole((role) => {
      safeVoid(
        () => {
          role.set_ui_opacity(this.node, fixed(style?.opacity !== undefined ? style.opacity : 1))
          role.set_node_touch_enabled(this.node, touchEnabled)
          if (style?.relatedLifeEntity !== undefined) {
            role.set_bagslot_related_lifeentity(this.node, style.relatedLifeEntity)
          }
        },
        { tag: "runtime_ui_bag_slot_style", logger: scopedLogger(this.host) },
      )
    })
  }
}
