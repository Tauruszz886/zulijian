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
import { calculateFastRunMaxAirMoveDistance } from "./FastRunAirDistance"
import { evaluateFastRunExpression } from "./FastRunExpression"

type FastRunExpressionTarget =
  | "groundAcceleration"
  | "groundDeceleration"
  | "airAcceleration"
  | "airDeceleration"
  | "airHangTime"
type FastRunHangTimeTestState = "idle" | "waiting" | "recording"

type FastRunExpressionButton = {
  target: FastRunExpressionTarget
  button: RuntimeButton
}

type FastRunKeypadButtonSpec = {
  tag: string
  text: string
  action: "append" | "backspace" | "clear" | "confirm"
  value?: string
}

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
  activeExpressionLabel: RuntimeLabel
  groundAccelerationLabel: RuntimeLabel
  groundAccelerationButton: RuntimeButton
  groundDecelerationLabel: RuntimeLabel
  groundDecelerationButton: RuntimeButton
  airAccelerationLabel: RuntimeLabel
  airAccelerationButton: RuntimeButton
  airDecelerationLabel: RuntimeLabel
  airDecelerationButton: RuntimeButton
  airHangTimeLabel: RuntimeLabel
  airHangTimeButton: RuntimeButton
  airHangTestButton: RuntimeButton
  airHangTestLabel: RuntimeLabel
  theoreticalAirDistanceLabel: RuntimeLabel
  testedAirDistanceLabel: RuntimeLabel
  expressionButtons: FastRunExpressionButton[]
  keypadButtons: RuntimeButton[]
}

export type FastRunTestDashboardCallbacks = {
  getCurrentSpeed: (this: void) => number
  getMaxSpeed: (this: void) => number
  setMaxSpeed: (this: void, speed: number) => void
  getGroundAcceleration: (this: void) => number
  setGroundAcceleration: (this: void, groundAcceleration: number) => void
  getGroundAccelerationExpression: (this: void) => string
  setGroundAccelerationExpression: (this: void, expression: string) => boolean
  getGroundDeceleration: (this: void) => number
  setGroundDeceleration: (this: void, groundDeceleration: number) => void
  getGroundDecelerationExpression: (this: void) => string
  setGroundDecelerationExpression: (this: void, expression: string) => boolean
  getAirAcceleration: (this: void) => number
  setAirAcceleration: (this: void, airAcceleration: number) => void
  getAirAccelerationExpression: (this: void) => string
  setAirAccelerationExpression: (this: void, expression: string) => boolean
  getAirDeceleration: (this: void) => number
  setAirDeceleration: (this: void, airDeceleration: number) => void
  getAirDecelerationExpression: (this: void) => string
  setAirDecelerationExpression: (this: void, expression: string) => boolean
  isRayDebugEnabled: (this: void) => boolean
  setRayDebugEnabled: (this: void, enabled: boolean) => void
  isGrounded: (this: void) => boolean
  getTickSeconds: (this: void) => number
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
  /** 面板整体透明度，1 为不透明，0.5 为 50%。 */
  opacity?: number
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
  /** 测试面板初始滞留时间，单位秒。 */
  airHangTimeSeconds?: number
}

export const DEFAULT_FAST_RUN_TEST_MODE_OPTIONS: FastRunSystemTestModeOptions = {
  enabled: false,
  buttonStyleKey: 0 as BtnStyleKey,
  labelStyleKey: 0 as LabelStyleKey,
  backgroundImageKey: 16941 as ImageKey,
  touchEventType: 1 as ENodeTouchEventType,
  x: 960,
  y: 920,
  opacity: 1,
  titleFontSize: 24 as integer,
  bodyFontSize: 18 as integer,
  buttonFontSize: 20,
  minSpeed: 0,
  maxSpeed: 60,
  airHangTimeSeconds: 0,
}

let nextDashboardId: integer = 1

