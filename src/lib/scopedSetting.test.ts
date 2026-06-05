import { describe, it, expect } from 'vitest';
import { scopedKey, resolveScopedSetting } from './scopedSetting';

describe('scopedKey', () => {
  it('GLOBAL → clé nue', () => { expect(scopedKey('feature_x', 'GLOBAL')).toBe('feature_x'); });
  it('pays → clé suffixée', () => { expect(scopedKey('feature_x', 'CM')).toBe('feature_x:CM'); });
});

describe('resolveScopedSetting', () => {
  const s = { 'feature_x': 'true', 'feature_x:CM': 'false', 'feature_y': 'true' };
  it('override pays prioritaire', () => {
    expect(resolveScopedSetting(s, 'feature_x', 'CM', 'true')).toEqual({ value: 'false', overridden: true });
  });
  it('fallback global si pas d’override', () => {
    expect(resolveScopedSetting(s, 'feature_y', 'CM', 'true')).toEqual({ value: 'true', overridden: false });
  });
  it('GLOBAL lit la clé nue', () => {
    expect(resolveScopedSetting(s, 'feature_x', 'GLOBAL', 'true')).toEqual({ value: 'true', overridden: false });
  });
  it('défaut si absent', () => {
    expect(resolveScopedSetting(s, 'feature_z', 'CM', 'true')).toEqual({ value: 'true', overridden: false });
  });
});
