import { describe, test, expect } from 'vitest';
import { analyzeDensitySeverity, generateSafePADraft } from './utils/stadiumHelpers';

describe('StadiumHelpers Utility Suite', () => {
  test('correctly evaluates density severities for various ranges', () => {
    expect(analyzeDensitySeverity(90)).toBe('CRITICAL');
    expect(analyzeDensitySeverity(85)).toBe('CONGESTED');
    expect(analyzeDensitySeverity(61)).toBe('CONGESTED');
    expect(analyzeDensitySeverity(60)).toBe('MODERATE');
    expect(analyzeDensitySeverity(31)).toBe('MODERATE');
    expect(analyzeDensitySeverity(30)).toBe('NORMAL');
    expect(analyzeDensitySeverity(10)).toBe('NORMAL');
  });

  test('correctly generates multilingual safe PA announcement drafts', () => {
    const resultDefault = generateSafePADraft();
    expect(resultDefault.EN).toContain('GATE-B');
    expect(resultDefault.EN).toContain('NORMAL');
    expect(resultDefault.ES).toContain('GATE-B');
    expect(resultDefault.ES).toContain('NORMAL');

    const resultCustom = generateSafePADraft('Gate-A', 'CRITICAL');
    expect(resultCustom.EN).toContain('GATE-A');
    expect(resultCustom.EN).toContain('CRITICAL');
    expect(resultCustom.ES).toContain('GATE-A');
    expect(resultCustom.ES).toContain('CRITICAL');
  });
});
