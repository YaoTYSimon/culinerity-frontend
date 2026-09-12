import type { HeadspaceEntry } from '../types';

export function calculateHeadspaceScore(inputs: {
  costPressure: number;
  nutritionTradeoffs: number;
  timeEffort: number;
  culturalFit: number;
  decisionFriction: number;
}): number {
  const { costPressure, nutritionTradeoffs, timeEffort, culturalFit, decisionFriction } = inputs;
  const avgStress = (costPressure + nutritionTradeoffs + timeEffort + culturalFit + decisionFriction) / 5;
  return Math.round(Math.max(0, Math.min(100, 100 - avgStress)));
}

export function getScoreLabel(score: number): string {
  if (score >= 75) return 'Strong clarity';
  if (score >= 55) return 'Moderate load';
  if (score >= 35) return 'High load';
  return 'Critical load';
}

export function getScoreColor(score: number): string {
  if (score >= 75) return '#2A6448';
  if (score >= 55) return '#8C6820';
  if (score >= 35) return '#B45615';
  return '#8B2222';
}

export function getWeeklyDecisionCount(
  decisions: { date: string }[],
  weeksBack = 1
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  return decisions.filter((d) => new Date(d.date) >= cutoff).length;
}

export function getMonthlyDecisionCount(decisions: { date: string }[]): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return decisions.filter((d) => new Date(d.date) >= cutoff).length;
}

export function simulateScenario(
  profile: {
    weeklyIncome: number;
    weeklyRent: number;
    weeklyBudget: number;
  },
  scenario: {
    rentChangePercent?: number;
    incomeChangeDollars?: number;
    groceryInflationPercent?: number;
  },
  currentScore: number
): {
  newFoodBudget: number;
  budgetChange: number;
  projectedScore: number;
  scoreDelta: number;
  tradeoffIncrease: number;
  bufferMoves: string[];
} {
  const { weeklyIncome, weeklyRent, weeklyBudget } = profile;
  const { rentChangePercent = 0, incomeChangeDollars = 0, groceryInflationPercent = 0 } = scenario;

  const newRent = weeklyRent * (1 + rentChangePercent / 100);
  const newIncome = weeklyIncome + incomeChangeDollars;
  const rentDelta = newRent - weeklyRent;
  const groceryPressure = weeklyBudget * (groceryInflationPercent / 100);

  const budgetChange = -(rentDelta + Math.abs(incomeChangeDollars < 0 ? incomeChangeDollars / 4 : 0) + groceryPressure);
  const newFoodBudget = Math.max(0, weeklyBudget + budgetChange);

  const pressureRatio = budgetChange < 0 ? Math.abs(budgetChange) / weeklyBudget : 0;
  const scoreDelta = -Math.round(pressureRatio * 40);
  const projectedScore = Math.max(0, Math.min(100, currentScore + scoreDelta));
  const tradeoffIncrease = Math.round(pressureRatio * 8);

  const bufferMoves: string[] = [];
  if (newFoodBudget < weeklyBudget * 0.8) {
    bufferMoves.push('2 batch-cook sessions per week saves ~$35 and 3 hours');
  }
  if (pressureRatio > 0.15) {
    bufferMoves.push('Check Woolworths and Coles half-price cycles on your staples');
  }
  if (pressureRatio > 0.25) {
    bufferMoves.push('Nearest community fridge and food rescue services near your postcode');
    bufferMoves.push('OzHarvest or Foodbank referral may cover 2–3 meals per week');
  }
  if (rentChangePercent > 0) {
    bufferMoves.push("Council rental assistance schemes — check your suburb's eligibility");
  }
  if (incomeChangeDollars < 0) {
    bufferMoves.push('Services Australia Jobseeker or Hardship provisions — apply within 2 weeks');
  }

  return { newFoodBudget, budgetChange, projectedScore, scoreDelta, tradeoffIncrease, bufferMoves };
}

export function generateInsights(
  entries: HeadspaceEntry[],
  weeklyLogs: { moneySpent: number; timeSpent: number; nutritionScore: number; culturalFitScore: number }[],
  decisionCount: number,
  budget: number
): string[] {
  const insights: string[] = [];

  if (entries.length === 0 || weeklyLogs.length === 0) return insights;

  const latest = entries[0];
  const recentLogs = weeklyLogs.slice(0, 4);
  const avgTime = recentLogs.reduce((s, l) => s + l.timeSpent, 0) / recentLogs.length;
  const avgCost = recentLogs.reduce((s, l) => s + l.moneySpent, 0) / recentLogs.length;
  const avgNutrition = recentLogs.reduce((s, l) => s + l.nutritionScore, 0) / recentLogs.length;
  const avgCultural = recentLogs.reduce((s, l) => s + l.culturalFitScore, 0) / recentLogs.length;

  const axes = [
    { name: 'time', value: latest.timeEffort },
    { name: 'cost', value: latest.costPressure },
    { name: 'nutrition', value: latest.nutritionTradeoffs },
    { name: 'cultural fit', value: latest.culturalFit },
    { name: 'decision friction', value: latest.decisionFriction },
  ].sort((a, b) => b.value - a.value);

  const topPressure = axes[0];
  if (topPressure.value > 60) {
    if (topPressure.name === 'time') {
      insights.push(`Your load is time, not money — two batch-cook sessions would free roughly ${Math.round(avgTime * 0.3)} hours a week.`);
    } else if (topPressure.name === 'cost') {
      insights.push(`Cost is your primary pressure. Your current spend is $${avgCost.toFixed(0)}/wk — ${avgCost > budget ? `$${(avgCost - budget).toFixed(0)} over` : `$${(budget - avgCost).toFixed(0)} under`} your set budget.`);
    } else if (topPressure.name === 'cultural fit') {
      insights.push(`Cultural fit is your sharpest friction point — your food choices may be drifting from what matters to you. The Cultural Staples index can help track this.`);
    } else if (topPressure.name === 'nutrition') {
      insights.push(`Nutrition trade-offs are high this week. Consider checking the Pantry — using what you have often improves nutritional range.`);
    }
  }

  if (decisionCount > 5) {
    insights.push(`You logged ${decisionCount} food trade-offs this week. That's significant decision friction. The trend matters more than the count.`);
  }

  if (avgNutrition < 5 && avgCost < budget) {
    insights.push(`Budget is under control but nutrition is low — you may have room to spend slightly more on quality ingredients.`);
  }

  if (avgCultural < 5) {
    insights.push(`Cultural fit has been low. The Craving Swap engine can find culturally-relevant alternatives near you.`);
  }

  return insights;
}
