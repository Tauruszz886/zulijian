import { safeVoid } from "@common/engine_safe"
import type {
  RuntimeAutoAdaptionOptions,
  RuntimeAutoCenterOptions,
  RuntimeAutoLayoutValue,
  RuntimeUiHost,
} from "../types"
import { fixed, scopedLogger } from "../utils"

type ResolvedRuntimeAutoLayoutValue = {
  enabled: boolean
  isPercent: boolean
  value: number
}

function resolveAutoLayoutValue(value?: RuntimeAutoLayoutValue): ResolvedRuntimeAutoLayoutValue {
  return {
    enabled: value?.enabled !== undefined ? value.enabled : false,
    isPercent: value?.isPercent !== undefined ? value.isPercent : false,
    value: value?.value !== undefined ? value.value : 0,
  }
}

/** 运行时 UI 组件基类，承载所有 ENode 共有的显隐和屏幕自适应布局能力。 */
export class RuntimeUiComponentBase<TNode extends ENode = ENode> {
  readonly node: TNode
  protected readonly host: RuntimeUiHost

  constructor(host: RuntimeUiHost, node: TNode) {
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

  setAutoAdaption(options: RuntimeAutoAdaptionOptions): boolean {
    const left = resolveAutoLayoutValue(options.left)
    const right = resolveAutoLayoutValue(options.right)
    const top = resolveAutoLayoutValue(options.top)
    const bottom = resolveAutoLayoutValue(options.bottom)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_auto_adaption(
          this.node,
          left.enabled,
          left.isPercent,
          fixed(left.value),
          right.enabled,
          right.isPercent,
          fixed(right.value),
          top.enabled,
          top.isPercent,
          fixed(top.value),
          bottom.enabled,
          bottom.isPercent,
          fixed(bottom.value),
        )
      },
      { tag: "runtime_ui_node_auto_adaption", logger: scopedLogger(this.host) },
    )
  }

  setAutoCenter(options: RuntimeAutoCenterOptions): boolean {
    const horizontal = resolveAutoLayoutValue(options.horizontal)
    const vertical = resolveAutoLayoutValue(options.vertical)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_auto_center(
          this.node,
          horizontal.enabled,
          horizontal.isPercent,
          fixed(horizontal.value),
          vertical.enabled,
          vertical.isPercent,
          fixed(vertical.value),
        )
      },
      { tag: "runtime_ui_node_auto_center", logger: scopedLogger(this.host) },
    )
  }

  setLeftAutoAdaption(value: RuntimeAutoLayoutValue): boolean {
    const resolved = resolveAutoLayoutValue(value)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_left_auto_adaption(this.node, resolved.enabled, resolved.isPercent, fixed(resolved.value))
      },
      { tag: "runtime_ui_node_left_auto_adaption", logger: scopedLogger(this.host) },
    )
  }

  setRightAutoAdaption(value: RuntimeAutoLayoutValue): boolean {
    const resolved = resolveAutoLayoutValue(value)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_right_auto_adaption(this.node, resolved.enabled, resolved.isPercent, fixed(resolved.value))
      },
      { tag: "runtime_ui_node_right_auto_adaption", logger: scopedLogger(this.host) },
    )
  }

  setTopAutoAdaption(value: RuntimeAutoLayoutValue): boolean {
    const resolved = resolveAutoLayoutValue(value)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_top_auto_adaption(this.node, resolved.enabled, resolved.isPercent, fixed(resolved.value))
      },
      { tag: "runtime_ui_node_top_auto_adaption", logger: scopedLogger(this.host) },
    )
  }

  setBottomAutoAdaption(value: RuntimeAutoLayoutValue): boolean {
    const resolved = resolveAutoLayoutValue(value)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_bottom_auto_adaption(this.node, resolved.enabled, resolved.isPercent, fixed(resolved.value))
      },
      { tag: "runtime_ui_node_bottom_auto_adaption", logger: scopedLogger(this.host) },
    )
  }

  setHorizontalAutoCenter(value: RuntimeAutoLayoutValue): boolean {
    const resolved = resolveAutoLayoutValue(value)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_horizontal_auto_center(this.node, resolved.enabled, resolved.isPercent, fixed(resolved.value))
      },
      { tag: "runtime_ui_node_horizontal_auto_center", logger: scopedLogger(this.host) },
    )
  }

  setVerticalAutoCenter(value: RuntimeAutoLayoutValue): boolean {
    const resolved = resolveAutoLayoutValue(value)
    return safeVoid(
      () => {
        GameAPI.set_eui_node_vertical_auto_center(this.node, resolved.enabled, resolved.isPercent, fixed(resolved.value))
      },
      { tag: "runtime_ui_node_vertical_auto_center", logger: scopedLogger(this.host) },
    )
  }
}
