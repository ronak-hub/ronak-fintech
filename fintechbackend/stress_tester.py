"""
Stress-Testing Math Engine for Vaultic
Calculates alternative financial timelines under various crisis scenarios.
"""

from pydantic import BaseModel, Field
from typing import Optional
import math
from datetime import datetime, timedelta
from enum import Enum


class RiskSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class StressTestInput(BaseModel):
    """Input parameters for stress testing simulation."""
    job_loss_months: int = Field(gt=0, le=24, description="Months of income loss")
    emergency_expense_inflation: float = Field(ge=0, le=100, description="Emergency expense inflation percentage")
    investment_return_shock: float = Field(ge=-50, le=50, description="Investment return shock in percentage")
    market_crash_severity: float = Field(ge=0, le=60, description="Market crash severity in percentage")


class StressTestResult(BaseModel):
    """Output of stress test simulation."""
    scenario_name: str
    baseline_exit_date: str
    stressed_exit_date: str
    months_delayed: int
    years_of_runway_lost: float
    survival_probability: float
    critical_risk: bool
    impact_severity: RiskSeverity
    detailed_breakdown: dict


def months_to_target(
    portfolio: float,
    monthly_savings: float,
    target_pool: float,
    monthly_rate: float,
) -> Optional[float]:
    """
    Months to reach target with existing principal + monthly contributions.

    Solves: P(1+r)^n + PMT*((1+r)^n - 1)/r = T
    => n = ln((T*r + PMT) / (P*r + PMT)) / ln(1+r)
    """
    if portfolio >= target_pool:
        return 0.0

    if monthly_savings <= 0:
        return None

    if monthly_rate <= 0:
        return max(0.0, (target_pool - portfolio) / monthly_savings)

    numerator = target_pool * monthly_rate + monthly_savings
    denominator = portfolio * monthly_rate + monthly_savings
    if denominator <= 0:
        return None

    ratio = numerator / denominator
    if ratio <= 1:
        return 0.0
    if ratio <= 0:
        return None

    try:
        return math.log(ratio) / math.log(1 + monthly_rate)
    except (ValueError, ZeroDivisionError):
        return None


