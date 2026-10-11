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
  CheckCircle2, 
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAcademic } from '../../context/AcademicContext';
import { Button } from '../common/Button';

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
        {/* Brand & Academic Context */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Gestão Pedagógica <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm">— Prof. Silas</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Física • Ensino Médio
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="hidden md:inline">
                {students.length} estudantes · {classes.length} turmas ativas · 2026
              </span>
              <span className="hidden md:inline text-slate-300 dark:text-slate-700">·</span>
              {/* Honest Connection Status */}
              <div className="flex items-center space-x-1">
                {currentUser && firestoreConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Firestore Sincronizado
                  </span>
                ) : currentUser && !firestoreConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Reconectando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Modo Local
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Quick dataset seed button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSeed430Students()}
            disabled={isSaving}
            leftIcon={<Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
            title="Carregar ou restaurar base completa com 430 estudantes em 12 turmas"
            className="hidden sm:inline-flex"
          >
            <span>Base 430 Alunos</span>
          </Button>

          {/* Import Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            leftIcon={<Upload className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
          >
            <span className="hidden md:inline">Importar</span>
            <span className="md:hidden">Importar</span>
          </Button>

          {/* Export Center */}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenExport}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            <span className="hidden md:inline">Exportar / PDF</span>
            <span className="md:hidden">PDF</span>
          </Button>

          {/* Dark / Light toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            title={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Auth indicator */}
          <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-800">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {currentUser.displayName || userProfile?.displayName || 'Prof. Silas'}
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
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    {(currentUser.displayName || 'S')[0]}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Sair da conta"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={login}
                leftIcon={<LogIn className="h-3.5 w-3.5 text-blue-600" />}
              >
                <span>Entrar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
