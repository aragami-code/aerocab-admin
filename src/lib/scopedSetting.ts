export function scopedKey(key: string, country: string): string {
  return !country || country === 'GLOBAL' ? key : `${key}:${country.toUpperCase()}`;
}

export function resolveScopedSetting(
  settings: Record<string, string>,
  key: string,
  country: string,
  def: string,
): { value: string; overridden: boolean } {
  if (country && country !== 'GLOBAL') {
    const scoped = settings[`${key}:${country.toUpperCase()}`];
    if (scoped !== undefined) return { value: scoped, overridden: true };
  }
  const global = settings[key];
  if (global !== undefined) return { value: global, overridden: false };
  return { value: def, overridden: false };
}
