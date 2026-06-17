import { safeCall } from "@common/engine_safe"
import {
  FOURTH_LEVEL_COMPRESSOR_DOWN_FRAMES,
  FOURTH_LEVEL_COMPRESSOR_DOWN_Y,
  FOURTH_LEVEL_COMPRESSOR_HEIGHT,
  FOURTH_LEVEL_COMPRESSOR_HOLD_SECONDS,
  FOURTH_LEVEL_COMPRESSOR_START_Y,
  FOURTH_LEVEL_COMPRESSOR_UP_FRAMES,
  FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS,
  FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP,
} from "./runtime_config"
import { asFixed } from "./runtime_layout"

type RuntimeCompressorPiece = {
  name: string
  unit: unknown
  x: number
  z: number
  sx: number
  sy: number
  sz: number
  upY: number
  downY: number
}

let runtimeCompressorStarted = false
let runtimeCompressorPieces: RuntimeCompressorPiece[] = []

export function resetRuntimeCompressors(): void {
  runtimeCompressorPieces = []
  runtimeCompressorStarted = false
}

export function registerRuntimeCompressorPiece(piece: RuntimeCompressorPiece): void {
  runtimeCompressorPieces.push(piece)
}

function setRuntimeCompressorPosition(piece: RuntimeCompressorPiece, y: number): void {
  safeCall(
    () => {
      ;(piece.unit as any).set_position(math.Vector3(piece.x as Fixed, y as Fixed, piece.z as Fixed))
    },
    { tag: `runtime_compressor_set_position_${piece.name}`, fallback: undefined, logger: print }
  )
}

function animateRuntimeCompressorPiece(piece: RuntimeCompressorPiece, fromY: number, toY: number, frames: number, done?: () => void): void {
  let frame = 0
  const step = (): void => {
    frame += 1
    const t = frame / frames
    setRuntimeCompressorPosition(piece, fromY + (toY - fromY) * t)
    if (frame < frames) {
      ;(LuaAPI as any).call_delay_frame(1, step)
      return
    }
    if (done !== undefined) {
      done()
    }
  }
  step()
}

function animateRuntimeCompressors(direction: "drop" | "rise", frames: number, done?: () => void): void {
  if (runtimeCompressorPieces.length === 0) {
    if (done !== undefined) {
      done()
    }
    return
  }
  let remaining = runtimeCompressorPieces.length
  for (let i = 0; i < runtimeCompressorPieces.length; i++) {
    const piece = runtimeCompressorPieces[i]!
    const fromY = direction === "drop" ? piece.upY : piece.downY
    const toY = direction === "drop" ? piece.downY : piece.upY
    animateRuntimeCompressorPiece(piece, fromY, toY, frames, () => {
      remaining -= 1
      if (remaining <= 0 && done !== undefined) {
        done()
      }
    })
  }
}

function scheduleRuntimeCompressorCycle(): void {
  ;(LuaAPI as any).call_delay_time(asFixed(FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS), () => {
    print(
      `[ZLJ_RUNTIME_COMPRESSOR] drop begin pieces=${runtimeCompressorPieces.length} wait=${FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS} plate_y=${FOURTH_LEVEL_COMPRESSOR_START_Y}->${FOURTH_LEVEL_COMPRESSOR_DOWN_Y} float_gap=${FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP}`
    )
    animateRuntimeCompressors("drop", FOURTH_LEVEL_COMPRESSOR_DOWN_FRAMES, () => {
      ;(LuaAPI as any).call_delay_time(asFixed(FOURTH_LEVEL_COMPRESSOR_HOLD_SECONDS), () => {
        print(
          `[ZLJ_RUNTIME_COMPRESSOR] rise begin pieces=${runtimeCompressorPieces.length} plate_y=${FOURTH_LEVEL_COMPRESSOR_DOWN_Y}->${FOURTH_LEVEL_COMPRESSOR_START_Y} float_gap=${FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP}`
        )
        animateRuntimeCompressors("rise", FOURTH_LEVEL_COMPRESSOR_UP_FRAMES, scheduleRuntimeCompressorCycle)
      })
    })
  })
}

export function startRuntimeCompressors(): void {
  if (runtimeCompressorStarted) {
    return
  }
  runtimeCompressorStarted = true
  if (runtimeCompressorPieces.length === 0) {
    print("[ZLJ_RUNTIME_COMPRESSOR] skipped pieces=0")
    return
  }
  print(
    `[ZLJ_RUNTIME_COMPRESSOR] start pieces=${runtimeCompressorPieces.length} plate_up_y=${FOURTH_LEVEL_COMPRESSOR_START_Y} plate_down_y=${FOURTH_LEVEL_COMPRESSOR_DOWN_Y} float_gap=${FOURTH_LEVEL_PRESS_PLATE_FLOAT_GAP} plate_height=${FOURTH_LEVEL_COMPRESSOR_HEIGHT} cycle_wait=${FOURTH_LEVEL_COMPRESSOR_WAIT_SECONDS}`
  )
  scheduleRuntimeCompressorCycle()
}
