import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  Award,
  Filter
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import {
  exportStudentsToExcel,
  exportStudentsToCSV,
  exportGradebookToExcel,
  exportClassPerformancePDF,
  exportIndividualReportCardPDF,
  downloadSampleSpreadsheetTemplate
} from '../../utils/exportUtils';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface ExportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    classes,
    students,
    assessments,
    grades,
    qualitative,
    attendance,
    settings,
    selectedClassId,
    selectedPeriod
  } = useAcademic();

  const [exportTargetClassId, setExportTargetClassId] = useState<string>(selectedClassId === 'all' && classes.length > 0 ? classes[0].id : selectedClassId);
  const [exportPeriod, setExportPeriod] = useState<number>(selectedPeriod);
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');

  const targetClass = classes.find(c => c.id === exportTargetClassId) || classes[0];
  const targetClassStudents = targetClass ? students.filter(s => s.classId === targetClass.id) : students;
  const [selectedStudentId, setSelectedStudentId] = useState<string>(targetClassStudents[0]?.id || '');

  const handleExportClassList = () => {
    if (format === 'xlsx') {
      exportStudentsToExcel(targetClassStudents, targetClass?.name);
    } else {
      exportStudentsToCSV(targetClassStudents, targetClass?.name);
    }
    onClose();
  };

  const handleExportGradebook = () => {
    if (!targetClass) return;
    if (format === 'pdf') {
      exportClassPerformancePDF(targetClass, targetClassStudents, assessments, grades, exportPeriod, settings);
    } else {
      exportGradebookToExcel(targetClass, targetClassStudents, assessments, grades, exportPeriod, settings);
    }
    onClose();
  };

  const handleExportStudentPDF = () => {
    const st = students.find(s => s.id === (selectedStudentId || targetClassStudents[0]?.id));
    if (!st) return;
    exportIndividualReportCardPDF(st, targetClass, assessments, grades, qualitative, attendance, settings);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Central de Exportação & Emissão de Documentos"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Filters Context */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Turma Selecionada
            </label>
            <select
              value={exportTargetClassId}
              onChange={(e) => setExportTargetClassId(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Bimestre / Período
            </label>
            <select
              value={exportPeriod}
              onChange={(e) => setExportPeriod(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4].map(p => (
                <option key={p} value={p}>{p}º Bimestre</option>
              ))}
            </select>
          </div>
        </div>

        {/* Format Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            Formato Padrão de Saída:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                format === 'xlsx'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                format === 'csv'
                  ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Download className="h-4 w-4" />
              <span>CSV (UTF-8)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                format === 'pdf'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>PDF A4 Oficial</span>
            </button>
          </div>
        </div>

        {/* Document Action Cards */}
        <div className="space-y-3">
          {/* Boletim Individual (PDF A4) */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <strong className="text-xs text-blue-950 dark:text-blue-200 block">
                Boletim Individual do Estudante (PDF A4 Oficial)
              </strong>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-2">
                Documento A4 completo com notas dos bimestres, frequência detalhada, acompanhamento qualitativo e observações pedagógicas.
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Aluno:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 max-w-[240px] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  {targetClassStudents.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.registration})</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportStudentPDF}
              className="shrink-0"
            >
              Emitir Boletim A4
            </Button>
          </div>

          {/* Diário Completo de Notas */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Diário Completo de Notas / Ata de Rendimento
              </strong>
              <span className="text-[11px] text-slate-500">
                Matriz de notas com pesos, faltas, médias regulares e de recuperação da turma selecionada.
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportGradebook}
              className="shrink-0"
            >
              Baixar Agora
            </Button>
          </div>

          {/* Lista de Alunos */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Listagem Nominal e Cadastral dos Alunos
              </strong>
              <span className="text-[11px] text-slate-500">
                Matrículas, nomes completos, cursos técnicos e telefones dos responsáveis.
              </span>
            </div>
            <Button
              variant="success"
              size="sm"
              onClick={handleExportClassList}
              className="shrink-0"
            >
              Baixar Agora
            </Button>
          </div>

          {/* Modelo em Branco */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Modelos Padronizados para Preenchimento Offline
              </strong>
              <span className="text-[11px] text-slate-500">
                Planilhas modelo com cabeçalhos pré-formatados para importação em massa.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSampleSpreadsheetTemplate('xlsx')}
              className="shrink-0"
            >
              Baixar Modelo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
