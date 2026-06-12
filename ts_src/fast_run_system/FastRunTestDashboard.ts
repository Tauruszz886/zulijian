import { TriggerHub } from "@common/trigger_hub"
import {
  RuntimeButton,
  RuntimeImage,
  RuntimeLabel,
  RuntimeUiGroup,
  RuntimeUiScope,
  type RuntimeButtonStyle,
  type RuntimeLabelStyle,
} from "../runtime_ui"

export type FastRunDashboardComponents = {
  group: RuntimeUiGroup
  background: RuntimeImage
  titleLabel: RuntimeLabel
  rayDebugButton: RuntimeButton
  currentSpeedLabel: RuntimeLabel
  speedLabel: RuntimeLabel
  speedMinus10Button: RuntimeButton
  speedMinus1Button: RuntimeButton
  speedValueLabel: RuntimeLabel
  speedPlus1Button: RuntimeButton
  speedPlus10Button: RuntimeButton
  groundAccelerationLabel: RuntimeLabel
  groundAccelerationMinus10Button: RuntimeButton
  groundAccelerationMinus1Button: RuntimeButton
  groundAccelerationValueLabel: RuntimeLabel
  groundAccelerationPlus1Button: RuntimeButton
  groundAccelerationPlus10Button: RuntimeButton
  groundDecelerationLabel: RuntimeLabel
  groundDecelerationMinus10Button: RuntimeButton
  groundDecelerationMinus1Button: RuntimeButton
  groundDecelerationValueLabel: RuntimeLabel
  groundDecelerationPlus1Button: RuntimeButton
  groundDecelerationPlus10Button: RuntimeButton
  airAccelerationLabel: RuntimeLabel
  airAccelerationMinus10Button: RuntimeButton
  airAccelerationMinus1Button: RuntimeButton
  airAccelerationValueLabel: RuntimeLabel
  airAccelerationPlus1Button: RuntimeButton
  airAccelerationPlus10Button: RuntimeButton
  airDecelerationLabel: RuntimeLabel
  airDecelerationMinus10Button: RuntimeButton
  airDecelerationMinus1Button: RuntimeButton
  airDecelerationValueLabel: RuntimeLabel
  airDecelerationPlus1Button: RuntimeButton
  airDecelerationPlus10Button: RuntimeButton
}

export type FastRunTestDashboardCallbacks = {
  getCurrentSpeed: (this: void) => number
  getMaxSpeed: (this: void) => number
  setMaxSpeed: (this: void, speed: number) => void
  getGroundAcceleration: (this: void) => number
  setGroundAcceleration: (this: void, groundAcceleration: number) => void
  getGroundDeceleration: (this: void) => number
  setGroundDeceleration: (this: void, groundDeceleration: number) => void
  getAirAcceleration: (this: void) => number
  setAirAcceleration: (this: void, airAcceleration: number) => void
  getAirDeceleration: (this: void) => number
  setAirDeceleration: (this: void, airDeceleration: number) => void
  isRayDebugEnabled: (this: void) => boolean
  setRayDebugEnabled: (this: void, enabled: boolean) => void
  logger: (this: void, msg: string) => void
}

/**
 * FastRunSystem 测试面板配置。
 *
 * 这是 kit 自带的测试模式，方便在地图里临时调参。正式玩法不要开启。
 */
export type FastRunSystemTestModeOptions = {
  /** 是否开启测试模式。 */
  enabled?: boolean
  /** 面板挂载父节点；推荐地图侧传入导出的 UINodes 画布节点。 */
  parentNode?: ENode
  /** 未传 parentNode 时，用 LuaAPI.query_ui_node 查询该节点名。 */
  parentNodeName?: string
  /** Runtime 创建按钮时使用的按钮样式 key。 */
  buttonStyleKey?: BtnStyleKey
  /** Runtime 创建文本时使用的文本样式 key。 */
  labelStyleKey?: LabelStyleKey
  /** 背景图资源 key。 */
  backgroundImageKey?: ImageKey
  /** EUI_NODE_TOUCH_EVENT 使用的触摸类型。不同工程如点击无响应，可在地图侧替换该值。 */
  touchEventType?: ENodeTouchEventType
  /** 面板中心 X。 */
  x?: number
  /** 面板中心 Y。 */
  y?: number
  /** 标题字号。 */
  titleFontSize?: integer
  /** 普通文本字号。 */
  bodyFontSize?: integer
  /** 按钮文字字号。 */
  buttonFontSize?: number
  /** 测试面板允许设置的最大速度下限。 */
  minSpeed?: number
  /** 测试面板允许设置的最大速度上限。 */
  maxSpeed?: number
  /** 测试面板允许设置的地面加速度下限。 */
  minGroundAcceleration?: number
  /** 测试面板允许设置的地面加速度上限。 */
  maxGroundAcceleration?: number
  /** 测试面板允许设置的地面减速度下限。 */
  minGroundDeceleration?: number
  /** 测试面板允许设置的地面减速度上限。 */
  maxGroundDeceleration?: number
  /** 测试面板允许设置的空中加速度下限。 */
  minAirAcceleration?: number
  /** 测试面板允许设置的空中加速度上限。 */
  maxAirAcceleration?: number
  /** 测试面板允许设置的空中减速度下限。 */
  minAirDeceleration?: number
  /** 测试面板允许设置的空中减速度上限。 */
  maxAirDeceleration?: number
}

