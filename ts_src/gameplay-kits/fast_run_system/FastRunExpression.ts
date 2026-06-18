export type FastRunExpressionResult = {
  ok: boolean
  value: number
  error: string
}

class FastRunExpressionParser {
  private readonly text: string
  private readonly speed: number
  private index = 0
  private error = ""

  constructor(text: string, speed: number) {
    this.text = text
    this.speed = speed
  }

  parse(): FastRunExpressionResult {
    this.skipSpaces()
    if (this.index >= this.text.length) return this.fail("表达式为空")

    const value = this.parseAddSub()
    if (this.error.length > 0) return this.fail(this.error)

    this.skipSpaces()
    if (this.index < this.text.length) {
      return this.fail(`无法识别字符 '${this.charAt(this.index)}'`)
    }

    if (!this.isFiniteNumber(value)) return this.fail("结果不是有效数字")
    return { ok: true, value, error: "" }
  }

  private parseAddSub(): number {
    let value = this.parseMulDiv()
    while (this.error.length === 0) {
      this.skipSpaces()
      const op = this.peek()
      if (op !== "+" && op !== "-") return value
      this.index++
      const right = this.parseMulDiv()
      value = op === "+" ? value + right : value - right
    }
    return value
  }

  private parseMulDiv(): number {
    let value = this.parseUnary()
    while (this.error.length === 0) {
      this.skipSpaces()
      const op = this.peek()
      if (op !== "*" && op !== "/") return value
      this.index++
      const right = this.parseUnary()
      if (op === "/" && math.abs(right) <= 0.000001) {
        this.error = "除数不能为 0"
        return value
      }
      value = op === "*" ? value * right : value / right
    }
    return value
  }

  private parseUnary(): number {
    this.skipSpaces()
    const op = this.peek()
    if (op === "+") {
      this.index++
      return this.parseUnary()
    }
    if (op === "-") {
      this.index++
      return -this.parseUnary()
    }
    return this.parsePrimary()
  }

  private parsePrimary(): number {
    this.skipSpaces()
    const ch = this.peek()
    if (ch === "s" || ch === "S") {
      this.index++
      return this.speed
    }

    if (ch === "(") {
      this.index++
      const value = this.parseAddSub()
      this.skipSpaces()
      if (this.peek() !== ")") {
        this.error = "缺少右括号"
        return value
      }
      this.index++
      return value
    }

    return this.parseNumber()
  }

  private parseNumber(): number {
    this.skipSpaces()
    const start = this.index
    let sawDigit = false

    while (this.index < this.text.length) {
      const c = this.charCodeAt(this.index)
      if (c < 48 || c > 57) break
      sawDigit = true
      this.index++
    }

    if (this.index < this.text.length && this.charCodeAt(this.index) === 46 /* '.' */) {
      this.index++
      while (this.index < this.text.length) {
        const c = this.charCodeAt(this.index)
        if (c < 48 || c > 57) break
        sawDigit = true
        this.index++
      }
    }

    if (!sawDigit) {
      this.error = `需要数字或 s，当前位置=${this.index + 1}`
      return 0
    }

    let value = 0
    let fracDiv = 1
    let inFraction = false
    for (let i = start; i < this.index; i++) {
      const c = this.charCodeAt(i)
      if (c === 46 /* '.' */) {
        inFraction = true
      } else if (!inFraction) {
        value = value * 10 + (c - 48)
      } else {
        fracDiv = fracDiv * 10
        value = value + (c - 48) / fracDiv
      }
    }
    return value
  }

  private skipSpaces(): void {
    while (this.index < this.text.length) {
      const c = this.charCodeAt(this.index)
      if (c !== 32 && c !== 9 && c !== 10 && c !== 13) return
      this.index++
    }
  }

  private peek(): string {
    if (this.index >= this.text.length) return ""
    return this.charAt(this.index)
  }

  private charAt(index: number): string {
    return this.text.charAt(index)
  }

  private charCodeAt(index: number): number {
    return this.text.charCodeAt(index)
  }

  private isFiniteNumber(value: number): boolean {
    if (value !== value) return false
    const text = tostring(value)
    return text !== "inf" && text !== "-inf" && text !== "nan"
  }

  private fail(error: string): FastRunExpressionResult {
    return { ok: false, value: 0, error }
  }
}

export function evaluateFastRunExpression(expression: string, speed: number): FastRunExpressionResult {
  return new FastRunExpressionParser(expression, speed).parse()
}
