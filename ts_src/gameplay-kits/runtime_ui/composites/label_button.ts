import { RuntimeButton } from "../components/button"
import { RuntimeLabel } from "../components/label"
import type { LabelButtonStyle, RuntimeUiClickHandler, RuntimeUiClickOptions } from "../types"

/**
 * LabelButton：底层 Button 负责触摸和背景，顶层 Label 负责文字。
 * 用它绕开引擎 Button 内置文字无法精确控制对齐的问题。
 */
export class LabelButton {
  readonly node: EButton
  readonly button: RuntimeButton
  readonly label: RuntimeLabel

  constructor(button: RuntimeButton, label: RuntimeLabel) {
    this.button = button
    this.label = label
    this.node = button.node
  }

  setText(text: string): void {
    this.label.setText(text)
  }

  setVisible(visible: boolean): void {
    this.button.setVisible(visible)
    this.label.setVisible(visible)
  }

  onClick(handler: RuntimeUiClickHandler, options?: RuntimeUiClickOptions): number | null {
    return this.button.onClick(handler, options)
  }

  offClick(regId: number): boolean {
    return this.button.offClick(regId)
  }

  applyStyle(style?: LabelButtonStyle): void {
    this.button.applyStyle(style?.buttonStyle)
    this.label.applyStyle(style?.labelStyle)
  }
}