export const DEFAULT_FAST_RUN_TEST_MODE_OPTIONS: FastRunSystemTestModeOptions = {
  enabled: false,
  buttonStyleKey: 0 as BtnStyleKey,
  labelStyleKey: 0 as LabelStyleKey,
  backgroundImageKey: 16941 as ImageKey,
  touchEventType: 1 as ENodeTouchEventType,
  x: 250,
  y: 920,
  titleFontSize: 24 as integer,
  bodyFontSize: 18 as integer,
  buttonFontSize: 20,
  minSpeed: 0,
  maxSpeed: 60,
  minGroundAcceleration: 0,
  maxGroundAcceleration: 200,
  minGroundDeceleration: 0,
  maxGroundDeceleration: 200,
  minAirAcceleration: 0,
  maxAirAcceleration: 200,
  minAirDeceleration: 0,
  maxAirDeceleration: 200,
}

let nextDashboardId: integer = 1

const TITLE_TEXT = "快速跑调试"
const PANEL_WIDTH = 620
const PANEL_HEIGHT = 530
const TITLE_OFFSET_Y = 184
const RAY_BUTTON_OFFSET_X = 190
const RAY_BUTTON_OFFSET_Y = 184
const CURRENT_SPEED_OFFSET_Y = 144
const SPEED_ROW_OFFSET_Y = 96
const GROUND_ACCELERATION_ROW_OFFSET_Y = 34
const GROUND_DECELERATION_ROW_OFFSET_Y = -28
const AIR_ACCELERATION_ROW_OFFSET_Y = -90
const AIR_DECELERATION_ROW_OFFSET_Y = -152
const CAPTION_OFFSET_X = -244
const MINUS_10_OFFSET_X = -142
const MINUS_1_OFFSET_X = -82
const VALUE_OFFSET_X = 0
const PLUS_1_OFFSET_X = 82
const PLUS_10_OFFSET_X = 142
const CAPTION_WIDTH = 110
const CAPTION_HEIGHT = 34
const VALUE_WIDTH = 94
const VALUE_HEIGHT = 40
const STEP_BUTTON_WIDTH = 52
const STEP_BUTTON_HEIGHT = 42
const UI_TEXT_WHITE = 0xffffff as Color
const UI_TEXT_BLACK = 0x000000 as Color

function clampNumber(value: number, minValue: number, maxValue: number): number {
  if (value < minValue) return minValue
  if (value > maxValue) return maxValue
  return value
}

