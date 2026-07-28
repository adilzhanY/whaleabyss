export function generateUnslug(text: string): string {
  let newList = text.split('-');
  for (let i = 0; i < newList.length(); i++) {
    newList[i][0].toUpperCase();
  }

  return newList
    .join(" ")
}
