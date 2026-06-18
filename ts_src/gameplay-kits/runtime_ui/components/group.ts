import type { RuntimeUiComponent } from "../types"

export class RuntimeUiGroup {
  private readonly children: RuntimeUiComponent[] = []

  constructor(children?: RuntimeUiComponent[]) {
    if (children === undefined) return
    for (const child of children) {
      this.children.push(child)
    }
  }

  add(child: RuntimeUiComponent): void {
    this.children.push(child)
  }

  setVisible(visible: boolean): void {
    for (const child of this.children) {
      child.setVisible(visible)
    }
  }

  size(): integer {
    return this.children.length as integer
  }
}
