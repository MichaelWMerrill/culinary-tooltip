import { describe, it, expect } from 'vitest';
import { unknownSourceIds, unsupportedApprovedClaims, pendingWithoutSource } from '../recipeSources.js';

const source = { id: 'fsis-smoking', title: 'Smoking Meat and Poultry', publisher: 'USDA FSIS', url: 'https://example.com', tier: 'A', checked: '2026-09-27' };

describe('unknownSourceIds', () => {
  it('is empty when every referenced id is declared', () => {
    const recipe = {
      sources: [source],
      ratios: [{ id: 'salt', review: 'approved', sourceIds: ['fsis-smoking'] }],
      guidance: [],
      steps: [{ sourceIds: ['fsis-smoking'] }],
    };
    expect(unknownSourceIds(recipe)).toEqual([]);
  });

  it('flags a sourceId with no matching entry in sources[]', () => {
    const recipe = { sources: [source], ratios: [{ id: 'salt', review: 'pending', sourceIds: ['ghost-source'] }], guidance: [], steps: [] };
    expect(unknownSourceIds(recipe)).toEqual(['ghost-source']);
  });

  it('checks guidance and steps too, and de-duplicates', () => {
    const recipe = {
      sources: [],
      ratios: [],
      guidance: [{ id: 'g1', review: 'pending', sourceIds: ['missing'] }],
      steps: [{ sourceIds: ['missing'] }],
    };
    expect(unknownSourceIds(recipe)).toEqual(['missing']);
  });
});

describe('unsupportedApprovedClaims', () => {
  it('flags an approved ratio with no source and no modelBasis', () => {
    const recipe = { ratios: [{ id: 'salt', review: 'approved', sourceIds: [], modelBasis: false }], guidance: [] };
    expect(unsupportedApprovedClaims(recipe)).toEqual(['salt']);
  });

  it('accepts an approved ratio with a source', () => {
    const recipe = { ratios: [{ id: 'salt', review: 'approved', sourceIds: ['fsis-smoking'], modelBasis: false }], guidance: [] };
    expect(unsupportedApprovedClaims(recipe)).toEqual([]);
  });

  it('accepts an approved item with modelBasis instead of a source', () => {
    const recipe = { ratios: [], guidance: [{ id: 'brine-hold', review: 'approved', sourceIds: [], modelBasis: true }] };
    expect(unsupportedApprovedClaims(recipe)).toEqual([]);
  });

  it('never flags a pending item, sourced or not', () => {
    const recipe = { ratios: [{ id: 'sugar', review: 'pending', sourceIds: [], modelBasis: false }], guidance: [] };
    expect(unsupportedApprovedClaims(recipe)).toEqual([]);
  });
});

describe('pendingWithoutSource', () => {
  it('flags a pending item with neither a source nor modelBasis', () => {
    const recipe = { ratios: [{ id: 'sugar', review: 'pending', sourceIds: [], modelBasis: false }], guidance: [] };
    expect(pendingWithoutSource(recipe)).toEqual(['sugar']);
  });

  it('does not flag a pending item that already has a source', () => {
    const recipe = { ratios: [{ id: 'salt', review: 'pending', sourceIds: ['fsis-smoking'], modelBasis: false }], guidance: [] };
    expect(pendingWithoutSource(recipe)).toEqual([]);
  });

  it('never flags an approved item (that is unsupportedApprovedClaims\' job)', () => {
    const recipe = { ratios: [{ id: 'salt', review: 'approved', sourceIds: [], modelBasis: false }], guidance: [] };
    expect(pendingWithoutSource(recipe)).toEqual([]);
  });
});
