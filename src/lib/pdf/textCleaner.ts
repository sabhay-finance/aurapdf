/**
 * Advanced text cleaning and ligature repair utility for PDF extractions.
 * Repairs font null byte substitutions (\x00), dropped ligatures (fi, fl, ff),
 * hyphenation breaks, and font spacing issues common in Schweser, Wiley, and CFA textbooks.
 */

export function cleanExtractedText(text: string): string {
  if (!text) return '';

  let cleaned = text
    // 1. Handle double-f / specific ligature cases before generic replacement
    .replace(/over\s*\x00\s*itting/gi, 'overfitting')
    .replace(/under\s*\x00\s*itting/gi, 'underfitting')
    .replace(/di\s*\x00\s*er/gi, 'differ')
    .replace(/e\s*\x00\s*ect/gi, 'effect')
    .replace(/e\s*\x00\s*icien/gi, 'efficien')
    .replace(/o\s*\x00\s*set/gi, 'offset')
    .replace(/pro\s*\x00\s*it/gi, 'profit')
    .replace(/arti\s*\x00\s*icial/gi, 'artificial')

    // 2. In this Schweser font, null byte \x00 represents the 'f' character
    .replace(/([a-zA-Z]*)\s*\x00\s*([a-zA-Z]*)/g, (match, p1, p2) => {
      return p1 + 'f' + p2;
    })
    .replace(/\x00/g, 'f')

    // 3. Fix words where preposition merged with the f-ligature: e.g. "offintech" -> "of fintech", "afirm" -> "a firm"
    .replace(/\b(of|in|a|if)f([a-z]+)/gi, '$1 f$2')

    // 4. Standard Unicode Ligatures
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')

    // 5. Fix hyphenation across line wraps: e.g. "unstruc- tured" -> "unstructured"
    .replace(/(\b[a-zA-Z]{2,})-\s+([a-zA-Z]{2,}\b)/g, '$1$2')

    // 6. Fix common remaining font drop artifacts: "frm" -> "firm", "irm" -> "firm"
    .replace(/\bfrm\b/g, 'firm')
    .replace(/\bFrm\b/g, 'Firm')
    .replace(/\bfrms\b/g, 'firms')
    .replace(/\bFrms\b/g, 'Firms')
    .replace(/\birm\b/g, 'firm')
    .replace(/\bIrm\b/g, 'Firm')
    .replace(/\birms\b/g, 'firms')
    .replace(/\bIrms\b/g, 'Firms')
    .replace(/\birm's\b/g, "firm's")
    .replace(/\bpro\s*it\b/gi, 'profit')
    .replace(/\bpro\s*its\b/gi, 'profits')
    .replace(/\bpro\s*itable\b/gi, 'profitable')
    .replace(/\barti\s*icial\b/gi, 'artificial')
    .replace(/\bthefirm\b/gi, 'the firm')
    .replace(/\bprofitmaximizing\b/gi, 'profit-maximizing')
    .replace(/\btotalfixed\b/gi, 'total fixed')
    .replace(/\bshortrun\b/gi, 'short run')
    .replace(/\blongrun\b/gi, 'long run')

    // 7. Ensure spacing after punctuation marks: e.g. ",firms" -> ", firms", ")firm" -> ") firm"
    .replace(/,([a-zA-Z])/g, ', $1')
    .replace(/\.([A-Z])/g, '. $1')
    .replace(/\)([a-zA-Z])/g, ') $1')

    // 8. Normalize multiple whitespace and tabs down to single space
    .replace(/[ \t]+/g, ' ');

  return cleaned.trim();
}
