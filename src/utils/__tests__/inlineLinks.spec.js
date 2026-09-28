import { describe, it, expect } from 'vitest';
import { parseInlineLinks } from '../inlineLinks.js';

describe('parseInlineLinks', () => {
  it('returns a single text segment when there is no link', () => {
    expect(parseInlineLinks('plain text, no links')).toEqual([{ type: 'text', value: 'plain text, no links' }]);
  });

  it('splits text around an internal link', () => {
    expect(parseInlineLinks("that's expected; [here's why](/blog/danger-zone) not a warning sign.")).toEqual([
      { type: 'text', value: "that's expected; " },
      { type: 'link', text: "here's why", href: '/blog/danger-zone' },
      { type: 'text', value: ' not a warning sign.' },
    ]);
  });

  it('handles a link with a query string', () => {
    expect(parseInlineLinks('see the [calculator](/pork-shoulder-calculator?pr=pork_shoulder&w=8).')).toEqual([
      { type: 'text', value: 'see the ' },
      { type: 'link', text: 'calculator', href: '/pork-shoulder-calculator?pr=pork_shoulder&w=8' },
      { type: 'text', value: '.' },
    ]);
  });

  it('handles multiple links in the same field', () => {
    expect(parseInlineLinks('[a](/a) and [b](/b)')).toEqual([
      { type: 'link', text: 'a', href: '/a' },
      { type: 'text', value: ' and ' },
      { type: 'link', text: 'b', href: '/b' },
    ]);
  });

  it('does not treat an external URL as a link', () => {
    expect(parseInlineLinks('see [docs](https://example.com/x)')).toEqual([
      { type: 'text', value: 'see [docs](https://example.com/x)' },
    ]);
  });

  it('does not treat a protocol-relative URL as a link', () => {
    expect(parseInlineLinks('see [docs](//example.com/x)')).toEqual([
      { type: 'text', value: 'see [docs](//example.com/x)' },
    ]);
  });

  it('does not treat a javascript: URL as a link', () => {
    expect(parseInlineLinks('see [docs](javascript:alert(1))')).toEqual([
      { type: 'text', value: 'see [docs](javascript:alert(1))' },
    ]);
  });
});
