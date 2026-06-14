export function normalizeSprintMeasurements<
  T extends {
    sprint30m?: number;
    sprint30mSecond?: number;
  },
>(measurements: T): T {
  const first = measurements.sprint30m;
  const second = measurements.sprint30mSecond;

  if (
    first === undefined ||
    second === undefined ||
    !Number.isFinite(first) ||
    !Number.isFinite(second) ||
    first <= second
  ) {
    return measurements;
  }

  return {
    ...measurements,
    sprint30m: second,
    sprint30mSecond: first,
  };
}
