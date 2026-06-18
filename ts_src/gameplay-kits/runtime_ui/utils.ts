import type { RuntimeUiLogger } from "./types"

export function noopLogger(this: void, _msg: string): void {}

export function fixed(value: number): Fixed {
  return math.tofixed(value)
}

export function scopedLogger(host: { log: (msg: string) => void }): RuntimeUiLogger {
  return (msg) => host.log(msg)
}
