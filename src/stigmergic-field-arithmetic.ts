export function checkedFieldAdd(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    throw new Error("ARITHMETIC_OVERFLOW");
  }

  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error("ARITHMETIC_OVERFLOW");
  }

  return result;
}

export function decayedMagnitude(
  magnitude: number,
  decayWindowEvents: number,
  sourceSequence: number,
  throughSequence: number,
): number {
  const age = throughSequence - sourceSequence;
  if (age < 0) {
    throw new Error("TRACE_FROM_FUTURE");
  }
  if (age >= decayWindowEvents) {
    return 0;
  }

  const remaining = decayWindowEvents - age;
  const product = magnitude * remaining;
  if (!Number.isSafeInteger(product)) {
    throw new Error("ARITHMETIC_OVERFLOW");
  }

  return Math.floor(product / decayWindowEvents);
}
