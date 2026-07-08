import { describe, test, expect } from 'vitest';
import { analyzeDensitySeverity, generateSafePADraft } from './utils/stadiumHelpers';
import { classifyIncident, formatRecommendations, generateMultilingualPADrafts } from './utils/incidentClassifier';

describe('Rigorous Edge-Case and Type Safety Test Suite', () => {
  
  describe('stadiumHelpers - analyzeDensitySeverity Edge Cases', () => {
    test('handles extreme positive densities', () => {
      expect(analyzeDensitySeverity(100)).toBe('CRITICAL');
      expect(analyzeDensitySeverity(10000)).toBe('CRITICAL');
      expect(analyzeDensitySeverity(Infinity)).toBe('CRITICAL');
    });

    test('handles zero and negative densities', () => {
      expect(analyzeDensitySeverity(0)).toBe('NORMAL');
      expect(analyzeDensitySeverity(-1)).toBe('NORMAL');
      expect(analyzeDensitySeverity(-999999)).toBe('NORMAL');
      expect(analyzeDensitySeverity(-Infinity)).toBe('NORMAL');
    });

    test('handles NaN and non-standard float bounds', () => {
      expect(analyzeDensitySeverity(NaN)).toBe('NORMAL');
      expect(analyzeDensitySeverity(85.0001)).toBe('CRITICAL');
      expect(analyzeDensitySeverity(59.9999)).toBe('MODERATE');
      expect(analyzeDensitySeverity(29.9999)).toBe('NORMAL');
    });
  });

  describe('stadiumHelpers - generateSafePADraft Edge Cases', () => {
    test('handles missing, null, or undefined parameters gracefully by returning correct defaults', () => {
      // Cast null/undefined as any to test runtime type tolerance
      const draftWithNulls = generateSafePADraft(null as any, undefined as any);
      expect(draftWithNulls.EN).toBe('Attention fans near GATE-B: Operations status is currently NORMAL.');
      expect(draftWithNulls.ES).toBe('Atención aficionados cerca de la GATE-B: El estado de las operaciones es NORMAL.');
    });

    test('handles empty or blank string parameters by falling back to standards', () => {
      const draftWithBlanks = generateSafePADraft('', '');
      expect(draftWithBlanks.EN).toBe('Attention fans near GATE-B: Operations status is currently NORMAL.');
    });

    test('handles extremely long gate names and statuses to prevent layout breakage', () => {
      const superLongGate = 'G'.repeat(100);
      const superLongStatus = 'S'.repeat(100);
      const draft = generateSafePADraft(superLongGate, superLongStatus);
      expect(draft.EN).toContain(superLongGate.toUpperCase());
      expect(draft.ES).toContain(superLongStatus.toUpperCase());
    });
  });

  describe('incidentClassifier - classifyIncident Edge Cases', () => {
    test('handles completely empty inputs with generic fallback', () => {
      const result = classifyIncident('', '', '');
      expect(result.fifaTag).toBe('FIFA-SEC-CLASS-101-GEN');
      expect(result.fifaDesc).toBe('Standard Venue Operations & Crowd Flow');
      expect(result.severity).toBe('medium');
    });

    test('handles unexpected/garbled input characters and massive inputs', () => {
      const massiveGarbage = 'A'.repeat(10000);
      const result = classifyIncident(massiveGarbage, massiveGarbage, massiveGarbage);
      expect(result.fifaTag).toBe('FIFA-SEC-CLASS-101-GEN');
      expect(result.severity).toBe('medium');
    });

    test('resolves correct tag priority when multiple matching keywords are present', () => {
      // "crack" matches STR (Facilities Integrity), "medical" matches MED (Life-safety)
      // STR should be prioritized over other types of issues
      const comb1 = classifyIncident('Medical Structural Crack Alert', 'A fan slipped near a crack');
      expect(comb1.fifaTag).toBe('FIFA-SEC-CLASS-103-STR');
      expect(comb1.severity).toBe('critical');

      // Check fight / violence keyword mapping
      const comb2 = classifyIncident('VIP Access Conduct Fight', 'Stewards intervened in sector B');
      expect(comb2.fifaTag).toBe('FIFA-SEC-CLASS-105-VIO');
      expect(comb2.severity).toBe('high');
    });

    test('maps clear bag policy queries correctly', () => {
      const result = classifyIncident('Clear bag compliance check', 'Large non-transparent bag size violation');
      expect(result.fifaTag).toBe('FIFA-SEC-CLASS-101-BAG');
      expect(result.severity).toBe('medium');
    });
  });

  describe('incidentClassifier - formatRecommendations Edge Cases', () => {
    test('formats standard generic recommendations', () => {
      const baseRec = 'Check CCTV cameras.';
      const formatted = formatRecommendations('FIFA-SEC-CLASS-101-GEN', 'gate-b', baseRec);
      expect(formatted).toBe('Compliance Reference: [FIFA-SEC-CLASS-101-GEN] under protocol FIFA-SEC-ANNEX-2026.\n\nCheck CCTV cameras.');
    });

    test('adds urgent warning for structural risk incident', () => {
      const baseRec = 'Contact local supervisor.';
      const formatted = formatRecommendations('FIFA-SEC-CLASS-103-STR', 'stand-east', baseRec);
      expect(formatted).toContain('CRITICAL STRUCTURAL RISK');
      expect(formatted).toContain('localized evacuation of Sector STAND-EAST');
    });

    test('adds clinical triage warning for medical emergency', () => {
      const baseRec = 'Await feedback.';
      const formatted = formatRecommendations('FIFA-SEC-CLASS-102-MED', 'gate-a', baseRec);
      expect(formatted).toContain('MEDICAL EMERGENCY PRIORITIZED');
      expect(formatted).toContain('Red Cross triage squad immediately');
    });
  });

  describe('incidentClassifier - generateMultilingualPADrafts Edge Cases', () => {
    test('returns medical PA draft when keywords match', () => {
      const drafts = generateMultilingualPADrafts('gate-a', 'Cardiac Distress', 'Fan is experiencing chest pain');
      expect(drafts.en).toContain('Medical assistance');
      expect(drafts.es).toContain('asistencia médica');
      expect(drafts.fr).toContain('assistance médicale');
      expect(drafts.ar).toContain('المساعدة الطبية');
    });

    test('returns security PA draft when keywords match', () => {
      const drafts = generateMultilingualPADrafts('stand-east', 'Crowd surge', 'Barrier pressure is heavy');
      expect(drafts.en).toContain('Attention fans near Sector STAND-EAST');
    });

    test('returns cleaning PA draft when spill keywords match', () => {
      const drafts = generateMultilingualPADrafts('gate-c', 'Drink Spill', 'Water leak near trash bin');
      expect(drafts.en).toContain('caution in Sector GATE-C due to a temporary clean-up');
    });

    test('returns generic PA draft when no keywords match', () => {
      const drafts = generateMultilingualPADrafts('gate-d', 'General Info', 'A routine inquiry was made');
      expect(drafts.en).toContain('minor operational notice');
    });
  });
});
