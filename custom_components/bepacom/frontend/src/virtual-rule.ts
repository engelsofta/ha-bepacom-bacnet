function normalizeRuleValue(value: unknown): string {
  return String(value ?? "").trim().replace(/^['\"]|['\"]$/g, "").toLowerCase();
}

function numericRuleValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().replace(/^['\"]|['\"]$/g, "").replace(",", ".");
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function equalRuleValue(value: unknown, expression: unknown): boolean {
  const left = numericRuleValue(value);
  const right = numericRuleValue(expression);
  if (left !== null && right !== null) return left === right;
  return normalizeRuleValue(value) === normalizeRuleValue(expression);
}

function advancedRuleMatches(value: unknown, expression: string): boolean | null {
  let rule = expression.trim();
  if (!rule) return null;
  rule = rule.replaceAll("&&", " && ").replaceAll("||", " || ");
  if (!/^[a-zA-Z0-9_\s()<>!=&|^+*\/%.,'"-]+$/.test(rule)) return null;

  const numericValue = numericRuleValue(value);
  const preparedValue = numericValue !== null
    ? String(numericValue)
    : JSON.stringify(normalizeRuleValue(value));
  const preparedRule = rule
    .replace(/\bvalue\b/g, preparedValue)
    .replace(/([^=!])=([^=])/g, "$1==$2");

  try {
    // The character whitelist above deliberately limits this preview evaluator.
    // Backend evaluation remains authoritative.
    return Boolean(Function(`"use strict"; return (${preparedRule});`)());
  } catch {
    return null;
  }
}

export function virtualRuleMatches(value: unknown, condition: unknown): boolean {
  const raw = String(condition ?? "").trim();
  if (!raw) return false;

  if (raw.includes("value") || raw.includes("&&") || raw.includes("||")) {
    const advanced = advancedRuleMatches(value, raw);
    if (advanced !== null) return advanced;
  }
  if (raw.includes(",")) {
    return raw.split(",").some((part) => virtualRuleMatches(value, part.trim()));
  }

  const numericValue = numericRuleValue(value);
  for (const operator of [">=", "<=", "!=", "==", ">", "<"]) {
    if (!raw.startsWith(operator)) continue;
    const right = raw.slice(operator.length).trim();
    const numericRight = numericRuleValue(right);
    if (numericValue !== null && numericRight !== null) {
      if (operator === ">=") return numericValue >= numericRight;
      if (operator === "<=") return numericValue <= numericRight;
      if (operator === "!=") return numericValue !== numericRight;
      if (operator === "==") return numericValue === numericRight;
      if (operator === ">") return numericValue > numericRight;
      return numericValue < numericRight;
    }
    if (operator === "!=") return !equalRuleValue(value, right);
    if (operator === "==") return equalRuleValue(value, right);
    return false;
  }

  const dashIndex = raw.slice(1).indexOf("-");
  if (dashIndex >= 0) {
    const splitAt = dashIndex + 1;
    const left = numericRuleValue(raw.slice(0, splitAt).trim());
    const right = numericRuleValue(raw.slice(splitAt + 1).trim());
    if (numericValue !== null && left !== null && right !== null) {
      return numericValue >= Math.min(left, right) && numericValue <= Math.max(left, right);
    }
  }

  return equalRuleValue(value, raw);
}
