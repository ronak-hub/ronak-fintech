import type { WizardDataInput } from '@/lib/finance';
import { getEffectiveSavingsAmount } from '@/lib/finance';

export interface BackendUserProfile {
  monthly_income?: number;
  rent?: number;
  emis?: number;
  insurance?: number;
  current_bank_balance?: number;
  target_savings_rate?: number;
  primary_goal?: string;
  goal_amount?: number;
  savings_amount?: number;
  fixed_expenses?: number;
  wizard_snapshot?: Record<string, unknown>;
}

export interface MergedDashboardProfile {
  monthlyIncome: number;
  bankBalance: number;
  fixedExpenses: number;
  targetSavingsRate: number;
  savingsAmount: number;
  primaryGoal: string;
  goalAmount: number;
}

function firstPositiveNumber(...values: unknown[]): number {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 0;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

/** Merge backend summary + wizard snapshot + local wizard into one coherent profile. */
export function mergeDashboardProfile(
  backend?: BackendUserProfile | null,
  wizardData?: WizardDataInput | null,
): MergedDashboardProfile {
  const snapshot = backend?.wizard_snapshot ?? {};
  const wizard = wizardData ?? {};

  const fixedFromParts =
    (backend?.rent || 0) + (backend?.emis || 0) + (backend?.insurance || 0);

  const monthlyIncome = firstPositiveNumber(
    backend?.monthly_income,
    snapshot.monthly_income,
    wizard.monthly_income,
  );

  const bankBalance = firstPositiveNumber(
    backend?.current_bank_balance,
    snapshot.bank_balance,
    wizard.bank_balance,
  );

  const fixedExpenses = firstPositiveNumber(
    backend?.fixed_expenses,
    snapshot.fixed_expenses,
    wizard.fixed_expenses,
    fixedFromParts,
  );

  const targetSavingsRate =
    Number(backend?.target_savings_rate ?? snapshot.target_savings_rate ?? wizard.target_savings_rate) || 0.3;

  const savingsAmount = firstPositiveNumber(
    backend?.savings_amount,
    snapshot.savings_amount,
    wizard.savings_amount,
    getEffectiveSavingsAmount({ monthly_income: monthlyIncome, target_savings_rate: targetSavingsRate, savings_amount: wizard.savings_amount }),
  );

  const primaryGoal = firstString(backend?.primary_goal, snapshot.primary_goal, wizard.primary_goal, 'Financial Freedom');
  const goalAmount = firstPositiveNumber(backend?.goal_amount, snapshot.goal_amount, wizard.goal_amount);

  return {
    monthlyIncome,
    bankBalance,
    fixedExpenses,
    targetSavingsRate,
    savingsAmount,
    primaryGoal,
    goalAmount,
  };
}

export function buildSetupPayload(profile: MergedDashboardProfile, expenses: WizardDataInput['expenses'] = []) {
  return {
    monthly_income: profile.monthlyIncome,
    fixed_expenses: profile.fixedExpenses,
    bank_balance: profile.bankBalance,
    target_savings_rate: profile.targetSavingsRate,
    savings_amount: profile.savingsAmount,
    primary_goal: profile.primaryGoal,
    goal_amount: profile.goalAmount,
    expenses: expenses ?? [],
  };
}
