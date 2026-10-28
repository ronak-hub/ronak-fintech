export interface WizardDataInput {
  monthly_income?: number | string;
  fixed_expenses?: number | string;
  savings_amount?: number | string;
  target_savings_rate?: number | string;
  bank_balance?: number | string;
  primary_goal?: string;
  goal_amount?: number | string;
  expenses?: Array<{ category?: string; amount?: number | string }>;
}

const WIZARD_STORAGE_KEY = 'vaulticDnaInputs';
const WIZARD_STEP_STORAGE_KEY = 'vaulticDnaStep';

export function readStoredWizardData(): WizardDataInput | null {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return null;
  }

  const raw = globalThis.window.localStorage.getItem(WIZARD_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as WizardDataInput) : null;
  } catch {
    return null;
  }
}

export function readStoredWizardStep(): number | null {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return null;
  }

  const raw = globalThis.window.localStorage.getItem(WIZARD_STEP_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const step = Number(raw);
  return Number.isFinite(step) ? step : null;
}

export function hasMeaningfulWizardData(data?: WizardDataInput | null): boolean {
  if (!data) {
    return false;
  }

  const values = [
    data.monthly_income,
    data.fixed_expenses,
    data.savings_amount,
    data.bank_balance,
    data.goal_amount,
    data.primary_goal,
  ];

  return values.some((value) => {
    if (value === undefined || value === null || value === '') {
      return false;
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    return String(value).trim().length > 0;
  });
}

export function persistWizardData(data: Record<string, unknown>, step?: number): WizardDataInput {
  if (typeof globalThis === 'undefined' || !globalThis.window) {
    return data as WizardDataInput;
  }

  const existing = readStoredWizardData() ?? {};
  const sanitized = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const merged = { ...existing, ...sanitized } as WizardDataInput;

  globalThis.window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(merged));
  const resolvedStep = step ?? readStoredWizardStep() ?? 1;
  globalThis.window.localStorage.setItem(WIZARD_STEP_STORAGE_KEY, String(resolvedStep));
  globalThis.window.dispatchEvent(new Event('vaulticDnaInputsUpdated'));
  return merged;
}

export function getEffectiveSavingsAmount(data?: WizardDataInput): number {
  const income = Number(data?.monthly_income) || 0;
  const savingsAmountRaw = data?.savings_amount;
  const savingsAmountValue = savingsAmountRaw !== undefined && savingsAmountRaw !== null ? String(savingsAmountRaw).trim() : '';

  if (savingsAmountValue !== '') {
    const explicitSavings = Number(savingsAmountValue);
    if (!Number.isNaN(explicitSavings)) {
      return explicitSavings;
    }
  }

  const rate = Number(data?.target_savings_rate);
  return Math.round(income * (rate > 0 ? rate : 0.3));
}

/** SIP needed so existing capital + monthly contributions reach `goal`. */
export function computeRequiredSip(
  goal: number,
  years: number,
  currentCapital = 0,
  annualReturn = 0.12,
): number {
  const r = annualReturn / 12;
  const n = Math.max(1, years * 12);
  const principal = Math.max(0, currentCapital);
  const futureOfPrincipal = principal * ((1 + r) ** n);
  const remaining = Math.max(0, goal - futureOfPrincipal);
  if (remaining <= 0) {
    return 0;
  }
  if (r === 0) {
    return Math.round(remaining / n);
  }
  const multiplier = (((1 + r) ** n - 1) / r) * (1 + r);
  return Math.round(remaining / multiplier);
}

/** Wealth target for FI using annual outflow / 6% safe withdrawal rate. */
export function computeFinancialFreedomTarget(params: {
  monthlyIncome: number;
  fixedExpenses: number;
  savingsAmount?: number;
  targetSavingsRate?: number;
  explicitGoal?: number;
}): number {
  const monthlyIncome = Math.max(0, params.monthlyIncome);
  const fixedExpenses = Math.max(0, params.fixedExpenses);
  const rate = params.targetSavingsRate ?? 0.3;
  const savings =
    params.savingsAmount && params.savingsAmount > 0 && params.savingsAmount <= monthlyIncome
      ? params.savingsAmount
      : Math.round(monthlyIncome * rate);
  const wealthThreshold = Math.max(monthlyIncome * 24, 500000);
  const explicit = params.explicitGoal ?? 0;

  if (explicit >= wealthThreshold) {
    return explicit;
  }

  const monthlyOutflow = fixedExpenses + savings;
  const fiTarget = Math.round((monthlyOutflow * 12) / 0.06);
  return fiTarget > 0 ? fiTarget : 50000000;
}

export type GoalPrediction = { target: number; years: number; required_sip: number };

export function computeGoalPrediction(
  goalId: string,
  params: {
    monthlyIncome: number;
    fixedExpenses: number;
    savingsAmount: number;
    bankBalance: number;
    explicitGoal?: number;
    targetSavingsRate?: number;
  },
): GoalPrediction {
  const income = Math.max(0, params.monthlyIncome);
  const savingsAmount =
    params.savingsAmount > 0 && params.savingsAmount <= income
      ? params.savingsAmount
      : Math.round(income * (params.targetSavingsRate ?? 0.3));
  const balance = Math.max(0, params.bankBalance);
  let target = 0;
  let years = 10;

  if (goalId === 'Financial Freedom') {
    target = computeFinancialFreedomTarget({
      monthlyIncome: income,
      fixedExpenses: params.fixedExpenses,
      savingsAmount,
      targetSavingsRate: params.targetSavingsRate,
      explicitGoal: params.explicitGoal ?? 0,
    });
    years = 10;
  } else if (goalId === 'Luxury Travel') {
    target = Math.round(Math.max(150000, Math.min(5000000, savingsAmount * 2.8)));
    years = 2;
  } else if (goalId === 'Special Commodities') {
    target = Math.round(Math.max(500000, Math.min(20000000, income * 50 || savingsAmount * 20)));
    years = 5;
  } else {
    target = params.explicitGoal ?? 50000000;
  }

  return {
    target,
    years,
    required_sip: computeRequiredSip(target, years, balance),
  };
}
