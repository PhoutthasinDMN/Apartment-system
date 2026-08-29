import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('formatDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatDate('2026-08-29')).toBe('29/08/2026');
  });

  it.each([undefined, null, '', '—', 'not-a-date'])('returns a safe placeholder for %s', (value) => {
    expect(formatDate(value)).toBe('—');
  });
});

describe('formatMoney', () => {
  it('formats Lao kip without decimal places', () => {
    expect(formatMoney(800000, 'lo')).toContain('800.000');
  });
});
