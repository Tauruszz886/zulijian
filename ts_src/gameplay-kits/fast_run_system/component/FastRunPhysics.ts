type PhysicsCcdTarget = {
  enable_physics_ccd?: (this: void, enable: boolean) => void
}

type UnitCcdTarget = {
  enable_unit_ccd?: (this: void) => void
}

export function enablePhysicsCcd(target: unknown): boolean {
  try {
    const enable = (target as PhysicsCcdTarget).enable_physics_ccd
    if (enable === undefined || enable === null) return false
    enable(true)
    return true
  } catch (_e) {
    return false
  }
}

export function enableUnitCcd(unit: Unit): boolean {
  try {
    const enable = (unit as unknown as UnitCcdTarget).enable_unit_ccd
    if (enable === undefined || enable === null) return false
    enable()
    return true
  } catch (_e) {
    return false
  }
}
