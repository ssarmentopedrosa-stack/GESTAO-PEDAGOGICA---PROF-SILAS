import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  Calendar,
  BookOpen,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  HeartHandshake,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { calculatePeriodGrade, calculateNeededGrade, formatGrade } from '../../utils/calculations';
import { exportIndividualReportCardPDF } from '../../utils/exportUtils';
import { Badge } from '../common/Badge';

interface StudentProfileViewProps {
  studentId: string;
  onBack: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({ studentId, onBack }) => {
  const {
    students,
    classes,
    assessments,
    grades,
    qualitative,
    attendance,
    settings
  } = useAcademic();

  const student = students.find(s => s.id === studentId);
  const studentClass = classes.find(c => c.id === student?.classId);

  // Filter assessments for this class
  const classAssessments = useMemo(() => {
    if (!student) return [];
    return assessments.filter(a => a.classId === student.classId);
  }, [assessments, student]);

  // Qualitative notes for this student
  const studentQualitative = useMemo(() => {
    return qualitative.filter(q => q.studentId === studentId);
  }, [qualitative, studentId]);

  // Attendance stats for this student
  const attendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let justified = 0;
    let late = 0;

    attendance.forEach(att => {
      const rec = att.records[studentId];
      if (rec) {
        if (rec.status === 'present') present++;
        else if (rec.status === 'absent') absent++;
        else if (rec.status === 'justified') justified++;
        else if (rec.status === 'late') late++;
      }
    });

    const total = present + absent + justified + late;
    const rate = total > 0 ? ((present + justified + late) / total) * 100 : 100;

    return { total, present, absent, justified, late, rate };
  }, [attendance, studentId]);

  // Period calculations (1 a 4)
  const periodResults = useMemo(() => {
    if (!student) return {};
    const map: Record<number, ReturnType<typeof calculatePeriodGrade>> = {};
    for (let p = 1; p <= settings.periodsCount; p++) {
      map[p] = calculatePeriodGrade(
        p,
        classAssessments,
        grades,
        student.id,
        settings.calculationMode,
        settings.recoveryPolicy
      );
    }
    return map;
  }, [student, classAssessments, grades, settings]);

  // Annual calculation
  const annualAvg = useMemo(() => {
    const list = Object.values(periodResults).filter(p => p.finalAverage !== null).map(p => p.finalAverage as number);
    if (list.length === 0) return null;
    return Number((list.reduce((acc, c) => acc + c, 0) / list.length).toFixed(2));
  }, [periodResults]);

  // Needed for passing
  const neededScore = useMemo(() => {
    return calculateNeededGrade(periodResults, settings.passingGrade, settings.periodsCount);
  }, [periodResults, settings]);

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 text-sm">Estudante não encontrado.</p>
        <button onClick={onBack} className="mt-4 text-xs font-semibold text-indigo-600 hover:underline">
          Voltar para a lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {student.name}
              </h2>
              <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                {student.status === 'active' ? 'Matrícula Ativa' : student.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Matrícula: {student.registration} • Turma: {student.className} • Curso: {student.technicalCourse}
            </p>
          </div>
        </div>

        {/* Action: Generate Official PDF Report Card */}
        <button
          onClick={() => exportIndividualReportCardPDF(student, studentClass, assessments, grades, qualitative, attendance, settings)}
          className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition"
        >
          <Download className="h-4 w-4" />
          <span>Emitir Boletim Oficial (PDF)</span>
        </button>
      </div>

      {/* KPI Highlights: Annual Average, Attendance Rate, Needed Grade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cumulative Annual Average */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Média Anual Acumulada</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className={`text-2xl font-bold ${
              annualAvg === null ? 'text-slate-400' : annualAvg >= settings.passingGrade ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatGrade(annualAvg)}
            </span>
            <span className="text-xs text-slate-400">/ 10,0</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Média mínima para aprovação: {formatGrade(settings.passingGrade)}
          </span>
        </div>

        {/* Attendance Rate */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Frequência Escolar</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className={`text-2xl font-bold ${
              attendanceStats.rate < 75 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
            }`}>
              {attendanceStats.rate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">({attendanceStats.absent} faltas)</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Total de {attendanceStats.total} aulas ministradas
          </span>
        </div>

        {/* Projection / Needed Grade */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Projeção para Aprovação</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {neededScore !== null ? formatGrade(neededScore) : '-'}
            </span>
            <span className="text-xs text-slate-400">pontos/bimestre restante</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {neededScore === 0 ? 'Já atingiu pontuação suficiente para aprovação!' : 'Nota necessária nos próximos bimestres'}
          </span>
        </div>
      </div>

      {/* Bimestres Breakdown (Cards 1 to 4) */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <span>Detalhamento dos Instrumentos Avaliativos por Bimestre</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(p => {
            const calc = periodResults[p];
            const pAss = classAssessments.filter(a => a.period === p);

            return (
              <div
                key={p}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {p}º Bimestre
                    </span>
                    <Badge variant={calc?.finalAverage === null ? 'neutral' : calc.finalAverage >= settings.passingGrade ? 'success' : 'danger'}>
                      {calc?.finalAverage !== null ? formatGrade(calc.finalAverage) : 'Sem Nota'}
                    </Badge>
                  </div>

                  {/* List assessments */}
                  <div className="mt-3 space-y-2">
                    {pAss.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Nenhuma atividade registrada.</p>
                    ) : (
                      pAss.map(a => {
                        const g = grades.find(grade => grade.studentId === student.id && grade.assessmentId === a.id);
                        return (
                          <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800/50">
                            <span className="truncate pr-2 text-slate-600 dark:text-slate-400" title={a.title}>
                              {a.title.split(':')[0] || a.title} <span className="text-[10px] text-slate-400">(P{a.weight})</span>
                            </span>
                            <span className={`font-mono font-bold ${
                              g?.value !== null && g?.value !== undefined && g.value < settings.passingGrade ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {g?.value !== null && g?.value !== undefined ? formatGrade(g.value) : g?.status === 'pending' ? 'Pend.' : '-'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Média Regular:</span>
                    <span className="font-bold">{formatGrade(calc?.regularAverage)}</span>
                  </div>
                  {calc?.recoveryGrade !== null && (
                    <div className="flex justify-between text-amber-600 font-semibold">
                      <span>Recuperação:</span>
                      <span>{formatGrade(calc?.recoveryGrade)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formative / Qualitative Timeline */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <HeartHandshake className="h-4 w-4 text-indigo-600" />
            <span>Linha do Tempo de Avaliações Qualitativas e Pareceres Formativos</span>
          </h3>
          <span className="text-xs text-slate-500">
            {studentQualitative.length} anotações registradas
          </span>
        </div>

        {studentQualitative.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 text-center">
            Nenhuma observação qualitativa registrada para este estudante até o momento.
          </p>
        ) : (
          <div className="space-y-3">
            {studentQualitative.map(q => (
              <div
                key={q.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {q.criterionLabel || q.criterion}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      • {q.period}º Bimestre ({q.date || 'Sem data'})
                    </span>
                  </div>
                  <Badge variant={q.level === 'excelente' ? 'success' : q.level === 'bom' ? 'info' : q.level === 'em_desenvolvimento' ? 'warning' : 'danger'}>
                    {q.level === 'excelente' ? 'Excelente' : q.level === 'bom' ? 'Bom' : q.level === 'em_desenvolvimento' ? 'Em Desenvolvimento' : 'Necessita Acompanhamento'}
                  </Badge>
                </div>
                {q.comment && (
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    "{q.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