export function resolveFastRunTestModeOptions(options?: FastRunSystemTestModeOptions): FastRunSystemTestModeOptions {
  const base = DEFAULT_FAST_RUN_TEST_MODE_OPTIONS
  return {
    enabled: options?.enabled !== undefined ? options.enabled : base.enabled,
    parentNode: options?.parentNode,
    parentNodeName: options?.parentNodeName,
    buttonStyleKey: options?.buttonStyleKey !== undefined ? options.buttonStyleKey : (base.buttonStyleKey as BtnStyleKey),
    labelStyleKey: options?.labelStyleKey !== undefined ? options.labelStyleKey : (base.labelStyleKey as LabelStyleKey),
    backgroundImageKey:
      options?.backgroundImageKey !== undefined ? options.backgroundImageKey : (base.backgroundImageKey as ImageKey),
    touchEventType:
      options?.touchEventType !== undefined ? options.touchEventType : (base.touchEventType as ENodeTouchEventType),
    x: options?.x !== undefined ? options.x : base.x,
    y: options?.y !== undefined ? options.y : base.y,
    titleFontSize: options?.titleFontSize !== undefined ? options.titleFontSize : base.titleFontSize,
    bodyFontSize: options?.bodyFontSize !== undefined ? options.bodyFontSize : base.bodyFontSize,
    buttonFontSize: options?.buttonFontSize !== undefined ? options.buttonFontSize : base.buttonFontSize,
    minSpeed: options?.minSpeed !== undefined ? options.minSpeed : base.minSpeed,
    maxSpeed: options?.maxSpeed !== undefined ? options.maxSpeed : base.maxSpeed,
    minGroundAcceleration:
      options?.minGroundAcceleration !== undefined ? options.minGroundAcceleration : base.minGroundAcceleration,
    maxGroundAcceleration:
      options?.maxGroundAcceleration !== undefined ? options.maxGroundAcceleration : base.maxGroundAcceleration,
    minGroundDeceleration:
      options?.minGroundDeceleration !== undefined ? options.minGroundDeceleration : base.minGroundDeceleration,
    maxGroundDeceleration:
      options?.maxGroundDeceleration !== undefined ? options.maxGroundDeceleration : base.maxGroundDeceleration,
    minAirAcceleration:
      options?.minAirAcceleration !== undefined ? options.minAirAcceleration : base.minAirAcceleration,
    maxAirAcceleration:
      options?.maxAirAcceleration !== undefined ? options.maxAirAcceleration : base.maxAirAcceleration,
    minAirDeceleration:
      options?.minAirDeceleration !== undefined ? options.minAirDeceleration : base.minAirDeceleration,
    maxAirDeceleration:
      options?.maxAirDeceleration !== undefined ? options.maxAirDeceleration : base.maxAirDeceleration,
  }
}

export class FastRunTestDashboard {
  private readonly options: FastRunSystemTestModeOptions
  private readonly callbacks: FastRunTestDashboardCallbacks
  private scopeId: number | null = null
  private components: FastRunDashboardComponents | null = null
  private uiScope: RuntimeUiScope | null = null

  constructor(options: FastRunSystemTestModeOptions, callbacks: FastRunTestDashboardCallbacks) {
    this.options = options
    this.callbacks = callbacks
  }

  setEnabled(enabled: boolean): void {
    if (!enabled) {
      this.disable()
      return
    }

    this.enable()
  }

  private enable(): void {
    this.log(
      `[FastRunSystemTestMode] enable enabled=${tostring(this.options.enabled)} parent=${tostring(this.options.parentNode)} parent_name=${tostring(this.options.parentNodeName)} button_style=${tostring(this.options.buttonStyleKey)} label_style=${tostring(this.options.labelStyleKey)} background=${tostring(this.options.backgroundImageKey)} x=${tostring(this.options.x)} y=${tostring(this.options.y)}`,
    )
    if (this.options.enabled !== true) return
    if (this.components !== null) {
      this.log("[FastRunSystemTestMode] enable skipped: dashboard already exists")
      return
    }

    const created = this.createComponents()
    if (created === null) return
    this.components = created
    this.log(
      `[FastRunSystemTestMode] dashboard created bg=${tostring(created.background.node)} speed_value=${tostring(created.speedValueLabel.node)} ground_accel_value=${tostring(created.groundAccelerationValueLabel.node)} air_decel_value=${tostring(created.airDecelerationValueLabel.node)}`,
    )
    this.updateValues()
    this.setVisible(true)

    this.registerEvents(created)
  }

  private disable(): void {
    this.log("[FastRunSystemTestMode] disable")
    if (this.scopeId !== null) {
      TriggerHub.disposeScope(this.scopeId, { safe: true, logger: this.callbacks.logger })
      this.scopeId = null
    }
    this.setVisible(false)
    this.components = null
    this.uiScope = null
  }

  updateValues(): void {
    const components = this.components
    if (components === null) {
      return
    }

    const currentSpeedText = this.formatNumber(this.callbacks.getCurrentSpeed())
    const maxSpeedText = this.formatNumber(this.callbacks.getMaxSpeed())
    const groundAccelerationText = this.formatNumber(this.callbacks.getGroundAcceleration())
    const groundDecelerationText = this.formatNumber(this.callbacks.getGroundDeceleration())
    const airAccelerationText = this.formatNumber(this.callbacks.getAirAcceleration())
    const airDecelerationText = this.formatNumber(this.callbacks.getAirDeceleration())
    components.titleLabel.setText(TITLE_TEXT)
    components.rayDebugButton.setText(this.callbacks.isRayDebugEnabled() ? "射线开" : "射线关")
    components.currentSpeedLabel.setText(`当前速度 ${currentSpeedText}`)
    components.speedValueLabel.setText(maxSpeedText)
    components.groundAccelerationValueLabel.setText(groundAccelerationText)
    components.groundDecelerationValueLabel.setText(groundDecelerationText)
    components.airAccelerationValueLabel.setText(airAccelerationText)
    components.airDecelerationValueLabel.setText(airDecelerationText)
  }

