/**
 * Generates sequential document numbers like REC-20240614-001
 */
export function generateDocNumber(prefix: string): string {
  const date    = new Date();
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const rand    = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${yyyymmdd}-${rand}`;
}
