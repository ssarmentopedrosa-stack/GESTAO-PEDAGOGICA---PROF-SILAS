import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  BookOpen,
  Calendar,
  Award,
  HeartHandshake,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { calculatePeriodGrade, calculateNeededGrade, formatGrade } from '../../utils/calculations';
import { exportIndividualReportCardPDF } from '../../utils/exportUtils';
import { Badge } from '../common/Badge';
import { PageHeader } from '../common/PageHeader';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { StatCard } from '../common/StatCard';

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
    settings,
  } = useAcademic();

  const student = students.find(s => s.id === studentId);
  const studentClass = classes.find(c => c.id === student?.classId);

  // Filter assessments for this class
  const classAssessments = useMemo(() => {
    if (!student) return [];
    return assessments.filter(a => a.classId === student.classId);
  }, [student, assessments]);

  // Calculations across all 4 periods
  const periodResults = useMemo(() => {
    if (!student) return {};
    const res: Record<number, ReturnType<typeof calculatePeriodGrade>> = {};
    for (let p = 1; p <= settings.periodsCount; p++) {
      res[p] = calculatePeriodGrade(
        p,
        classAssessments,
        grades,
        student.id,
        settings.calculationMode,
        settings.recoveryPolicy
      );
    }
    return res;
  }, [student, classAssessments, grades, settings]);

  // Cumulative Annual Average
  const annualAvg = useMemo(() => {
    const validGrades = Object.values(periodResults)
      .map(r => r.finalAverage)
      .filter((g): g is number => g !== null && typeof g === 'number');

    if (validGrades.length === 0) return null;
    const sum = validGrades.reduce((a, b) => a + b, 0);
    return Number((sum / validGrades.length).toFixed(2));
  }, [periodResults]);

  // Attendance stats for this student
  const attendanceStats = useMemo(() => {
    if (!student) return { total: 0, present: 0, absent: 0, justified: 0, late: 0, rate: 100 };
    let present = 0;
    let absent = 0;
    let justified = 0;
    let late = 0;

    attendance.forEach(att => {
      const rec = att.records[student.id];
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
  }, [student, attendance]);

  // Qualitative notes for this student
  const studentQualitative = useMemo(() => {
    if (!student) return [];
    return qualitative.filter(q => q.studentId === student.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [student, qualitative]);

  // Needed grade projection
  const neededScore = useMemo(() => {
    return calculateNeededGrade(periodResults, settings.passingGrade, settings.periodsCount);
  }, [periodResults, settings]);

  if (!student) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 text-sm">Estudante não encontrado.</p>
        <Button variant="subtle" size="sm" onClick={onBack} className="mt-4">
          Voltar para a lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={student.name}
        subtitle={`Matrícula: ${student.registration} · Turma: ${student.className} · Curso: ${student.technicalCourse}`}
        breadcrumbs={[
          { label: 'Estudantes', onClick: onBack },
          { label: student.name }
        ]}
        badge={
          <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
            {student.status === 'active' ? 'Matrícula Ativa' : student.status}
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => exportIndividualReportCardPDF(student, studentClass, assessments, grades, qualitative, attendance, settings)}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Emitir Boletim Oficial (PDF)
          </Button>
        }
      />

      {/* KPI Highlights: Annual Average, Attendance Rate, Needed Grade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Média Anual Acumulada"
          value={formatGrade(annualAvg)}
          description={`Meta de aprovação: ${formatGrade(settings.passingGrade)}`}
          subtext="Calculada com base nos bimestres consolidados"
          icon={<Award className="h-5 w-5" />}
          accentColor={annualAvg === null ? 'slate' : annualAvg >= settings.passingGrade ? 'emerald' : 'rose'}
        />

        <StatCard
          label="Frequência Escolar"
          value={`${attendanceStats.rate.toFixed(1)}%`}
          description={`${attendanceStats.absent} faltas acumuladas`}
          subtext={`Total de ${attendanceStats.total} aulas registradas`}
          icon={<Calendar className="h-5 w-5" />}
          accentColor={attendanceStats.rate < 75 ? 'rose' : 'blue'}
        />

        <StatCard
          label="Projeção para Aprovação"
          value={neededScore !== null ? formatGrade(neededScore) : '-'}
          description={neededScore === 0 ? 'Meta já atingida!' : 'Pontos necessários por bimestre restante'}
          subtext="Estimativa dinâmica segundo o plano letivo"
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="teal"
        />
      </div>

      {/* General Pedagogical Observations if present */}
      {student.observations && (
        <Card variant="subtle">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center space-x-1.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Parecer Pedagógico Geral / Observações de Matrícula</span>
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
            "{student.observations}"
          </p>
        </Card>
      )}

      {/* Bimestres Breakdown (Cards 1 to 4) */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span>Detalhamento dos Instrumentos Avaliativos por Bimestre</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(p => {
            const calc = periodResults[p];
            const pAss = classAssessments.filter(a => a.period === p);

            return (
              <Card
                key={p}
                className="flex flex-col justify-between"
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
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatGrade(calc?.regularAverage)}</span>
                  </div>
                  {calc?.recoveryGrade !== null && (
                    <div className="flex justify-between text-amber-600 font-semibold">
                      <span>Recuperação:</span>
                      <span>{formatGrade(calc?.recoveryGrade)}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Formative / Qualitative Timeline */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <HeartHandshake className="h-4 w-4 text-blue-600" />
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
      </Card>
    </div>
  );
};
