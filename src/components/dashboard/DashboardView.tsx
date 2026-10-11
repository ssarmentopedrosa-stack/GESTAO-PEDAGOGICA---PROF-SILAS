import React, { useMemo } from 'react';
import {
  Users,
  Layers,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Percent,
  Calendar,
  ArrowRight,
  BookOpenCheck,
  ChevronRight
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { calculatePeriodGrade, formatGrade, formatPercent } from '../../utils/calculations';
import { Badge } from '../common/Badge';

interface DashboardViewProps {
  onNavigateToTab: (tab: any) => void;
  onSelectStudentProfile: (studentId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab, onSelectStudentProfile }) => {
  const {
    students,
    classes,
    assessments,
    grades,
    attendance,
    settings,
    selectedClassId,
    selectedPeriod,
  } = useAcademic();

  // Filter students based on selectedClassId
  const filteredStudents = useMemo(() => {
    if (selectedClassId === 'all') return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Assessments for active view
  const relevantAssessments = useMemo(() => {
    if (selectedClassId === 'all') return assessments;
    return assessments.filter(a => a.classId === selectedClassId);
  }, [assessments, selectedClassId]);

  // Compute stats across filtered students for active period
  const stats = useMemo(() => {
    let satisfactoryCount = 0;
    let belowAverageCount = 0;
    let pendingCount = 0;
    let totalGradeSum = 0;
    let validStudentGradeCount = 0;

    const gradeRanges = {
      danger: 0,   // 0.0 - 4.9
      warning: 0,  // 5.0 - 5.9
      good: 0,     // 6.0 - 7.9
      excellent: 0 // 8.0 - 10.0
    };

    const needsAttentionList: Array<{
      student: typeof filteredStudents[0];
      periodGrade: number | null;
      attendancePercent: number;
      absencesCount: number;
      pendingCount: number;
      reason: string;
    }> = [];

    // Calculate attendance for filtered students
    const studentAttendanceMap = new Map<string, { present: number; absent: number; total: number }>();
    attendance.forEach(att => {
      if (selectedClassId !== 'all' && att.classId !== selectedClassId) return;
      Object.entries(att.records).forEach(([sId, rec]) => {
        const current = studentAttendanceMap.get(sId) || { present: 0, absent: 0, total: 0 };
        current.total++;
        if (rec.status === 'present' || rec.status === 'late' || rec.status === 'justified') {
          current.present++;
        } else if (rec.status === 'absent') {
          current.absent++;
        }
        studentAttendanceMap.set(sId, current);
      });
    });

    filteredStudents.forEach(st => {
      const calc = calculatePeriodGrade(
        selectedPeriod,
        relevantAssessments,
        grades,
        st.id,
        settings.calculationMode,
        settings.recoveryPolicy
      );

      const attInfo = studentAttendanceMap.get(st.id) || { present: 0, absent: 0, total: 0 };
      const attRate = attInfo.total > 0 ? (attInfo.present / attInfo.total) * 100 : 100;

      if (calc.finalAverage !== null) {
        totalGradeSum += calc.finalAverage;
        validStudentGradeCount++;

        if (calc.finalAverage >= settings.passingGrade) {
          satisfactoryCount++;
        } else {
          belowAverageCount++;
        }

        // Ranges
        if (calc.finalAverage < 5.0) gradeRanges.danger++;
        else if (calc.finalAverage < 6.0) gradeRanges.warning++;
        else if (calc.finalAverage < 8.0) gradeRanges.good++;
        else gradeRanges.excellent++;
      }

      if (calc.pendingAssessmentsCount > 0) {
        pendingCount++;
      }

      // Attention criteria: Grade below passing OR attendance < 75% OR has pending assessments
      const reasons: string[] = [];
      if (calc.finalAverage !== null && calc.finalAverage < settings.passingGrade) {
        reasons.push(`Média ${formatGrade(calc.finalAverage)} abaixo de ${formatGrade(settings.passingGrade)}`);
      }
      if (attRate < 75 && attInfo.total > 0) {
        reasons.push(`Frequência crítica (${attRate.toFixed(0)}% com ${attInfo.absent} faltas)`);
      }
      if (calc.pendingAssessmentsCount > 0) {
        reasons.push(`${calc.pendingAssessmentsCount} instrumento(s) pendente(s)`);
      }

      if (reasons.length > 0) {
        needsAttentionList.push({
          student: st,
          periodGrade: calc.finalAverage,
          attendancePercent: attRate,
          absencesCount: attInfo.absent,
          pendingCount: calc.pendingAssessmentsCount,
          reason: reasons.join(' • ')
        });
      }
    });

    const averageGrade = validStudentGradeCount > 0 ? totalGradeSum / validStudentGradeCount : null;
    const satisfactoryPercent = filteredStudents.length > 0 ? (satisfactoryCount / filteredStudents.length) * 100 : 0;

    // Overall attendance rate
    let totalLessonsCount = 0;
    let totalPresencesCount = 0;
    let totalAbsencesCount = 0;
    attendance.forEach(att => {
      if (selectedClassId !== 'all' && att.classId !== selectedClassId) return;
      Object.values(att.records).forEach(r => {
        totalLessonsCount++;
        if (r.status === 'present' || r.status === 'late' || r.status === 'justified') {
          totalPresencesCount++;
        } else if (r.status === 'absent') {
          totalAbsencesCount++;
        }
      });
    });
    const overallAttendanceRate = totalLessonsCount > 0 ? (totalPresencesCount / totalLessonsCount) * 100 : 100;

    return {
      satisfactoryCount,
      belowAverageCount,
      pendingCount,
      averageGrade,
      satisfactoryPercent,
      gradeRanges,
      needsAttentionList,
      overallAttendanceRate,
      totalAbsencesCount
    };
  }, [filteredStudents, relevantAssessments, grades, attendance, selectedPeriod, settings, selectedClassId]);

  // Performance evolution across periods (Bimestres 1 a 4)
  const bimesterEvolution = useMemo(() => {
    return [1, 2, 3, 4].map(p => {
      let sum = 0;
      let count = 0;
      filteredStudents.forEach(st => {
        const calc = calculatePeriodGrade(p, relevantAssessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);
        if (calc.finalAverage !== null) {
          sum += calc.finalAverage;
          count++;
        }
      });
      return {
        period: p,
        average: count > 0 ? Number((sum / count).toFixed(2)) : null,
        evaluatedStudents: count
      };
    });
  }, [filteredStudents, relevantAssessments, grades, settings]);

  // Average performance by class
  const classPerformance = useMemo(() => {
    return classes.map(c => {
      const classStudents = students.filter(s => s.classId === c.id);
      let sum = 0;
      let count = 0;
      classStudents.forEach(st => {
        const calc = calculatePeriodGrade(selectedPeriod, assessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);
        if (calc.finalAverage !== null) {
          sum += calc.finalAverage;
          count++;
        }
      });
      return {
        classEntity: c,
        average: count > 0 ? Number((sum / count).toFixed(2)) : null,
        studentCount: classStudents.length,
        evaluatedCount: count
      };
    });
  }, [classes, students, selectedPeriod, assessments, grades, settings]);

  return (
    <div className="space-y-6">
      {/* Top Banner Context */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Painel Geral de Desempenho
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Métricas acadêmicas e diagnósticos pedagógicos de {settings.subjectName || 'Física'} • {selectedPeriod}º Bimestre de {settings.academicYear}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="info">
            {selectedClassId === 'all' ? 'Todas as 12 Turmas' : classes.find(c => c.id === selectedClassId)?.name}
          </Badge>
          <Badge variant="neutral">
            Modo: {settings.calculationMode === 'weighted' ? 'Média Ponderada' : 'Média Simples'}
          </Badge>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Alunos</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {filteredStudents.length}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {classes.length} turmas cadastradas
          </span>
        </div>

        {/* General Average */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Média Geral ({selectedPeriod}º B)</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatGrade(stats.averageGrade)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Meta mínima: {formatGrade(settings.passingGrade)}
          </span>
        </div>

        {/* Satisfactory Rate */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rendimento Satisfatório</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.satisfactoryPercent.toFixed(1)}%
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.satisfactoryCount} estudantes ≥ {formatGrade(settings.passingGrade)}
          </span>
        </div>

        {/* Below Passing Grade */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Abaixo da Média</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.belowAverageCount}
          </p>
          <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">
            Necessitam recuperação
          </span>
        </div>

        {/* Pending Grades */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Com Pendências</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pendingCount}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Atividades a lançar
          </span>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Frequência Média</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.overallAttendanceRate.toFixed(1)}%
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.totalAbsencesCount} faltas no total
          </span>
        </div>
      </div>

      {/* Main Analytics Row: Bimester Evolution & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Across Bimesters */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolução do Rendimento por Bimestre
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento da média geral de Física ao longo do ano letivo
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('gradebook')}
              className="inline-flex items-center space-x-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Abrir Diário</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {bimesterEvolution.map(b => (
              <div 
                key={b.period}
                className={`p-3.5 rounded-xl border ${
                  b.period === selectedPeriod
                    ? 'border-indigo-500/80 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {b.period}º Bimestre
                  </span>
                  {b.period === selectedPeriod && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatGrade(b.average)}
                  </div>
                  <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        b.average === null ? 'bg-transparent' : b.average >= settings.passingGrade ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, ((b.average || 0) / 10) * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  {b.evaluatedStudents} notas consolidadas
                </p>
              </div>
            ))}
          </div>

          {/* Class by Class Comparative Matrix */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
              Média por Turma do Ensino Médio ({selectedPeriod}º Bimestre)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {classPerformance.map(cp => (
                <div
                  key={cp.classEntity.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-2.5 hover:border-indigo-300 transition"
                >
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={cp.classEntity.name}>
                    {cp.classEntity.name}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {cp.studentCount} alunos
                    </span>
                    <span className={`text-xs font-bold ${
                      cp.average === null ? 'text-slate-400' : cp.average >= settings.passingGrade ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatGrade(cp.average)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grade Distribution Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Distribuição por Faixas de Notas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Classificação dos estudantes no {selectedPeriod}º Bimestre
            </p>

            <div className="space-y-3">
              {/* Excellent: 8.0 - 10.0 */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-emerald-700 dark:text-emerald-400">Excelente (8,0 - 10,0)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.gradeRanges.excellent} alunos</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${filteredStudents.length > 0 ? (stats.gradeRanges.excellent / filteredStudents.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Good: 6.0 - 7.9 */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-blue-700 dark:text-blue-400">Satisfatório (6,0 - 7,9)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.gradeRanges.good} alunos</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${filteredStudents.length > 0 ? (stats.gradeRanges.good / filteredStudents.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Warning: 5.0 - 5.9 */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-amber-700 dark:text-amber-400">Em Alerta (5,0 - 5,9)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.gradeRanges.warning} alunos</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${filteredStudents.length > 0 ? (stats.gradeRanges.warning / filteredStudents.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Critical: 0.0 - 4.9 */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-rose-700 dark:text-rose-400">Crítico (&lt; 5,0)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stats.gradeRanges.danger} alunos</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${filteredStudents.length > 0 ? (stats.gradeRanges.danger / filteredStudents.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold block text-slate-800 dark:text-slate-200 mb-0.5">
              Diretriz Pedagógica:
            </span>
            Estudantes com nota final inferior a 6,0 têm direito à recuperação paralela conforme plano de ensino.
          </div>
        </div>
      </div>

      {/* Pedagogical Attention Radar (Estudantes que necessitam de intervenção ou plantão) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Estudantes que Necessitam de Acompanhamento Pedagógico</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identificação objetiva baseada em rendimento abaixo da média, infrequência ou pendência de avaliações ({stats.needsAttentionList.length} identificados)
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('reports')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Ver Relatório Completo
          </button>
        </div>

        {stats.needsAttentionList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Parabéns! Todos os estudantes estão com desempenho e frequência regulares no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Matrícula</th>
                  <th className="px-4 py-2.5">Estudante</th>
                  <th className="px-4 py-2.5">Turma</th>
                  <th className="px-4 py-2.5 text-center">Nota ({selectedPeriod}º B)</th>
                  <th className="px-4 py-2.5 text-center">Frequência</th>
                  <th className="px-4 py-2.5">Motivo do Acompanhamento</th>
                  <th className="px-4 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {stats.needsAttentionList.slice(0, 8).map(({ student, periodGrade, attendancePercent, reason }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {student.registration}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {student.name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {student.className}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">
                      <span className={periodGrade === null ? 'text-slate-400' : periodGrade < settings.passingGrade ? 'text-rose-600' : 'text-emerald-600'}>
                        {formatGrade(periodGrade)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={attendancePercent < 75 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {attendancePercent.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        {reason}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onSelectStudentProfile(student.id)}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium"
                      >
                        <span>Perfil</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
