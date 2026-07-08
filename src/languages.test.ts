import { describe, it, expect } from 'vitest';
import { INDIAN_LANGUAGES, TRANSLATIONS } from './languages';

describe('Multi-lingual Translation System Integrity Checks', () => {
  it('should define all 22 Indian scheduled languages plus English', () => {
    expect(INDIAN_LANGUAGES).toBeInstanceOf(Array);
    expect(INDIAN_LANGUAGES.length).toBe(23); // 22 scheduled + english
  });

  it('should have language objects containing code, name, and nativeName', () => {
    INDIAN_LANGUAGES.forEach(lang => {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('name');
      expect(lang).toHaveProperty('nativeName');
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.name).toBe('string');
      expect(typeof lang.nativeName).toBe('string');
    });
  });

  it('should have translations dictionary defined for all registered languages', () => {
    INDIAN_LANGUAGES.forEach(lang => {
      expect(TRANSLATIONS).toHaveProperty(lang.code);
      const translation = TRANSLATIONS[lang.code];

      // Verify all required translation keys are present and non-empty strings
      expect(typeof translation.arenaControl).toBe('string');
      expect(translation.arenaControl.length).toBeGreaterThan(0);

      expect(typeof translation.fanCompanion).toBe('string');
      expect(translation.fanCompanion.length).toBeGreaterThan(0);

      expect(typeof translation.analytics).toBe('string');
      expect(translation.analytics.length).toBeGreaterThan(0);

      expect(typeof translation.commandTitle).toBe('string');
      expect(translation.commandTitle.length).toBeGreaterThan(0);

      expect(typeof translation.liveBroadcast).toBe('string');
      expect(translation.liveBroadcast.length).toBeGreaterThan(0);

      expect(typeof translation.gamedayMode).toBe('string');
      expect(translation.gamedayMode.length).toBeGreaterThan(0);

      expect(typeof translation.recentIntercom).toBe('string');
      expect(translation.recentIntercom.length).toBeGreaterThan(0);

      expect(typeof translation.activeFans).toBe('string');
      expect(translation.activeFans.length).toBeGreaterThan(0);

      expect(typeof translation.staffMesh).toBe('string');
      expect(translation.staffMesh.length).toBeGreaterThan(0);
    });
  });

  it('should match precise translation string values for English core properties', () => {
    const english = TRANSLATIONS['en'];
    expect(english.arenaControl).toBe('Arena Control Center');
    expect(english.fanCompanion).toBe('Fan Companion');
    expect(english.analytics).toBe('Overview & Analytics');
    expect(english.gamedayMode).toBe('GAMEDAY MODE');
  });

  it('should match precise translation string values for Hindi core properties', () => {
    const hindi = TRANSLATIONS['hi'];
    expect(hindi.arenaControl).toBe('एरिना नियंत्रण केंद्र');
    expect(hindi.fanCompanion).toBe('प्रशंसक साथी ऐप');
    expect(hindi.analytics).toBe('अवलोकन और विश्लेषण');
    expect(hindi.gamedayMode).toBe('खेल का दिन');
  });
});
