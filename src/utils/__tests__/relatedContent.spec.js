import { describe, it, expect } from 'vitest';
import { pickRelatedPosts, pickRelatedCalculator, pickRelatedRecipe } from '../relatedContent.js';

// Fixture posts, shaped like content-collection entries.
const posts = [
  { id: 'old-brisket-post', data: { protein: ['beef_brisket'], pubDate: '2026-01-01' } },
  { id: 'new-pork-post', data: { protein: ['pork_shoulder'], pubDate: '2026-08-01' } },
];

describe('pickRelatedPosts (unchanged)', () => {
  it('filters by protein and still returns matches, newest first among equal rank', () => {
    const result = pickRelatedPosts(posts, 'pork_shoulder');
    expect(result.map((p) => p.id)).toEqual(['new-pork-post']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(pickRelatedPosts(posts, 'turkey')).toEqual([]);
  });
});

describe('pickRelatedCalculator (unchanged)', () => {
  it('maps a known protein to its calculator', () => {
    expect(pickRelatedCalculator(['pork_shoulder'])).toEqual({
      href: '/pork-shoulder-calculator',
      label: 'Pork Shoulder Yield & Cost Calculator',
    });
  });

  it('falls back to the rest calculator for an unmapped protein', () => {
    expect(pickRelatedCalculator(['pork_ribs'])).toEqual({ href: '/rest-calculator', label: 'Rest & Hold Calculator' });
  });
});

describe('pickRelatedRecipe', () => {
  const recipes = [
    { id: 'older-pork-recipe', data: { protein: ['pork_shoulder'], title: 'Older Pork Recipe', pubDate: '2026-01-01' } },
    { id: 'dry-brined-pulled-pork', data: { protein: ['pork_shoulder'], title: 'Dry-Brined Pulled Pork', pubDate: '2026-09-28' } },
    { id: 'brisket-recipe', data: { protein: ['beef_brisket'], title: 'Some Brisket Recipe', pubDate: '2026-09-01' } },
  ];

  it('returns the most recent recipe sharing a protein tag', () => {
    expect(pickRelatedRecipe(recipes, ['pork_shoulder'])).toEqual({
      href: '/recipes/dry-brined-pulled-pork',
      title: 'Dry-Brined Pulled Pork',
    });
  });

  it('matches on any shared protein tag for a multi-protein post', () => {
    expect(pickRelatedRecipe(recipes, ['pork_ribs', 'beef_brisket'])).toEqual({
      href: '/recipes/brisket-recipe',
      title: 'Some Brisket Recipe',
    });
  });

  it('returns null when no recipe shares a protein tag', () => {
    expect(pickRelatedRecipe(recipes, ['turkey'])).toBeNull();
  });

  it('returns null for an empty recipes list', () => {
    expect(pickRelatedRecipe([], ['pork_shoulder'])).toBeNull();
  });
});