  private createComponents(): FastRunDashboardComponents | null {
    const x = this.options.x !== undefined ? this.options.x : 250
    const y = this.options.y !== undefined ? this.options.y : 920
    const labelStyleKey = this.options.labelStyleKey as LabelStyleKey
    const buttonStyleKey = this.options.buttonStyleKey as BtnStyleKey
    const backgroundImageKey = this.options.backgroundImageKey as ImageKey
    const suffix = tostring(nextDashboardId)
    nextDashboardId = (nextDashboardId + 1) as integer
    this.log(
      `[FastRunSystemTestMode] create dashboard parent=${tostring(this.options.parentNode)} parent_name=${tostring(this.options.parentNodeName)} suffix=${suffix} background=${tostring(backgroundImageKey)} pos=(${tostring(x)},${tostring(y)})`,
    )

    const uiScope = new RuntimeUiScope({
      parentNode: this.options.parentNode,
      parentNodeName: this.options.parentNodeName,
      labelStyleKey,
      buttonStyleKey,
      logger: this.callbacks.logger,
    })
    this.uiScope = uiScope

    const titleStyle = this.createLabelStyle(this.options.titleFontSize as integer)
    const bodyStyle = this.createLabelStyle(this.options.bodyFontSize as integer)
    const buttonStyle = this.createButtonStyle()
    const background = uiScope.createImage(
      `fast_run_dashboard_bg_${suffix}`,
      { x, y, width: PANEL_WIDTH, height: PANEL_HEIGHT },
      backgroundImageKey,
      { opacity: 1 },
    )
    const titleLabel = uiScope.createLabel(
      `fast_run_dashboard_title_${suffix}`,
      { x, y: y + TITLE_OFFSET_Y, width: 300, height: 40 },
      TITLE_TEXT,
      titleStyle,
    )
    const rayDebugButton = uiScope.createButton(
      `fast_run_dashboard_ray_debug_${suffix}`,
      { x: x + RAY_BUTTON_OFFSET_X, y: y + RAY_BUTTON_OFFSET_Y, width: 94, height: 38 },
      this.callbacks.isRayDebugEnabled() ? "射线开" : "射线关",
      buttonStyle,
    )
    const currentSpeedLabel = uiScope.createLabel(
      `fast_run_dashboard_current_${suffix}`,
      { x, y: y + CURRENT_SPEED_OFFSET_Y, width: 300, height: 34 },
      `当前速度 ${this.formatNumber(this.callbacks.getCurrentSpeed())}`,
      bodyStyle,
    )
    const speedLabel = uiScope.createLabel(
      `fast_run_dashboard_speed_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + SPEED_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "最大速度",
      bodyStyle,
    )
    const speedMinus10Button = uiScope.createButton(
      `fast_run_dashboard_speed_minus_10_${suffix}`,
      { x: x + MINUS_10_OFFSET_X, y: y + SPEED_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-10",
      buttonStyle,
    )
    const speedMinus1Button = uiScope.createButton(
      `fast_run_dashboard_speed_minus_1_${suffix}`,
      { x: x + MINUS_1_OFFSET_X, y: y + SPEED_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-1",
      buttonStyle,
    )
    const speedValueLabel = uiScope.createLabel(
      `fast_run_dashboard_speed_value_${suffix}`,
      { x: x + VALUE_OFFSET_X, y: y + SPEED_ROW_OFFSET_Y, width: VALUE_WIDTH, height: VALUE_HEIGHT },
      this.formatNumber(this.callbacks.getMaxSpeed()),
      bodyStyle,
    )
    const speedPlus1Button = uiScope.createButton(
      `fast_run_dashboard_speed_plus_1_${suffix}`,
      { x: x + PLUS_1_OFFSET_X, y: y + SPEED_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+1",
      buttonStyle,
    )
    const speedPlus10Button = uiScope.createButton(
      `fast_run_dashboard_speed_plus_10_${suffix}`,
      { x: x + PLUS_10_OFFSET_X, y: y + SPEED_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+10",
      buttonStyle,
    )
    const groundAccelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_ground_accel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "地面加速",
      bodyStyle,
    )
    const groundAccelerationMinus10Button = uiScope.createButton(
      `fast_run_dashboard_ground_accel_minus_10_${suffix}`,
      { x: x + MINUS_10_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-10",
      buttonStyle,
    )
    const groundAccelerationMinus1Button = uiScope.createButton(
      `fast_run_dashboard_ground_accel_minus_1_${suffix}`,
      { x: x + MINUS_1_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-1",
      buttonStyle,
    )
    const groundAccelerationValueLabel = uiScope.createLabel(
      `fast_run_dashboard_ground_accel_value_${suffix}`,
      { x: x + VALUE_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: VALUE_WIDTH, height: VALUE_HEIGHT },
      this.formatNumber(this.callbacks.getGroundAcceleration()),
      bodyStyle,
    )
    const groundAccelerationPlus1Button = uiScope.createButton(
      `fast_run_dashboard_ground_accel_plus_1_${suffix}`,
      { x: x + PLUS_1_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+1",
      buttonStyle,
    )
    const groundAccelerationPlus10Button = uiScope.createButton(
      `fast_run_dashboard_ground_accel_plus_10_${suffix}`,
      { x: x + PLUS_10_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+10",
      buttonStyle,
    )
    const groundDecelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_ground_decel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "地面减速",
      bodyStyle,
    )
    const groundDecelerationMinus10Button = uiScope.createButton(
      `fast_run_dashboard_ground_decel_minus_10_${suffix}`,
      { x: x + MINUS_10_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-10",
      buttonStyle,
    )
    const groundDecelerationMinus1Button = uiScope.createButton(
      `fast_run_dashboard_ground_decel_minus_1_${suffix}`,
      { x: x + MINUS_1_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-1",
      buttonStyle,
    )
    const groundDecelerationValueLabel = uiScope.createLabel(
      `fast_run_dashboard_ground_decel_value_${suffix}`,
      { x: x + VALUE_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: VALUE_WIDTH, height: VALUE_HEIGHT },
      this.formatNumber(this.callbacks.getGroundDeceleration()),
      bodyStyle,
    )
    const groundDecelerationPlus1Button = uiScope.createButton(
      `fast_run_dashboard_ground_decel_plus_1_${suffix}`,
      { x: x + PLUS_1_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+1",
      buttonStyle,
    )
    const groundDecelerationPlus10Button = uiScope.createButton(
      `fast_run_dashboard_ground_decel_plus_10_${suffix}`,
      { x: x + PLUS_10_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+10",
      buttonStyle,
    )
    const airAccelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_air_accel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "空中加速",
      bodyStyle,
    )
    const airAccelerationMinus10Button = uiScope.createButton(
      `fast_run_dashboard_air_accel_minus_10_${suffix}`,
      { x: x + MINUS_10_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-10",
      buttonStyle,
    )
    const airAccelerationMinus1Button = uiScope.createButton(
      `fast_run_dashboard_air_accel_minus_1_${suffix}`,
      { x: x + MINUS_1_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-1",
      buttonStyle,
    )
    const airAccelerationValueLabel = uiScope.createLabel(
      `fast_run_dashboard_air_accel_value_${suffix}`,
      { x: x + VALUE_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: VALUE_WIDTH, height: VALUE_HEIGHT },
      this.formatNumber(this.callbacks.getAirAcceleration()),
      bodyStyle,
    )
    const airAccelerationPlus1Button = uiScope.createButton(
      `fast_run_dashboard_air_accel_plus_1_${suffix}`,
      { x: x + PLUS_1_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+1",
      buttonStyle,
    )
    const airAccelerationPlus10Button = uiScope.createButton(
      `fast_run_dashboard_air_accel_plus_10_${suffix}`,
      { x: x + PLUS_10_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+10",
      buttonStyle,
    )
    const airDecelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_air_decel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "空中减速",
      bodyStyle,
    )
    const airDecelerationMinus10Button = uiScope.createButton(
      `fast_run_dashboard_air_decel_minus_10_${suffix}`,
      { x: x + MINUS_10_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-10",
      buttonStyle,
    )
    const airDecelerationMinus1Button = uiScope.createButton(
      `fast_run_dashboard_air_decel_minus_1_${suffix}`,
      { x: x + MINUS_1_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "-1",
      buttonStyle,
    )
    const airDecelerationValueLabel = uiScope.createLabel(
      `fast_run_dashboard_air_decel_value_${suffix}`,
      { x: x + VALUE_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: VALUE_WIDTH, height: VALUE_HEIGHT },
      this.formatNumber(this.callbacks.getAirDeceleration()),
      bodyStyle,
    )
    const airDecelerationPlus1Button = uiScope.createButton(
      `fast_run_dashboard_air_decel_plus_1_${suffix}`,
      { x: x + PLUS_1_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+1",
      buttonStyle,
    )
    const airDecelerationPlus10Button = uiScope.createButton(
      `fast_run_dashboard_air_decel_plus_10_${suffix}`,
      { x: x + PLUS_10_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
      "+10",
      buttonStyle,
    )

    if (
      background === null ||
      titleLabel === null ||
      rayDebugButton === null ||
      currentSpeedLabel === null ||
      speedLabel === null ||
      speedMinus10Button === null ||
      speedMinus1Button === null ||
      speedValueLabel === null ||
      speedPlus1Button === null ||
      speedPlus10Button === null ||
      groundAccelerationLabel === null ||
      groundAccelerationMinus10Button === null ||
      groundAccelerationMinus1Button === null ||
      groundAccelerationValueLabel === null ||
      groundAccelerationPlus1Button === null ||
      groundAccelerationPlus10Button === null ||
      groundDecelerationLabel === null ||
      groundDecelerationMinus10Button === null ||
      groundDecelerationMinus1Button === null ||
      groundDecelerationValueLabel === null ||
      groundDecelerationPlus1Button === null ||
      groundDecelerationPlus10Button === null ||
      airAccelerationLabel === null ||
      airAccelerationMinus10Button === null ||
      airAccelerationMinus1Button === null ||
      airAccelerationValueLabel === null ||
      airAccelerationPlus1Button === null ||
      airAccelerationPlus10Button === null ||
      airDecelerationLabel === null ||
      airDecelerationMinus10Button === null ||
      airDecelerationMinus1Button === null ||
      airDecelerationValueLabel === null ||
      airDecelerationPlus1Button === null ||
      airDecelerationPlus10Button === null
    ) {
      this.log(
        `[FastRunSystemTestMode] create dashboard failed bg=${tostring(background)} title=${tostring(titleLabel)} ray=${tostring(rayDebugButton)} current=${tostring(currentSpeedLabel)} speed_label=${tostring(speedLabel)} speed_value=${tostring(speedValueLabel)} ground_accel=${tostring(groundAccelerationValueLabel)} ground_decel=${tostring(groundDecelerationValueLabel)} air_accel=${tostring(airAccelerationValueLabel)} air_decel=${tostring(airDecelerationValueLabel)}`,
      )
      return null
    }

    const group = new RuntimeUiGroup([
      background,
      titleLabel,
      rayDebugButton,
      currentSpeedLabel,
      speedLabel,
      speedMinus10Button,
      speedMinus1Button,
      speedValueLabel,
      speedPlus1Button,
      speedPlus10Button,
      groundAccelerationLabel,
      groundAccelerationMinus10Button,
      groundAccelerationMinus1Button,
      groundAccelerationValueLabel,
      groundAccelerationPlus1Button,
      groundAccelerationPlus10Button,
      groundDecelerationLabel,
      groundDecelerationMinus10Button,
      groundDecelerationMinus1Button,
      groundDecelerationValueLabel,
      groundDecelerationPlus1Button,
      groundDecelerationPlus10Button,
      airAccelerationLabel,
      airAccelerationMinus10Button,
      airAccelerationMinus1Button,
      airAccelerationValueLabel,
      airAccelerationPlus1Button,
      airAccelerationPlus10Button,
      airDecelerationLabel,
      airDecelerationMinus10Button,
      airDecelerationMinus1Button,
      airDecelerationValueLabel,
      airDecelerationPlus1Button,
      airDecelerationPlus10Button,
    ])
    return {
      group,
      background,
      titleLabel,
      rayDebugButton,
      currentSpeedLabel,
      speedLabel,
      speedMinus10Button,
      speedMinus1Button,
      speedValueLabel,
      speedPlus1Button,
      speedPlus10Button,
      groundAccelerationLabel,
      groundAccelerationMinus10Button,
      groundAccelerationMinus1Button,
      groundAccelerationValueLabel,
      groundAccelerationPlus1Button,
      groundAccelerationPlus10Button,
      groundDecelerationLabel,
      groundDecelerationMinus10Button,
      groundDecelerationMinus1Button,
      groundDecelerationValueLabel,
      groundDecelerationPlus1Button,
      groundDecelerationPlus10Button,
      airAccelerationLabel,
      airAccelerationMinus10Button,
      airAccelerationMinus1Button,
      airAccelerationValueLabel,
      airAccelerationPlus1Button,
      airAccelerationPlus10Button,
      airDecelerationLabel,
      airDecelerationMinus10Button,
      airDecelerationMinus1Button,
      airDecelerationValueLabel,
      airDecelerationPlus1Button,
      airDecelerationPlus10Button,
    }
  }

  private setVisible(visible: boolean): void {
    const components = this.components
    if (components === null) {
      this.log(`[FastRunSystemTestMode] set visible skipped=${tostring(visible)}: components missing`)
      return
    }

    components.group.setVisible(visible)
  }

  private changeSpeed(delta: number): void {
    const minSpeed = this.options.minSpeed !== undefined ? this.options.minSpeed : 0
    const maxSpeed = this.options.maxSpeed !== undefined ? this.options.maxSpeed : 60
    this.callbacks.setMaxSpeed(clampNumber(this.callbacks.getMaxSpeed() + delta, minSpeed, maxSpeed))
  }

  private changeGroundAcceleration(delta: number): void {
    const minValue = this.options.minGroundAcceleration !== undefined ? this.options.minGroundAcceleration : 0
    const maxValue = this.options.maxGroundAcceleration !== undefined ? this.options.maxGroundAcceleration : 200
    this.callbacks.setGroundAcceleration(
      clampNumber(this.callbacks.getGroundAcceleration() + delta, minValue, maxValue),
    )
  }

  private changeGroundDeceleration(delta: number): void {
    const minValue = this.options.minGroundDeceleration !== undefined ? this.options.minGroundDeceleration : 0
    const maxValue = this.options.maxGroundDeceleration !== undefined ? this.options.maxGroundDeceleration : 200
    this.callbacks.setGroundDeceleration(
      clampNumber(this.callbacks.getGroundDeceleration() + delta, minValue, maxValue),
    )
  }

  private changeAirAcceleration(delta: number): void {
    const minAirAcceleration = this.options.minAirAcceleration !== undefined ? this.options.minAirAcceleration : 0
    const maxAirAcceleration = this.options.maxAirAcceleration !== undefined ? this.options.maxAirAcceleration : 200
    this.callbacks.setAirAcceleration(
      clampNumber(this.callbacks.getAirAcceleration() + delta, minAirAcceleration, maxAirAcceleration),
    )
  }

  private changeAirDeceleration(delta: number): void {
    const minAirDeceleration = this.options.minAirDeceleration !== undefined ? this.options.minAirDeceleration : 0
    const maxAirDeceleration = this.options.maxAirDeceleration !== undefined ? this.options.maxAirDeceleration : 200
    this.callbacks.setAirDeceleration(
      clampNumber(this.callbacks.getAirDeceleration() + delta, minAirDeceleration, maxAirDeceleration),
    )
  }

  private toggleRayDebug(): void {
    this.callbacks.setRayDebugEnabled(!this.callbacks.isRayDebugEnabled())
  }

  private createLabelStyle(fontSize: integer): RuntimeLabelStyle {
    return {
      fontSize,
      color: UI_TEXT_WHITE,
      backgroundOpacity: 0,
      outlineEnabled: true,
      outlineColor: UI_TEXT_BLACK,
      outlineOpacity: 1,
      outlineWidth: 2,
      shadowEnabled: true,
      shadowColor: UI_TEXT_BLACK,
      shadowXOffset: 1,
      shadowYOffset: -1,
    }
  }

  private createButtonStyle(): RuntimeButtonStyle {
    return {
      fontSize: this.options.buttonFontSize !== undefined ? this.options.buttonFontSize : 20,
      textColor: UI_TEXT_WHITE,
      opacity: 1,
      enabled: true,
      touchEnabled: true,
    }
  }

  private formatNumber(value: number): string {
    return tostring(math.floor(value * 100 + 0.5) / 100)
  }

  private registerEvents(components: FastRunDashboardComponents): void {
    const touchEventType = this.options.touchEventType as ENodeTouchEventType
    const scopeId = TriggerHub.createScope("fast-run-test-dashboard")
    this.scopeId = scopeId
    this.log(
      `[FastRunSystemTestMode] register dashboard events scope=${tostring(scopeId)} touch_type=${tostring(touchEventType)}`,
    )

    this.registerButton(scopeId, components.speedMinus10Button, touchEventType, "speed-minus-10", () => this.changeSpeed(-10))
    this.registerButton(scopeId, components.rayDebugButton, touchEventType, "ray-debug", () => this.toggleRayDebug())
    this.registerButton(scopeId, components.speedMinus1Button, touchEventType, "speed-minus-1", () => this.changeSpeed(-1))
    this.registerButton(scopeId, components.speedPlus1Button, touchEventType, "speed-plus-1", () => this.changeSpeed(1))
    this.registerButton(scopeId, components.speedPlus10Button, touchEventType, "speed-plus-10", () => this.changeSpeed(10))
    this.registerButton(
      scopeId,
      components.groundAccelerationMinus10Button,
      touchEventType,
      "ground-acceleration-minus-10",
      () => this.changeGroundAcceleration(-10),
    )
    this.registerButton(
      scopeId,
      components.groundAccelerationMinus1Button,
      touchEventType,
      "ground-acceleration-minus-1",
      () => this.changeGroundAcceleration(-1),
    )
    this.registerButton(
      scopeId,
      components.groundAccelerationPlus1Button,
      touchEventType,
      "ground-acceleration-plus-1",
      () => this.changeGroundAcceleration(1),
    )
    this.registerButton(
      scopeId,
      components.groundAccelerationPlus10Button,
      touchEventType,
      "ground-acceleration-plus-10",
      () => this.changeGroundAcceleration(10),
    )
    this.registerButton(
      scopeId,
      components.groundDecelerationMinus10Button,
      touchEventType,
      "ground-deceleration-minus-10",
      () => this.changeGroundDeceleration(-10),
    )
    this.registerButton(
      scopeId,
      components.groundDecelerationMinus1Button,
      touchEventType,
      "ground-deceleration-minus-1",
      () => this.changeGroundDeceleration(-1),
    )
    this.registerButton(
      scopeId,
      components.groundDecelerationPlus1Button,
      touchEventType,
      "ground-deceleration-plus-1",
      () => this.changeGroundDeceleration(1),
    )
    this.registerButton(
      scopeId,
      components.groundDecelerationPlus10Button,
      touchEventType,
      "ground-deceleration-plus-10",
      () => this.changeGroundDeceleration(10),
    )
    this.registerButton(
      scopeId,
      components.airAccelerationMinus10Button,
      touchEventType,
      "air-acceleration-minus-10",
      () => this.changeAirAcceleration(-10),
    )
    this.registerButton(
      scopeId,
      components.airAccelerationMinus1Button,
      touchEventType,
      "air-acceleration-minus-1",
      () => this.changeAirAcceleration(-1),
    )
    this.registerButton(
      scopeId,
      components.airAccelerationPlus1Button,
      touchEventType,
      "air-acceleration-plus-1",
      () => this.changeAirAcceleration(1),
    )
    this.registerButton(
      scopeId,
      components.airAccelerationPlus10Button,
      touchEventType,
      "air-acceleration-plus-10",
      () => this.changeAirAcceleration(10),
    )
    this.registerButton(
      scopeId,
      components.airDecelerationMinus10Button,
      touchEventType,
      "air-deceleration-minus-10",
      () => this.changeAirDeceleration(-10),
    )
    this.registerButton(
      scopeId,
      components.airDecelerationMinus1Button,
      touchEventType,
      "air-deceleration-minus-1",
      () => this.changeAirDeceleration(-1),
    )
    this.registerButton(
      scopeId,
      components.airDecelerationPlus1Button,
      touchEventType,
      "air-deceleration-plus-1",
      () => this.changeAirDeceleration(1),
    )
    this.registerButton(
      scopeId,
      components.airDecelerationPlus10Button,
      touchEventType,
      "air-deceleration-plus-10",
      () => this.changeAirDeceleration(10),
    )
  }

  private registerButton(
    scopeId: number,
    button: RuntimeButton,
    touchEventType: ENodeTouchEventType,
    tag: string,
    handler: () => void,
  ): void {
    TriggerHub.register(
      [EVENT.EUI_NODE_TOUCH_EVENT, button.node, touchEventType],
      handler,
      { scopeId, tag: `fast-run-dashboard-${tag}`, safe: true, safeCallback: true, logger: this.callbacks.logger },
    )
  }

  private log(msg: string): void {
    const logger = this.callbacks.logger
    logger(msg)
  }
}
