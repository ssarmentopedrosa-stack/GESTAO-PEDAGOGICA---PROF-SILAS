import React, { useState, useMemo } from 'react';
import {
  Plus,
  BookOpen,
  Calculator,
  HelpCircle,
  Download,
  Filter,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Info
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Assessment, GradeRecord, Student } from '../../types';
import { calculatePeriodGrade, calculateNeededGrade, formatGrade } from '../../utils/calculations';
import { exportGradebookToExcel, exportClassPerformancePDF } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const GradebookView: React.FC = () => {
  const {
    students,
    classes,
    assessments,
    grades,
    settings,
    selectedClassId,
    setSelectedClassId,
    selectedPeriod,
    setSelectedPeriod,
    createAssessment,
    removeAssessment,
    setGrade,
  } = useAcademic();

  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  // New assessment form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Assessment['type']>('prova');
  const [newWeight, setNewWeight] = useState<number>(5);
  const [newMaxGrade, setNewMaxGrade] = useState<number>(settings.gradeScale || 10);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  // Cell editing state: studentId + assessmentId
  const [editingCell, setEditingCell] = useState<{ studentId: string; assessmentId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editStatus, setEditStatus] = useState<GradeRecord['status']>('graded');
  const [cellError, setCellError] = useState<string | null>(null);

  // Filter students by selected class
  const classStudents = useMemo(() => {
    if (selectedClassId === 'all') {
      // Pick first class if available
      return classes.length > 0 ? students.filter(s => s.classId === classes[0].id) : students;
    }
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId, classes]);

  const activeClassId = selectedClassId === 'all' && classes.length > 0 ? classes[0].id : selectedClassId;
  const currentClass = classes.find(c => c.id === activeClassId);

  // Filter assessments for this class and active period
  const periodAssessments = useMemo(() => {
    return assessments.filter(a => a.classId === activeClassId && a.period === selectedPeriod);
  }, [assessments, activeClassId, selectedPeriod]);

  // Handle cell click to edit
  const handleStartEdit = (studentId: string, assessmentId: string) => {
    const current = grades.find(g => g.studentId === studentId && g.assessmentId === assessmentId);
    setEditingCell({ studentId, assessmentId });
    setEditValue(current?.value !== null && current?.value !== undefined ? String(current.value).replace('.', ',') : '');
    setEditStatus(current?.status || 'graded');
    setCellError(null);
  };

  // Commit grade save respecting assessment maxGrade and gradeScale with strict validation (no silent truncation)
  const handleSaveGrade = async () => {
    if (!editingCell) return;
    const { studentId, assessmentId } = editingCell;

    const currentAss = assessments.find(a => a.id === assessmentId);
    const maxAllowed = currentAss?.maxGrade ?? (settings.gradeScale || 10);

    let parsedVal: number | null = null;
    let finalStatus: GradeRecord['status'] = editStatus;

    if (editStatus === 'absent') {
      parsedVal = 0;
    } else if (editStatus === 'excused' || editStatus === 'not_applicable') {
      parsedVal = null;
    } else if (editStatus === 'pending') {
      parsedVal = null;
    } else {
      // graded
      if (editValue.trim() === '') {
        parsedVal = null;
        finalStatus = 'pending';
      } else {
        const num = parseFloat(editValue.replace(',', '.'));
        if (isNaN(num)) {
          setCellError('Valor inválido.');
          return;
        }
        if (num < 0 || num > maxAllowed) {
          setCellError(`Nota deve estar entre 0 e ${maxAllowed}.`);
          return;
        }
        parsedVal = Number(num.toFixed(2));
        finalStatus = 'graded';
      }
    }

    setCellError(null);
    await setGrade(assessmentId, studentId, activeClassId, selectedPeriod, parsedVal, finalStatus);
    setEditingCell(null);
  };

  // Handle Assessment submission
  const handleAddAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createAssessment({
      title: newTitle.trim(),
      classId: activeClassId,
      period: selectedPeriod,
      type: newType,
      maxGrade: newMaxGrade || settings.gradeScale || 10,
      weight: newWeight || 1,
      date: newDate,
      notes: newNotes,
      academicYear: settings.academicYear
    });

    setIsAssessmentModalOpen(false);
    setNewTitle('');
    setNewNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Diário de Notas Quantitativas
            </h2>
            <Badge variant="info">
              {currentClass?.name || 'Selecione uma turma'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Planilha dinâmica de notas com edição ágil de células, cálculo transparente de médias e recuperação paralela.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Formula Info Toggle */}
          <button
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
            <span>Critérios de Cálculo</span>
          </button>

          {/* Export Class Gradebook to Excel */}
          {currentClass && (
            <button
              onClick={() => exportGradebookToExcel(currentClass, classStudents, assessments, grades, selectedPeriod, settings)}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          )}

          {/* Export ATA PDF */}
          {currentClass && (
            <button
              onClick={() => exportClassPerformancePDF(currentClass, classStudents, assessments, grades, selectedPeriod, settings)}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Ata PDF</span>
            </button>
          )}

          {/* New Assessment */}
          <button
            onClick={() => setIsAssessmentModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Avaliação</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar if 'all' was active or switching */}
      {selectedClassId === 'all' && (
        <div className="flex items-center space-x-2 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Visão de Turma Ativa:</strong> O filtro geral está em &quot;Todas as Turmas&quot;. Para segurança pedagógica e integridade dos pesos avaliativos, o diário exibe <strong>{currentClass?.name}</strong>. Alterne a turma desejada no seletor abaixo:
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Turma em Exibição:
          </label>
          <select
            value={activeClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.technicalCourse})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-500">Período:</span>
          {[1, 2, 3, 4].map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                selectedPeriod === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {p}º Bimestre
            </button>
          ))}
        </div>
      </div>

      {/* Formula Transparency Callout */}
      {showFormulaInfo && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 text-xs text-indigo-950 dark:text-indigo-200 space-y-2">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center space-x-1.5 text-indigo-900 dark:text-indigo-300">
              <Calculator className="h-4 w-4" />
              <span>Transparência Pedagógica: Regras de Cálculo do Diário</span>
            </span>
            <button onClick={() => setShowFormulaInfo(false)} className="text-indigo-600 dark:text-indigo-400 font-normal hover:underline">
              Fechar
            </button>
          </div>
          <p>
            • <strong>Modo Ativo:</strong> {settings.calculationMode === 'weighted' ? 'Média Ponderada' : 'Média Aritmética Simples'}.
          </p>
          <p>
            • <strong>Fórmula da Média Ponderada:</strong> Média = ∑(Nota × Peso) / ∑(Pesos válidos).
          </p>
          <p>
            • <strong>Regra de Recuperação Paralela:</strong> {settings.recoveryPolicy === 'replaces_if_higher' ? 'A nota de recuperação substitui a média regular apenas se for superior.' : 'A nota de recuperação compõe nova média ponderada com a anterior.'} (As notas originais são permanentemente mantidas no histórico).
          </p>
          <p>
            • <strong>Distinção de Estados:</strong> Atividades pendentes e dispensadas não são transformadas silenciosamente em zero. Falta injustificada pontua 0 com registro do evento.
          </p>
        </div>
      )}

      {/* Spreadsheet Matrix Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="px-3 py-3 border-b border-r border-slate-200 dark:border-slate-700 w-10 text-center font-bold">
                  Nº
                </th>
                <th className="px-3 py-3 border-b border-r border-slate-200 dark:border-slate-700 w-24 font-mono font-bold">
                  Matrícula
                </th>
                <th className="px-3 py-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px] font-bold">
                  Nome do Estudante
                </th>

                {/* Dynamically rendered Assessment Columns */}
                {periodAssessments.map(ass => (
                  <th
                    key={ass.id}
                    className="px-3 py-2 border-b border-r border-slate-200 dark:border-slate-700 min-w-[130px] text-center group relative"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate" title={ass.title}>
                      {ass.title}
                    </div>
                    <div className="flex items-center justify-center space-x-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="uppercase font-semibold">{ass.type}</span>
                      <span>•</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">Peso {ass.weight}</span>
                    </div>

                    {/* Quick remove assessment trigger */}
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a avaliação "${ass.title}" e todas as notas lançadas nela?`)) {
                          removeAssessment(ass.id);
                        }
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-0.5 transition"
                      title="Excluir instrumento avaliativo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </th>
                ))}

                {/* Calculated Result Columns */}
                <th className="px-3 py-3 border-b border-r border-slate-200 dark:border-slate-700 w-24 text-center font-bold bg-slate-50 dark:bg-slate-800">
                  Média Reg.
                </th>
                <th className="px-3 py-3 border-b border-r border-slate-200 dark:border-slate-700 w-24 text-center font-bold bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                  Recup.
                </th>
                <th className="px-3 py-3 border-b border-r border-slate-200 dark:border-slate-700 w-28 text-center font-bold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200">
                  Média Final
                </th>
                <th className="px-3 py-3 border-b border-slate-200 dark:border-slate-700 w-28 text-center font-bold">
                  Situação
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-sans">
              {classStudents.map((student, index) => {
                const calc = calculatePeriodGrade(
                  selectedPeriod,
                  periodAssessments,
                  grades,
                  student.id,
                  settings.calculationMode,
                  settings.recoveryPolicy
                );

                return (
                  <tr key={student.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/15 transition-colors">
                    <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100 dark:border-slate-800">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-100 dark:border-slate-800">
                      {student.registration}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">
                      {student.name}
                      {student.status !== 'active' && (
                        <span className="ml-1 text-[10px] text-amber-600 font-semibold">({student.status})</span>
                      )}
                    </td>

                    {/* Grade values for each assessment */}
                    {periodAssessments.map(ass => {
                      const gradeObj = grades.find(g => g.studentId === student.id && g.assessmentId === ass.id);
                      const isEditing = editingCell?.studentId === student.id && editingCell?.assessmentId === ass.id;

                      let cellText = '-';
                      let statusBadge = null;

                      if (gradeObj) {
                        if (gradeObj.status === 'graded' && typeof gradeObj.value === 'number') {
                          cellText = formatGrade(gradeObj.value);
                        } else if (gradeObj.status === 'pending') {
                          cellText = 'Pendente';
                          statusBadge = 'text-amber-500';
                        } else if (gradeObj.status === 'absent') {
                          cellText = 'Falta (0,0)';
                          statusBadge = 'text-rose-500 font-semibold';
                        } else if (gradeObj.status === 'excused') {
                          cellText = 'Dispensa';
                          statusBadge = 'text-sky-500';
                        } else if (gradeObj.status === 'not_applicable') {
                          cellText = 'N/A';
                          statusBadge = 'text-slate-400 font-medium';
                        }
                      }

                      const maxAllowed = ass.maxGrade || settings.gradeScale || 10;
                      return (
                        <td
                          key={ass.id}
                          onClick={() => handleStartEdit(student.id, ass.id)}
                          className={`px-2 py-1.5 text-center border-r border-slate-100 dark:border-slate-800 cursor-pointer transition select-none ${
                            isEditing
                              ? 'bg-indigo-100/70 dark:bg-indigo-900/50 ring-2 ring-indigo-500 ring-inset'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col space-y-1 p-1 bg-white dark:bg-slate-800 rounded-md shadow-md border border-indigo-400 min-w-[110px]">
                              <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold px-0.5">
                                <span>Máx: {maxAllowed}</span>
                                <span>P: {ass.weight}</span>
                              </div>
                              <input
                                type="text"
                                autoFocus
                                value={editValue}
                                placeholder={`0 a ${maxAllowed}`}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  setCellError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveGrade();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className={`w-full text-center text-xs font-bold py-1 border rounded-sm bg-white dark:bg-slate-900 focus:outline-hidden ${
                                  cellError ? 'border-rose-500 bg-rose-50/40 text-rose-700' : 'border-slate-300 dark:border-slate-600'
                                }`}
                              />
                              {cellError && (
                                <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold px-0.5 leading-tight text-center">
                                  {cellError}
                                </span>
                              )}
                              <div className="flex items-center justify-between text-[10px] space-x-1">
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value as any)}
                                  className="text-[10px] bg-slate-100 dark:bg-slate-700 rounded-sm px-1 py-0.5 border border-slate-300 dark:border-slate-600"
                                >
                                  <option value="graded">Nota</option>
                                  <option value="pending">Pendente</option>
                                  <option value="absent">Falta (0,0)</option>
                                  <option value="excused">Falta Justificada</option>
                                  <option value="not_applicable">Dispensado (N/A)</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={handleSaveGrade}
                                  className="bg-indigo-600 text-white px-2 py-0.5 rounded-sm hover:bg-indigo-700 font-bold"
                                >
                                  OK
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className={`font-mono text-xs ${statusBadge || (gradeObj?.value !== null && (gradeObj?.value || 0) < settings.passingGrade ? 'text-rose-600 font-bold' : 'text-slate-800 dark:text-slate-200 font-semibold')}`}>
                              {cellText}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Regular Average */}
                    <td className="px-3 py-2 text-center font-mono font-bold text-xs bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800">
                      {formatGrade(calc.regularAverage)}
                    </td>

                    {/* Recovery Grade */}
                    <td className="px-3 py-2 text-center font-mono font-semibold text-xs text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 border-r border-slate-100 dark:border-slate-800">
                      {formatGrade(calc.recoveryGrade)}
                    </td>

                    {/* Final Average */}
                    <td className={`px-3 py-2 text-center font-mono font-bold text-xs border-r border-slate-100 dark:border-slate-800 ${
                      calc.finalAverage === null
                        ? 'text-slate-400'
                        : calc.finalAverage >= settings.passingGrade
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                    }`}>
                      {formatGrade(calc.finalAverage)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-2 text-center">
                      {calc.finalAverage === null ? (
                        <span className="text-[10px] text-slate-400">Em Aberto</span>
                      ) : calc.finalAverage >= settings.passingGrade ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                          Aprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-rose-100 dark:bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-300">
                          Abaixo ({formatGrade(settings.passingGrade - calc.finalAverage)} pts)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Instruction Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 gap-2">
        <span>
          💡 <strong>Dica de uso:</strong> Clique em qualquer célula para digitar a nota (ex: 8,5 ou 9.0) ou selecionar falta/dispensa. Pressione Enter para salvar instantaneamente.
        </span>
        <span className="font-mono">
          {classStudents.length} alunos listados nesta turma
        </span>
      </div>

      {/* New Assessment Modal */}
      <Modal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        title={`Cadastrar Instrumento Avaliativo • ${selectedPeriod}º Bimestre`}
        maxWidth="lg"
      >
        <form onSubmit={handleAddAssessmentSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nome da Avaliação *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: P1 - Prova Bimestral de Termodinâmica"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tipo da Atividade
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="prova">Prova Teórica / Prática</option>
                <option value="trabalho">Trabalho / Relatório Laboratorial</option>
                <option value="projeto">Projeto Técnico Integrador</option>
                <option value="atividade">Atividade em Sala / Lista</option>
                <option value="participacao">Participação / Engajamento</option>
                <option value="recuperacao">Recuperação Paralela Bimestral</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Peso na Média Ponderada *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="1"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nota Máxima
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={newMaxGrade}
                onChange={(e) => setNewMaxGrade(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Data da Aplicação
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Orientações ou Observações Pedagógicas (Opcional)
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Ex: Permitido uso de formulário oficial e calculadora científica..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAssessmentModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Cadastrar Avaliação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
