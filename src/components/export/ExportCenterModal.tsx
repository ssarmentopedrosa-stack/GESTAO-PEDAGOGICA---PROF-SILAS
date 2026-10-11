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
  downloadSampleSpreadsheetTemplate
} from '../../utils/exportUtils';
import { Modal } from '../common/Modal';

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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold"
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
            Formato de Saída:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                format === 'xlsx'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                format === 'csv'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Download className="h-4 w-4" />
              <span>CSV (Excel UTF-8)</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                format === 'pdf'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>PDF Pronto p/ Impressão</span>
            </button>
          </div>
        </div>

        {/* Document Action Cards */}
        <div className="space-y-3">
          {/* Diário Completo de Notas */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Diário Completo de Notas / Ata de Rendimento
              </strong>
              <span className="text-[11px] text-slate-500">
                Matriz de notas com pesos, faltas, médias regulares e de recuperação da turma selecionada.
              </span>
            </div>
            <button
              onClick={handleExportGradebook}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0"
            >
              Baixar Agora
            </button>
          </div>

          {/* Lista de Alunos */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Listagem Nominal e Cadastral dos Alunos
              </strong>
              <span className="text-[11px] text-slate-500">
                Matrículas, nomes completos, cursos técnicos e telefones dos responsáveis.
              </span>
            </div>
            <button
              onClick={handleExportClassList}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
            >
              Baixar Agora
            </button>
          </div>

          {/* Modelo em Branco */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <div>
              <strong className="text-xs text-slate-900 dark:text-white block">
                Modelos Padronizados para Preenchimento Offline
              </strong>
              <span className="text-[11px] text-slate-500">
                Planilhas modelo com cabeçalhos pré-formatados e exemplos demonstrativos fictícios.
              </span>
            </div>
            <button
              onClick={() => downloadSampleSpreadsheetTemplate('xlsx')}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0"
            >
              Baixar Modelo
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