const TITLE_TEXT = "快速跑调试"
const PANEL_WIDTH = 620
const PANEL_HEIGHT = 860
const TITLE_OFFSET_Y = 340
const RAY_BUTTON_OFFSET_X = 190
const RAY_BUTTON_OFFSET_Y = 340
const CURRENT_SPEED_OFFSET_Y = 302
const SPEED_ROW_OFFSET_Y = 256
const GROUND_ACCELERATION_ROW_OFFSET_Y = 198
const GROUND_DECELERATION_ROW_OFFSET_Y = 152
const AIR_ACCELERATION_ROW_OFFSET_Y = 106
const AIR_DECELERATION_ROW_OFFSET_Y = 60
const AIR_HANG_ROW_OFFSET_Y = 12
const AIR_HANG_TEST_ROW_OFFSET_Y = -34
const THEORETICAL_AIR_DISTANCE_ROW_OFFSET_Y = -76
const TESTED_AIR_DISTANCE_ROW_OFFSET_Y = -116
const ACTIVE_EXPRESSION_OFFSET_Y = -164
const KEYPAD_FIRST_ROW_OFFSET_Y = -216
const KEYPAD_ROW_GAP = 46
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
const EXPRESSION_BUTTON_OFFSET_X = 36
const EXPRESSION_BUTTON_WIDTH = 360
const EXPRESSION_BUTTON_HEIGHT = 38
const KEYPAD_BUTTON_WIDTH = 72
const KEYPAD_BUTTON_HEIGHT = 38
const KEYPAD_COLUMN_GAP = 78
const MAX_EXPRESSION_LENGTH = 28
const MAX_AIR_HANG_TIME_SECONDS = 60
const UI_TEXT_WHITE = 0xffffff as Color
const UI_TEXT_BLACK = 0x000000 as Color

const KEYPAD_BUTTONS: FastRunKeypadButtonSpec[] = [
  { tag: "s", text: "s", action: "append", value: "s" },
  { tag: "7", text: "7", action: "append", value: "7" },
  { tag: "8", text: "8", action: "append", value: "8" },
  { tag: "9", text: "9", action: "append", value: "9" },
  { tag: "divide", text: "/", action: "append", value: "/" },
  { tag: "4", text: "4", action: "append", value: "4" },
  { tag: "5", text: "5", action: "append", value: "5" },
  { tag: "6", text: "6", action: "append", value: "6" },
  { tag: "multiply", text: "*", action: "append", value: "*" },
  { tag: "1", text: "1", action: "append", value: "1" },
  { tag: "2", text: "2", action: "append", value: "2" },
  { tag: "3", text: "3", action: "append", value: "3" },
  { tag: "minus", text: "-", action: "append", value: "-" },
  { tag: "plus", text: "+", action: "append", value: "+" },
  { tag: "dot", text: ".", action: "append", value: "." },
  { tag: "0", text: "0", action: "append", value: "0" },
  { tag: "backspace", text: "退格", action: "backspace" },
  { tag: "clear", text: "清空", action: "clear" },
  { tag: "confirm", text: "确认", action: "confirm" },
]

const EXPRESSION_TARGET_NAMES: Record<FastRunExpressionTarget, string> = {
  groundAcceleration: "地面加速",
  groundDeceleration: "地面减速",
  airAcceleration: "空中加速",
  airDeceleration: "空中减速",
  airHangTime: "滞留时间",
}

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
    opacity: options?.opacity !== undefined ? options.opacity : base.opacity,
    titleFontSize: options?.titleFontSize !== undefined ? options.titleFontSize : base.titleFontSize,
    bodyFontSize: options?.bodyFontSize !== undefined ? options.bodyFontSize : base.bodyFontSize,
    buttonFontSize: options?.buttonFontSize !== undefined ? options.buttonFontSize : base.buttonFontSize,
    minSpeed: options?.minSpeed !== undefined ? options.minSpeed : base.minSpeed,
    maxSpeed: options?.maxSpeed !== undefined ? options.maxSpeed : base.maxSpeed,
    airHangTimeSeconds:
      options?.airHangTimeSeconds !== undefined ? options.airHangTimeSeconds : base.airHangTimeSeconds,
  }
}

