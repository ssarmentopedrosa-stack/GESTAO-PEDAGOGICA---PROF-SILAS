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
  ChevronRight,
  FileText,
  Filter,
  CalendarCheck2,
  HeartHandshake
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { calculatePeriodGrade, formatGrade, formatPercent } from '../../utils/calculations';
import { exportIndividualReportCardPDF } from '../../utils/exportUtils';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

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
    qualitative,
    attendance,
    settings,
    selectedClassId,
    setSelectedClassId,
    selectedPeriod,
    setSelectedPeriod
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

        // Ranges (proportional to school grade scale)
        const scaleFactor = (settings.gradeScale || 10) / 10;
        const dangerLimit = 5.0 * scaleFactor;
        const warningLimit = 6.0 * scaleFactor;
        const goodLimit = 8.0 * scaleFactor;

        if (calc.finalAverage < dangerLimit) gradeRanges.danger++;
        else if (calc.finalAverage < warningLimit) gradeRanges.warning++;
        else if (calc.finalAverage < goodLimit) gradeRanges.good++;
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
        reasons.push(`Frequência ${attRate.toFixed(0)}% com ${attInfo.absent} faltas`);
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
          reason: reasons.join(' · ')
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
      {/* Page Header */}
      <PageHeader
        title="Painel Geral de Desempenho"
        subtitle={`Métricas e diagnósticos acadêmicos de ${settings.subjectName || 'Física'} • ${selectedPeriod}º Bimestre • Ano ${settings.academicYear}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="info">
              {selectedClassId === 'all' ? 'Todas as Turmas' : classes.find(c => c.id === selectedClassId)?.name}
            </Badge>
            <Badge variant="neutral">
              Escala: 0 a {settings.gradeScale || 10} · Meta: {formatGrade(settings.passingGrade)}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('gradebook')}
              leftIcon={<BookOpenCheck className="h-4 w-4 text-blue-600" />}
            >
              Abrir Diário
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('attendance')}
              leftIcon={<CalendarCheck2 className="h-4 w-4 text-emerald-600" />}
            >
              Fazer Chamada
            </Button>
          </div>
        }
      />

      {/* Scope Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-slate-200">Filtro do Painel:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as {classes.length} Turmas (Visão Consolidada)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.technicalCourse})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1">Bimestre:</span>
          {[1, 2, 3, 4].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPeriod(p)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {p}º B
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stat Cards Grid - Clickable directly into modules */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          label="Total de Alunos"
          value={filteredStudents.length}
          description={`${classes.length} turmas ativas`}
          icon={<Users className="h-5 w-5" />}
          accentColor="blue"
          onClick={() => onNavigateToTab('students')}
        />

        <StatCard
          label={`Média (${selectedPeriod}º B)`}
          value={formatGrade(stats.averageGrade)}
          description={`Meta: ${formatGrade(settings.passingGrade)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="emerald"
          onClick={() => onNavigateToTab('gradebook')}
        />

        <StatCard
          label="Rendimento"
          value={`${stats.satisfactoryPercent.toFixed(0)}%`}
          description={`${stats.satisfactoryCount} acima da média`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accentColor="teal"
          onClick={() => onNavigateToTab('gradebook')}
        />

        <StatCard
          label="Abaixo da Média"
          value={stats.belowAverageCount}
          description="Apoio pedagógico"
          icon={<AlertTriangle className="h-5 w-5" />}
          accentColor="rose"
          onClick={() => onNavigateToTab('reports')}
        />

        <StatCard
          label="Pendências"
          value={stats.pendingCount}
          description="Avaliações em aberto"
          icon={<Clock className="h-5 w-5" />}
          accentColor="amber"
          onClick={() => onNavigateToTab('gradebook')}
        />

        <StatCard
          label="Frequência"
          value={`${stats.overallAttendanceRate.toFixed(0)}%`}
          description={`${stats.totalAbsencesCount} faltas totais`}
          icon={<Calendar className="h-5 w-5" />}
          accentColor="blue"
          onClick={() => onNavigateToTab('attendance')}
        />
      </div>

      {/* Main Analytics Row: Bimester Evolution & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Across Bimesters */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolução do Rendimento por Bimestre
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento contínuo da média da disciplina de Física
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('gradebook')}
              className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Abrir Diário</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bimesterEvolution.map(b => (
              <div 
                key={b.period}
                className={`p-3.5 rounded-xl border transition-colors ${
                  b.period === selectedPeriod
                    ? 'border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {b.period}º Bimestre
                  </span>
                  {b.period === selectedPeriod && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </div>
                <div className="mt-2.5">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatGrade(b.average)}
                  </div>
                  <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.average === null ? 'bg-transparent' : b.average >= settings.passingGrade ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, ((b.average || 0) / (settings.gradeScale || 10)) * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
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
                  onClick={() => {
                    setSelectedClassId(cp.classEntity.id);
                    onNavigateToTab('gradebook');
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-3 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs cursor-pointer transition-all"
                >
                  <p className="text-xs font-bold text-[#0F172A] dark:text-slate-100 truncate" title={cp.classEntity.name}>
                    {cp.classEntity.name}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] font-medium text-[#475569] dark:text-slate-400">
                      {cp.studentCount} alunos
                    </span>
                    <span className={`text-xs font-extrabold ${
                      cp.average === null ? 'text-slate-400' : cp.average >= settings.passingGrade ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {formatGrade(cp.average)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Grade Distribution Breakdown */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Distribuição por Faixas de Notas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Classificação no {selectedPeriod}º Bimestre
            </p>

            <div className="space-y-3.5">
              {/* Excellent */}
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

              {/* Good */}
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

              {/* Warning */}
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

              {/* Critical */}
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
            Estudantes com nota final inferior a {formatGrade(settings.passingGrade)} têm direito à recuperação paralela conforme plano de ensino.
          </div>
        </Card>
      </div>

      {/* Pedagogical Attention Radar */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Acompanhamento Pedagógico Prioritário</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estudantes identificados com rendimento abaixo da média, infrequência ou pendência de notas ({stats.needsAttentionList.length} identificados)
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('reports')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            Ver Relatório Completo
          </button>
        </div>

        {stats.needsAttentionList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum estudante necessita de intervenção prioritária no período selecionado.
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
                  <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
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
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => exportIndividualReportCardPDF(
                            student,
                            classes.find(c => c.id === student.classId),
                            assessments,
                            grades,
                            qualitative,
                            attendance,
                            settings
                          )}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title="Emitir Boletim PDF Individual (A4)"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectStudentProfile(student.id)}
                          className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span>Perfil</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
