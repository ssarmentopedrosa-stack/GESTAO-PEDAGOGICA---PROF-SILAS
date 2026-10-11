import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  X,
  RefreshCw,
  Layers,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { Student, GradeRecord } from '../../types';
import {
  readSpreadsheetFile,
  extractSheetData,
  autoDetectColumnMappings,
  processImportRows,
  ColumnMapping,
  TargetField,
  ParsedSpreadsheet,
  ParsedRowResult
} from '../../utils/importUtils';
import { downloadSampleSpreadsheetTemplate } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({ isOpen, onClose }) => {
  const { students, classes, selectedPeriod, importStudentsBulk, showToast } = useAcademic();
  const { effectiveUid } = useAuth();

  // Wizard Step: 1 to 8
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  const [sheetData, setSheetData] = useState<ParsedSpreadsheet | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [processedRows, setProcessedRows] = useState<ParsedRowResult[]>([]);
  const [defaultClassId, setDefaultClassId] = useState<string>(classes[0]?.id || '');
  const [importMode, setImportMode] = useState<'add' | 'update' | 'merge'>('merge');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<{ added: number; updated: number; rejected: number } | null>(null);

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setHeaderRowIdx(0);
    setSheetData(null);
    setMappings([]);
    setProcessedRows([]);
    setFinalReport(null);
  };

  // Step 1: File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsLoading(true);

    try {
      const { workbook: wb, sheetNames: sheets } = await readSpreadsheetFile(selected);
      setWorkbook(wb);
      setSheetNames(sheets);
      setSelectedSheet(sheets[0] || '');

      const parsed = extractSheetData(wb, sheets[0], 0);
      setSheetData(parsed);

      const detected = autoDetectColumnMappings(parsed.headers);
      setMappings(detected);

      setStep(2);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar planilha.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Sheet Selected -> next to Step 3
  const handleSheetConfirm = () => {
    if (!workbook || !selectedSheet) return;
    const parsed = extractSheetData(workbook, selectedSheet, headerRowIdx);
    setSheetData(parsed);
    const detected = autoDetectColumnMappings(parsed.headers);
    setMappings(detected);
    setStep(3);
  };

  // Step 3: Header Row confirmed -> next to Step 4 (Mapping)
  const handleHeaderRowConfirm = () => {
    if (!workbook || !selectedSheet) return;
    const parsed = extractSheetData(workbook, selectedSheet, headerRowIdx);
    setSheetData(parsed);
    const detected = autoDetectColumnMappings(parsed.headers);
    setMappings(detected);
    setStep(4);
  };

  // Step 4: Column Mapping confirmed -> Process and Validate to Step 5 (Preview) & 6/7
  const handleProcessValidation = () => {
    if (!sheetData) return;
    const chosenClass = classes.find(c => c.id === defaultClassId) || classes[0];
    const results = processImportRows(
      sheetData.rawData,
      headerRowIdx,
      mappings,
      students,
      chosenClass?.id || 'cls-default',
      chosenClass?.name || '1º Ano A',
      effectiveUid
    );
    setProcessedRows(results);
    setStep(5);
  };

  // Step 8: Execute Import
  const handleExecuteImport = async () => {
    setIsLoading(true);
    try {
      const chosenClass = classes.find(c => c.id === defaultClassId) || classes[0];

      // Filter based on selected strategy
      const validRows = processedRows.filter(r => r.errors.length === 0);
      const rejectedCount = processedRows.length - validRows.length;

      const candidates: Student[] = [];
      const gradesToCreate: GradeRecord[] = [];

      validRows.forEach(r => {
        if (importMode === 'add' && r.isExistingMatch) return; // Skip existing
        if (importMode === 'update' && !r.isExistingMatch) return; // Skip new

        const st: Student = {
          id: r.mappedStudent.id || `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: r.mappedStudent.name || 'Estudante',
          registration: r.mappedStudent.registration || `TEMP-${Date.now()}`,
          academicYear: 2026,
          classId: chosenClass?.id || 'cls-default',
          className: chosenClass?.name || 'Turma',
          gradeYear: chosenClass?.gradeYear || '1º Ano',
          technicalCourse: chosenClass?.technicalCourse || 'Geral',
          status: r.mappedStudent.status || 'active',
          email: r.mappedStudent.email || '',
          guardianContact: r.mappedStudent.guardianContact || '',
          observations: r.mappedStudent.observations || '',
          teacherUid: effectiveUid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        candidates.push(st);

        // Map grades if present
        if (r.gradesToImport?.p1 !== undefined) {
          gradesToCreate.push({
            id: `ass-${chosenClass?.id}-b${selectedPeriod}-p1_${st.id}`,
            assessmentId: `ass-${chosenClass?.id}-b${selectedPeriod}-p1`,
            studentId: st.id,
            classId: chosenClass?.id || '',
            period: selectedPeriod,
            value: r.gradesToImport.p1,
            status: 'graded',
            teacherUid: effectiveUid
          });
        }
      });

      const { added, updated } = await importStudentsBulk(candidates, gradesToCreate);
      setFinalReport({ added, updated, rejected: rejectedCount });
      setStep(8);
    } catch (err: any) {
      alert(`Falha durante a importação: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const errorRowsCount = processedRows.filter(r => r.errors.length > 0).length;
  const duplicateRegistrationsCount = processedRows.filter(r => r.isDuplicateRegistration).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetWizard();
        onClose();
      }}
      title={`Assistente de Importação Inteligente (Etapa ${step} de 8)`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
          {[
            { n: 1, title: 'Upload' },
            { n: 2, title: 'Aba' },
            { n: 3, title: 'Cabeçalho' },
            { n: 4, title: 'Mapeamento' },
            { n: 5, title: 'Amostra' },
            { n: 6, title: 'Validação' },
            { n: 7, title: 'Estratégia' },
            { n: 8, title: 'Conclusão' },
          ].map(s => (
            <div key={s.n} className="flex flex-col items-center">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === s.n
                    ? 'bg-indigo-600 text-white'
                    : step > s.n
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span className={`text-[10px] mt-1 hidden sm:block ${step === s.n ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* ================= STEP 1: UPLOAD ================= */}
        {step === 1 && (
          <div className="space-y-6 text-center py-6">
            <div className="max-w-md mx-auto border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 hover:border-indigo-400 transition bg-slate-50/50 dark:bg-slate-800/30">
              <Upload className="h-12 w-12 text-indigo-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Selecione o arquivo da sua planilha
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Formatos compatíveis: .xlsx, .xls ou .csv (até centenas de estudantes)
              </p>
              <label className="inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer shadow-xs">
                <span>Procurar no Computador</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Model Templates Download */}
            <div className="max-w-md mx-auto pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold mb-2">Precisa de um modelo padrão de planilha?</p>
              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => downloadSampleSpreadsheetTemplate('xlsx')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Baixar Modelo Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleSpreadsheetTemplate('csv')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar Modelo CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SHEET SELECTION ================= */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Etapa 2: Selecionar a Aba da Planilha
              </h3>
              <p className="text-xs text-slate-500">
                O arquivo contém as seguintes abas. Escolha qual contém a listagem dos estudantes:
              </p>
            </div>

            <div className="space-y-2">
              {sheetNames.map(name => (
                <label
                  key={name}
                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedSheet === name
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="sheet"
                    checked={selectedSheet === name}
                    onChange={() => setSelectedSheet(name)}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-xs">{name}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSheetConfirm}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Avançar para Cabeçalho
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: HEADER ROW DETECTION ================= */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Etapa 3: Identificar a Linha do Cabeçalho
              </h3>
              <p className="text-xs text-slate-500">
                Informe em qual linha estão os títulos das colunas (geralmente a Linha 1):
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Linha do Cabeçalho:
              </label>
              <select
                value={headerRowIdx}
                onChange={(e) => setHeaderRowIdx(Number(e.target.value))}
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {[0, 1, 2, 3, 4].map(idx => (
                  <option key={idx} value={idx}>Linha {idx + 1}</option>
                ))}
              </select>
            </div>

            {/* Quick Preview of Header Titles */}
            {sheetData && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
                  Colunas detectadas nesta linha:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sheetData.rawData[headerRowIdx]?.map((col: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                      {String(col || `Col ${i + 1}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleHeaderRowConfirm}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Avançar para Mapeamento
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: COLUMN MAPPING ================= */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Etapa 4: Mapear Colunas da Planilha para os Campos do Sistema
              </h3>
              <p className="text-xs text-slate-500">
                O sistema detectou automaticamente as correspondências. Revise e ajuste conforme necessário:
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Turma padrão de destino:
              </span>
              <select
                value={defaultClassId}
                onChange={(e) => setDefaultClassId(e.target.value)}
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[340px] overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              {mappings.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="w-1/2 pr-2">
                    <span className="font-mono text-slate-500 text-[11px] block">Coluna {idx + 1}:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{m.columnHeader}</strong>
                  </div>
                  <div className="w-1/2">
                    <select
                      value={m.targetField}
                      onChange={(e) => {
                        const target = e.target.value as TargetField;
                        setMappings(prev => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], targetField: target };
                          return copy;
                        });
                      }}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="ignore">-- Ignorar esta coluna --</option>
                      <option value="name">Nome Completo do Aluno (Obrigatório)</option>
                      <option value="registration">Matrícula / Código Escolar</option>
                      <option value="className">Nome da Turma</option>
                      <option value="gradeYear">Série (1º, 2º ou 3º Ano)</option>
                      <option value="technicalCourse">Curso Técnico</option>
                      <option value="status">Situação (Ativo/Transferido)</option>
                      <option value="email">E-mail</option>
                      <option value="guardianContact">Contato do Responsável</option>
                      <option value="observations">Observações</option>
                      <option value="gradeP1">Nota Avaliação 1 (P1)</option>
                      <option value="gradeT1">Nota Avaliação 2 (T1)</option>
                      <option value="gradeRec">Nota de Recuperação</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleProcessValidation}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Avançar para Visualização & Validação
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5, 6 & 7: PREVIEW, VALIDATION & STRATEGY ================= */}
        {(step === 5 || step === 6 || step === 7) && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {step === 5 ? 'Etapa 5: Amostra dos Dados Mapeados' : step === 6 ? 'Etapa 6: Diagnóstico de Validação & Erros' : 'Etapa 7: Estratégia de Importação & Confirmação'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 5 ? `Total de ${processedRows.length} linhas processadas na planilha.` : step === 6 ? 'Verifique possíveis inconsistências ou duplicidades detectadas.' : 'Escolha como tratar registros novos vs já cadastrados.'}
              </p>
            </div>

            {/* Validation summary banner */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {processedRows.filter(r => r.errors.length === 0).length} Linhas Válidas
              </span>
              {errorRowsCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  {errorRowsCount} Linhas com Erros Críticos
                </span>
              )}
              {duplicateRegistrationsCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200">
                  {duplicateRegistrationsCount} Matrículas Duplicadas
                </span>
              )}
            </div>

            {/* Step 7 Strategy Choice */}
            {step === 7 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Selecione o Modo de Importação:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-lg border cursor-pointer text-xs transition ${importMode === 'merge' ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xs' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mr-2 text-indigo-600"
                    />
                    <strong className="block">Mesclar (Recomendado)</strong>
                    <span className="text-slate-500 text-[11px]">Adiciona estudantes novos e atualiza dados dos já cadastrados.</span>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer text-xs transition ${importMode === 'add' ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xs' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={importMode === 'add'}
                      onChange={() => setImportMode('add')}
                      className="mr-2 text-indigo-600"
                    />
                    <strong className="block">Apenas Adicionar</strong>
                    <span className="text-slate-500 text-[11px]">Insere somente estudantes inexistentes, ignora os já matriculados.</span>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer text-xs transition ${importMode === 'update' ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-xs' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={importMode === 'update'}
                      onChange={() => setImportMode('update')}
                      className="mr-2 text-indigo-600"
                    />
                    <strong className="block">Apenas Atualizar</strong>
                    <span className="text-slate-500 text-[11px]">Atualiza notas e cadastros existentes pela matrícula.</span>
                  </label>
                </div>
              </div>
            )}

            {/* Table sample */}
            <div className="max-h-[280px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Linha</th>
                    <th className="px-3 py-2">Matrícula</th>
                    <th className="px-3 py-2">Nome Mapeado</th>
                    <th className="px-3 py-2">Situação / Validação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {processedRows.slice(0, 50).map(r => (
                    <tr key={r.rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{r.rowIndex}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">{r.mappedStudent.registration}</td>
                      <td className="px-3 py-1.5 font-medium">{r.mappedStudent.name}</td>
                      <td className="px-3 py-1.5">
                        {r.errors.length > 0 ? (
                          <span className="text-rose-600 font-semibold text-[11px]">{r.errors.join(', ')}</span>
                        ) : r.warnings.length > 0 ? (
                          <span className="text-amber-600 text-[11px]">{r.warnings.join(', ')}</span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium">✓ Pronto para importar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              {step < 7 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {isLoading ? 'Importando...' : 'Confirmar e Executar Importação'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 8: FINAL SUMMARY REPORT ================= */}
        {step === 8 && finalReport && (
          <div className="space-y-6 text-center py-6">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Importação Concluída com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Os dados da planilha foram integrados ao sistema Gestão Escolar PRO.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xl font-bold text-emerald-600">{finalReport.added}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Novos Adicionados</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xl font-bold text-indigo-600">{finalReport.updated}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Atualizados</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xl font-bold text-rose-600">{finalReport.rejected}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Rejeitados/Erros</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  resetWizard();
                  onClose();
                }}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
              >
                Fechar Assistente e Ver Dados
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
