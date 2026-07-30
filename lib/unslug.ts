/** "genshin-abyss" → "Genshin Abyss". */
export function generateUnslug(text: string): string {
  return text
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
