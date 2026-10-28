"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { getAuthToken } from '@/lib/cookies';
import { persistWizardData, readStoredWizardData } from '@/lib/finance';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type TravelDestination = {
  continent: string;
  country: string;
  minBudget: number;
  avgDaily: number;
  recommendedDays: number;
  flightCost: number;
  accommodations: number;
  food: number;
  experiences: number;
  highlights: string[];
};

const stableSeedFromString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
};

const stableRandomFromSeed = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

// Generate a broad set of destinations (~195 UN member states) with deterministic heuristic budgets
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
  'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

const continentSets: Record<string, Set<string>> = {
  Europe: new Set(['Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Kosovo','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland','Portugal','Romania','Russia','San Marino','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Ukraine','United Kingdom','Vatican City']),
  Asia: new Set(['Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei','Cambodia','China','Georgia','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Malaysia','Maldives','Mongolia','Myanmar','Nepal','North Korea','Oman','Pakistan','Palau','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Tajikistan','Thailand','Timor-Leste','Turkey','Turkmenistan','United Arab Emirates','Uzbekistan','Vietnam','Yemen']),
  Africa: new Set(['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon','Central African Republic','Chad','Comoros','Congo','Democratic Republic of the Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe']),
  Americas: new Set(['Antigua and Barbuda','Argentina','Bahamas','Barbados','Belize','Bolivia','Brazil','Canada','Chile','Colombia','Costa Rica','Cuba','Dominica','Dominican Republic','Ecuador','El Salvador','Grenada','Guatemala','Guyana','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Paraguay','Peru','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Suriname','Trinidad and Tobago','United States','Uruguay','Venezuela','Argentina','Brazil','Chile','Costa Rica']),
  Oceania: new Set(['Australia','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','New Zealand','Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu'])
};

const continentBaseMin: Record<string, number> = {
  Europe: 200000,
  Asia: 120000,
  Africa: 100000,
  Americas: 220000,
  Oceania: 260000,
  Other: 150000,
};

const TRAVEL_DESTINATIONS: TravelDestination[] = COUNTRIES.map((country) => {
  let continent = 'Other';
  for (const [cname, set] of Object.entries(continentSets)) {
    if (set.has(country)) {
      continent = cname;
      break;
    }
  }

  const base = continentBaseMin[continent] ?? continentBaseMin.Other;
  const rand = stableRandomFromSeed(stableSeedFromString(country));
  const randFactor = 0.85 + rand() * 0.5; // 0.85 - 1.35
  const recommendedDays = Math.round(5 + rand() * 10);
  const avgDaily = Math.round((base / Math.max(1, recommendedDays)) * (0.06 + rand() * 0.1));
  const minBudget = Math.round(base * randFactor);

  // Derive a simple cost breakdown so chart code never reads undefined
  const flightCost = Math.max(20000, Math.round(minBudget * 0.28));
  const accommodations = Math.max(30000, Math.round(minBudget * 0.38));
  const food = Math.max(8000, Math.round(minBudget * 0.14));
  const experiences = Math.max(8000, Math.round(minBudget * 0.2));
  const highlights = [
    `${country} highlights`,
    `Approx ${recommendedDays} day trip`,
    `Estimated avg ₹${avgDaily}/day`,
  ];

  return {
    continent,
    country,
    minBudget,
    avgDaily,
    recommendedDays,
    flightCost,
    accommodations,
    food,
    experiences,
    highlights,
  };
});

const GOAL_DEFINITIONS: Record<string, { title: string; shortTitle: string; subtitle: string; description: string; benefit: string; }> = {
  'financial-freedom': {
    title: 'FIRE / Freedom',
    shortTitle: 'Financial Freedom',
    subtitle: 'Build a plan where your money works for you, not the other way around.',
    description: 'Financial Freedom means your monthly income and savings cover your living costs, so you can choose work on your own terms. This page helps you verify that the income, expenses, and savings you entered actually support that path.',
    benefit: 'You will see whether your current cash flow supports a freedom timeline and where to focus your savings or expenses to make it real.',
  },
  'luxury-travel': {
    title: 'World Tour',
    shortTitle: 'Luxury Travel',
    subtitle: 'Turn your savings goal into a travel plan with real numbers and checkpoints.',
    description: 'Luxury Travel is about funding meaningful trips without debt. We use your income and expense inputs to show how much monthly savings you need to keep your journey on track.',
    benefit: 'You can verify whether your current budget will support the kind of travel you want and adjust your plan before committing.',
  },
  'elite-asset': {
    title: 'Real Estate / Car',
    shortTitle: 'Elite Asset',
    subtitle: 'Use your current financial profile to check whether you can afford a major asset goal sooner.',
    description: 'Elite Asset means saving for a large purchase like a home or car in a way that does not derail your monthly safety net. This page uses your inputs to show the gap between your plan and the asset target.',
    benefit: 'You will understand how much of your income is being reserved for the asset goal and how much is left for daily living.',
  },
  'special-commodities': {
    title: 'Special Commodities',
    shortTitle: 'Special Commodities',
    subtitle: 'Compare premium investment categories like real estate, luxury cars, and collectibles.',
    description: 'Special Commodities are high-value, non-traditional investments that include real estate, luxury vehicles, rare art, precision watches, and other premium assets. This page helps you explore the categories and see how your current savings profile aligns with these options.',
    benefit: 'You will get a quick view of which special commodities align with your money profile and what it takes to prepare for one of these asset classes without sacrificing your safety net.',
  },
};

