import React, { useMemo, useState } from 'react';
import {
  LineChart,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Clock,
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Assessment } from '../../types';
import { calculatePeriodGrade, formatGrade } from '../../utils/calculations';
import { Badge } from '../common/Badge';

interface ReportsViewProps {
  onSelectStudentProfile: (studentId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onSelectStudentProfile }) => {
  const {
    students,
    classes,
    assessments,
    grades,
    qualitative,
    settings,
    selectedClassId,
    selectedPeriod,
  } = useAcademic();

  const [activeReportTab, setActiveReportTab] = useState<'below' | 'trend' | 'assessments' | 'pending' | 'qualitative'>('below');

  // Filter students
  const targetStudents = useMemo(() => {
    if (selectedClassId === 'all') return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // 1. Students Below Passing Grade
  const belowAverageReport = useMemo(() => {
    return targetStudents
      .map(st => {
        const calc = calculatePeriodGrade(selectedPeriod, assessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);
        return {
          student: st,
          grade: calc.finalAverage,
          deficit: calc.finalAverage !== null ? Number((settings.passingGrade - calc.finalAverage).toFixed(2)) : null,
          hasRecovery: calc.recoveryGrade !== null
        };
      })
      .filter(item => item.grade !== null && item.grade < settings.passingGrade)
      .sort((a, b) => (a.grade || 0) - (b.grade || 0));
  }, [targetStudents, assessments, grades, selectedPeriod, settings]);

  // 2. Trend Between Periods (e.g. 1º Bimestre vs 2º Bimestre)
  const performanceTrends = useMemo(() => {
    if (selectedPeriod === 1) return [];
    const prevPeriod = selectedPeriod - 1;

    return targetStudents
      .map(st => {
        const curr = calculatePeriodGrade(selectedPeriod, assessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);
        const prev = calculatePeriodGrade(prevPeriod, assessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);

        if (curr.finalAverage === null || prev.finalAverage === null) return null;

        const diff = Number((curr.finalAverage - prev.finalAverage).toFixed(2));
        return {
          student: st,
          currGrade: curr.finalAverage,
          prevGrade: prev.finalAverage,
          diff,
          isDrop: diff < -0.8,
          isImprovement: diff > 0.8
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.diff - b.diff);
  }, [targetStudents, assessments, grades, selectedPeriod, settings]);

  // 3. Lowest Average Assessments (Reflection for teacher)
  const assessmentDifficultyReport = useMemo(() => {
    const periodAssessments = assessments.filter(a => a.period === selectedPeriod && (selectedClassId === 'all' || a.classId === selectedClassId));

    return periodAssessments.map(ass => {
      const assGrades = grades.filter(g => g.assessmentId === ass.id && g.status === 'graded' && typeof g.value === 'number');
      const sum = assGrades.reduce((acc, g) => acc + (g.value || 0), 0);
      const avg = assGrades.length > 0 ? Number((sum / assGrades.length).toFixed(2)) : null;

      const belowCount = assGrades.filter(g => (g.value || 0) < settings.passingGrade).length;
      const belowPercent = assGrades.length > 0 ? (belowCount / assGrades.length) * 100 : 0;

      return {
        assessment: ass,
        evaluatedCount: assGrades.length,
        average: avg,
        belowCount,
        belowPercent
      };
    }).sort((a, b) => (a.average || 10) - (b.average || 10));
  }, [assessments, grades, selectedPeriod, selectedClassId, settings]);

  // 4. Pending Deliverables & Assessments
  const pendingReport = useMemo(() => {
    const list: Array<{
      student: typeof targetStudents[0];
      pendingAssessments: Assessment[];
    }> = [];

    const periodAssessments = assessments.filter(a => a.period === selectedPeriod);

    targetStudents.forEach(st => {
      const stAssessments = periodAssessments.filter(a => a.classId === st.classId);
      const pendingForStudent = stAssessments.filter(a => {
        const g = grades.find(grade => grade.studentId === st.id && grade.assessmentId === a.id);
        return !g || g.status === 'pending';
      });

      if (pendingForStudent.length > 0) {
        list.push({ student: st, pendingAssessments: pendingForStudent });
      }
    });

    return list;
  }, [targetStudents, assessments, grades, selectedPeriod]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Relatórios & Inteligência Pedagógica
            </h2>
            <Badge variant="info">
              {selectedPeriod}º Bimestre
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Diagnósticos objetivos baseados em regras para guiar intervenções pontuais, plantões e reflexão docente.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveReportTab('below')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeReportTab === 'below'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Abaixo da Média ({belowAverageReport.length})
        </button>

        <button
          onClick={() => setActiveReportTab('trend')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeReportTab === 'trend'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Oscilação / Evolução Entre Bimestres
        </button>

        <button
          onClick={() => setActiveReportTab('assessments')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeReportTab === 'assessments'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Dificuldade dos Instrumentos
        </button>

        <button
          onClick={() => setActiveReportTab('pending')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeReportTab === 'pending'
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Painel de Pendências ({pendingReport.length})
        </button>
      </div>

      {/* Report 1: Below Passing Grade */}
      {activeReportTab === 'below' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Estudantes Abaixo da Média Mínima ({formatGrade(settings.passingGrade)})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alunos elegíveis à recuperação paralela ou acompanhamento pedagógico imediato no {selectedPeriod}º Bimestre.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Matrícula</th>
                  <th className="px-3 py-2.5">Estudante</th>
                  <th className="px-3 py-2.5">Turma</th>
                  <th className="px-3 py-2.5 text-center">Média Obtida</th>
                  <th className="px-3 py-2.5 text-center">Déficit p/ Meta</th>
                  <th className="px-3 py-2.5 text-center">Fez Recuperação?</th>
                  <th className="px-3 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {belowAverageReport.map(({ student, grade, deficit, hasRecovery }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{student.registration}</td>
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 text-slate-500">{student.className}</td>
                    <td className="px-3 py-2 text-center font-bold text-rose-600">{formatGrade(grade)}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600">-{formatGrade(deficit)}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={hasRecovery ? 'success' : 'warning'}>
                        {hasRecovery ? 'Sim (Registrada)' : 'Pendente'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onSelectStudentProfile(student.id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        Abrir Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Trend Between Periods */}
      {activeReportTab === 'trend' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Evolução e Oscilação Entre o {selectedPeriod - 1}º e {selectedPeriod}º Bimestres
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identificação de quedas acentuadas (&gt; 0,8 ponto) e superações notáveis.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Estudante</th>
                  <th className="px-3 py-2.5">Turma</th>
                  <th className="px-3 py-2.5 text-center">{selectedPeriod - 1}º Bimestre</th>
                  <th className="px-3 py-2.5 text-center">{selectedPeriod}º Bimestre</th>
                  <th className="px-3 py-2.5 text-center">Variação</th>
                  <th className="px-3 py-2.5">Diagnóstico Transparente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {performanceTrends.map(({ student, prevGrade, currGrade, diff, isDrop, isImprovement }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 text-slate-500">{student.className}</td>
                    <td className="px-3 py-2 text-center font-mono">{formatGrade(prevGrade)}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold">{formatGrade(currGrade)}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold">
                      <span className={diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'}>
                        {diff > 0 ? `+${formatGrade(diff)}` : formatGrade(diff)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isDrop ? (
                        <span className="text-rose-600 font-semibold flex items-center space-x-1">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span>Queda significativa de rendimento</span>
                        </span>
                      ) : isImprovement ? (
                        <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Superação e evolução positiva</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Desempenho estável</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Assessments Difficulty */}
      {activeReportTab === 'assessments' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Análise dos Instrumentos Avaliativos do {selectedPeriod}º Bimestre
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reflexão docente: avaliações com menor rendimento podem indicar complexidade de formulação ou necessidade de revisão de conteúdo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessmentDifficultyReport.map(({ assessment, average, belowCount, belowPercent, evaluatedCount }) => (
              <div key={assessment.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {assessment.title}
                  </span>
                  <Badge variant={average !== null && average < settings.passingGrade ? 'danger' : 'success'}>
                    Média: {formatGrade(average)}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>Tipo: <strong className="uppercase">{assessment.type}</strong> (Peso {assessment.weight})</span>
                  <span>{evaluatedCount} estudantes avaliados</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs flex justify-between">
                  <span className="text-rose-600 font-semibold">
                    {belowCount} alunos abaixo de {formatGrade(settings.passingGrade)} ({belowPercent.toFixed(1)}%)
                  </span>
                  <span className="text-slate-400">Data: {assessment.date || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report 4: Pending Deliverables */}
      {activeReportTab === 'pending' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Painel de Pendências de Avaliações
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estudantes com instrumentos não entregues ou notas pendentes para planejamento de 2ª chamada.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Matrícula</th>
                  <th className="px-3 py-2.5">Estudante</th>
                  <th className="px-3 py-2.5">Turma</th>
                  <th className="px-3 py-2.5">Atividades / Provas Pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {pendingReport.map(({ student, pendingAssessments }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{student.registration}</td>
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 text-slate-500">{student.className}</td>
                    <td className="px-3 py-2 text-amber-600 font-medium">
                      {pendingAssessments.map(a => a.title).join(' • ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
