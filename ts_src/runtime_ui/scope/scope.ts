import { safeCall } from "@common/engine_safe"
import { RuntimeButton } from "../components/button"
import { RuntimeImage } from "../components/image"
import { RuntimeInput } from "../components/input"
import { RuntimeLabel } from "../components/label"
import { RuntimeProgressBar } from "../components/progress_bar"
import type {
  RuntimeButtonStyle,
  RuntimeImageStyle,
  RuntimeInputStyle,
  RuntimeLabelStyle,
  RuntimeProgressBarStyle,
  RuntimeUiLogger,
  RuntimeUiRect,
  RuntimeUiScopeOptions,
} from "../types"
import { fixed, noopLogger } from "../utils"

/**
 * 运行时 UI 组件作用域。
 *
 * 只封装 GameAPI/Role 的运行时 UI 能力，不使用 EditorAPI。
 * 当前先服务项目内测试面板；之后合入 platform 时可以直接保留这个 API 形状。
 *
 * 重要运行时经验：不要在 main.lua 刚加载时立刻创建 EUI。
 * 实测此时 create_eui_* 可能返回了节点句柄，但画面不渲染。
 * 使用方应在首帧之后创建，例如用 LuaAPI.call_delay_time(math.tofixed(1), ...) 延迟启动 UI。
 */
export class RuntimeUiScope {
  private readonly options: RuntimeUiScopeOptions
  private readonly logger: RuntimeUiLogger

  constructor(options: RuntimeUiScopeOptions) {
    this.options = options
    this.logger = options.logger !== undefined ? options.logger : noopLogger
  }

  resolveParent(): ENode | null {
    const parentNode = this.options.parentNode
    if (parentNode !== undefined) return parentNode

    const parentNodeName = this.options.parentNodeName
    if (parentNodeName === undefined || parentNodeName.length === 0) return null

    const queried = safeCall(
      () => {
        return LuaAPI.query_ui_node(parentNodeName)
      },
      { tag: "runtime_ui_query_parent", fallback: null, logger: this.logger },
    )
    return queried === undefined ? null : queried
  }

  createLabel(name: string, rect: RuntimeUiRect, text: string, style?: RuntimeLabelStyle): RuntimeLabel | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create label failed: parent missing name=${name}`)
      return null
    }

    const styleKey = this.options.labelStyleKey !== undefined ? this.options.labelStyleKey : (0 as LabelStyleKey)
    const node = safeCall(
      () => {
        return GameAPI.create_eui_label_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
          text,
        ) as ELabel
      },
      { tag: `runtime_ui_create_label_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const label = new RuntimeLabel(this, node)
    label.setText(text)
    label.applyStyle(style)
    label.setVisible(true)
    return label
  }

  createButton(name: string, rect: RuntimeUiRect, text: string, style?: RuntimeButtonStyle): RuntimeButton | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create button failed: parent missing name=${name}`)
      return null
    }

    const styleKey = this.options.buttonStyleKey !== undefined ? this.options.buttonStyleKey : (0 as BtnStyleKey)
    const node = safeCall(
      () => {
        return GameAPI.create_eui_button_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
        ) as EButton
      },
      { tag: `runtime_ui_create_button_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const button = new RuntimeButton(this, node)
    button.setText(text)
    button.applyStyle(style)
    button.setVisible(true)
    return button
  }

  createImage(name: string, rect: RuntimeUiRect, imageKey: ImageKey, style?: RuntimeImageStyle): RuntimeImage | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create image failed: parent missing name=${name}`)
      return null
    }

    const node = safeCall(
      () => {
        return GameAPI.create_eui_image_at_position(
          imageKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
        ) as EImage
      },
      { tag: `runtime_ui_create_image_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const image = new RuntimeImage(this, node)
    image.applyStyle(style)
    image.setVisible(true)
    return image
  }

  createInput(name: string, rect: RuntimeUiRect, text: string, style?: RuntimeInputStyle): RuntimeInput | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create input failed: parent missing name=${name}`)
      return null
    }

    const styleKey = this.options.inputStyleKey !== undefined ? this.options.inputStyleKey : (0 as InputStyleKey)
    const node = safeCall(
      () => {
        return GameAPI.create_eui_input_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
          text,
        ) as EInputField
      },
      { tag: `runtime_ui_create_input_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const input = new RuntimeInput(this, node)
    input.setText(text)
    input.applyStyle(style)
    input.setVisible(true)
    return input
  }

  createProgressBar(
    name: string,
    rect: RuntimeUiRect,
    style?: RuntimeProgressBarStyle,
  ): RuntimeProgressBar | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create progress failed: parent missing name=${name}`)
      return null
    }

    const styleKey =
      this.options.progressBarStyleKey !== undefined ? this.options.progressBarStyleKey : (0 as ProgressBarStyleKey)
    const node = safeCall(
      () => {
        return GameAPI.create_eui_progress_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
        ) as EProgressbar
      },
      { tag: `runtime_ui_create_progress_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const progressBar = new RuntimeProgressBar(this, node)
    progressBar.applyStyle(style)
    progressBar.setVisible(true)
    return progressBar
  }

  forEachRole(callback: (role: Role) => void): void {
    const roles = safeCall(
      () => {
        return GameAPI.get_all_valid_roles()
      },
      { tag: "runtime_ui_roles", logger: this.logger },
    )
    if (roles === undefined) return

    for (const role of roles) {
      callback(role)
    }
  }

  log(msg: string): void {
    this.logger(msg)
  }
}