type WizardInputs = {
  monthly_income?: string | number;
  fixed_expenses?: string | number;
  bank_balance?: string | number;
  target_savings_rate?: string | number;
  savings_amount?: string | number;
  primary_goal?: string;
  goal_amount?: string | number;
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inputs, setInputs] = useState<WizardInputs | null>(null);
  const [customSavingsInput, setCustomSavingsInput] = useState('');
  const [customInvestmentInput, setCustomInvestmentInput] = useState('');
  const [customGoalAmountInput, setCustomGoalAmountInput] = useState('');
  const [customTravelBudgetInput, setCustomTravelBudgetInput] = useState('');

  const parseNumberInput = (value: string) => {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const persistGoalSelection = (override: Record<string, unknown> = {}) => {
    if (typeof globalThis.window === 'undefined') return;
    const stored = readStoredWizardData() ?? {};

    const merged = {
      ...stored,
      primary_goal: goal.shortTitle,
      ...override,
    };

    persistWizardData(merged as Record<string, unknown>, 3);
    setInputs({ ...(inputs ?? {}), ...(merged as WizardInputs) } as WizardInputs);
    // Also attempt to persist the important fields to the backend (best-effort).
    // Prepare numeric values safely and avoid throwing in environments without fetch
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
      const token = getAuthToken();
      const payload: Record<string, unknown> = {};
      if (merged.savings_amount !== undefined) payload.savings_amount = Number(merged.savings_amount);
      if (merged.goal_amount !== undefined) payload.goal_amount = Number(merged.goal_amount);
      if (merged.monthly_income !== undefined) payload.monthly_income = Number(merged.monthly_income);
      // Only call backend if we have something meaningful to persist
      if (typeof fetch !== 'undefined' && Object.keys(payload).length > 0) {
        void (async () => {
          try {
            await fetch(`${apiBase}/user/setup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            // network/save errors are best-effort in dev; ignore
          }
        })();
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    const stored = readStoredWizardData();
    if (!stored) return;

    setTimeout(() => setInputs(stored as WizardInputs), 0);
  }, []);

  // Fetch server-side profile/goal data and populate inputs (best-effort)
  useEffect(() => {
    (async () => {
      try {
        const token = getAuthToken();
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
        const res = await fetch(`${apiBase}/dashboard/summary`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) return;
        const json = await res.json();
        const profile = json.user_profile ?? {};
        const storedInputs = readStoredWizardData() ?? {};
        const wizardSnapshot = profile.wizard_snapshot ?? {};
        const serverInputs: WizardInputs = {
          monthly_income: wizardSnapshot.monthly_income ?? profile.monthly_income ?? profile.monthlyIncome ?? storedInputs.monthly_income,
          fixed_expenses: wizardSnapshot.fixed_expenses ?? profile.rent ?? profile.fixed_expenses ?? storedInputs.fixed_expenses,
          bank_balance: wizardSnapshot.bank_balance ?? profile.current_bank_balance ?? profile.currentBankBalance ?? storedInputs.bank_balance,
          target_savings_rate: wizardSnapshot.target_savings_rate ?? profile.target_savings_rate ?? profile.targetSavingsRate ?? storedInputs.target_savings_rate,
          savings_amount: wizardSnapshot.savings_amount ?? profile.savings_amount ?? storedInputs.savings_amount,
          primary_goal: wizardSnapshot.primary_goal ?? profile.primary_goal ?? storedInputs.primary_goal,
          goal_amount: wizardSnapshot.goal_amount ?? profile.goal_amount ?? profile.goalAmount ?? storedInputs.goal_amount,
        };
        const merged = { ...storedInputs, ...Object.fromEntries(Object.entries(serverInputs).filter(([, value]) => value !== undefined && value !== null && value !== '')) };
        setInputs(merged as WizardInputs);
        persistWizardData(merged as Record<string, unknown>, 3);
      } catch (e) {
        // best-effort only
      }
    })();
  }, []);

  const rawGoal = params?.goal;
  const goalKey = typeof rawGoal === 'string' ? rawGoal.toLowerCase() : 'financial-freedom';
  const goal = GOAL_DEFINITIONS[goalKey] ?? GOAL_DEFINITIONS['financial-freedom'];
  const goalTitle = goal.title;
  const breadcrumb = goal.shortTitle;

  const monthlyIncome = Number(inputs?.monthly_income || 0);
  const fixedExpenses = Number(inputs?.fixed_expenses || 0);
  const savingsAmount = Number(inputs?.savings_amount || 0);
  const goalAmount = Number(inputs?.goal_amount || 0);
  const customSavings = parseNumberInput(customSavingsInput);
  const customInvestmentBudget = parseNumberInput(customInvestmentInput);
  const customGoalAmount = parseNumberInput(customGoalAmountInput);
  const customTravelBudget = parseNumberInput(customTravelBudgetInput);

  const effectiveSavingsAmount = customSavings ?? savingsAmount;
  const effectiveGoalAmount = customGoalAmount ?? goalAmount;
  const effectiveInvestmentBudget = customInvestmentBudget ?? Math.max(0, Math.round(effectiveSavingsAmount * 0.5));
  const effectiveSafeSpend = Math.max(monthlyIncome - fixedExpenses - effectiveSavingsAmount, 0);
  const coveredRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - fixedExpenses) / monthlyIncome) * 100) : 0;
  const canContinue = monthlyIncome > 0;

  const continents = Array.from(new Set(TRAVEL_DESTINATIONS.map((dest) => dest.continent)));
  const defaultContinent = continents[0] ?? 'Europe';
  const defaultCountry = TRAVEL_DESTINATIONS.find((dest) => dest.continent === defaultContinent)?.country ?? TRAVEL_DESTINATIONS[0].country;

  const [selectedContinent, setSelectedContinent] = useState<string>(defaultContinent);
  const [selectedCountry, setSelectedCountry] = useState<string>(defaultCountry);
  const [customDestination, setCustomDestination] = useState<string>('');

  const continentCountries = TRAVEL_DESTINATIONS.filter((dest) => dest.continent === selectedContinent);
  const selectedDestination = continentCountries.find((dest) => dest.country === selectedCountry) ?? continentCountries[0] ?? TRAVEL_DESTINATIONS[0];

  const customDestinationName = customDestination.trim();
  const customDestinationEstimate = customDestinationName
    ? {
        continent: selectedContinent,
        country: customDestinationName,
        minBudget: Math.max(220000, Math.round(Math.max(effectiveSavingsAmount, monthlyIncome * 0.25))),
        avgDaily: Math.max(18000, Math.round(Math.max(effectiveSavingsAmount / 7, monthlyIncome * 0.08))),
        recommendedDays: 8,
        flightCost: Math.max(70000, Math.round(Math.max(effectiveSavingsAmount * 0.35, monthlyIncome * 0.2))),
        accommodations: Math.max(70000, Math.round(Math.max(effectiveSavingsAmount * 0.25, monthlyIncome * 0.2))),
        food: Math.max(25000, Math.round(Math.max(effectiveSavingsAmount * 0.15, monthlyIncome * 0.08))),
        experiences: Math.max(25000, Math.round(Math.max(effectiveSavingsAmount * 0.15, monthlyIncome * 0.08))),
        highlights: ['Custom travel destination', 'Use this estimate as a planning guide', 'Refine your budget with actual local pricing'],
      }
    : null;

  const effectiveDestination = customDestinationEstimate ?? selectedDestination;

  const handleContinentSelect = (continent: string) => {
    const firstCountry = TRAVEL_DESTINATIONS.find((dest) => dest.continent === continent)?.country;
    setSelectedContinent(continent);
    if (firstCountry) {
      setSelectedCountry(firstCountry);
    }
    setCustomDestination('');
  };

  const travelBudget = effectiveDestination.minBudget;
  const effectiveTravelBudget = customTravelBudget ?? travelBudget;
  const travelMonthsToSave = effectiveSavingsAmount > 0 ? Math.ceil(effectiveTravelBudget / effectiveSavingsAmount) : 0;
  const travelGoalProgress = effectiveTravelBudget > 0 ? Math.min(100, Math.round((effectiveSavingsAmount * 12 * 100) / effectiveTravelBudget)) : 0;

  const travelGraphData = useMemo(() => {
    const months = 6;
    const base = Math.max(effectiveSavingsAmount, Math.round(monthlyIncome * 0.2));
    return Array.from({ length: months }, (_, index) => {
      const saved = base * (index + 1);
      return {
        name: `M${index + 1}`,
        saved,
        needed: effectiveTravelBudget,
        percent: effectiveTravelBudget > 0 ? Math.min(100, Math.round((saved / effectiveTravelBudget) * 100)) : 0,
      };
    });
  }, [effectiveTravelBudget, effectiveSavingsAmount, monthlyIncome]);

  const travelAllocation = [
    { name: 'Flights', value: effectiveDestination.flightCost, fill: '#F59E0B' },
    { name: 'Stay', value: effectiveDestination.accommodations, fill: '#22C55E' },
    { name: 'Food', value: effectiveDestination.food, fill: '#38BDF8' },
    { name: 'Experiences', value: effectiveDestination.experiences, fill: '#A78BFA' },
  ];

  const formattedValue = (value: number) => `₹${value.toLocaleString('en-IN')}`;

  const allocationData = [
    { name: 'Expenses', value: fixedExpenses, fill: '#F97316' },
    { name: 'Savings', value: effectiveSavingsAmount, fill: '#38BDF8' },
    { name: 'Safe spend', value: effectiveSafeSpend, fill: '#22C55E' },
  ];

  const specialCommodityOptions = [
    {
      name: 'Real Estate',
      description: 'Residential or commercial properties with long-term appreciation and rental income potential.',
      entry: '₹25L+',
      horizon: '5–15 years',
      risk: 'Moderate',
    },
    {
      name: 'Luxury Cars',
      description: 'Rare or collectible vehicles that can hold value as a prestige asset and lifestyle investment.',
      entry: '₹20L+',
      horizon: '3–10 years',
      risk: 'Moderate to High',
    },
    {
      name: 'Fine Art',
      description: 'Museum-quality works, limited editions, and blue-chip pieces that may appreciate over time.',
      entry: '₹10L+',
      horizon: '5–20 years',
      risk: 'High',
    },
    {
      name: 'Vintage Watches',
      description: 'Iconic timepieces from top brands that can become scarce and collectable with time.',
      entry: '₹5L+',
      horizon: '3–12 years',
      risk: 'Moderate',
    },
    {
      name: 'Rare Metals',
      description: 'Physical gold, platinum, or palladium holdings that serve as hard assets and inflation hedge.',
      entry: '₹2L+',
      horizon: '1–10 years',
      risk: 'Low to Moderate',
    },
    {
      name: 'Collectible Wine',
      description: 'Vintage spirits and wines that gain value through rarity, provenance, and aging.',
      entry: '₹3L+',
      horizon: '5–15 years',
      risk: 'High',
    },
  ];

  const SPECIAL_ENTRY_DEFAULTS: Record<string, number> = {
    'Real Estate': 2500000,
    'Luxury Cars': 2000000,
    'Fine Art': 1000000,
    'Vintage Watches': 500000,
    'Rare Metals': 200000,
    'Collectible Wine': 300000,
  };

  const [selectedSpecialCommodity, setSelectedSpecialCommodity] = useState<string>(specialCommodityOptions[0].name);
  const [customCommodityValueInput, setCustomCommodityValueInput] = useState('');

  const parsedCustomCommodity = parseNumberInput(customCommodityValueInput);
  const effectiveCommodityValue = parsedCustomCommodity ?? (SPECIAL_ENTRY_DEFAULTS[selectedSpecialCommodity] ?? 0);

  const specialReserve = Math.max(200000, Math.round(Math.max(effectiveInvestmentBudget, monthlyIncome * 0.3)));

  const goalProgress = effectiveGoalAmount > 0 ? Math.min(100, Math.round((effectiveSavingsAmount * 12 * 100) / effectiveGoalAmount)) : 0;
  const goalTimelineMonths = effectiveSavingsAmount > 0 ? Math.ceil(effectiveGoalAmount / effectiveSavingsAmount) : 0;
  const goalYears = goalTimelineMonths > 0 ? Math.max(0, Math.floor(goalTimelineMonths / 12)) : 0;
  const goalMonthsRemainder = goalTimelineMonths > 0 ? goalTimelineMonths % 12 : 0;

  const [chartMode, setChartMode] = useState<'monthly' | 'annual'>('monthly');

  const monthlySavingsRef = useRef<HTMLInputElement | null>(null);

  const suggestedSavings = Math.max(15000, Math.round(monthlyIncome * 0.2));

  const applySuggestedSavings = (amount: number) => {
    if (typeof globalThis.window === 'undefined') return;
    try {
      const stored = readStoredWizardData() ?? {};
      const merged = { ...stored, savings_amount: amount };
      persistWizardData(merged as Record<string, unknown>, 3);
      setCustomSavingsInput(String(amount));
      setInputs({ ...(inputs ?? {}), ...(merged as Record<string, unknown>) } as WizardInputs);
      // focus the input so user can tweak if desired
      setTimeout(() => monthlySavingsRef.current?.focus(), 50);
    } catch {
      // ignore
    }
  };

  const projectionData = useMemo(() => {
    const months = chartMode === 'monthly' ? 6 : 4;
    const monthlyTarget = Math.max(effectiveSavingsAmount, Math.round(monthlyIncome * 0.2));
    const periodIncome = chartMode === 'monthly' ? monthlyIncome : monthlyIncome * 12;
    const periodExpenses = chartMode === 'monthly' ? fixedExpenses : fixedExpenses * 12;
    const periodSavings = chartMode === 'monthly' ? monthlyTarget : monthlyTarget * 12;

    let cumulativeIncome = 0;
    let cumulativeExpenses = 0;
    let cumulativeSavings = 0;

    return Array.from({ length: months }, (_, index) => {
      cumulativeIncome += periodIncome;
      cumulativeExpenses += periodExpenses;
      cumulativeSavings += periodSavings;
      const pointName = chartMode === 'monthly' ? `M${index + 1}` : `Y${index + 1}`;
      return {
        name: pointName,
        income: cumulativeIncome,
        expenses: cumulativeExpenses,
        savings: cumulativeSavings,
        goalShare: effectiveGoalAmount > 0 ? Math.min(100, Math.round((cumulativeSavings / effectiveGoalAmount) * 100)) : 0,
      };
    });
  }, [chartMode, effectiveSavingsAmount, effectiveGoalAmount, fixedExpenses, monthlyIncome]);

  
  return (
    <div className="min-h-screen bg-vaultic-black text-vaultic-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <button
          type="button"
          onClick={() => router.push('/dashboard?wizardStep=3')}
          className="inline-flex items-center gap-2 rounded-full border border-vaultic-border/70 bg-vaultic-black/80 px-4 py-3 text-xs uppercase tracking-[0.35em] text-vaultic-orange transition hover:bg-vaultic-orange/10"
        >
          <ArrowLeft size={16} /> Back to goal selection
        </button>

        <section className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/75 p-6 sm:p-8 shadow-[0_0_60px_rgba(var(--accent-rgb),0.16)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Goal verification</p>
              <h1 className="mt-4 text-4xl font-black text-vaultic-cream">{goalTitle}</h1>
              <p className="mt-3 text-sm leading-7 text-vaultic-slate">{goal.subtitle}</p>
            </div>
            <div className="rounded-[1.75rem] border border-vaultic-orange/30 bg-vaultic-ink/70 p-4 text-center">
              <p className="mt-3 text-xs uppercase tracking-[0.35em] text-vaultic-muted">Based on your numbers</p>
              <p className="mt-2 text-3xl font-black text-vaultic-mint">{formattedValue(monthlyIncome)}</p>
              <p className="mt-2 text-xs text-vaultic-slate">Income captured for this goal</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-vaultic-border/40 bg-vaultic-black/60 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Adjust values</p>
            <p className="mt-2 text-sm text-vaultic-slate">Quickly override the values used across this page. Click Save to persist to your profile.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <p className="text-[10px] uppercase tracking-[0.25em] text-vaultic-muted">Monthly savings</p>
                <input
                  type="text"
                  inputMode="numeric"
                  ref={monthlySavingsRef}
                  value={customSavingsInput}
                  onChange={(e) => setCustomSavingsInput(e.target.value)}
                  placeholder={formattedValue(effectiveSavingsAmount)}
                  className="mt-2 w-full rounded-2xl border border-vaultic-border/60 bg-transparent px-3 py-2 text-sm text-vaultic-cream outline-none"
                />
              </label>

              <label className="block">
                <p className="text-[10px] uppercase tracking-[0.25em] text-vaultic-muted">Investment reserve</p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customInvestmentInput}
                  onChange={(e) => setCustomInvestmentInput(e.target.value)}
                  placeholder={formattedValue(effectiveInvestmentBudget)}
                  className="mt-2 w-full rounded-2xl border border-vaultic-border/60 bg-transparent px-3 py-2 text-sm text-vaultic-cream outline-none"
                />
              </label>

              <label className="block">
                <p className="text-[10px] uppercase tracking-[0.25em] text-vaultic-muted">Goal amount</p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customGoalAmountInput}
                  onChange={(e) => setCustomGoalAmountInput(e.target.value)}
                  placeholder={formattedValue(effectiveGoalAmount)}
                  className="mt-2 w-full rounded-2xl border border-vaultic-border/60 bg-transparent px-3 py-2 text-sm text-vaultic-cream outline-none"
                />
              </label>

              <label className="block">
                <p className="text-[10px] uppercase tracking-[0.25em] text-vaultic-muted">Travel budget</p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customTravelBudgetInput}
                  onChange={(e) => setCustomTravelBudgetInput(e.target.value)}
                  placeholder={formattedValue(travelBudget)}
                  className="mt-2 w-full rounded-2xl border border-vaultic-border/60 bg-transparent px-3 py-2 text-sm text-vaultic-cream outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof globalThis.window === 'undefined') return;
                  const stored = readStoredWizardData() ?? {};
                  const merged = {
                    ...stored,
                    ...(parseNumberInput(customSavingsInput) !== undefined ? { savings_amount: parseNumberInput(customSavingsInput) } : {}),
                    ...(parseNumberInput(customInvestmentInput) !== undefined ? { investment_budget: parseNumberInput(customInvestmentInput) } : {}),
                    ...(parseNumberInput(customGoalAmountInput) !== undefined ? { goal_amount: parseNumberInput(customGoalAmountInput) } : {}),
                    ...(parseNumberInput(customTravelBudgetInput) !== undefined ? { travel_budget: parseNumberInput(customTravelBudgetInput) } : {}),
                  };

                  persistWizardData(merged as Record<string, unknown>, 3);
                  setInputs({ ...(inputs ?? {}), ...(merged as Record<string, unknown>) } as WizardInputs);
                }}
                className="rounded-full bg-vaultic-orange px-4 py-2 text-sm font-semibold text-black"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomSavingsInput('');
                  setCustomInvestmentInput('');
                  setCustomGoalAmountInput('');
                  setCustomTravelBudgetInput('');
                  if (typeof globalThis.window === 'undefined') return;
                  const stored = readStoredWizardData();
                  if (!stored) return;
                  try {
                    const parsed = { ...stored } as Record<string, unknown>;
                    delete parsed.savings_amount;
                    delete parsed.investment_budget;
                    delete parsed.goal_amount;
                    delete parsed.travel_budget;
                    persistWizardData(parsed, 3);
                    setInputs(parsed as WizardInputs);
                  } catch {
                    // ignore
                  }
                }}
                className="rounded-full border border-vaultic-border/60 px-4 py-2 text-sm text-vaultic-cream"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/80 p-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Fixed expenses</p>
              <p className="mt-3 text-2xl font-black text-vaultic-orange">{formattedValue(fixedExpenses)}</p>
              <p className="mt-2 text-xs text-vaultic-slate">Monthly bills, rent, EMI and insurance.</p>
            </div>
            <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/80 p-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Savings plan</p>
              <p className="mt-3 text-2xl font-black text-vaultic-cyan">{formattedValue(effectiveSavingsAmount)}</p>
              <p className="mt-2 text-xs text-vaultic-slate">Current amount reserved each month.</p>
            </div>
            <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/80 p-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Safe spend</p>
              <p className="mt-3 text-2xl font-black text-vaultic-mint">{formattedValue(effectiveSafeSpend)}</p>
              <p className="mt-2 text-xs text-vaultic-slate">What remains after bills and savings.</p>
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/80 p-6">
            <p className="text-sm leading-7 text-vaultic-slate">{goal.description}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-vaultic-black/70 border border-vaultic-border p-5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Goal amount</p>
                <p className="mt-3 text-2xl font-black text-vaultic-cream">{formattedValue(effectiveGoalAmount)}</p>
              </div>
              <div className="rounded-3xl bg-vaultic-black/70 border border-vaultic-border p-5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Income coverage</p>
                <p className="mt-3 text-2xl font-black text-vaultic-mint">{coveredRate}%</p>
                <p className="mt-2 text-xs text-vaultic-slate">Percent of income left after expenses.</p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-7 text-vaultic-slate">{goal.benefit}</p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_0.8fr]">
            <div className="rounded-[2rem] border border-vaultic-border/50 bg-vaultic-black/80 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Interactive projection</p>
                  <h2 className="mt-2 text-2xl font-black text-vaultic-cream">Your cash flow path</h2>
                </div>
                <div className="inline-flex rounded-full border border-vaultic-border bg-vaultic-black/70 p-1">
                  <button
                    type="button"
                    onClick={() => setChartMode('monthly')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${chartMode === 'monthly' ? 'bg-vaultic-orange text-black' : 'text-vaultic-muted hover:text-white'}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('annual')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${chartMode === 'annual' ? 'bg-vaultic-orange text-black' : 'text-vaultic-muted hover:text-white'}`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-[1.75rem] bg-vaultic-ink/70 p-4">
                <div className="mb-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-vaultic-black/70 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Goal progress</p>
                    <p className="mt-3 text-3xl font-black text-vaultic-mint">{goalProgress}%</p>
                  </div>
                  <div className="rounded-3xl bg-vaultic-black/70 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Target timeline</p>
                    <p className="mt-3 text-3xl font-black text-vaultic-cream">{goalYears}y {goalMonthsRemainder}m</p>
                  </div>
                  <div className="rounded-3xl bg-vaultic-black/70 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Monthly outlook</p>
                    <p className="mt-3 text-3xl font-black text-vaultic-cyan">{formattedValue(Math.max(effectiveSavingsAmount, Math.round(monthlyIncome * 0.2)))}</p>
                  </div>
                </div>

                <div className="h-72 rounded-[1.5rem] bg-vaultic-black/60 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0F172A" />
                      <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
                      <YAxis tick={{ fill: '#94A3B8' }} />
                      <Tooltip
                        wrapperStyle={{ background: '#061015', borderRadius: 10 }}
                        formatter={(value: unknown, name?: unknown) => {
                          const v = Number(value as unknown as number) || 0;
                          const n = String(name ?? '');
                          return [`₹${v.toLocaleString('en-IN')}`, n === 'goalShare' ? 'Goal %' : n === 'savings' ? 'Savings' : n === 'expenses' ? 'Expenses' : 'Income'];
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#94A3B8' }} />
                      <Line type="monotone" dataKey="income" name="Income" stroke="#22C55E" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#F97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="savings" name="Savings" stroke="#38BDF8" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-vaultic-border/50 bg-vaultic-black/80 p-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Allocation snapshot</p>
              <h2 className="mt-2 text-2xl font-black text-vaultic-cream">Where your monthly money goes</h2>
              <p className="mt-3 text-sm leading-6 text-vaultic-slate">The pie chart shows how your fixed bills and savings split your income. This helps you see whether you are saving enough for the goal.</p>

              <div className="mt-6 rounded-[1.75rem] bg-vaultic-black/60 p-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={90}
                        paddingAngle={6}
                        label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
                      >
                        {allocationData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip wrapperStyle={{ background: '#061015', borderRadius: 10 }} formatter={(value: unknown, name?: unknown) => [`₹${Number(value as unknown as number) || 0}`, String(name ?? 'Allocation')]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {goalKey === 'luxury-travel' && (
            <div className="mt-8 space-y-6 rounded-[2rem] border border-vaultic-border/50 bg-vaultic-black/80 p-6">
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Travel planning</p>
                <h2 className="text-2xl font-black text-vaultic-cream">World Tour by continent</h2>
                <p className="text-sm leading-6 text-vaultic-slate">Choose a region and then a destination to see how your savings plan supports the trip, with a destination-level budget breakdown and projected saving progress.</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold uppercase tracking-[0.25em] text-vaultic-muted" htmlFor="custom-destination">
                  Prefer a specific destination?
                </label>
                <input
                  id="custom-destination"
                  value={customDestination}
                  onChange={(event) => setCustomDestination(event.target.value)}
                  placeholder="Type a country, city or region you want to visit"
                  className="w-full rounded-3xl border border-vaultic-border/70 bg-vaultic-black/80 px-4 py-3 text-sm text-vaultic-cream outline-none transition focus:border-vaultic-orange/70 focus:ring-2 focus:ring-vaultic-orange/20"
                />
                {customDestinationName ? (
                  <>
                    <p className="text-xs text-vaultic-slate">Using your custom destination: <span className="font-semibold text-vaultic-cream">{customDestinationName}</span>. This will override the preset destination estimate.</p>
                    <p className="text-xs text-vaultic-slate/80">This estimate is a starting point. Refine it with local flight, stay, and experience pricing for the exact trip you want.</p>
                  </>
                ) : (
                  <p className="text-xs text-vaultic-slate">Or select a preset destination card below to see curated budgets.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {continents.map((continent) => (
                  <button
                    key={continent}
                    type="button"
                    onClick={() => handleContinentSelect(continent)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${selectedContinent === continent ? 'border-vaultic-orange bg-vaultic-orange/10 text-vaultic-cream' : 'border-vaultic-border text-vaultic-muted hover:border-vaultic-cream hover:text-white'}`}
                  >
                    {continent}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {continentCountries.map((destination) => (
                  <button
                    key={destination.country}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(destination.country);
                      setCustomDestination('');
                    }}
                    className={`rounded-[1.5rem] border p-4 text-left transition ${selectedCountry === destination.country ? 'border-vaultic-orange bg-vaultic-orange/5 text-vaultic-cream' : 'border-vaultic-border bg-vaultic-black/70 text-vaultic-slate hover:border-vaultic-cream hover:text-white'}`}
                  >
                    <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">{destination.continent}</p>
                    <p className="mt-2 text-xl font-black">{destination.country}</p>
                    <p className="mt-3 text-sm leading-6 text-vaultic-slate">Approx. {destination.recommendedDays} days · ₹{destination.avgDaily.toLocaleString('en-IN')} / day</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_0.8fr]">
                <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/70 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Selected destination</p>
                      <h3 className="mt-2 text-2xl font-black text-vaultic-cream">{effectiveDestination.country}</h3>
                    </div>
                    <div className="rounded-full bg-vaultic-ink/70 px-4 py-2 text-xs uppercase tracking-[0.25em] text-vaultic-muted">{effectiveDestination.recommendedDays} days</div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Trip budget</p>
                      <p className="mt-3 text-3xl font-black text-vaultic-mint">{formattedValue(effectiveDestination.minBudget)}</p>
                      <p className="mt-2 text-xs text-vaultic-slate">Total cost for flights, stay, food and experiences.</p>
                    </div>
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Projected savings</p>
                      <p className="mt-3 text-3xl font-black text-vaultic-cream">{formattedValue(Math.max(effectiveSavingsAmount, Math.round(monthlyIncome * 0.2)))}</p>
                      <p className="mt-2 text-xs text-vaultic-slate">Suggested monthly travel reserve.</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Flight + stay</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-orange">{formattedValue(effectiveDestination.flightCost + effectiveDestination.accommodations)}</p>
                    </div>
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Food + experiences</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-cyan">{formattedValue(effectiveDestination.food + effectiveDestination.experiences)}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/80 p-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Destination highlights</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-vaultic-slate">
                      {effectiveDestination.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-vaultic-orange" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6 rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/70 p-5">
                  <div className="rounded-[1.5rem] bg-vaultic-black/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Travel savings progress</p>
                    <p className="mt-3 text-3xl font-black text-vaultic-mint">{travelGoalProgress}%</p>
                    <p className="mt-2 text-sm text-vaultic-slate">Based on your current savings and this destination&apos;s minimum travel budget.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Total travel budget</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-cream">{formattedValue(travelBudget)}</p>
                    </div>
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Months to save</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-orange">{travelMonthsToSave}</p>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-vaultic-black/60 p-3">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={travelGraphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#0F172A" />
                          <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
                          <YAxis tick={{ fill: '#94A3B8' }} />
                          <Tooltip wrapperStyle={{ background: '#061015', borderRadius: 10 }} formatter={(value: unknown, name?: unknown) => [`₹${Number(value as unknown as number) || 0}`, String(name ?? '') === 'percent' ? 'Completion' : 'Saved']} />
                          <Legend wrapperStyle={{ color: '#94A3B8' }} />
                          <Line type="monotone" dataKey="saved" name="Saved" stroke="#22C55E" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="needed" name="Trip cost" stroke="#F97316" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] bg-vaultic-black/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Cost allocation</p>
                    <div className="mt-4 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={travelAllocation}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={70}
                            paddingAngle={4}
                            label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
                          >
                            {travelAllocation.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip wrapperStyle={{ background: '#061015', borderRadius: 10 }} formatter={(value: unknown, name?: unknown) => [`₹${Number(value as unknown as number) || 0}`, String(name ?? 'Allocation')]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {goalKey === 'special-commodities' && (
            <div className="mt-8 space-y-6 rounded-[2rem] border border-vaultic-border/50 bg-vaultic-black/80 p-6">
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Special Commodities</p>
                <h2 className="text-2xl font-black text-vaultic-cream">Explore premium asset categories</h2>
                <p className="text-sm leading-6 text-vaultic-slate">Select a category to see typical entry-level costs, timeline estimates, and how your savings line up. You can override the entry price to match a specific listing.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {specialCommodityOptions.map((opt) => (
                  <div key={opt.name} className={`rounded-[1.25rem] border p-4 ${selectedSpecialCommodity === opt.name ? 'border-vaultic-orange bg-vaultic-orange/5' : 'border-vaultic-border bg-vaultic-black/70'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-vaultic-muted">{opt.name}</p>
                        <h3 className="mt-2 text-xl font-black text-vaultic-cream">{opt.entry}</h3>
                        <p className="mt-2 text-sm text-vaultic-slate">{opt.description}</p>
                      </div>
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => setSelectedSpecialCommodity(opt.name)}
                          className="rounded-full border border-vaultic-border/60 px-3 py-1 text-sm text-vaultic-cream"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-vaultic-slate">Typical horizon: <span className="font-semibold text-vaultic-cream">{opt.horizon}</span></div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-vaultic-border/40 bg-vaultic-black/60 p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Customize entry price</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-vaultic-slate">Selected category</p>
                    <p className="mt-1 text-lg font-black text-vaultic-cream">{selectedSpecialCommodity}</p>
                  </div>
                  <label>
                    <p className="text-sm text-vaultic-slate">Custom price (₹)</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customCommodityValueInput}
                      onChange={(e) => setCustomCommodityValueInput(e.target.value)}
                      placeholder={formattedValue(SPECIAL_ENTRY_DEFAULTS[selectedSpecialCommodity] ?? 0)}
                      className="mt-2 w-full rounded-2xl border border-vaultic-border/60 bg-transparent px-3 py-2 text-sm text-vaultic-cream outline-none"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window === 'undefined') return;
                      const stored = window.localStorage.getItem('vaulticDnaInputs');
                      let base = {} as Record<string, unknown>;
                      try { base = stored ? JSON.parse(stored) : {}; } catch { base = {}; }
                      const rawSc = (base as Record<string, unknown>)['special_commodity_values'];
                      const sc = rawSc && typeof rawSc === 'object' ? { ...(rawSc as Record<string, unknown>) } : {} as Record<string, unknown>;
                      if (parseNumberInput(customCommodityValueInput) !== undefined) {
                        sc[selectedSpecialCommodity] = parseNumberInput(customCommodityValueInput);
                      } else {
                        sc[selectedSpecialCommodity] = SPECIAL_ENTRY_DEFAULTS[selectedSpecialCommodity];
                      }
                      const merged = { ...base, special_commodity_values: sc };
                      window.localStorage.setItem('vaulticDnaInputs', JSON.stringify(merged));
                      setInputs({ ...(inputs ?? {}), ...(merged as Record<string, unknown>) } as unknown as WizardInputs);
                    }}
                    className="rounded-full bg-vaultic-orange px-4 py-2 text-sm font-semibold text-black"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCommodityValueInput('');
                      if (typeof window === 'undefined') return;
                      const stored = window.localStorage.getItem('vaulticDnaInputs');
                      if (!stored) return;
                      try {
                        const parsed = JSON.parse(stored) as Record<string, unknown>;
                        const raw = parsed['special_commodity_values'];
                        const scParsed = raw && typeof raw === 'object' ? raw as Record<string, unknown> : undefined;
                        if (scParsed) {
                          delete scParsed[selectedSpecialCommodity];
                          parsed['special_commodity_values'] = scParsed;
                        }
                        window.localStorage.setItem('vaulticDnaInputs', JSON.stringify(parsed));
                        setInputs(parsed as unknown as WizardInputs);
                      } catch {
                        // ignore
                      }
                    }}
                    className="rounded-full border border-vaultic-border/60 px-4 py-2 text-sm text-vaultic-cream"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-4 text-sm text-vaultic-slate">
                  <p>Entry price: <span className="font-semibold text-vaultic-cream">{formattedValue(effectiveCommodityValue)}</span></p>
                  <p className="mt-2">Months to save (at current monthly savings): <span className="font-semibold text-vaultic-orange">{effectiveSavingsAmount > 0 ? Math.ceil(effectiveCommodityValue / effectiveSavingsAmount) : '—'}</span></p>
                </div>
              </div>
            </div>
          )}

          {goalKey === 'special-commodities' && (
            <div className="mt-8 space-y-6 rounded-[2rem] border border-vaultic-border/50 bg-vaultic-black/80 p-6">
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Special Commodities</p>
                <h2 className="text-2xl font-black text-vaultic-cream">Premium asset class intelligence</h2>
                <p className="text-sm leading-6 text-vaultic-slate">Explore high-value asset categories such as real estate, luxury cars, fine art, vintage watches, rare metals, and collectible wine. This page helps you compare the type, entry range, risk profile, and how your current savings could support each path.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/70 p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Current planning snapshot</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Monthly income</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-mint">{formattedValue(monthlyIncome)}</p>
                    </div>
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Monthly savings</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-cyan">{formattedValue(savingsAmount)}</p>
                    </div>
                    <div className="rounded-3xl bg-vaultic-black/80 p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Safe reserve</p>
                      <p className="mt-3 text-2xl font-black text-vaultic-cream">{formattedValue(specialReserve)}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/80 p-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">What this means</p>
                    <p className="mt-3 text-sm leading-6 text-vaultic-slate">A premium asset purchase should preserve your safety net. If your savings are below the reserve, focus first on closing that gap before moving into high-ticket assets.</p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/70 p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Recommended readiness</p>
                  <p className="mt-3 text-3xl font-black text-vaultic-mint">{savingsAmount >= specialReserve ? 'Ready to explore' : 'Build your safety buffer'}</p>
                  <p className="mt-2 text-sm text-vaultic-slate">Compare asset classes based on current cashflow and whether your present savings are aligned with premium purchase entry points.</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {specialCommodityOptions.map((option) => (
                  <div key={option.name} className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-vaultic-cream">{option.name}</h3>
                        <p className="mt-2 text-sm text-vaultic-slate">{option.description}</p>
                      </div>
                      <span className="rounded-full border border-vaultic-border px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">{option.risk}</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl bg-vaultic-black/80 p-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Entry price</p>
                        <p className="mt-2 text-xl font-black text-vaultic-mint">{option.entry}</p>
                      </div>
                      <div className="rounded-3xl bg-vaultic-black/80 p-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Hold horizon</p>
                        <p className="mt-2 text-xl font-black text-vaultic-cream">{option.horizon}</p>
                      </div>
                      <div className="rounded-3xl bg-vaultic-black/80 p-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Aligns with</p>
                        <p className="mt-2 text-xl font-black text-vaultic-cyan">{savingsAmount >= specialReserve ? 'Current savings' : 'Future savings'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-black/70 p-6">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Next action</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-vaultic-slate">
                  <li>• Preserve at least {formattedValue(specialReserve)} as a cash reserve before pursuing luxury asset investments.</li>
                  <li>• Prioritize assets with clear utility or income potential if you need to stay cash-flow positive.</li>
                  <li>• Use the categories above to choose one asset class and deepen research into market timing, provenance, and liquidity.</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.push('/dashboard?wizardStep=3')}
              className="inline-flex items-center justify-center rounded-2xl border border-vaultic-border/70 bg-vaultic-black/80 px-6 py-3 text-sm uppercase tracking-[0.35em] text-vaultic-muted hover:border-vaultic-orange/70"
            >
              Adjust my entries
            </button>
            <button
              type="button"
              onClick={() => {
                persistGoalSelection();
                router.push('/dashboard?wizardStep=3');
              }}
              disabled={!canContinue}
              className="inline-flex items-center justify-center rounded-2xl bg-vaultic-orange px-6 py-3 text-sm font-black uppercase tracking-[0.35em] text-vaultic-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue with this goal
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
