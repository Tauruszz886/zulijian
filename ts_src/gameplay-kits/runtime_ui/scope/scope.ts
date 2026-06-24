import { safeCall } from "@common/engine_safe"
import { TriggerHub } from "@common/trigger_hub"
import { RuntimeAbilityButton } from "../components/ability_button"
import { RuntimeBagSlot } from "../components/bag_slot"
import { RuntimeButton } from "../components/button"
import { RuntimeClipping } from "../components/clipping"
import { RuntimeEffect } from "../components/effect"
import { RuntimeImage } from "../components/image"
import { RuntimeInput } from "../components/input"
import { RuntimeLabel } from "../components/label"
import { RuntimeListView } from "../components/list_view"
import { RuntimeNode } from "../components/node"
import { RuntimeProgressBar } from "../components/progress_bar"
import { RuntimeProgressTimer } from "../components/progress_timer"
import { LabelButton } from "../composites/label_button"
import type {
  LabelButtonStyle,
  RuntimeAbilityButtonStyle,
  RuntimeBagSlotStyle,
  RuntimeButtonStyle,
  RuntimeClippingStyle,
  RuntimeEffectStyle,
  RuntimeImageStyle,
  RuntimeInputStyle,
  RuntimeLabelStyle,
  RuntimeListViewStyle,
  RuntimeProgressBarStyle,
  RuntimeProgressTimerStyle,
  RuntimeUiClickHandler,
  RuntimeUiClickOptions,
  RuntimeUiHost,
  RuntimeUiLogger,
  RuntimeUiRect,
  RuntimeUiScopeOptions,
} from "../types"
import { fixed, noopLogger } from "../utils"

const DEFAULT_RUNTIME_UI_TOUCH_EVENT_TYPE = 1 as ENodeTouchEventType

/**
 * 运行时 UI 组件作用域。
 *
 * 只封装 GameAPI/Role 的运行时 UI 能力，不使用 EditorAPI。
 * 当前先服务项目内测试面板；之后合入 platform 时可以直接保留这个 API 形状。
 *
 * 重要运行时经验：不要在 main.lua 刚加载时立刻创建 EUI。
 * 实测此时 create_eui_* 可能返回了节点句柄，但画面不渲染。
 * 使用方应在首帧之后创建，例如用 LuaAPI.call_delay_frame(1, ...) 延迟一帧启动 UI。
 */
export class RuntimeUiScope {
  private readonly options: RuntimeUiScopeOptions
  private readonly logger: RuntimeUiLogger
  private clickScopeId: number | null = null

  constructor(options: RuntimeUiScopeOptions) {
    this.options = options
    this.logger = options.logger !== undefined ? options.logger : noopLogger
  }

  resolveParent(): ENode | null {
    const parentNode = this.options.parentNode
    if (parentNode !== undefined) return parentNode

    const parentNodeName = this.options.parentNodeName
    if (parentNodeName === undefined || parentNodeName.length === 0) return null

    const exportedNode = this.getExportedNode(parentNodeName)
    if (exportedNode !== null) return exportedNode

    const queried = safeCall(
      () => {
        return LuaAPI.query_ui_node(parentNodeName)
      },
      { tag: "runtime_ui_query_parent", fallback: null, logger: this.logger },
    )
    return queried === undefined ? null : queried
  }

  getNode(name: string): ENode | null {
    const exportedNode = this.getExportedNode(name)
    if (exportedNode !== null) return exportedNode

    const queried = safeCall(
      () => {
        return LuaAPI.query_ui_node(name)
      },
      { tag: `runtime_ui_query_node_${name}`, fallback: null, logger: this.logger },
    )
    return queried === undefined ? null : queried
  }

