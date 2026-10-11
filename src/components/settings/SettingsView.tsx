import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Database,
  Download,
  Upload,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { useAuth } from '../../context/AuthContext';
import { CalculationMode, RecoveryPolicy } from '../../types';
import { runCalculationTests } from '../../utils/calculations.test';
import { Badge } from '../common/Badge';

export const SettingsView: React.FC = () => {
  const {
    settings,
    saveSettingsConfig,
    loadSeed430Students,
    clearWorkspace,
    students,
    classes,
    assessments,
    grades,
    qualitative,
    attendance,
    showToast,
    isSaving
  } = useAcademic();

  const { effectiveUid, firestoreConnected } = useAuth();

  // Settings form state
  const [passingGrade, setPassingGrade] = useState<number>(settings.passingGrade);
  const [gradeScale, setGradeScale] = useState<number>(settings.gradeScale);
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(settings.calculationMode);
  const [recoveryPolicy, setRecoveryPolicy] = useState<RecoveryPolicy>(settings.recoveryPolicy);
  const [schoolName, setSchoolName] = useState<string>(settings.schoolName);
  const [subjectName, setSubjectName] = useState<string>(settings.subjectName);
  const [teacherName, setTeacherName] = useState<string>(settings.teacherName);

  // Automated test runner state
  const [testResults, setTestResults] = useState<ReturnType<typeof runCalculationTests> | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettingsConfig({
      passingGrade,
      gradeScale,
      calculationMode,
      recoveryPolicy,
      schoolName: schoolName.trim(),
      subjectName: subjectName.trim(),
      teacherName: teacherName.trim(),
    });
  };

  const handleRunTests = () => {
    const results = runCalculationTests();
    setTestResults(results);
    showToast('Bateria de testes automatizados executada com sucesso!');
  };

  // Full Backup Export as JSON
  const handleExportBackupJSON = () => {
    const fullBackup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      teacherUid: effectiveUid,
      settings,
      classes,
      students,
      assessments,
      grades,
      qualitative,
      attendance
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_GestaoEscolarPRO_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Configurações Pedagógicas & Testes Automatizados
            </h2>
            <Badge variant="info">
              LGPD & Regras de Segurança Ativas
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configuração de fórmulas de cálculo, média para aprovação, recuperação e verificação de integridade algorítmica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <SettingsIcon className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Critérios & Parâmetros Pedagógicos
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Média para Aprovação *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={passingGrade}
                  onChange={(e) => setPassingGrade(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão estadual: 6,0</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Escala de Notas
                </label>
                <select
                  value={gradeScale}
                  onChange={(e) => setGradeScale(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value={10}>Escala de 0 a 10</option>
                  <option value={100}>Escala de 0 a 100</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Fórmula de Média do Bimestre *
              </label>
              <select
                value={calculationMode}
                onChange={(e) => setCalculationMode(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="weighted">Média Ponderada: ∑(Nota × Peso) / ∑(Pesos Válidos)</option>
                <option value="simple">Média Aritmética Simples: ∑(Notas) / Quantidade</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Regra de Aplicação da Recuperação Paralela *
              </label>
              <select
                value={recoveryPolicy}
                onChange={(e) => setRecoveryPolicy(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="replaces_if_higher">Substitui a média regular apenas se for maior (Preserva original)</option>
                <option value="weighted_average">Composição ponderada (Regular peso 6 + Recuperação peso 4)</option>
                <option value="simple_average">Média aritmética entre regular e recuperação</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome da Instituição Escolar
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Disciplina / Componente
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Configurações Pedagógicas</span>
              </button>
            </div>
          </form>
        </div>

        {/* Automated Tests & Diagnostics */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Calculator className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bateria de Testes Automatizados de Cálculo
                </h3>
              </div>
              <button
                onClick={handleRunTests}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Executar Testes</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Validação matemática formal das regras de média ponderada, tratamento de ausências sem penalização de dispensas, e regras de recuperação.
            </p>

            {testResults ? (
              <div className="space-y-2">
                {testResults.map((t, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-xs flex items-start justify-between ${
                      t.passed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{t.name}</span>
                      {t.details && <span className="text-[11px] opacity-80">{t.details}</span>}
                    </div>
                    <Badge variant={t.passed ? 'success' : 'danger'}>
                      {t.passed ? 'APROVADO' : 'FALHOU'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                Clique no botão "Executar Testes" para rodar a suíte matemática automatizada.
              </div>
            )}
          </div>

          {/* Backup & System Reset Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Database className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cópia de Segurança Integral & Dados em Massa
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Exporte uma cópia completa de todos os alunos, turmas, notas, histórico qualitativo e chamadas em formato JSON padronizado.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleExportBackupJSON}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800"
              >
                <Download className="h-4 w-4" />
                <span>Exportar Backup Integral (.json)</span>
              </button>

              <button
                onClick={() => loadSeed430Students()}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Recarregar Base de 430 Alunos</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Atenção: Tem certeza de que deseja limpar todos os dados do professor na área de trabalho?')) {
                    clearWorkspace();
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800"
              >
                <span>Limpar Espaço</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
