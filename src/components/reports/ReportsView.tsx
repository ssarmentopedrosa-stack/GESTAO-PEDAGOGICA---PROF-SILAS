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
  Filter,
  FileText
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Assessment } from '../../types';
import { calculatePeriodGrade, formatGrade } from '../../utils/calculations';
import { Badge } from '../common/Badge';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';

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

  const [activeReportTab, setActiveReportTab] = useState<'below' | 'trend' | 'assessments' | 'pending'>('below');

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
      <PageHeader
        title="Relatórios & Inteligência Pedagógica"
        subtitle="Diagnósticos objetivos baseados em dados reais para guiar intervenções pontuais e reflexão docente."
        badge={
          <Badge variant="info">
            {selectedPeriod}º Bimestre Letivo
          </Badge>
        }
      />

      {/* Tabs / Segmented Control */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveReportTab('below')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeReportTab === 'below'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Abaixo da Média ({belowAverageReport.length})
        </button>

        <button
          onClick={() => setActiveReportTab('trend')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeReportTab === 'trend'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Evolução Entre Bimestres
        </button>

        <button
          onClick={() => setActiveReportTab('assessments')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeReportTab === 'assessments'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Dificuldade dos Instrumentos
        </button>

        <button
          onClick={() => setActiveReportTab('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
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
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Estudantes Abaixo da Média Mínima ({formatGrade(settings.passingGrade)})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alunos elegíveis à recuperação paralela ou acompanhamento pedagógico imediato no {selectedPeriod}º Bimestre.
            </p>
          </div>

          {belowAverageReport.length === 0 ? (
            <EmptyState
              icon={<Award className="h-6 w-6" />}
              title="Nenhum estudante abaixo da média"
              description={`Parabéns! Todos os estudantes avaliados no ${selectedPeriod}º Bimestre atingiram rendimento satisfatório.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {belowAverageReport.map(item => (
                    <tr key={item.student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {item.student.registration}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                        {item.student.name}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {item.student.className}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-rose-600">
                        {formatGrade(item.grade)}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-rose-700 dark:text-rose-400">
                        -{formatGrade(item.deficit)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={item.hasRecovery ? 'info' : 'warning'}>
                          {item.hasRecovery ? 'Sim (Realizada)' : 'Não Realizada'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => onSelectStudentProfile(item.student.id)}
                          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                        >
                          Ver Perfil
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Report 2: Trend Between Periods */}
      {activeReportTab === 'trend' && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Análise Comparativa de Desempenho
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedPeriod === 1 
                ? 'A comparação entre bimestres estará disponível a partir do 2º Bimestre.' 
                : `Comparativo de notas entre o ${selectedPeriod - 1}º Bimestre e o ${selectedPeriod}º Bimestre.`}
            </p>
          </div>

          {selectedPeriod === 1 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Selecione o 2º, 3º ou 4º Bimestre no filtro para visualizar a oscilação de rendimento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Estudante</th>
                    <th className="px-3 py-2.5">Turma</th>
                    <th className="px-3 py-2.5 text-center">{selectedPeriod - 1}º Bimestre</th>
                    <th className="px-3 py-2.5 text-center">{selectedPeriod}º Bimestre</th>
                    <th className="px-3 py-2.5 text-center">Variação</th>
                    <th className="px-3 py-2.5">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {performanceTrends.map(item => (
                    <tr key={item.student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                        {item.student.name}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {item.student.className}
                      </td>
                      <td className="px-3 py-2 text-center font-bold">
                        {formatGrade(item.prevGrade)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold">
                        {formatGrade(item.currGrade)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold">
                        <span className={item.diff > 0 ? 'text-emerald-600' : item.diff < 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {item.isImprovement ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Evolução Notável</span>
                          </span>
                        ) : item.isDrop ? (
                          <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center space-x-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            <span>Queda Significativa</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Estabilidade</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Report 3: Assessment Difficulty */}
      {activeReportTab === 'assessments' && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Diagnóstico de Dificuldade dos Instrumentos Avaliativos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Média geral e índice de notas abaixo de {formatGrade(settings.passingGrade)} em cada avaliação de Física do {selectedPeriod}º Bimestre.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessmentDifficultyReport.map(item => (
              <div 
                key={item.assessment.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant="info">
                      {item.assessment.type.toUpperCase()} • Peso {item.assessment.weight}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">
                      Máx: {item.assessment.maxGrade}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {item.assessment.title}
                  </h4>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Média Geral da Turma:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatGrade(item.average)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Abaixo da Meta:</span>
                    <span className={`font-bold ${item.belowPercent > 30 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.belowCount} ({item.belowPercent.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Report 4: Pending Deliverables */}
      {activeReportTab === 'pending' && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Painel de Estudantes com Avaliações Pendentes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estudantes sem notas registradas em instrumentos aplicados no {selectedPeriod}º Bimestre.
            </p>
          </div>

          {pendingReport.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="Nenhuma pendência encontrada"
              description="Todas as avaliações dos estudantes avaliados possuem notas ou dispensas registradas."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingReport.map(item => (
                <div key={item.student.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.student.name} <span className="font-normal text-slate-400 font-mono">({item.student.registration})</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Turma: {item.student.className}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {item.pendingAssessments.map(a => (
                      <Badge key={a.id} variant="warning">
                        {a.title.slice(0, 20)}
                      </Badge>
                    ))}
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => onSelectStudentProfile(item.student.id)}
                    >
                      Perfil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
