import React, { useState } from 'react';
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
  Filter,
  ChevronLeft,
  ChevronRight
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'gradebook', label: 'Diário de Notas', icon: BookOpenCheck },
        { id: 'students', label: 'Estudantes', icon: Users },
        { id: 'classes', label: 'Turmas & Cursos', icon: Layers },
      ]
    },
    {
      title: 'Pedagógico',
      items: [
        { id: 'attendance', label: 'Frequência Escolar', icon: CalendarCheck2 },
        { id: 'qualitative', label: 'Acompanhamento Qualitativo', icon: HeartHandshake },
      ]
    },
    {
      title: 'Gestão',
      items: [
        { id: 'reports', label: 'Relatórios & Boletins', icon: LineChart },
        { id: 'settings', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  return (
    <aside
      className={`shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 flex flex-col justify-between hidden md:flex ${
        isCollapsed ? 'w-18 p-2.5' : 'w-64 p-4'
      }`}
    >
      <div className="space-y-5 overflow-y-auto">
        {/* Toggle Collapse Button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between pb-1'}`}>
          {!isCollapsed && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Menu de Navegação
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Context Filters: Class and Period Selection (only when expanded) */}
        {!isCollapsed && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Escopo de Visualização</span>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Turma Ativa
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Turmas (Consolidado)</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Bimestre
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    className={`py-1 text-xs font-semibold rounded-md transition-colors ${
                      selectedPeriod === p
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p}º B
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Nav Items Groups */}
        <nav className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center transition-all rounded-lg font-medium ${
                      isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2 text-xs'
                    } ${
                      isActive
                        ? 'bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300 font-semibold border-l-4 border-blue-600 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#1D4ED8] dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Utility Tools */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
        <button
          onClick={onOpenImport}
          title={isCollapsed ? 'Importar Planilhas' : undefined}
          className={`w-full flex items-center text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors ${
            isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Importar Planilhas</span>}
        </button>
        <button
          onClick={onOpenExport}
          title={isCollapsed ? 'Exportação & PDF' : undefined}
          className={`w-full flex items-center text-xs font-medium rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors ${
            isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
          }`}
        >
          <Download className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Exportação & PDF</span>}
        </button>
      </div>
    </aside>
  );
};