export class FastRunTestDashboard {
  private readonly options: FastRunSystemTestModeOptions
  private readonly callbacks: FastRunTestDashboardCallbacks
  private scopeId: number | null = null
  private components: FastRunDashboardComponents | null = null
  private uiScope: RuntimeUiScope | null = null
  private selectedExpressionTarget: FastRunExpressionTarget = "groundAcceleration"
  private groundAccelerationDraft = ""
  private groundDecelerationDraft = ""
  private airAccelerationDraft = ""
  private airDecelerationDraft = ""
  private airHangTimeDraft = ""
  private airHangTimeSeconds = 0
  private measuredAirHangTimeSeconds = 0
  private hangTimeRecordingSeconds = 0
  private hangTimeTestState: FastRunHangTimeTestState = "idle"

  constructor(options: FastRunSystemTestModeOptions, callbacks: FastRunTestDashboardCallbacks) {
    this.options = options
    this.callbacks = callbacks
    this.airHangTimeSeconds = clampNumber(
      options.airHangTimeSeconds !== undefined ? options.airHangTimeSeconds : 0,
      0,
      MAX_AIR_HANG_TIME_SECONDS,
    )
    this.airHangTimeDraft = this.formatNumber(this.airHangTimeSeconds)
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
      `[FastRunSystemTestMode] dashboard created bg=${tostring(created.background.node)} speed_value=${tostring(created.speedValueLabel.node)} keypad_count=${tostring(created.keypadButtons.length)}`,
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
    this.updateAirHangTimeTest()
    components.titleLabel.setText(TITLE_TEXT)
    components.rayDebugButton.setText(this.callbacks.isRayDebugEnabled() ? "射线开" : "射线关")
    components.currentSpeedLabel.setText(`当前速度 ${currentSpeedText}`)
    components.speedValueLabel.setText(maxSpeedText)
    components.airHangTestButton.setText(this.createAirHangTestButtonText())
    components.airHangTestLabel.setText(this.createAirHangTestText())
    components.theoreticalAirDistanceLabel.setText(
      `理论空距 ${this.formatNumber(this.calculateTheoreticalAirMoveDistance())}`,
    )
    components.testedAirDistanceLabel.setText(`测试空距 ${this.formatNumber(this.calculateTestedAirMoveDistance())}`)
    this.updateExpressionDisplays(components)
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
    const opacity = this.getOpacity()
    const background = uiScope.createImage(
      `fast_run_dashboard_bg_${suffix}`,
      { x, y, width: PANEL_WIDTH, height: PANEL_HEIGHT },
      backgroundImageKey,
      { opacity },
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
    const activeExpressionLabel = uiScope.createLabel(
      `fast_run_dashboard_active_expression_${suffix}`,
      { x, y: y + ACTIVE_EXPRESSION_OFFSET_Y, width: 420, height: 34 },
      this.createActiveExpressionText(),
      bodyStyle,
    )
    const groundAccelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_ground_accel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + GROUND_ACCELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "地面加速",
      bodyStyle,
    )
    this.groundAccelerationDraft = this.callbacks.getGroundAccelerationExpression()
    const groundAccelerationButton = uiScope.createButton(
      `fast_run_dashboard_ground_accel_value_${suffix}`,
      {
        x: x + EXPRESSION_BUTTON_OFFSET_X,
        y: y + GROUND_ACCELERATION_ROW_OFFSET_Y,
        width: EXPRESSION_BUTTON_WIDTH,
        height: EXPRESSION_BUTTON_HEIGHT,
      },
      this.createExpressionButtonText("groundAcceleration"),
      buttonStyle,
    )
    const groundDecelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_ground_decel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + GROUND_DECELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "地面减速",
      bodyStyle,
    )
    this.groundDecelerationDraft = this.callbacks.getGroundDecelerationExpression()
    const groundDecelerationButton = uiScope.createButton(
      `fast_run_dashboard_ground_decel_value_${suffix}`,
      {
        x: x + EXPRESSION_BUTTON_OFFSET_X,
        y: y + GROUND_DECELERATION_ROW_OFFSET_Y,
        width: EXPRESSION_BUTTON_WIDTH,
        height: EXPRESSION_BUTTON_HEIGHT,
      },
      this.createExpressionButtonText("groundDeceleration"),
      buttonStyle,
    )
    const airAccelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_air_accel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + AIR_ACCELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "空中加速",
      bodyStyle,
    )
    this.airAccelerationDraft = this.callbacks.getAirAccelerationExpression()
    const airAccelerationButton = uiScope.createButton(
      `fast_run_dashboard_air_accel_value_${suffix}`,
      {
        x: x + EXPRESSION_BUTTON_OFFSET_X,
        y: y + AIR_ACCELERATION_ROW_OFFSET_Y,
        width: EXPRESSION_BUTTON_WIDTH,
        height: EXPRESSION_BUTTON_HEIGHT,
      },
      this.createExpressionButtonText("airAcceleration"),
      buttonStyle,
    )
    const airDecelerationLabel = uiScope.createLabel(
      `fast_run_dashboard_air_decel_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + AIR_DECELERATION_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "空中减速",
      bodyStyle,
    )
    this.airDecelerationDraft = this.callbacks.getAirDecelerationExpression()
    const airDecelerationButton = uiScope.createButton(
      `fast_run_dashboard_air_decel_value_${suffix}`,
      {
        x: x + EXPRESSION_BUTTON_OFFSET_X,
        y: y + AIR_DECELERATION_ROW_OFFSET_Y,
        width: EXPRESSION_BUTTON_WIDTH,
        height: EXPRESSION_BUTTON_HEIGHT,
      },
      this.createExpressionButtonText("airDeceleration"),
      buttonStyle,
    )
    const airHangTimeLabel = uiScope.createLabel(
      `fast_run_dashboard_air_hang_label_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + AIR_HANG_ROW_OFFSET_Y, width: CAPTION_WIDTH, height: CAPTION_HEIGHT },
      "滞留时间",
      bodyStyle,
    )
    this.airHangTimeDraft = this.formatNumber(this.airHangTimeSeconds)
    const airHangTimeButton = uiScope.createButton(
      `fast_run_dashboard_air_hang_value_${suffix}`,
      {
        x: x + EXPRESSION_BUTTON_OFFSET_X,
        y: y + AIR_HANG_ROW_OFFSET_Y,
        width: EXPRESSION_BUTTON_WIDTH,
        height: EXPRESSION_BUTTON_HEIGHT,
      },
      this.createExpressionButtonText("airHangTime"),
      buttonStyle,
    )
    const airHangTestButton = uiScope.createButton(
      `fast_run_dashboard_air_hang_test_${suffix}`,
      { x: x + CAPTION_OFFSET_X, y: y + AIR_HANG_TEST_ROW_OFFSET_Y, width: 118, height: 38 },
      this.createAirHangTestButtonText(),
      buttonStyle,
    )
    const airHangTestLabel = uiScope.createLabel(
      `fast_run_dashboard_air_hang_test_label_${suffix}`,
      { x: x - 26, y: y + AIR_HANG_TEST_ROW_OFFSET_Y, width: 300, height: 34 },
      this.createAirHangTestText(),
      bodyStyle,
    )
    const theoreticalAirDistanceLabel = uiScope.createLabel(
      `fast_run_dashboard_air_distance_theoretical_${suffix}`,
      { x, y: y + THEORETICAL_AIR_DISTANCE_ROW_OFFSET_Y, width: 420, height: 34 },
      `理论空距 ${this.formatNumber(this.calculateTheoreticalAirMoveDistance())}`,
      bodyStyle,
    )
    const testedAirDistanceLabel = uiScope.createLabel(
      `fast_run_dashboard_air_distance_tested_${suffix}`,
      { x, y: y + TESTED_AIR_DISTANCE_ROW_OFFSET_Y, width: 420, height: 34 },
      `测试空距 ${this.formatNumber(this.calculateTestedAirMoveDistance())}`,
      bodyStyle,
    )

    const keypadButtons: RuntimeButton[] = []
    for (let i = 0; i < KEYPAD_BUTTONS.length; i++) {
      const spec = KEYPAD_BUTTONS[i]
      const col = i % 4
      const row = math.floor(i / 4)
      const width = spec.action === "confirm" ? KEYPAD_BUTTON_WIDTH * 2 + 6 : KEYPAD_BUTTON_WIDTH
      const offsetX = -117 + col * KEYPAD_COLUMN_GAP + (spec.action === "confirm" ? KEYPAD_COLUMN_GAP / 2 : 0)
      const button = uiScope.createButton(
        `fast_run_dashboard_key_${spec.tag}_${suffix}`,
        {
          x: x + offsetX,
          y: y + KEYPAD_FIRST_ROW_OFFSET_Y - row * KEYPAD_ROW_GAP,
          width,
          height: KEYPAD_BUTTON_HEIGHT,
        },
        spec.text,
        buttonStyle,
      )
      if (button === null) {
        this.log(`[FastRunSystemTestMode] create keypad button failed tag=${spec.tag}`)
        return null
      }
      keypadButtons.push(button)
    }

    const expressionButtons: FastRunExpressionButton[] = [
      { target: "groundAcceleration", button: groundAccelerationButton as RuntimeButton },
      { target: "groundDeceleration", button: groundDecelerationButton as RuntimeButton },
      { target: "airAcceleration", button: airAccelerationButton as RuntimeButton },
      { target: "airDeceleration", button: airDecelerationButton as RuntimeButton },
      { target: "airHangTime", button: airHangTimeButton as RuntimeButton },
    ]

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
      activeExpressionLabel === null ||
      groundAccelerationLabel === null ||
      groundAccelerationButton === null ||
      groundDecelerationLabel === null ||
      groundDecelerationButton === null ||
      airAccelerationLabel === null ||
      airAccelerationButton === null ||
      airDecelerationLabel === null ||
      airDecelerationButton === null ||
      airHangTimeLabel === null ||
      airHangTimeButton === null ||
      airHangTestButton === null ||
      airHangTestLabel === null ||
      theoreticalAirDistanceLabel === null ||
      testedAirDistanceLabel === null
    ) {
      this.log(
        `[FastRunSystemTestMode] create dashboard failed bg=${tostring(background)} title=${tostring(titleLabel)} ray=${tostring(rayDebugButton)} current=${tostring(currentSpeedLabel)} speed_label=${tostring(speedLabel)} speed_value=${tostring(speedValueLabel)} ground_accel_button=${tostring(groundAccelerationButton)} ground_decel_button=${tostring(groundDecelerationButton)} air_accel_button=${tostring(airAccelerationButton)} air_decel_button=${tostring(airDecelerationButton)} air_hang=${tostring(airHangTimeButton)} theoretical_air_distance=${tostring(theoreticalAirDistanceLabel)} tested_air_distance=${tostring(testedAirDistanceLabel)}`,
      )
      return null
    }

    const groupChildren = [
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
      activeExpressionLabel,
      groundAccelerationLabel,
      groundAccelerationButton,
      groundDecelerationLabel,
      groundDecelerationButton,
      airAccelerationLabel,
      airAccelerationButton,
      airDecelerationLabel,
      airDecelerationButton,
      airHangTimeLabel,
      airHangTimeButton,
      airHangTestButton,
      airHangTestLabel,
      theoreticalAirDistanceLabel,
      testedAirDistanceLabel,
    ]
    const group = new RuntimeUiGroup(groupChildren)
    for (const button of keypadButtons) {
      group.add(button)
    }

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
      activeExpressionLabel,
      groundAccelerationLabel,
      groundAccelerationButton,
      groundDecelerationLabel,
      groundDecelerationButton,
      airAccelerationLabel,
      airAccelerationButton,
      airDecelerationLabel,
      airDecelerationButton,
      airHangTimeLabel,
      airHangTimeButton,
      airHangTestButton,
      airHangTestLabel,
      theoreticalAirDistanceLabel,
      testedAirDistanceLabel,
      expressionButtons,
      keypadButtons,
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

  private toggleRayDebug(): void {
    this.callbacks.setRayDebugEnabled(!this.callbacks.isRayDebugEnabled())
  }

  private toggleAirHangTimeTest(): void {
    if (this.hangTimeTestState !== "idle") {
      this.hangTimeTestState = "idle"
      this.hangTimeRecordingSeconds = 0
      this.log("[FastRunSystemTestMode] air hang test canceled")
      this.updateValues()
      return
    }

    this.hangTimeTestState = "waiting"
    this.hangTimeRecordingSeconds = 0
    this.measuredAirHangTimeSeconds = 0
    this.log("[FastRunSystemTestMode] air hang test waiting")
    this.updateValues()
  }

  private updateAirHangTimeTest(): void {
    const grounded = this.callbacks.isGrounded()
    if (this.hangTimeTestState === "waiting") {
      if (grounded) return
      this.hangTimeTestState = "recording"
      this.hangTimeRecordingSeconds = 0
      this.log("[FastRunSystemTestMode] air hang test started")
    }

    if (this.hangTimeTestState !== "recording") return
    if (grounded) {
      this.measuredAirHangTimeSeconds = this.hangTimeRecordingSeconds
      this.hangTimeTestState = "idle"
      this.log(`[FastRunSystemTestMode] air hang test finished seconds=${this.formatNumber(this.measuredAirHangTimeSeconds)}`)
      return
    }

    this.hangTimeRecordingSeconds = clampNumber(
      this.hangTimeRecordingSeconds + this.callbacks.getTickSeconds(),
      0,
      MAX_AIR_HANG_TIME_SECONDS,
    )
  }

  private createAirHangTestButtonText(): string {
    if (this.hangTimeTestState === "waiting") return "取消测试"
    if (this.hangTimeTestState === "recording") return "记录中"
    return "测滞留"
  }

  private createAirHangTestText(): string {
    if (this.hangTimeTestState === "waiting") return "测试滞留 等待离地"
    if (this.hangTimeTestState === "recording") {
      return `测试滞留 ${this.formatNumber(this.hangTimeRecordingSeconds)}s`
    }
    return `测试滞留 ${this.formatNumber(this.measuredAirHangTimeSeconds)}s`
  }

  private calculateTheoreticalAirMoveDistance(): number {
    return calculateFastRunMaxAirMoveDistance({
      maxSpeed: this.callbacks.getMaxSpeed(),
      airAcceleration: this.callbacks.getAirAcceleration(),
      hangTimeSeconds: this.airHangTimeSeconds,
    })
  }

  private calculateTestedAirMoveDistance(): number {
    const hangTimeSeconds =
      this.hangTimeTestState === "recording" ? this.hangTimeRecordingSeconds : this.measuredAirHangTimeSeconds
    return calculateFastRunMaxAirMoveDistance({
      maxSpeed: this.callbacks.getMaxSpeed(),
      airAcceleration: this.callbacks.getAirAcceleration(),
      hangTimeSeconds,
    })
  }

  private applyGroundAccelerationExpression(components: FastRunDashboardComponents): void {
    this.applyExpression(
      "ground_acceleration",
      this.groundAccelerationDraft,
      () => this.callbacks.getGroundAccelerationExpression(),
      (expression) => this.callbacks.setGroundAccelerationExpression(expression),
      (expression) => {
        this.groundAccelerationDraft = expression
      },
    )
  }

  private applyGroundDecelerationExpression(components: FastRunDashboardComponents): void {
    this.applyExpression(
      "ground_deceleration",
      this.groundDecelerationDraft,
      () => this.callbacks.getGroundDecelerationExpression(),
      (expression) => this.callbacks.setGroundDecelerationExpression(expression),
      (expression) => {
        this.groundDecelerationDraft = expression
      },
    )
  }

  private applyAirAccelerationExpression(components: FastRunDashboardComponents): void {
    this.applyExpression(
      "air_acceleration",
      this.airAccelerationDraft,
      () => this.callbacks.getAirAccelerationExpression(),
      (expression) => this.callbacks.setAirAccelerationExpression(expression),
      (expression) => {
        this.airAccelerationDraft = expression
      },
    )
  }

  private applyAirDecelerationExpression(components: FastRunDashboardComponents): void {
    this.applyExpression(
      "air_deceleration",
      this.airDecelerationDraft,
      () => this.callbacks.getAirDecelerationExpression(),
      (expression) => this.callbacks.setAirDecelerationExpression(expression),
      (expression) => {
        this.airDecelerationDraft = expression
      },
    )
  }

  private applyAirHangTimeExpression(components: FastRunDashboardComponents): void {
    const draft = this.airHangTimeDraft
    let ok = false
    if (!this.hasSpeedSymbol(draft)) {
      const result = evaluateFastRunExpression(draft, 0)
      if (result.ok) {
        this.airHangTimeSeconds = clampNumber(result.value, 0, MAX_AIR_HANG_TIME_SECONDS)
        ok = true
      }
    }

    this.airHangTimeDraft = this.formatNumber(this.airHangTimeSeconds)
    this.updateExpressionDisplays(components)
    components.activeExpressionLabel.setText(ok ? `${this.createActiveExpressionText()} 已应用` : "滞留时间只允许立即值")
    this.log(`[FastRunSystemTestMode] air hang expression ${ok ? "applied" : "rejected"} expr=${draft}`)
  }

  private applyExpression(
    tag: string,
    draft: string,
    getCurrent: () => string,
    setExpression: (expression: string) => boolean,
    setDraft: (expression: string) => void,
  ): void {
    const ok = setExpression(draft)
    const current = getCurrent()
    setDraft(current)
    const components = this.components
    if (components !== null) {
      this.updateExpressionDisplays(components)
      components.activeExpressionLabel.setText(ok ? `${this.createActiveExpressionText()} 已应用` : "表达式无效，已还原")
    }
    this.log(`[FastRunSystemTestMode] expression ${ok ? "applied" : "rejected"} tag=${tag} expr=${draft}`)
  }

  private createLabelStyle(fontSize: integer): RuntimeLabelStyle {
    const opacity = this.getOpacity()
    return {
      fontSize,
      color: UI_TEXT_WHITE,
      opacity,
      backgroundOpacity: 0,
      outlineEnabled: true,
      outlineColor: UI_TEXT_BLACK,
      outlineOpacity: opacity,
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
      opacity: this.getOpacity(),
      enabled: true,
      touchEnabled: true,
    }
  }

  private getOpacity(): number {
    return this.options.opacity !== undefined ? this.options.opacity : 1
  }

  private formatNumber(value: number): string {
    return tostring(math.floor(value * 100 + 0.5) / 100)
  }

  private createActiveExpressionText(): string {
    return `正在编辑 ${EXPRESSION_TARGET_NAMES[this.selectedExpressionTarget]}`
  }

  private getDraft(target: FastRunExpressionTarget): string {
    if (target === "groundAcceleration") return this.groundAccelerationDraft
    if (target === "groundDeceleration") return this.groundDecelerationDraft
    if (target === "airAcceleration") return this.airAccelerationDraft
    if (target === "airDeceleration") return this.airDecelerationDraft
    return this.airHangTimeDraft
  }

  private setDraft(target: FastRunExpressionTarget, value: string): void {
    if (target === "groundAcceleration") {
      this.groundAccelerationDraft = value
      return
    }
    if (target === "groundDeceleration") {
      this.groundDecelerationDraft = value
      return
    }
    if (target === "airAcceleration") {
      this.airAccelerationDraft = value
      return
    }
    if (target === "airDeceleration") {
      this.airDecelerationDraft = value
      return
    }
    this.airHangTimeDraft = value
  }

  private createExpressionButtonText(target: FastRunExpressionTarget): string {
    const draft = this.getDraft(target)
    const marker = target === this.selectedExpressionTarget ? "> " : ""
    return `${marker}${draft.length > 0 ? draft : "空"}`
  }

  private updateExpressionDisplays(components: FastRunDashboardComponents): void {
    components.activeExpressionLabel.setText(this.createActiveExpressionText())
    for (const entry of components.expressionButtons) {
      entry.button.setText(this.createExpressionButtonText(entry.target))
    }
  }

  private selectExpressionTarget(target: FastRunExpressionTarget): void {
    this.selectedExpressionTarget = target
    const components = this.components
    if (components !== null) {
      this.updateExpressionDisplays(components)
    }
    this.log(`[FastRunSystemTestMode] expression target selected target=${target}`)
  }

  private handleKeypadButton(spec: FastRunKeypadButtonSpec): void {
    if (spec.action === "confirm") {
      this.applySelectedExpression()
      return
    }

    const target = this.selectedExpressionTarget
    let draft = this.getDraft(target)
    if (spec.action === "backspace") {
      if (draft.length > 0) draft = draft.substring(0, draft.length - 1)
    } else if (spec.action === "clear") {
      draft = ""
    } else if (spec.value !== undefined && draft.length < MAX_EXPRESSION_LENGTH) {
      draft = draft + spec.value
    }
    this.setDraft(target, draft)

    const components = this.components
    if (components !== null) {
      this.updateExpressionDisplays(components)
    }
  }

  private applySelectedExpression(): void {
    const components = this.components
    if (components === null) return

    const target = this.selectedExpressionTarget
    if (target === "groundAcceleration") {
      this.applyGroundAccelerationExpression(components)
      return
    }
    if (target === "groundDeceleration") {
      this.applyGroundDecelerationExpression(components)
      return
    }
    if (target === "airAcceleration") {
      this.applyAirAccelerationExpression(components)
      return
    }
    if (target === "airDeceleration") {
      this.applyAirDecelerationExpression(components)
      return
    }
    this.applyAirHangTimeExpression(components)
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
    this.registerButton(scopeId, components.airHangTestButton, touchEventType, "air-hang-test", () =>
      this.toggleAirHangTimeTest(),
    )
    for (const entry of components.expressionButtons) {
      const target = entry.target
      this.registerButton(scopeId, entry.button, touchEventType, `select-${entry.target}`, () => {
        this.selectExpressionTarget(target)
      })
    }
    for (let i = 0; i < components.keypadButtons.length; i++) {
      const spec = KEYPAD_BUTTONS[i]
      const button = components.keypadButtons[i]
      const keypadSpec = spec
      this.registerButton(scopeId, button, touchEventType, `key-${spec.tag}`, () => {
        this.handleKeypadButton(keypadSpec)
      })
    }
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

  private hasSpeedSymbol(expression: string): boolean {
    for (let i = 0; i < expression.length; i++) {
      const ch = expression.charAt(i)
      if (ch === "s" || ch === "S") return true
    }
    return false
  }
}
