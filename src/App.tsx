import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AcademicProvider, useAcademic } from './context/AcademicContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { GradebookView } from './components/gradebook/GradebookView';
import { StudentsView } from './components/students/StudentsView';
import { StudentProfileView } from './components/students/StudentProfileView';
import { ClassesView } from './components/classes/ClassesView';
import { QualitativeView } from './components/qualitative/QualitativeView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { ImportWizardModal } from './components/import/ImportWizardModal';
import { ExportCenterModal } from './components/export/ExportCenterModal';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  LayoutDashboard,
  BookOpenCheck,
  Users,
  LineChart,
  CalendarCheck2
} from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Theme state: defaults to light ('false'), persisted in localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gp_theme');
      if (saved) return saved === 'dark';
    } catch {
      // Fallback
    }
    return false; // Strict default light mode
  });

  const handleToggleTheme = (val: boolean) => {
    setDarkMode(val);
    try {
      localStorage.setItem('gp_theme', val ? 'dark' : 'light');
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const { notification, clearNotification } = useAcademic();

  const handleSelectStudentProfile = (id: string) => {
    setSelectedStudentId(id);
    setActiveTab('students');
  };

  const handleSelectClassGradebook = (classId: string) => {
    setSelectedStudentId(null);
    setActiveTab('gradebook');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={handleToggleTheme}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSelectedStudentId(null);
            setActiveTab(tab);
          }}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {selectedStudentId ? (
              <StudentProfileView
                studentId={selectedStudentId}
                onBack={() => setSelectedStudentId(null)}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    onNavigateToTab={(tab) => setActiveTab(tab)}
                    onSelectStudentProfile={handleSelectStudentProfile}
                  />
                )}
                {activeTab === 'gradebook' && <GradebookView />}
                {activeTab === 'students' && (
                  <StudentsView onSelectStudentProfile={handleSelectStudentProfile} />
                )}
                {activeTab === 'classes' && (
                  <ClassesView onSelectClassGradebook={handleSelectClassGradebook} />
                )}
                {activeTab === 'qualitative' && <QualitativeView />}
                {activeTab === 'attendance' && <AttendanceView />}
                {activeTab === 'reports' && (
                  <ReportsView onSelectStudentProfile={handleSelectStudentProfile} />
                )}
                {activeTab === 'settings' && <SettingsView />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-sm">
        <button
          onClick={() => { setSelectedStudentId(null); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center p-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 mb-0.5" />
          <span>Início</span>
        </button>
        <button
          onClick={() => { setSelectedStudentId(null); setActiveTab('gradebook'); }}
          className={`flex flex-col items-center p-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'gradebook'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpenCheck className="h-4 w-4 mb-0.5" />
          <span>Notas</span>
        </button>
        <button
          onClick={() => { setSelectedStudentId(null); setActiveTab('students'); }}
          className={`flex flex-col items-center p-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'students'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4 mb-0.5" />
          <span>Alunos</span>
        </button>
        <button
          onClick={() => { setSelectedStudentId(null); setActiveTab('attendance'); }}
          className={`flex flex-col items-center p-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'attendance'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CalendarCheck2 className="h-4 w-4 mb-0.5" />
          <span>Chamada</span>
        </button>
        <button
          onClick={() => { setSelectedStudentId(null); setActiveTab('reports'); }}
          className={`flex flex-col items-center p-1.5 text-[11px] font-medium transition-colors ${
            activeTab === 'reports'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LineChart className="h-4 w-4 mb-0.5" />
          <span>Boletins</span>
        </button>
      </nav>

      {/* Modals */}
      <ImportWizardModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <ExportCenterModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className="fixed bottom-14 md:bottom-6 right-6 z-50 flex items-center space-x-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-lg text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          {notification.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
          {notification.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
          {notification.type === 'info' && <Info className="h-4 w-4 text-blue-500 shrink-0" />}
          <span className="text-slate-800 dark:text-slate-200 max-w-sm">{notification.message}</span>
          <button
            onClick={clearNotification}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Fechar notificação"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AcademicProvider>
        <MainApp />
      </AcademicProvider>
    </AuthProvider>
  );
}
