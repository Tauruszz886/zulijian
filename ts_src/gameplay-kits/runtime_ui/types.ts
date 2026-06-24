export type RuntimeUiLogger = (this: void, msg: string) => void

export type RuntimeUiNodeMap = Record<string, ENode | string>

export type RuntimeUiClickEvent = {
  eventName: string
  actor: unknown
  data: unknown
  node: ENode
}

export type RuntimeUiClickHandler = (this: void, event: RuntimeUiClickEvent) => void

export type RuntimeUiClickOptions = {
  touchEventType?: ENodeTouchEventType
  tag?: string
  safeCallback?: boolean
}

export type RuntimeUiRect = {
  x: number
  y: number
  width: number
  height: number
}

export type RuntimeAutoLayoutValue = {
  enabled?: boolean
  isPercent?: boolean
  value?: number
}

export type RuntimeAutoAdaptionOptions = {
  left?: RuntimeAutoLayoutValue
  right?: RuntimeAutoLayoutValue
  top?: RuntimeAutoLayoutValue
  bottom?: RuntimeAutoLayoutValue
}

export type RuntimeAutoCenterOptions = {
  horizontal?: RuntimeAutoLayoutValue
  vertical?: RuntimeAutoLayoutValue
}

export type RuntimeUiScopeOptions = {
  /** UI 挂载父节点。优先使用导出的 UINodes，避免运行时按名称查找失败。 */
  parentNode?: ENode
  /** 编辑器导出的 UINodes，例如 ts_src/generated/exported_data.ts 里的 UINodes。 */
  uiNodes?: RuntimeUiNodeMap
  /** 未传 parentNode 时，用 LuaAPI.query_ui_node 查询该节点名。 */
  parentNodeName?: string
  /** Runtime 创建 Label 使用的样式 key。 */
  labelStyleKey?: LabelStyleKey
  /** Runtime 创建 Button 使用的样式 key。 */
  buttonStyleKey?: BtnStyleKey
  /** Runtime 创建 AbilityButton 使用的样式 key。 */
  abilityStyleKey?: AbilityStyleKey
  /** Runtime 创建 BagSlot 使用的样式 key。 */
  bagSlotStyleKey?: BagSlotStyleKey
  /** Runtime 创建 Input 使用的样式 key。 */
  inputStyleKey?: InputStyleKey
  /** Runtime 创建 ProgressBar 使用的样式 key。 */
  progressBarStyleKey?: ProgressBarStyleKey
  /** Runtime 创建 ProgressTimer 使用的样式 key。 */
  progressTimerStyleKey?: ProgressTimerStyleKey
  /** Runtime 创建 Effect 使用的动效样式 key。 */
  animationStyleKey?: AnimationStyleKey
  /** EUI_NODE_TOUCH_EVENT 使用的触摸类型；不同工程点击无响应时可覆盖。 */
  touchEventType?: ENodeTouchEventType
  /** 日志输出；组件内部只打印关键失败原因。 */
  logger?: RuntimeUiLogger
}

export type RuntimeLabelStyle = {
  fontSize?: integer
  color?: Color
  opacity?: number
  touchEnabled?: boolean
  backgroundColor?: Color
  backgroundOpacity?: number
  outlineEnabled?: boolean
  outlineColor?: Color
  outlineOpacity?: number
  outlineWidth?: number
  shadowEnabled?: boolean
  shadowColor?: Color
  shadowXOffset?: number
  shadowYOffset?: number
}

export type RuntimeButtonStyle = {
  fontSize?: number
  textColor?: Color
  normalImageKey?: ImageKey
  pressedImageKey?: ImageKey
  opacity?: number
  enabled?: boolean
  touchEnabled?: boolean
}

export type RuntimeAbilityButtonStyle = RuntimeButtonStyle

export type LabelButtonStyle = {
  buttonStyle?: RuntimeButtonStyle
  labelStyle?: RuntimeLabelStyle
}

export type RuntimeBagSlotStyle = {
  opacity?: number
  touchEnabled?: boolean
  relatedLifeEntity?: LifeEntity
}

export type RuntimeImageStyle = {
  opacity?: number
  color?: Color
  textureKey?: ImageKey
  texturePath?: string
  resetSize?: boolean
}

export type RuntimeInputStyle = {
  opacity?: number
  touchEnabled?: boolean
}

export type RuntimeProgressBarStyle = {
  opacity?: number
  min?: integer
  max?: integer
  current?: integer
}

export type RuntimeProgressTimerStyle = RuntimeProgressBarStyle & {
  touchEnabled?: boolean
}

export type RuntimeNodeStyle = {
  opacity?: number
  touchEnabled?: boolean
}

export type RuntimeClippingStyle = RuntimeNodeStyle
export type RuntimeListViewStyle = RuntimeNodeStyle

export type RuntimeEffectStyle = RuntimeNodeStyle & {
  animationName?: string
  animationState?: EAnimationState
  playOnApply?: boolean
}

export type RuntimeUiComponent = {
  readonly node: ENode
  setVisible: (visible: boolean) => void
}

export type RuntimeUiHost = {
  forEachRole: (callback: (role: Role) => void) => void
  registerClick: (
    node: ENode,
    handler: RuntimeUiClickHandler,
    options?: RuntimeUiClickOptions,
  ) => number | null
  unregisterClick: (regId: number) => boolean
  log: (msg: string) => void
}
