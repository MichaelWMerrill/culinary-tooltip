/*
 * A restricted `[text](/path)` inline-link syntax for recipe frontmatter
 * fields (steps[].why, guidance[].text) that Astro renders as plain text
 * rather than through the Markdown pipeline the recipe body gets.
 *
 * Only same-site absolute paths are allowed: the href must start with a
 * single `/` and not `//` (which browsers treat as protocol-relative to an
 * arbitrary host). That rules out `javascript:`, external URLs, and
 * protocol-relative URLs without needing an allowlist of hosts, so no raw
 * HTML ever needs to reach these fields.
 */
const LINK_PATTERN = /\[([^\]\[]+)\]\((\/(?!\/)[^\s()]*)\)/g;

export function parseInlineLinks(text) {
  const segments = [];
  let lastIndex = 0;
  LINK_PATTERN.lastIndex = 0;
  let match;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'link', text: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}
