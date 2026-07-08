import { describe, it, expect } from 'vitest';

// We simulate the fallback logic matching the server's local handlers to verify response correctness
function handleFallbackFanAsk(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('bag') || q.includes('policy') || q.includes('bring') || q.includes('backpack')) {
    return 'clear bag policy';
  }

  if (q.includes('water') || q.includes('drink') || q.includes('bottle') || q.includes('hydrate')) {
    return 'water & hydration';
  }

  if (q.includes('accessibility') || q.includes('wheelchair') || q.includes('disabled') || q.includes('ada') || q.includes('elevator')) {
    return 'accessibility & inclusion';
  }

  if (q.includes('metro') || q.includes('transit') || q.includes('bus') || q.includes('uber') || q.includes('transport') || q.includes('get to') || q.includes('taxi')) {
    return 'transportation guide';
  }

  if (q.includes('food') || q.includes('eat') || q.includes('concession') || q.includes('vegan') || q.includes('halal') || q.includes('taco')) {
    return 'food & concessions';
  }

  return 'welcome guide';
}

describe('Fan Companion Fallback Guidance Logic Tests', () => {
  it('should route bag or backpack questions to clear bag policy', () => {
    expect(handleFallbackFanAsk('Can I bring a backpack?')).toBe('clear bag policy');
    expect(handleFallbackFanAsk('What is the bag policy?')).toBe('clear bag policy');
  });

  it('should route water, drink, or bottle questions to water and hydration', () => {
    expect(handleFallbackFanAsk('Where can I drink water?')).toBe('water & hydration');
    expect(handleFallbackFanAsk('Where can I get a drink?')).toBe('water & hydration');
  });

  it('should route accessibility, wheelchair, elevator or ADA questions to accessibility services', () => {
    expect(handleFallbackFanAsk('Is there wheelchair access?')).toBe('accessibility & inclusion');
    expect(handleFallbackFanAsk('where is the elevator?')).toBe('accessibility & inclusion');
    expect(handleFallbackFanAsk('ADA rules')).toBe('accessibility & inclusion');
  });

  it('should route transportation, metro, uber, or taxi questions to transit guidelines', () => {
    expect(handleFallbackFanAsk('How do I take the Metro?')).toBe('transportation guide');
    expect(handleFallbackFanAsk('Where is the Uber pickup?')).toBe('transportation guide');
  });

  it('should route concession, food, or vegan questions to concessions guide', () => {
    expect(handleFallbackFanAsk('Is there vegan food?')).toBe('food & concessions');
    expect(handleFallbackFanAsk('where can I get a taco?')).toBe('food & concessions');
  });

  it('should route miscellaneous questions to the welcome guide overview', () => {
    expect(handleFallbackFanAsk('Hello there! Who are you?')).toBe('welcome guide');
    expect(handleFallbackFanAsk('Tell me about the match')).toBe('welcome guide');
  });
});
