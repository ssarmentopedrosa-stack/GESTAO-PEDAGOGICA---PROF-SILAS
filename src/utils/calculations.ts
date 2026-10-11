import { Assessment, GradeRecord, RecoveryPolicy, CalculationMode } from '../types';

export interface PeriodCalculationResult {
  period: number;
  regularAverage: number | null;
  recoveryGrade: number | null;
  finalAverage: number | null;
  totalValidWeight: number;
  evaluatedAssessmentsCount: number;
  pendingAssessmentsCount: number;
  hasAssessments: boolean;
  status: 'graded' | 'incomplete' | 'empty';
}

/**
 * Calculates student's average in a given period according to configured rules
 */
export function calculatePeriodGrade(
  period: number,
  assessments: Assessment[],
  grades: GradeRecord[],
  studentId: string,
  calculationMode: CalculationMode = 'weighted',
  recoveryPolicy: RecoveryPolicy = 'replaces_if_higher'
): PeriodCalculationResult {
  const periodAssessments = assessments.filter(a => a.period === period);
  
  if (periodAssessments.length === 0) {
    return {
      period,
      regularAverage: null,
      recoveryGrade: null,
      finalAverage: null,
      totalValidWeight: 0,
      evaluatedAssessmentsCount: 0,
      pendingAssessmentsCount: 0,
      hasAssessments: false,
      status: 'empty',
    };
  }

  // Separate regular vs recovery assessments
  const regularAssessments = periodAssessments.filter(a => a.type !== 'recuperacao');
  const recoveryAssessments = periodAssessments.filter(a => a.type === 'recuperacao');

  let weightedSum = 0;
  let totalValidWeight = 0;
  let regularSum = 0;
  let regularCount = 0;
  let evaluatedCount = 0;
  let pendingCount = 0;

  for (const assessment of regularAssessments) {
    const grade = grades.find(g => g.assessmentId === assessment.id && g.studentId === studentId);
    
    if (!grade || grade.status === 'pending') {
      pendingCount++;
      continue;
    }

    if (grade.status === 'excused' || grade.status === 'not_applicable') {
      // Not counted in average and does not penalize
      continue;
    }

    if (grade.status === 'absent') {
      // Absent: counts as 0 unless excused
      const weight = assessment.weight > 0 ? assessment.weight : 1;
      weightedSum += 0 * weight;
      totalValidWeight += weight;
      regularSum += 0;
      regularCount++;
      evaluatedCount++;
      continue;
    }

    if (grade.status === 'graded' && typeof grade.value === 'number') {
      const val = grade.value;
      const weight = assessment.weight > 0 ? assessment.weight : 1;
      weightedSum += val * weight;
      totalValidWeight += weight;
      regularSum += val;
      regularCount++;
      evaluatedCount++;
    }
  }

  let regularAverage: number | null = null;
  if (calculationMode === 'weighted') {
    if (totalValidWeight > 0) {
      regularAverage = Number((weightedSum / totalValidWeight).toFixed(2));
    }
  } else {
    if (regularCount > 0) {
      regularAverage = Number((regularSum / regularCount).toFixed(2));
    }
  }

  // Check recovery assessment
  let recoveryGrade: number | null = null;
  for (const recAssessment of recoveryAssessments) {
    const recGrade = grades.find(g => g.assessmentId === recAssessment.id && g.studentId === studentId);
    if (recGrade && recGrade.status === 'graded' && typeof recGrade.value === 'number') {
      recoveryGrade = recGrade.value;
      break;
    }
  }

  // Calculate final period grade with recovery policy
  let finalAverage: number | null = regularAverage;

  if (recoveryGrade !== null && regularAverage !== null) {
    if (recoveryPolicy === 'replaces_if_higher') {
      finalAverage = recoveryGrade > regularAverage ? recoveryGrade : regularAverage;
    } else if (recoveryPolicy === 'simple_average') {
      finalAverage = Number(((regularAverage + recoveryGrade) / 2).toFixed(2));
    } else if (recoveryPolicy === 'weighted_average') {
      // Regular has weight 6, Recovery weight 4
      finalAverage = Number(((regularAverage * 6 + recoveryGrade * 4) / 10).toFixed(2));
    }
  } else if (recoveryGrade !== null && regularAverage === null) {
    finalAverage = recoveryGrade;
  }

  return {
    period,
    regularAverage,
    recoveryGrade,
    finalAverage,
    totalValidWeight,
    evaluatedAssessmentsCount: evaluatedCount,
    pendingAssessmentsCount: pendingCount,
    hasAssessments: true,
    status: evaluatedCount === 0 && pendingCount > 0 ? 'incomplete' : evaluatedCount > 0 ? 'graded' : 'empty'
  };
}

/**
 * Calculates annual average across completed periods
 */
export function calculateAnnualAverage(periodResults: Record<number, PeriodCalculationResult>): number | null {
  const validPeriods = Object.values(periodResults)
    .filter(p => p.finalAverage !== null)
    .map(p => p.finalAverage as number);

  if (validPeriods.length === 0) return null;

  const sum = validPeriods.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / validPeriods.length).toFixed(2));
}

/**
 * Calculates grade needed in remaining periods to attain passing grade
 */
export function calculateNeededGrade(
  periodResults: Record<number, PeriodCalculationResult>,
  passingGrade: number = 6.0,
  periodsCount: number = 4
): number | null {
  const completed = Object.values(periodResults).filter(p => p.finalAverage !== null);
  const remainingPeriods = periodsCount - completed.length;

  if (remainingPeriods <= 0) return 0; // Course finished

  const accumulatedSum = completed.reduce((acc, curr) => acc + (curr.finalAverage || 0), 0);
  const targetTotal = passingGrade * periodsCount;
  const neededSum = targetTotal - accumulatedSum;

  if (neededSum <= 0) return 0; // Already secured passing score

  const neededPerPeriod = neededSum / remainingPeriods;
  return Number(neededPerPeriod.toFixed(2));
}

/**
 * Formats a grade with Brazilian locale (comma as decimal separator)
 */
export function formatGrade(val: number | null | undefined, defaultValue: string = '-'): string {
  if (val === null || val === undefined || isNaN(val)) return defaultValue;
  return val.toFixed(1).replace('.', ',');
}

/**
 * Formats percentage
 */
export function formatPercent(val: number | null | undefined, defaultValue: string = '-'): string {
  if (val === null || val === undefined || isNaN(val)) return defaultValue;
  return `${val.toFixed(1).replace('.', ',')}%`;
}