  getNodeComponent(name: string): RuntimeNode | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeNode(this, node)
  }

  getLabel(name: string): RuntimeLabel | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeLabel(this, node as ELabel)
  }

  getButton(name: string): RuntimeButton | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeButton(this, node as EButton)
  }

  getAbilityButton(name: string): RuntimeAbilityButton | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeAbilityButton(this, node as EButton)
  }

  getBagSlot(name: string): RuntimeBagSlot | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeBagSlot(this, node as EBagSlot)
  }

  getImage(name: string): RuntimeImage | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeImage(this, node as EImage)
  }

  getInput(name: string): RuntimeInput | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeInput(this, node as EInputField)
  }

  getProgressBar(name: string): RuntimeProgressBar | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeProgressBar(this, node as EProgressbar)
  }

  getProgressTimer(name: string): RuntimeProgressTimer | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeProgressTimer(this, node as EProgressbar)
  }

  getClipping(name: string): RuntimeClipping | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeClipping(this, node)
  }

  getEffect(name: string): RuntimeEffect | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeEffect(this, node as EEffectNode)
  }

  getListView(name: string): RuntimeListView | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeListView(this, node)
  }

  forRole(role: Role): RuntimeUiRoleScope {
    return new RuntimeUiRoleScope(this, role)
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

  createLabelButton(
    name: string,
    rect: RuntimeUiRect,
    text: string,
    style?: LabelButtonStyle,
  ): LabelButton | null {
    const button = this.createButton(`${name}_button`, rect, "", style?.buttonStyle)
    if (button === null) return null

    const labelRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width + 18,
      height: rect.height + 6,
    }
    const label = this.createLabel(`${name}_label`, labelRect, text, {
      ...(style?.labelStyle !== undefined ? style.labelStyle : {}),
      touchEnabled: false,
      backgroundOpacity: style?.labelStyle?.backgroundOpacity !== undefined ? style.labelStyle.backgroundOpacity : 0,
    })
    if (label === null) return null

    return new LabelButton(button, label)
  }

  createAbilityButton(
    name: string,
    rect: RuntimeUiRect,
    options?: {
      showWhenEmpty?: boolean
      showName?: boolean
      style?: RuntimeAbilityButtonStyle
    },
  ): RuntimeAbilityButton | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create ability button failed: parent missing name=${name}`)
      return null
    }

    const styleKey = this.options.abilityStyleKey !== undefined ? this.options.abilityStyleKey : (0 as AbilityStyleKey)
    const showWhenEmpty = options?.showWhenEmpty !== undefined ? options.showWhenEmpty : true
    const showName = options?.showName !== undefined ? options.showName : true
    const node = safeCall(
      () => {
        return GameAPI.create_eui_ability_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          showWhenEmpty,
          showName,
          name,
        ) as EButton
      },
      { tag: `runtime_ui_create_ability_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const button = new RuntimeAbilityButton(this, node)
    button.applyStyle(options?.style)
    button.setVisible(true)
    return button
  }

  createBagSlot(name: string, rect: RuntimeUiRect, style?: RuntimeBagSlotStyle): RuntimeBagSlot | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create bag slot failed: parent missing name=${name}`)
      return null
    }

    const styleKey = this.options.bagSlotStyleKey !== undefined ? this.options.bagSlotStyleKey : (0 as BagSlotStyleKey)
    const node = safeCall(
      () => {
        return GameAPI.create_eui_bagslot_at_position(
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          styleKey,
          name,
        ) as EBagSlot
      },
      { tag: `runtime_ui_create_bag_slot_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const bagSlot = new RuntimeBagSlot(this, node)
    bagSlot.applyStyle(style)
    bagSlot.setVisible(true)
    return bagSlot
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

  createClipping(
    name: string,
    rect: RuntimeUiRect,
    clippingPath: ImageKey,
    style?: RuntimeClippingStyle,
  ): RuntimeClipping | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create clipping failed: parent missing name=${name}`)
      return null
    }

    const node = safeCall(
      () => {
        return GameAPI.create_eui_clipping_at_position(
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
          clippingPath,
        )
      },
      { tag: `runtime_ui_create_clipping_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const clipping = new RuntimeClipping(this, node)
    clipping.applyStyle(style)
    clipping.setVisible(true)
    return clipping
  }

  createEffect(
    name: string,
    rect: RuntimeUiRect,
    options?: {
      loop?: boolean
      style?: RuntimeEffectStyle
    },
  ): RuntimeEffect | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create effect failed: parent missing name=${name}`)
      return null
    }

    const styleKey =
      this.options.animationStyleKey !== undefined ? this.options.animationStyleKey : (0 as AnimationStyleKey)
    const loop = options?.loop !== undefined ? options.loop : true
    const node = safeCall(
      () => {
        return GameAPI.create_eui_effect_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          loop,
          name,
        ) as EEffectNode
      },
      { tag: `runtime_ui_create_effect_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const effect = new RuntimeEffect(this, node)
    effect.applyStyle(options?.style)
    effect.setVisible(true)
    return effect
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

  createListView(name: string, rect: RuntimeUiRect, style?: RuntimeListViewStyle): RuntimeListView | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create list view failed: parent missing name=${name}`)
      return null
    }

    const node = safeCall(
      () => {
        return GameAPI.create_eui_listview_at_position(
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
        )
      },
      { tag: `runtime_ui_create_list_view_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const listView = new RuntimeListView(this, node)
    listView.applyStyle(style)
    listView.setVisible(true)
    return listView
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

  createProgressTimer(
    name: string,
    rect: RuntimeUiRect,
    style?: RuntimeProgressTimerStyle,
  ): RuntimeProgressTimer | null {
    const parent = this.resolveParent()
    if (parent === null) {
      this.log(`[RuntimeUI] create progress timer failed: parent missing name=${name}`)
      return null
    }

    const styleKey =
      this.options.progressTimerStyleKey !== undefined
        ? this.options.progressTimerStyleKey
        : (0 as ProgressTimerStyleKey)
    const node = safeCall(
      () => {
        return GameAPI.create_eui_progresstimer_at_position(
          styleKey,
          parent,
          fixed(rect.x),
          fixed(rect.y),
          fixed(rect.width),
          fixed(rect.height),
          name,
        ) as EProgressbar
      },
      { tag: `runtime_ui_create_progress_timer_${name}`, fallback: null, logger: this.logger },
    )
    if (node === undefined || node === null) return null

    const progressTimer = new RuntimeProgressTimer(this, node)
    progressTimer.applyStyle(style)
    progressTimer.setVisible(true)
    return progressTimer
  }

  registerClick(
    node: ENode,
    handler: RuntimeUiClickHandler,
    options?: RuntimeUiClickOptions,
  ): number | null {
    const touchEventType =
      options?.touchEventType !== undefined
        ? options.touchEventType
        : this.options.touchEventType !== undefined
          ? this.options.touchEventType
          : DEFAULT_RUNTIME_UI_TOUCH_EVENT_TYPE
    const scopeId = this.getClickScopeId()
    return TriggerHub.register(
      [EVENT.EUI_NODE_TOUCH_EVENT, node, touchEventType],
      (eventName: unknown, actor: unknown, data: unknown) => {
        handler({
          eventName: typeof eventName === "string" ? eventName : "",
          actor,
          data,
          node,
        })
      },
      {
        scopeId,
        tag: options?.tag !== undefined ? options.tag : "runtime-ui-click",
        safe: true,
        safeCallback: options?.safeCallback !== undefined ? options.safeCallback : true,
        logger: this.logger,
      },
    )
  }

  unregisterClick(regId: number): boolean {
    return TriggerHub.unregister(regId, { safe: true, logger: this.logger })
  }

  dispose(): void {
    if (this.clickScopeId === null) return
    TriggerHub.disposeScope(this.clickScopeId, { safe: true, logger: this.logger })
    this.clickScopeId = null
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

  private getExportedNode(name: string): ENode | null {
    const uiNodes = this.options.uiNodes
    if (uiNodes === undefined) return null
    const node = uiNodes[name]
    if (node === undefined) return null
    return node as unknown as ENode
  }

  private getClickScopeId(): number {
    if (this.clickScopeId !== null) return this.clickScopeId
    this.clickScopeId = TriggerHub.createScope("runtime-ui")
    return this.clickScopeId
  }
}

