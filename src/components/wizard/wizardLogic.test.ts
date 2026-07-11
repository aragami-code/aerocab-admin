import { describe, it, expect } from 'vitest';
import { firstMissingStep } from './wizardLogic';
describe('firstMissingStep', () => {
  it('tout manquant → 0', () => { expect(firstMissingStep(['currency','payment_methods','tariffs','operated_airports'])).toBe(0); });
  it('tariffs+airports → 2', () => { expect(firstMissingStep(['tariffs','operated_airports'])).toBe(2); });
  it('operated_airports → 4', () => { expect(firstMissingStep(['operated_airports'])).toBe(4); });
  it('rien → 6', () => { expect(firstMissingStep([])).toBe(6); });
});
