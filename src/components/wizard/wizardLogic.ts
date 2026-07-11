export const STEPS = ['infos','payments','tariffs','workflows','airports','advanced','review'] as const;
export type StepId = typeof STEPS[number];
export const STEP_CRITERION: Record<number, string | null> = {
  0: 'currency', 1: 'payment_methods', 2: 'tariffs', 3: null, 4: 'operated_airports', 5: null, 6: null,
};
export function firstMissingStep(missing: string[]): number {
  for (let i = 0; i < STEPS.length; i++) { const c = STEP_CRITERION[i]; if (c && missing.includes(c)) return i; }
  return STEPS.length - 1;
}
export function stepBlockingSatisfied(stepIndex: number, missing: string[]): boolean {
  const c = STEP_CRITERION[stepIndex]; return !c || !missing.includes(c);
}
