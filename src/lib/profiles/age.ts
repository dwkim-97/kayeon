export function formatBirthYearLabel(birthYear: number) {
  const twoDigitYear = ((birthYear % 100) + 100) % 100;

  return `${twoDigitYear.toString().padStart(2, '0')}년생`;
}

export function birthYearFromAge(age: number, currentYear: number) {
  return currentYear - age + 1;
}
