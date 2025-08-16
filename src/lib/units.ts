export function to6(amountFloat: number): string {
  const v = Math.floor(amountFloat * 1_000_000);
  return String(v);
}
