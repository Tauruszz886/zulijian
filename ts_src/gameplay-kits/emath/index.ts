export type EMathHorizontalVector2 = {
  x: Fixed
  z: Fixed
}

/**
 * Eggy 运行时数学工具。
 *
 * 这里的运动相关参数统一用 Fixed，避免 gameplay kit 把速度、距离、时间步长等运动量当普通 number 传来传去。
 */
export namespace EMath {
  export function clamp01(value: Fixed): Fixed {
    if (value < 0) return 0
    if (value > 1) return 1
    return value
  }

  export function clampMin(value: Fixed, minValue: Fixed): Fixed {
    return value < minValue ? minValue : value
  }

  export function clamp(value: Fixed, minValue: Fixed, maxValue: Fixed): Fixed {
    if (value < minValue) return minValue
    if (value > maxValue) return maxValue
    return value
  }

  /**
   * 计算 X/Z 平面上的向量长度。
   *
   * 这不是类型转换；例如速度向量 (vx, vz) 会得到水平速度大小，
   * 摇杆输入 (x, z) 会得到水平输入强度。
   */
  export function horizontalLength(x: Fixed, z: Fixed): Fixed {
    return math.sqrt(x * x + z * z) as Fixed
  }

  /**
   * 把当前水平速度向量推进到目标水平速度向量。
   *
   * currentX/currentZ 是当前水平速度。
   * targetX/targetZ 是目标水平速度。
   * maxDelta 是这一帧允许变化的最大速度量，通常等于 加速度或减速度 * tickSeconds。
   *
   * 返回值是本帧计算出的下一步水平速度向量；调用方可以在写入角色前再做最大速度约束。
   */
  export function moveVectorTowards(
    currentX: Fixed,
    currentZ: Fixed,
    targetX: Fixed,
    targetZ: Fixed,
    maxDelta: Fixed,
  ): EMathHorizontalVector2 {
    // maxDelta <= 0 表示本帧不允许速度变化，直接保持当前速度。
    if (maxDelta <= 0) return { x: currentX, z: currentZ }

    // delta 是“从当前速度到目标速度”这条速度空间里的向量，不是世界坐标位移。
    const deltaX = targetX - currentX
    const deltaZ = targetZ - currentZ
    const deltaLength = horizontalLength(deltaX, deltaZ)

    // 如果这一帧允许变化的量已经足够走到目标，直接返回目标速度，避免在目标附近抖动。
    if (deltaLength <= maxDelta || deltaLength <= 0.000001) {
      return { x: targetX, z: targetZ }
    }

    // 否则只沿着 delta 方向前进 maxDelta，得到逐步加速、刹车和转向的效果。
    const scale = maxDelta / deltaLength
    return {
      x: currentX + deltaX * scale,
      z: currentZ + deltaZ * scale,
    }
  }

  export function formatFixed2(value: Fixed): string {
    return tostring(math.floor(value * 100 + 0.5) / 100)
  }
}

