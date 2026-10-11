import React from 'react';
import { 
  GraduationCap, 
  Upload, 
  Download, 
  Database, 
  LogIn, 
  LogOut, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Users,
  Search,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  onOpenImport,
  onOpenExport,
}) => {
  const { currentUser, userProfile, login, logout, isDemoUser, firestoreConnected } = useAuth();
  const { students, classes, loadSeed430Students, isSaving } = useAcademic();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand & Context */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Gestão Escolar <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PRO</span>
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Física & Ensino Médio
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
              {students.length} estudantes matriculados • {classes.length} turmas ativas • Ano Letivo 2026
            </p>
          </div>
        </div>

        {/* Center / Right actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick dataset seed button if empty or test requested */}
          <button
            onClick={() => loadSeed430Students()}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs"
            title="Carregar ou restaurar base completa com 430 estudantes em 12 turmas de Física"
          >
            <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Base 430 Alunos</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={onOpenImport}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden md:inline">Importar Planilha</span>
          </button>

          {/* Export Center */}
          <button
            onClick={onOpenExport}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-500/25"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Exportar / PDF</span>
          </button>

          {/* Dark / Light toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            aria-label="Alternar modo visual"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Auth indicator */}
          <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-800">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {currentUser.displayName || 'Professor(a)'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {currentUser.email}
                  </p>
                </div>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || ''}
                    className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName?.[0] || 'P'}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Sair da conta"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
