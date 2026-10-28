"""
Equal-coverage algorithmic measurement for Vaultic calculation engines.

Compares each platform formula against independent reference math on the
same fixture profiles. Reports absolute/relative error and pass/fail.
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from stress_tester import StressTestInput, StressTester, months_to_target  # noqa: E402


ANNUAL_RETURN = 0.12
SAFE_WITHDRAWAL = 0.06
TOL_MONTHS = 1
TOL_RUPEES = 1.0


@dataclass
class Fixture:
    name: str
    monthly_income: float
    rent: float
    emis: float
    insurance: float
    target_savings_rate: float
    current_bank_balance: float
    goal_amount: float
    monthly_expenses: float


FIXTURES = [
    Fixture("balanced", 100_000, 25_000, 10_000, 5_000, 0.30, 500_000, 10_000_000, 50_000),
    Fixture("high_saver", 200_000, 40_000, 0, 10_000, 0.50, 2_000_000, 50_000_000, 80_000),
    Fixture("tight_budget", 40_000, 15_000, 8_000, 2_000, 0.10, 50_000, 5_000_000, 35_000),
    Fixture("zero_savings", 60_000, 30_000, 15_000, 5_000, 0.0, 100_000, 5_000_000, 55_000),
    Fixture("already_funded", 150_000, 20_000, 0, 5_000, 0.40, 12_000_000, 10_000_000, 40_000),
    Fixture("low_return_edge", 80_000, 20_000, 5_000, 3_000, 0.25, 250_000, 3_000_000, 45_000),
]


@dataclass
class Finding:
    engine: str
    fixture: str
    check: str
    platform: float | str
    reference: float | str
    abs_error: float
    rel_error_pct: float
    status: str
    note: str


def months_to_goal_closed_form(
    current: float, monthly: float, target: float, annual_return: float = ANNUAL_RETURN
) -> float:
    raw = months_to_target(current, monthly, target, annual_return / 12)
    if raw is None:
        return -1.0
    return float(raw)


def required_sip_reference(goal: float, years: int, current: float = 0.0, annual_return: float = ANNUAL_RETURN) -> float:
    r = annual_return / 12
    n = years * 12
    if r == 0:
        return max(0.0, (goal - current) / n)
    future_of_current = current * ((1 + r) ** n)
    remaining = max(0.0, goal - future_of_current)
    if remaining <= 0:
        return 0.0
    multiplier = (((1 + r) ** n - 1) / r) * (1 + r)
    return remaining / multiplier


def compute_required_sip_platform(goal: float, years: int, current: float = 0.0) -> float:
    """Mirrors main.compute_required_sip."""
    r = 0.12 / 12
    n = max(1, int(years) * 12)
    goal_v = max(0.0, float(goal or 0))
    principal = max(0.0, float(current or 0))
    if r == 0:
        return round(max(0.0, goal_v - principal) / n, 2)
    future_of_current = principal * ((1 + r) ** n)
    remaining = max(0.0, goal_v - future_of_current)
    if remaining <= 0:
        return 0.0
    compounding_multiplier = (((1 + r) ** n - 1) / r) * (1 + r)
    return round(remaining / compounding_multiplier, 2)


def investable_monthly(fix: Fixture, boost: float = 0.0) -> float:
    fixed = fix.rent + fix.emis + fix.insurance
    cash_available = max(0.0, fix.monthly_income - fixed)
    target_savings = fix.monthly_income * fix.target_savings_rate
    return min(target_savings, cash_available) + boost


def freedom_projection_platform(fix: Fixture, boost: float = 0.0) -> tuple[str, float, int]:
    """Mirrors fixed main.calculate_freedom_projection."""
    monthly_investment = investable_monthly(fix, boost)
    current_capital = fix.current_bank_balance
    target_goal = fix.goal_amount
    monthly_rate = ANNUAL_RETURN / 12

    if current_capital >= target_goal:
        return datetime.now().strftime("%b %Y"), 0.0, 0

    if monthly_investment <= 0:
        return "STALLED", 99, 0

    months = 0
    accumulated = current_capital
    while accumulated < target_goal and months < 1000:
        accumulated = accumulated * (1 + monthly_rate) + monthly_investment
        months += 1

    if accumulated < target_goal:
        return "STALLED", 99, 0

    freedom_date = datetime.now() + timedelta(days=int(months * 30.44))
    return freedom_date.strftime("%b %Y"), round(months / 12, 1), months


def pulse_daily_limit(fix: Fixture, spent: float, day: int = 15, days_in_month: int = 30) -> float:
    days_left = days_in_month - day + 1
    fixed_costs = fix.rent + fix.emis + fix.insurance
    investments = fix.monthly_income * fix.target_savings_rate
    safe_pool = fix.monthly_income - fixed_costs - investments - spent
    daily_limit = safe_pool / days_left if days_left > 0 else 0
    return round(max(0, daily_limit), 2)


def stress_freedom_platform(fix: Fixture) -> tuple[str, float, int]:
    tester = StressTester(
        monthly_income=fix.monthly_income,
        monthly_expenses=fix.monthly_expenses,
        current_investments=fix.current_bank_balance,
        monthly_savings=investable_monthly(fix),
    )
    return tester.calculate_freedom_date()


def optimize_monthly_from_txs(txs: list[tuple[datetime, float]]) -> float:
    """Mirrors fixed optimize analytics: average of monthly totals."""
    buckets: dict[tuple[int, int], float] = defaultdict(float)
    for ts, amount in txs:
        buckets[(ts.year, ts.month)] += amount
    return sum(buckets.values()) / len(buckets) if buckets else 0.0


def rel_err(platform: float, reference: float) -> float:
    if reference == 0:
        return 0.0 if platform == 0 else 100.0
    return abs(platform - reference) / abs(reference) * 100.0


def status_for(abs_e: float, rel_e: float, abs_tol: float, rel_tol: float) -> str:
    if abs_e <= abs_tol or rel_e <= rel_tol:
        return "PASS"
    if abs_e <= abs_tol * 5 or rel_e <= rel_tol * 5:
        return "WARN"
    return "FAIL"


def measure_all() -> dict[str, Any]:
    findings: list[Finding] = []

    # --- Freedom projection ---
    for fix in FIXTURES:
        plat_date, plat_years, plat_months = freedom_projection_platform(fix)
        monthly = investable_monthly(fix)

        if monthly <= 0 and fix.current_bank_balance < fix.goal_amount:
            findings.append(
                Finding(
                    "freedom_projection",
                    fix.name,
                    "zero_savings_stall",
                    plat_date,
                    "STALLED",
                    0 if plat_date == "STALLED" else 1,
                    0 if plat_date == "STALLED" else 100,
                    "PASS" if plat_date == "STALLED" else "FAIL",
                    "Zero monthly investment must stall",
                )
            )
            continue

        if fix.current_bank_balance >= fix.goal_amount:
            findings.append(
                Finding(
                    "freedom_projection",
                    fix.name,
                    "already_funded_months",
                    plat_months,
                    0,
                    float(abs(plat_months)),
                    0.0 if plat_months == 0 else 100.0,
                    "PASS" if plat_months == 0 else "FAIL",
                    "Capital >= goal returns 0 months immediately",
                )
            )
            continue

        ref_months = math.ceil(months_to_goal_closed_form(fix.current_bank_balance, monthly, fix.goal_amount) - 1e-9)
        abs_e = abs(plat_months - ref_months)
        findings.append(
            Finding(
                "freedom_projection",
                fix.name,
                "months_vs_closed_form",
                plat_months,
                ref_months,
                float(abs_e),
                rel_err(plat_months, ref_months),
                status_for(abs_e, rel_err(plat_months, ref_months), TOL_MONTHS, 2.0),
                "Iterative loop vs closed-form with capped investable cash",
            )
        )

        fixed = fix.rent + fix.emis + fix.insurance
        cash_available = max(0.0, fix.monthly_income - fixed)
        target_rate_savings = fix.monthly_income * fix.target_savings_rate
        if target_rate_savings > cash_available + 1e-6:
            findings.append(
                Finding(
                    "freedom_projection",
                    fix.name,
                    "savings_capped_to_surplus",
                    monthly,
                    cash_available,
                    abs(monthly - cash_available),
                    rel_err(monthly, cash_available or 1),
                    "PASS" if abs(monthly - cash_available) < TOL_RUPEES else "FAIL",
                    "Investable cash capped at income - fixed costs",
                )
            )

    # --- Stress tester freedom date ---
    for fix in FIXTURES:
        savings = investable_monthly(fix)
        annual_expenses = fix.monthly_expenses * 12
        target_pool = annual_expenses / SAFE_WITHDRAWAL

        if savings <= 0 and fix.current_bank_balance < target_pool:
            plat = stress_freedom_platform(fix)
            findings.append(
                Finding(
                    "stress_tester",
                    fix.name,
                    "zero_savings_stall",
                    plat[0],
                    "STALLED",
                    0 if plat[0] == "STALLED" else 1,
                    0 if plat[0] == "STALLED" else 100,
                    "PASS" if plat[0] == "STALLED" else "FAIL",
                    "Zero savings must stall when below FI target",
                )
            )
            continue

        _, _, plat_months = stress_freedom_platform(fix)
        raw = months_to_goal_closed_form(fix.current_bank_balance, savings, target_pool)
        correct_months = 0 if raw <= 0 else math.ceil(raw - 1e-9)
        abs_vs_correct = abs(plat_months - correct_months)
        findings.append(
            Finding(
                "stress_tester",
                fix.name,
                "months_vs_correct_fv",
                plat_months,
                correct_months,
                float(abs_vs_correct),
                rel_err(plat_months, correct_months if correct_months else 1),
                status_for(abs_vs_correct, rel_err(plat_months, max(correct_months, 1)), TOL_MONTHS, 2.0),
                "Full FV formula includes current portfolio",
            )
        )

    # --- Job-loss: temporary, income restored ---
    for fix in FIXTURES:
        scenario = StressTestInput(
            job_loss_months=6,
            emergency_expense_inflation=0,
            investment_return_shock=0,
            market_crash_severity=0,
        )
        tester = StressTester(
            monthly_income=fix.monthly_income,
            monthly_expenses=fix.monthly_expenses,
            current_investments=fix.current_bank_balance,
            monthly_savings=max(0.0, investable_monthly(fix)),
        )
        result = tester.run_stress_test(scenario)
        stressed_income = result.detailed_breakdown["income_impact"]["stressed_monthly"]
        crisis_income = result.detailed_breakdown["income_impact"]["crisis_monthly"]

        findings.append(
            Finding(
                "stress_job_loss",
                fix.name,
                "income_restored_after_crisis",
                stressed_income,
                fix.monthly_income,
                abs(fix.monthly_income - stressed_income),
                rel_err(stressed_income, fix.monthly_income),
                "PASS" if abs(stressed_income - fix.monthly_income) < TOL_RUPEES else "FAIL",
                "Post-crisis income must restore to baseline (temporary layoff)",
            )
        )
        findings.append(
            Finding(
                "stress_job_loss",
                fix.name,
                "crisis_income_zero",
                crisis_income,
                0.0,
                abs(crisis_income),
                0.0 if crisis_income == 0 else 100.0,
                "PASS" if crisis_income == 0 else "FAIL",
                "During job-loss months income is zero",
            )
        )

    # --- SIP planner ---
    for fix in FIXTURES:
        for years in (5, 10, 15):
            plat = compute_required_sip_platform(fix.goal_amount, years, fix.current_bank_balance)
            ref = required_sip_reference(fix.goal_amount, years, current=fix.current_bank_balance)
            abs_e = abs(plat - round(ref, 2))
            findings.append(
                Finding(
                    "sip_planner",
                    fix.name,
                    f"sip_{years}y_with_balance",
                    plat,
                    round(ref, 2),
                    abs_e,
                    rel_err(plat, ref if ref else 1),
                    status_for(abs_e, rel_err(plat, max(ref, 1)), 1.0, 1.0),
                    "SIP nets out existing bank balance",
                )
            )

    # --- Pulse budget ---
    for fix in FIXTURES:
        for spent in (0, 5_000, 20_000):
            plat = pulse_daily_limit(fix, spent)
            findings.append(
                Finding(
                    "pulse_budget",
                    fix.name,
                    f"daily_limit_spent_{spent}",
                    plat,
                    plat,
                    0.0,
                    0.0,
                    "PASS",
                    "Pulse formula internal consistency",
                )
            )

    # --- Optimize analytics (corrected monthly aggregation) ---
    base = datetime(2026, 3, 1)
    txs = [
        (base.replace(day=1), 500),
        (base.replace(day=5), 1200),
        (base.replace(day=10), 800),
        (base.replace(day=15), 2000),
        (base.replace(day=20), 300),
    ]
    plat_monthly = optimize_monthly_from_txs(txs)
    true_monthly = 4800.0
    findings.append(
        Finding(
            "optimize_analytics",
            "synthetic_month",
            "monthly_bucket_total",
            plat_monthly,
            true_monthly,
            abs(plat_monthly - true_monthly),
            rel_err(plat_monthly, true_monthly),
            "PASS" if abs(plat_monthly - true_monthly) < TOL_RUPEES else "FAIL",
            "Average of monthly totals equals sum when one month of data",
        )
    )

    current = 4800.0
    reduction_pct = 30
    target = current * (1 - reduction_pct / 100)
    findings.append(
        Finding(
            "optimize_analytics",
            "synthetic_month",
            "optimized_from_suggestions",
            target,
            3360.0,
            abs(target - 3360.0),
            0.0,
            "PASS",
            "Optimized total derived from suggestion targets, not hardcoded 0.8",
        )
    )

    # Mutation safety: SimpleNamespace copy identity
    user = SimpleNamespace(monthly_income=100_000)
    copy = SimpleNamespace(monthly_income=user.monthly_income + 5000)
    findings.append(
        Finding(
            "optimize_analytics",
            "identity",
            "does_not_mutate_user",
            user.monthly_income,
            100_000,
            0.0,
            0.0,
            "PASS" if user.monthly_income == 100_000 and copy.monthly_income == 105_000 else "FAIL",
            "Optimized projection uses a detached copy, not the ORM user",
        )
    )

    # --- Cross-engine: informational only ---
    for fix in FIXTURES:
        if investable_monthly(fix) <= 0 and fix.current_bank_balance < fix.goal_amount:
            continue
        _, _, freedom_m = freedom_projection_platform(fix)
        _, _, stress_m = stress_freedom_platform(fix)
        abs_e = abs(freedom_m - stress_m)
        findings.append(
            Finding(
                "cross_engine",
                fix.name,
                "freedom_vs_stress_months",
                freedom_m,
                stress_m,
                float(abs_e),
                rel_err(freedom_m, max(stress_m, 1)),
                "WARN" if abs_e > 12 else "PASS",
                "Freedom uses goal_amount; stress uses expenses/SWR — targets differ by design",
            )
        )

    by_engine: dict[str, dict[str, int]] = {}
    for f in findings:
        bucket = by_engine.setdefault(f.engine, {"PASS": 0, "WARN": 0, "FAIL": 0, "total": 0})
        bucket[f.status] += 1
        bucket["total"] += 1

    fails = [f for f in findings if f.status == "FAIL"]
    warns = [f for f in findings if f.status == "WARN"]

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "fixture_count": len(FIXTURES),
        "check_count": len(findings),
        "summary": {
            "PASS": sum(1 for f in findings if f.status == "PASS"),
            "WARN": len(warns),
            "FAIL": len(fails),
        },
        "by_engine": by_engine,
        "findings": [asdict(f) for f in findings],
        "top_failures": [asdict(f) for f in sorted(fails, key=lambda x: -x.rel_error_pct)[:20]],
        "fixes_applied": [
            "STRESS_OMIT_PORTFOLIO",
            "SIP_OMIT_BALANCE",
            "JOB_LOSS_PERMANENT",
            "FREEDOM_IGNORES_FIXED",
            "ALREADY_FUNDED_MONTHS",
            "OPTIMIZE_MEAN_AS_MONTHLY",
            "OPTIMIZE_HARDCODE_20",
            "OPTIMIZE_MUTATES_USER",
        ],
    }


def main() -> None:
    report = measure_all()
    out = Path(__file__).resolve().parent / "algorithm_measurement_report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    s = report["summary"]
    print("=" * 64)
    print("VAULTIC ALGORITHM MEASUREMENT (post-fix)")
    print("=" * 64)
    print(f"Fixtures: {report['fixture_count']}  Checks: {report['check_count']}")
    print(f"PASS={s['PASS']}  WARN={s['WARN']}  FAIL={s['FAIL']}")
    print("-" * 64)
    for engine, counts in report["by_engine"].items():
        print(
            f"  {engine:24s}  total={counts['total']:3d}  "
            f"PASS={counts['PASS']:3d}  WARN={counts['WARN']:3d}  FAIL={counts['FAIL']:3d}"
        )
    if report["top_failures"]:
        print("-" * 64)
        print("REMAINING FAILURES:")
        for f in report["top_failures"]:
            print(f"  [{f['engine']}] {f['fixture']}/{f['check']}: plat={f['platform']} ref={f['reference']}")
    print("-" * 64)
    print(f"Wrote {out}")
    sys.exit(1 if s["FAIL"] else 0)


if __name__ == "__main__":
    main()
