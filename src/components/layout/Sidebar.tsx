import React from 'react';
import {
  LayoutDashboard,
  Users,
  Layers,
  BookOpenCheck,
  HeartHandshake,
  CalendarCheck2,
  LineChart,
  FileSpreadsheet,
  Download,
  Settings,
  Filter
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';

export type ActiveTab = 
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'gradebook'
  | 'qualitative'
  | 'attendance'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onOpenExport
}) => {
  const { classes, selectedClassId, setSelectedClassId, selectedPeriod, setSelectedPeriod } = useAcademic();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Principal', icon: LayoutDashboard },
    { id: 'gradebook', label: 'Diário de Notas (Planilha)', icon: BookOpenCheck },
    { id: 'students', label: 'Cadastro de Alunos', icon: Users },
    { id: 'classes', label: 'Turmas & Séries', icon: Layers },
    { id: 'qualitative', label: 'Avaliação Qualitativa', icon: HeartHandshake },
    { id: 'attendance', label: 'Frequência Escolar', icon: CalendarCheck2 },
    { id: 'reports', label: 'Relatórios Pedagógicos', icon: LineChart },
    { id: 'settings', label: 'Critérios & Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        {/* Context Filters: Class and Period Selection */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Filter className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Filtro de Turma & Período</span>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Turma Selecionada
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas as Turmas (Visão Geral)</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Bimestre Letivo
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriod(p)}
                  className={`py-1 text-xs font-semibold rounded-md transition ${
                    selectedPeriod === p
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {p}º B
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-medium rounded-xl transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Tools */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={onOpenImport}
          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 transition"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Importar Planilhas</span>
        </button>
        <button
          onClick={onOpenExport}
          className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium rounded-lg text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/60 transition"
        >
          <Download className="h-4 w-4" />
          <span>Exportação & PDF</span>
        </button>
      </div>
    </aside>
  );
};
