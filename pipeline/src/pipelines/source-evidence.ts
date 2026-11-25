// Normalize formatting whitespace without changing words, numbers, or punctuation.
export function normalizeSource(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function hasSourceQuote(source: string, quote: string): boolean {
  const normalizedQuote = normalizeSource(quote);
  return normalizedQuote.length > 0
    && normalizeSource(source).includes(normalizedQuote);
}
