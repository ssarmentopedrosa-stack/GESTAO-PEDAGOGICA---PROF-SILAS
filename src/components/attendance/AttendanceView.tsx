import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Save,
  Users,
  Download
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { AttendanceStatus } from '../../types';
import { Badge } from '../common/Badge';
import { PageHeader } from '../common/PageHeader';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';

export const AttendanceView: React.FC = () => {
  const {
    students,
    classes,
    attendance,
    selectedClassId,
    setSelectedClassId,
    recordAttendance,
    showToast
  } = useAcademic();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lessonTopic, setLessonTopic] = useState<string>('Leis de Newton e Dinâmica de Sistemas');
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus; notes?: string }>>({});
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  const activeClassId = selectedClassId === 'all' && classes.length > 0 ? classes[0].id : selectedClassId;
  const currentClass = classes.find(c => c.id === activeClassId);

  const classStudents = useMemo(() => {
    return students.filter(s => s.classId === activeClassId);
  }, [students, activeClassId]);

  // Load existing records for this class & date
  useMemo(() => {
    const existing = attendance.find(a => a.classId === activeClassId && a.date === date);
    if (existing) {
      setLocalRecords(existing.records);
      setLessonTopic(existing.lessonTopic || '');
    } else {
      // Default everyone to 'present' for fast roll call
      const init: Record<string, { status: AttendanceStatus }> = {};
      classStudents.forEach(st => {
        init[st.id] = { status: 'present' };
      });
      setLocalRecords(init);
    }
  }, [activeClassId, date, attendance, classStudents]);

  // Handle single student status toggle
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setLocalRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  // Mark all as present
  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus }> = {};
    classStudents.forEach(st => {
      updated[st.id] = { status: 'present' };
    });
    setLocalRecords(updated);
    showToast('Todos os estudantes foram marcados como presentes.');
  };

  // Save attendance
  const handleSave = async () => {
    setIsSavingLocal(true);
    try {
      await recordAttendance(activeClassId, date, localRecords, lessonTopic);
      showToast('Registro de chamada salvo com sucesso!');
    } finally {
      setIsSavingLocal(false);
    }
  };

  // Stats for the active day
  const dayStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let justified = 0;
    let late = 0;

    classStudents.forEach(st => {
      const stRec = localRecords[st.id]?.status || 'present';
      if (stRec === 'present') present++;
      else if (stRec === 'absent') absent++;
      else if (stRec === 'justified') justified++;
      else if (stRec === 'late') late++;
    });

    const total = classStudents.length;
    const rate = total > 0 ? ((present + justified + late) / total) * 100 : 100;

    return { total, present, absent, justified, late, rate };
  }, [classStudents, localRecords]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Diário de Frequência Escolar & Chamada"
        subtitle="Registro diário de presença, faltas justificadas e cálculo do percentual de assiduidade."
        badge={
          <Badge variant="info">
            {currentClass?.name || 'Selecione uma turma'}
          </Badge>
        }
        actions={
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            isLoading={isSavingLocal}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Salvar Chamada
          </Button>
        }
      />

      {/* Date & Class Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Turma
          </label>
          <select
            value={activeClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Data da Aula
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Conteúdo / Tópico Ministrado
          </label>
          <input
            type="text"
            value={lessonTopic}
            onChange={(e) => setLessonTopic(e.target.value)}
            placeholder="Ex: Cinemática Vetorial e Aplicações Técnicas..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Daily Summary Counters & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Resumo do Dia:
          </span>
          <Badge variant="success">
            {dayStats.present} Presentes
          </Badge>
          <Badge variant="danger">
            {dayStats.absent} Faltas
          </Badge>
          <Badge variant="info">
            {dayStats.justified} Justificadas
          </Badge>
          <Badge variant="warning">
            {dayStats.late} Atrasos
          </Badge>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            ({dayStats.rate.toFixed(0)}% Assiduidade)
          </span>
        </div>

        <Button
          variant="subtle"
          size="sm"
          onClick={handleMarkAllPresent}
        >
          Marcar Todos como Presentes
        </Button>
      </div>

      {/* Student Attendance List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {classStudents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Nenhum estudante nesta turma"
              description="Cadastre ou importe estudantes para realizar a chamada."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">Nº</th>
                  <th className="px-4 py-3 w-28">Matrícula</th>
                  <th className="px-4 py-3">Nome do Estudante</th>
                  <th className="px-4 py-3 text-center">Estado da Frequência</th>
                  <th className="px-4 py-3">Justificativa / Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {classStudents.map((st, idx) => {
                  const currentStatus = localRecords[st.id]?.status || 'present';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">
                        {st.registration}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                        {st.name}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'present')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'absent')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-red-700'
                            }`}
                          >
                            F
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'justified')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              currentStatus === 'justified'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-blue-700'
                            }`}
                          >
                            FJ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(st.id, 'late')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              currentStatus === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-amber-700'
                            }`}
                          >
                            A
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={localRecords[st.id]?.notes || ''}
                          onChange={(e) => {
                            setLocalRecords(prev => ({
                              ...prev,
                              [st.id]: {
                                ...prev[st.id],
                                status: prev[st.id]?.status || 'present',
                                notes: e.target.value
                              }
                            }));
                          }}
                          placeholder="Anotar justificativa, atestado ou motivo do atraso..."
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
