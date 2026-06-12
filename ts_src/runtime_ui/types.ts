export type RuntimeUiLogger = (this: void, msg: string) => void

export type RuntimeUiRect = {
  x: number
  y: number
  width: number
  height: number
}

export type RuntimeUiScopeOptions = {
  /** UI 挂载父节点。优先使用导出的 UINodes，避免运行时按名称查找失败。 */
  parentNode?: ENode
  /** 未传 parentNode 时，用 LuaAPI.query_ui_node 查询该节点名。 */
  parentNodeName?: string
  /** Runtime 创建 Label 使用的样式 key。 */
  labelStyleKey?: LabelStyleKey
  /** Runtime 创建 Button 使用的样式 key。 */
  buttonStyleKey?: BtnStyleKey
  /** Runtime 创建 Input 使用的样式 key。 */
  inputStyleKey?: InputStyleKey
  /** Runtime 创建 ProgressBar 使用的样式 key。 */
  progressBarStyleKey?: ProgressBarStyleKey
  /** 日志输出；组件内部只打印关键失败原因。 */
  logger?: RuntimeUiLogger
}

export type RuntimeLabelStyle = {
  fontSize?: integer
  color?: Color
  opacity?: number
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
  opacity?: number
  enabled?: boolean
  touchEnabled?: boolean
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

export type RuntimeUiComponent = {
  readonly node: ENode
  setVisible: (visible: boolean) => void
}

export type RuntimeUiHost = {
  forEachRole: (callback: (role: Role) => void) => void
  log: (msg: string) => void
}