export class RuntimeUiRoleScope implements RuntimeUiHost {
  private readonly base: RuntimeUiScope
  private readonly role: Role

  constructor(base: RuntimeUiScope, role: Role) {
    this.base = base
    this.role = role
  }

  getNode(name: string): ENode | null {
    return this.base.getNode(name)
  }

  getNodeComponent(name: string): RuntimeNode | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeNode(this, node)
  }

  getLabel(name: string): RuntimeLabel | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeLabel(this, node as ELabel)
  }

  getButton(name: string): RuntimeButton | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeButton(this, node as EButton)
  }

  getAbilityButton(name: string): RuntimeAbilityButton | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeAbilityButton(this, node as EButton)
  }

  getBagSlot(name: string): RuntimeBagSlot | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeBagSlot(this, node as EBagSlot)
  }

  getImage(name: string): RuntimeImage | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeImage(this, node as EImage)
  }

  getInput(name: string): RuntimeInput | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeInput(this, node as EInputField)
  }

  getProgressBar(name: string): RuntimeProgressBar | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeProgressBar(this, node as EProgressbar)
  }

  getProgressTimer(name: string): RuntimeProgressTimer | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeProgressTimer(this, node as EProgressbar)
  }

  getClipping(name: string): RuntimeClipping | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeClipping(this, node)
  }

  getEffect(name: string): RuntimeEffect | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeEffect(this, node as EEffectNode)
  }

  getListView(name: string): RuntimeListView | null {
    const node = this.getNode(name)
    if (node === null) return null
    return new RuntimeListView(this, node)
  }

  forEachRole(callback: (role: Role) => void): void {
    callback(this.role)
  }

  registerClick(
    node: ENode,
    handler: RuntimeUiClickHandler,
    options?: RuntimeUiClickOptions,
  ): number | null {
    return this.base.registerClick(node, handler, options)
  }

  unregisterClick(regId: number): boolean {
    return this.base.unregisterClick(regId)
  }

  log(msg: string): void {
    this.base.log(msg)
  }
}