class StressTester:
    """Mathematical engine for financial stress testing."""

    def __init__(
        self,
        monthly_income: float,
        monthly_expenses: float,
        current_investments: float,
        monthly_savings: float,
        baseline_annual_return: float = 0.12,
        safe_withdrawal_rate: float = 0.06
    ):
        self.monthly_income = max(0.0, monthly_income)
        self.monthly_expenses = max(0.0, monthly_expenses)
        self.current_investments = max(0.0, current_investments)
        self.monthly_savings = max(0.0, monthly_savings)
        self.baseline_annual_return = baseline_annual_return
        self.safe_withdrawal_rate = safe_withdrawal_rate

    def calculate_freedom_date(
        self,
        monthly_income: Optional[float] = None,
        monthly_expenses: Optional[float] = None,
        monthly_savings: Optional[float] = None,
        current_investments: Optional[float] = None,
        annual_return: Optional[float] = None
    ) -> tuple[str, float, int]:
        """
        Calculate financial independence date using compound growth with principal.

        Target = (Annual Expenses) / Safe Withdrawal Rate
        n = ln((T*r + PMT) / (P*r + PMT)) / ln(1+r)

        Returns: (exit_date_str, years_to_freedom, months_to_freedom)
        """
        expenses = monthly_expenses if monthly_expenses is not None else self.monthly_expenses
        savings = monthly_savings if monthly_savings is not None else self.monthly_savings
        portfolio = current_investments if current_investments is not None else self.current_investments
        annual_rate = annual_return if annual_return is not None else self.baseline_annual_return

        annual_expenses = expenses * 12
        target_pool = annual_expenses / self.safe_withdrawal_rate if self.safe_withdrawal_rate > 0 else float("inf")
        monthly_rate = annual_rate / 12

        raw_months = months_to_target(portfolio, savings, target_pool, monthly_rate)
        if raw_months is None:
            return "STALLED", 999, 999 * 12

        # Ceil so fractional months become a full funding month (matches iterative engines)
        months_needed = max(0, math.ceil(raw_months - 1e-9))
        years_needed = months_needed / 12.0

        exit_date = datetime.now() + timedelta(days=int(months_needed * 30.44))
        exit_date_str = exit_date.strftime("%b %Y")

        return exit_date_str, years_needed, months_needed

    def _simulate_job_loss_drawdown(
        self,
        portfolio: float,
        crisis_months: int,
        crisis_expenses: float,
        monthly_rate: float,
    ) -> tuple[float, int, bool]:
        """
        Temporary unemployment: N months of zero income while expenses continue.
        Portfolio compounds then pays expenses each month.
        Returns (portfolio_after, months_survived, depleted).
        """
        surviving = portfolio
        for month in range(crisis_months):
            surviving = surviving * (1 + monthly_rate) - crisis_expenses
            if surviving < 0:
                return 0.0, month + 1, True
        return max(0.0, surviving), crisis_months, False

    def run_stress_test(self, scenario: StressTestInput) -> StressTestResult:
        """Run stress test with temporary job loss, then restored income trajectory."""
        baseline_exit_date, baseline_years, baseline_months = self.calculate_freedom_date()

        # Emergency expense inflation during / after crisis window
        emergency_surge = self.monthly_expenses * (scenario.emergency_expense_inflation / 100)
        stressed_monthly_expenses = self.monthly_expenses + emergency_surge

        # Return shock + market crash on portfolio (immediate)
        shocked_annual_return = self.baseline_annual_return * (1 + scenario.investment_return_shock / 100)
        shocked_annual_return = max(-0.50, min(shocked_annual_return, 0.50))
        monthly_rate = shocked_annual_return / 12

        market_impact = self.current_investments * (scenario.market_crash_severity / 100)
        post_crash_portfolio = max(0.0, self.current_investments - market_impact)

        # Temporary job loss: deplete portfolio for N months with zero income
        crisis_income = 0.0
        post_crisis_portfolio, months_survived, depleted = self._simulate_job_loss_drawdown(
            portfolio=post_crash_portfolio,
            crisis_months=scenario.job_loss_months,
            crisis_expenses=stressed_monthly_expenses,
            monthly_rate=monthly_rate,
        )

        # Income and savings restore after the temporary layoff
        restored_income = self.monthly_income
        restored_savings = max(0.0, restored_income - stressed_monthly_expenses)
        if restored_savings <= 0:
            # Fall back to proportional savings if expenses exceed income after inflation
            restored_savings = max(
                0.0,
                self.monthly_savings * (restored_income / self.monthly_income if self.monthly_income > 0 else 0),
            )

        if depleted:
            stressed_exit_date, stressed_years, stressed_months = "STALLED", 999, 999 * 12
        else:
            # Crisis months already elapsed — add them to the remaining FI timeline
            remaining_exit, remaining_years, remaining_months = self.calculate_freedom_date(
                monthly_income=restored_income,
                monthly_expenses=stressed_monthly_expenses,
                monthly_savings=restored_savings,
                current_investments=post_crisis_portfolio,
                annual_return=shocked_annual_return,
            )
            if remaining_exit == "STALLED":
                stressed_exit_date, stressed_years, stressed_months = remaining_exit, remaining_years, remaining_months
            else:
                stressed_months = scenario.job_loss_months + remaining_months
                stressed_years = stressed_months / 12.0
                exit_date = datetime.now() + timedelta(days=int(stressed_months * 30.44))
                stressed_exit_date = exit_date.strftime("%b %Y")

        months_delayed = max(0, stressed_months - baseline_months)
        years_of_runway_lost = months_delayed / 12.0

        # Survival: can portfolio fund crisis-period expenses (zero income)?
        crisis_shortfall = stressed_monthly_expenses - crisis_income
        if crisis_shortfall <= 0:
            survival_probability = 1.0
        elif post_crash_portfolio <= 0:
            survival_probability = 0.0
        else:
            # How many crisis months the post-crash portfolio covers
            covered = months_survived if depleted else scenario.job_loss_months
            survival_probability = max(0.0, min(1.0, covered / max(1, scenario.job_loss_months)))
            if depleted:
                survival_probability = max(0.0, min(1.0, (months_survived - 1) / max(1, scenario.job_loss_months)))

        if years_of_runway_lost > 5 or survival_probability < 0.3 or depleted:
            severity = RiskSeverity.CRITICAL
            critical_risk = True
        elif years_of_runway_lost > 2 or survival_probability < 0.6:
            severity = RiskSeverity.HIGH
            critical_risk = False
        elif years_of_runway_lost > 1:
            severity = RiskSeverity.MEDIUM
            critical_risk = False
        else:
            severity = RiskSeverity.LOW
            critical_risk = False

        breakdown = {
            "income_impact": {
                "baseline_monthly": self.monthly_income,
                # Restored after temporary layoff (not a permanent cut)
                "stressed_monthly": restored_income,
                "crisis_monthly": crisis_income,
                "job_loss_months": scenario.job_loss_months,
                "loss_amount": self.monthly_income - crisis_income,
            },
            "expense_impact": {
                "baseline_monthly": self.monthly_expenses,
                "stressed_monthly": stressed_monthly_expenses,
                "emergency_surge": emergency_surge,
            },
            "portfolio_impact": {
                "baseline_value": self.current_investments,
                "post_crash_value": post_crash_portfolio,
                "post_crisis_value": post_crisis_portfolio,
                "stressed_value": post_crisis_portfolio,
                "loss_amount": market_impact,
                "loss_percentage": scenario.market_crash_severity,
                "depleted_during_job_loss": depleted,
                "months_survived": months_survived,
            },
            "investment_impact": {
                "baseline_annual_return": self.baseline_annual_return,
                "stressed_annual_return": shocked_annual_return,
                "return_shock": scenario.investment_return_shock,
            },
            "savings_impact": {
                "baseline_monthly": self.monthly_savings,
                "stressed_monthly": restored_savings,
                "crisis_monthly": 0.0,
                "reduction": self.monthly_savings - restored_savings,
            },
        }

        return StressTestResult(
            scenario_name=(
                f"Job Loss ({scenario.job_loss_months}mo) + "
                f"Emergency Inflation ({scenario.emergency_expense_inflation}%) + "
                f"Market Shock ({scenario.market_crash_severity}%)"
            ),
            baseline_exit_date=baseline_exit_date,
            stressed_exit_date=stressed_exit_date,
            months_delayed=months_delayed,
            years_of_runway_lost=years_of_runway_lost,
            survival_probability=survival_probability,
            critical_risk=critical_risk,
            impact_severity=severity,
            detailed_breakdown=breakdown,
        )


def validate_stress_parameters(scenario: StressTestInput) -> bool:
    """Validate stress test parameters to ensure they're within acceptable ranges."""
    validations = [
        (0 < scenario.job_loss_months <= 24, "Job loss duration must be 1-24 months"),
        (0 <= scenario.emergency_expense_inflation <= 100, "Emergency inflation must be 0-100%"),
        (-50 <= scenario.investment_return_shock <= 50, "Investment shock must be -50% to +50%"),
        (0 <= scenario.market_crash_severity <= 60, "Market crash must be 0-60%"),
    ]

    for is_valid, message in validations:
        if not is_valid:
            raise ValueError(message)

    return True
