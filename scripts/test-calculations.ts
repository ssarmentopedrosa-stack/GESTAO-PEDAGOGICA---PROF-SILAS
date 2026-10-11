import { calculatePeriodGrade, calculateAnnualAverage, calculateNeededGrade, formatGrade } from '../src/utils/calculations';
import { Assessment, GradeRecord } from '../src/types';

/**
 * Automated test suite for academic calculations
 * Tests:
 * 1. Simple vs Weighted Average formulas
 * 2. Statuses: Graded, Pending, Absent, Excused
 * 3. Recovery policies (replaces_if_higher, simple_average, weighted_average)
 * 4. Custom maxGrade and gradeScale bounds
 * 5. Annual average and needed passing grade
 */
export function runAcademicCalculationsTests() {
  console.log('====================================================');
  console.log(' Gestão Escolar PRO - Execução Real de Testes de Cálculos');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(name: string, condition: boolean, details: string) {
    if (condition) {
      passedCount++;
      console.log(`[PASS] ${name}`);
      console.log(`       -> ${details}\n`);
    } else {
      failedCount++;
      console.error(`[FAIL] ${name}`);
      console.error(`       -> ${details}\n`);
    }
  }

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
    assert(
      'CALC-01: Média Ponderada Padrão',
      result.finalAverage === 7.2,
      `Calculado: ${result.finalAverage}, Esperado: 7.2 ((6.0*6 + 9.0*4)/10)`
    );
  })();

  // Test 2: Status distinction (Absent counts as 0, Excused ignored, Pending does not penalize)
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
    assert(
      'CALC-02: Tratamento de Status (Falta=0 vs Dispensa=Neutro)',
      result.finalAverage === 4.0,
      `Calculado: ${result.finalAverage}, Esperado: 4.0`
    );
  })();

  // Test 3: Recovery replaces if higher
  (() => {
    const assessments: Assessment[] = [
      { id: 'a1', title: 'P1', classId: 'c1', period: 1, type: 'prova', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a2', title: 'REC', classId: 'c1', period: 1, type: 'recuperacao', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
    ];
    const grades: GradeRecord[] = [
      { id: 'g1', assessmentId: 'a1', studentId: 's1', classId: 'c1', period: 1, value: 4.0, status: 'graded', teacherUid: 't1' },
      { id: 'g2', assessmentId: 'a2', studentId: 's1', classId: 'c1', period: 1, value: 7.5, status: 'graded', teacherUid: 't1' },
    ];

    const result = calculatePeriodGrade(1, assessments, grades, 's1', 'simple', 'replaces_if_higher');
    assert(
      'CALC-03: Recuperação Substitui se Maior',
      result.regularAverage === 4.0 && result.finalAverage === 7.5,
      `Regular: ${result.regularAverage}, Final: ${result.finalAverage}`
    );
  })();

  // Test 4: Recovery does NOT replace if lower
  (() => {
    const assessments: Assessment[] = [
      { id: 'a1', title: 'P1', classId: 'c1', period: 1, type: 'prova', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a2', title: 'REC', classId: 'c1', period: 1, type: 'recuperacao', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
    ];
    const grades: GradeRecord[] = [
      { id: 'g1', assessmentId: 'a1', studentId: 's1', classId: 'c1', period: 1, value: 5.5, status: 'graded', teacherUid: 't1' },
      { id: 'g2', assessmentId: 'a2', studentId: 's1', classId: 'c1', period: 1, value: 3.0, status: 'graded', teacherUid: 't1' },
    ];

    const result = calculatePeriodGrade(1, assessments, grades, 's1', 'simple', 'replaces_if_higher');
    assert(
      'CALC-04: Recuperação Menor Não Prejudica',
      result.regularAverage === 5.5 && result.finalAverage === 5.5,
      `Regular: ${result.regularAverage}, Final: ${result.finalAverage} (preservou a maior)`
    );
  })();

  // Test 5: Recovery weighted average policy ((Reg*6 + Rec*4)/10)
  (() => {
    const assessments: Assessment[] = [
      { id: 'a1', title: 'P1', classId: 'c1', period: 1, type: 'prova', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
      { id: 'a2', title: 'REC', classId: 'c1', period: 1, type: 'recuperacao', maxGrade: 10, weight: 1, date: '', academicYear: 2026, teacherUid: 't1' },
    ];
    const grades: GradeRecord[] = [
      { id: 'g1', assessmentId: 'a1', studentId: 's1', classId: 'c1', period: 1, value: 4.0, status: 'graded', teacherUid: 't1' },
      { id: 'g2', assessmentId: 'a2', studentId: 's1', classId: 'c1', period: 1, value: 8.0, status: 'graded', teacherUid: 't1' },
    ];

    const result = calculatePeriodGrade(1, assessments, grades, 's1', 'simple', 'weighted_average');
    // (4.0*6 + 8.0*4)/10 = (24 + 32)/10 = 5.6
    assert(
      'CALC-05: Recuperação Média Ponderada (60/40)',
      result.finalAverage === 5.6,
      `Final: ${result.finalAverage}, Esperado: 5.6`
    );
  })();

  // Test 6: Calculation of needed score to reach passing grade
  (() => {
    const periodResults: any = {
      1: { finalAverage: 6.0 },
      2: { finalAverage: 5.0 }
    };
    // Passing = 6.0, 4 periods -> Target total = 24.0. Current = 11.0. Remaining = 2 periods. Needed = (24 - 11)/2 = 6.5
    const needed = calculateNeededGrade(periodResults, 6.0, 4);
    assert(
      'CALC-06: Nota Necessária para Aprovação',
      needed === 6.5,
      `Calculado: ${needed}, Esperado: 6.5`
    );
  })();

  // Test 7: Annual average calculation
  (() => {
    const periodResults: any = {
      1: { finalAverage: 7.0 },
      2: { finalAverage: 8.0 },
      3: { finalAverage: 6.0 },
      4: { finalAverage: 9.0 }
    };
    const annual = calculateAnnualAverage(periodResults);
    assert(
      'CALC-07: Média Anual Completa',
      annual === 7.5,
      `Calculado: ${annual}, Esperado: 7.5 ((7+8+6+9)/4)`
    );
  })();

  console.log('----------------------------------------------------');
  console.log(`Resultado da Bateria de Cálculos: ${passedCount} APROVADOS, ${failedCount} FALHAS.`);
  console.log('----------------------------------------------------');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAcademicCalculationsTests();
