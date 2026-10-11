import { calculatePeriodGrade, calculateAnnualAverage, calculateNeededGrade } from './calculations';
import { Assessment, GradeRecord } from '../types';

/**
 * Automated test suite for academic calculations
 * Tests:
 * 1. Simple vs Weighted Average formulas
 * 2. Absent vs Pending vs Excused behaviors
 * 3. Recovery policies (replaces_if_higher, simple_average, weighted_average)
 * 4. Needed grade for target passing threshold
 */
export function runCalculationTests(): { name: string; passed: boolean; details?: string }[] {
  const tests: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: Weighted average calculation (P1=6.0 weight 6, T1=9.0 weight 4 -> (36+36)/10 = 7.2)
  (() => {
    const assessments: Assessment[] = [
      { id: 'a1', title: 'P1', classId: 'c1', period: 1, type: 'prova', maxGrade: 10, weight: 6, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a2', title: 'T1', classId: 'c1', period: 1, type: 'trabalho', maxGrade: 10, weight: 4, date: '', academicYear: 2026, teacherUid: 't1' },
    ];
    const grades: GradeRecord[] = [
      { id: 'g1', assessmentId: 'a1', studentId: 's1', classId: 'c1', period: 1, value: 6.0, status: 'graded', teacherUid: 't1' },
      { id: 'g2', assessmentId: 'a2', studentId: 's1', classId: 'c1', period: 1, value: 9.0, status: 'graded', teacherUid: 't1' },
    ];

    const result = calculatePeriodGrade(1, assessments, grades, 's1', 'weighted', 'replaces_if_higher');
    const passed = result.finalAverage === 7.2;
    tests.push({
      name: 'Média Ponderada: (6.0*6 + 9.0*4)/10 deve resultar 7.2',
      passed,
      details: `Obtido: ${result.finalAverage}, Esperado: 7.2`
    });
  })();

  // Test 2: Absent (counts as zero) vs Pending (not counted) vs Excused (ignored)
  (() => {
    const assessments: Assessment[] = [
      { id: 'a1', title: 'P1', classId: 'c1', period: 1, type: 'prova', maxGrade: 10, weight: 5, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a2', title: 'T1', classId: 'c1', period: 1, type: 'trabalho', maxGrade: 10, weight: 5, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a3', title: 'Ativ', classId: 'c1', period: 1, type: 'atividade', maxGrade: 10, weight: 2, date: '', academicYear: 2026, teacherUid: 't1' },
    ];
    const grades: GradeRecord[] = [
      { id: 'g1', assessmentId: 'a1', studentId: 's1', classId: 'c1', period: 1, value: 8.0, status: 'graded', teacherUid: 't1' },
      { id: 'g2', assessmentId: 'a2', studentId: 's1', classId: 'c1', period: 1, value: null, status: 'absent', teacherUid: 't1' }, // 0
      { id: 'g3', assessmentId: 'a3', studentId: 's1', classId: 'c1', period: 1, value: null, status: 'excused', teacherUid: 't1' }, // ignored
    ];

    const result = calculatePeriodGrade(1, assessments, grades, 's1', 'weighted');
    // Weighted sum: 8*5 + 0*5 = 40. Total weight = 10. Avg = 4.0
    const passed = result.finalAverage === 4.0;
    tests.push({
      name: 'Tratamento de Falta vs Dispensa: Falta pontua zero, dispensa não penaliza',
      passed,
      details: `Obtido: ${result.finalAverage}, Esperado: 4.0`
    });
  })();

  // Test 3: Recovery replaces if higher without mutating original grade
  (() => {
    const assessments: Assessment[] = [
      { id: 'a1', title: 'P1', classId: 'c1', period: 1, type: 'prova', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a2', title: 'REC', classId: 'c1', period: 1, type: 'recuperacao', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
    ];
    const grades: GradeRecord[] = [
      { id: 'g1', assessmentId: 'a1', studentId: 's1', classId: 'c1', period: 1, value: 4.5, status: 'graded', teacherUid: 't1' },
      { id: 'g2', assessmentId: 'a2', studentId: 's1', classId: 'c1', period: 1, value: 7.0, status: 'graded', teacherUid: 't1' },
    ];

    const result = calculatePeriodGrade(1, assessments, grades, 's1', 'simple', 'replaces_if_higher');
    const passed = result.regularAverage === 4.5 && result.finalAverage === 7.0;
    tests.push({
      name: 'Regra de Recuperação "Substitui se Maior": Preserva nota original e eleva média final',
      passed,
      details: `Regular: ${result.regularAverage}, Final: ${result.finalAverage}`
    });
  })();

  // Test 4: Calculation of needed score to reach passing grade
  (() => {
    const periodResults: any = {
      1: { finalAverage: 6.0 },
      2: { finalAverage: 5.0 }
    };
    // Passing = 6.0, 4 periods -> Target total = 24.0. Current = 11.0. Remaining = 2 periods. Needed = (24 - 11)/2 = 6.5
    const needed = calculateNeededGrade(periodResults, 6.0, 4);
    const passed = needed === 6.5;
    tests.push({
      name: 'Cálculo de Nota Necessária: Bimestres com 6.0 e 5.0 necessitam média 6.5 nos 2 restantes',
      passed,
      details: `Obtido: ${needed}, Esperado: 6.5`
    });
  })();

  return tests;
}
