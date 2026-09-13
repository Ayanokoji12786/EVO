const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function speciesLetter(index: number): string {
  let n = index;
  let result = '';
  do {
    result = LETTERS[n % 26] + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

export function generateSpeciesName(speciesOrdinal: number, seedNumber: number): string {
  const letter = speciesLetter(speciesOrdinal);
  const num = (seedNumber % 99) + 1;
  return `Species ${letter}-${String(num).padStart(2, '0')}`;
}
