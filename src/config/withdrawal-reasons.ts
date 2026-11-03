/**
 * Editable free-text reason map for Withdrawals.
 * First matching pattern wins. Unmatched text becomes "Other".
 */
export const withdrawalReasonMap = [
  { category: "Other School", patterns: ["other school", "another school", "transfer", "new school"] },
  { category: "Leaving Thailand", patterns: ["leaving thailand", "left thailand", "leaving the country"] },
  { category: "RIS Minburi", patterns: ["minburi"] },
  { category: "Relocation", patterns: ["reloc", "family move", "moved abroad", "moving abroad"] },
] as const;

export function categorizeWithdrawalReason(reason: string, rules = withdrawalReasonMap): string {
  const text = reason.trim().toLowerCase();
  if (!text) return "";
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) return rule.category;
  }
  return "Other";
}
