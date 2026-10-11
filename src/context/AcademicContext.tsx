import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  Student,
  ClassEntity,
  Assessment,
  GradeRecord,
  QualitativeRecord,
  AttendanceRecord,
  SchoolSettings
} from '../types';
import {
  fetchClasses,
  saveClass,
  deleteClass,
  fetchStudents,
  saveStudent,
  saveStudentsBatch,
  deleteStudent,
  fetchAssessments,
  saveAssessment,
  deleteAssessment,
  fetchGrades,
  saveGrade,
  saveGradesBatch,
  fetchQualitativeRecords,
  saveQualitativeRecord,
  deleteQualitativeRecord,
  fetchAttendance,
  saveAttendance,
  fetchSettings,
  saveSettings,
  seedCompleteDatasetToFirestore,
  generate430StudentsDataset,
  DEFAULT_SETTINGS
} from '../services/db';

interface AcademicContextType {
  // Data state
  classes: ClassEntity[];
  students: Student[];
  assessments: Assessment[];
  grades: GradeRecord[];
  qualitative: QualitativeRecord[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  
  // Loading & sync
  isLoading: boolean;
  isSaving: boolean;
  lastSyncTime: Date | null;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  clearNotification: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Global filters
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedPeriod: number;
  setSelectedPeriod: (period: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selected Class helper
  currentClass: ClassEntity | undefined;

  // Operations
  refreshAllData: () => Promise<void>;
  createClass: (cls: Omit<ClassEntity, 'id' | 'teacherUid'>) => Promise<ClassEntity>;
  updateClass: (cls: ClassEntity) => Promise<void>;
  removeClass: (classId: string) => Promise<void>;

  createStudent: (st: Omit<Student, 'id' | 'teacherUid' | 'createdAt' | 'updatedAt'>) => Promise<Student>;
  updateStudent: (st: Student) => Promise<void>;
  removeStudent: (studentId: string) => Promise<void>;
  importStudentsBulk: (studentsToImport: Student[], gradesToImport?: GradeRecord[]) => Promise<{ added: number; updated: number }>;

  createAssessment: (ass: Omit<Assessment, 'id' | 'teacherUid'>) => Promise<Assessment>;
  updateAssessment: (ass: Assessment) => Promise<void>;
  removeAssessment: (assessmentId: string) => Promise<void>;

  setGrade: (assessmentId: string, studentId: string, classId: string, period: number, value: number | null, status?: GradeRecord['status'], notes?: string) => Promise<void>;

  createQualitative: (rec: Omit<QualitativeRecord, 'id' | 'teacherUid' | 'createdAt'>) => Promise<void>;
  removeQualitative: (id: string) => Promise<void>;

  recordAttendance: (classId: string, date: string, records: AttendanceRecord['records'], topic?: string) => Promise<void>;

  saveSettingsConfig: (newSettings: Partial<SchoolSettings>) => Promise<void>;

  loadSeed430Students: () => Promise<void>;
  clearWorkspace: () => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | null>(null);

const LOCAL_STORAGE_KEY_PREFIX = 'gestao_escolar_pro_';

export const AcademicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { effectiveUid, currentUser } = useAuth();

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [qualitative, setQualitative] = useState<QualitativeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>({ ...DEFAULT_SETTINGS, teacherUid: effectiveUid });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev?.message === message ? null : prev);
    }, 4500);
  }, []);

  const clearNotification = () => setNotification(null);

  // Helper to load cache or initial seed if empty
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (currentUser) {
        // Authenticated with Google: fetch from Cloud Firestore
        const activeUid = currentUser.uid;
        const [remoteClasses, remoteStudents, remoteAssessments, remoteGrades, remoteQual, remoteAtt, remoteSettings] = await Promise.all([
          fetchClasses(activeUid).catch(() => []),
          fetchStudents(activeUid).catch(() => []),
          fetchAssessments(activeUid).catch(() => []),
          fetchGrades(activeUid).catch(() => []),
          fetchQualitativeRecords(activeUid).catch(() => []),
          fetchAttendance(activeUid).catch(() => []),
          fetchSettings(activeUid).catch(() => ({ ...DEFAULT_SETTINGS, teacherUid: activeUid }))
        ]);

        if (remoteStudents.length > 0) {
          setClasses(remoteClasses);
          setStudents(remoteStudents);
          setAssessments(remoteAssessments);
          setGrades(remoteGrades);
          setQualitative(remoteQual);
          setAttendance(remoteAtt);
          setSettings(remoteSettings);
        } else {
          // First time sign-in with empty Firestore: initialize and persist 430 cohort
          const generated = generate430StudentsDataset(activeUid);
          setClasses(generated.classes);
          setStudents(generated.students);
          setAssessments(generated.assessments);
          setGrades(generated.grades);
          setQualitative(generated.qualitative);
          setAttendance(generated.attendance);
          setSettings({ ...DEFAULT_SETTINGS, teacherUid: activeUid });
          seedCompleteDatasetToFirestore(activeUid).catch(console.warn);
        }
      } else {
        // Local Workspace / Demo Mode: Load from localStorage or initialize with in-memory cohort
        const localCached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}data_${effectiveUid}`);
        if (localCached) {
          const parsed = JSON.parse(localCached);
          setClasses(parsed.classes || []);
          setStudents(parsed.students || []);
          setAssessments(parsed.assessments || []);
          setGrades(parsed.grades || []);
          setQualitative(parsed.qualitative || []);
          setAttendance(parsed.attendance || []);
          setSettings(parsed.settings || { ...DEFAULT_SETTINGS, teacherUid: effectiveUid });
        } else {
          const generated = generate430StudentsDataset(effectiveUid);
          setClasses(generated.classes);
          setStudents(generated.students);
          setAssessments(generated.assessments);
          setGrades(generated.grades);
          setQualitative(generated.qualitative);
          setAttendance(generated.attendance);
          setSettings({ ...DEFAULT_SETTINGS, teacherUid: effectiveUid });
        }
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, effectiveUid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep local storage in sync as fast backup
  useEffect(() => {
    if (!isLoading && students.length > 0) {
      const payload = { classes, students, assessments, grades, qualitative, attendance, settings };
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}data_${effectiveUid}`, JSON.stringify(payload));
      } catch (e) {
        // LocalStorage quota may be reached for huge datasets, ignore safely
      }
    }
  }, [classes, students, assessments, grades, qualitative, attendance, settings, effectiveUid, isLoading]);

  // Selected class entity
  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // ==========================================
  // Class Operations
  // ==========================================
  const createClass = async (clsData: Omit<ClassEntity, 'id' | 'teacherUid'>): Promise<ClassEntity> => {
    const newClass: ClassEntity = {
      ...clsData,
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherUid: effectiveUid,
      createdAt: new Date().toISOString()
    };
    setClasses(prev => [...prev, newClass]);
    try {
      await saveClass(newClass);
      showToast(`Turma "${newClass.name}" cadastrada com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar turma no banco:', err);
      showToast('Turma salva localmente com sucesso.', 'info');
    }
    return newClass;
  };

  const updateClass = async (cls: ClassEntity) => {
    setClasses(prev => prev.map(c => c.id === cls.id ? cls : c));
    try {
      await saveClass(cls);
      showToast(`Turma "${cls.name}" atualizada.`);
    } catch (err) {
      console.error('Erro ao atualizar turma:', err);
    }
  };

  const removeClass = async (classId: string) => {
    const target = classes.find(c => c.id === classId);
    setClasses(prev => prev.filter(c => c.id !== classId));
    // Also remove associated students or unlink
    setStudents(prev => prev.filter(s => s.classId !== classId));
    try {
      await deleteClass(classId, effectiveUid);
      showToast(`Turma "${target?.name || ''}" removida.`);
    } catch (err) {
      console.error('Erro ao excluir turma:', err);
    }
  };

  // ==========================================
  // Student Operations
  // ==========================================
  const createStudent = async (stData: Omit<Student, 'id' | 'teacherUid' | 'createdAt' | 'updatedAt'>): Promise<Student> => {
    // Check duplicates by registration
    if (stData.registration) {
      const duplicate = students.find(s => s.registration === stData.registration);
      if (duplicate) {
        throw new Error(`Atenção: Já existe um estudante com a matrícula ${stData.registration} (${duplicate.name}).`);
      }
    }

    const newStudent: Student = {
      ...stData,
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherUid: effectiveUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setStudents(prev => [newStudent, ...prev]);
    try {
      await saveStudent(newStudent);
      showToast(`Estudante "${newStudent.name}" matriculado(a) com sucesso!`);
    } catch (err) {
      console.error('Erro ao persistir estudante:', err);
    }
    return newStudent;
  };

  const updateStudent = async (st: Student) => {
    setStudents(prev => prev.map(s => s.id === st.id ? st : s));
    try {
      await saveStudent(st);
      showToast(`Cadastro de "${st.name}" atualizado.`);
    } catch (err) {
      console.error('Erro ao atualizar estudante:', err);
    }
  };

  const removeStudent = async (studentId: string) => {
    const target = students.find(s => s.id === studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setGrades(prev => prev.filter(g => g.studentId !== studentId));
    try {
      await deleteStudent(studentId);
      showToast(`Estudante "${target?.name || ''}" removido(a).`);
    } catch (err) {
      console.error('Erro ao remover estudante:', err);
    }
  };

  const importStudentsBulk = async (
    studentsToImport: Student[],
    gradesToImport?: GradeRecord[]
  ): Promise<{ added: number; updated: number }> => {
    setIsSaving(true);
    let added = 0;
    let updated = 0;

    const existingMap = new Map(students.map(s => [s.registration, s]));
    const updatedList = [...students];

    studentsToImport.forEach(incoming => {
      if (incoming.registration && existingMap.has(incoming.registration)) {
        const existing = existingMap.get(incoming.registration)!;
        const index = updatedList.findIndex(s => s.id === existing.id);
        if (index !== -1) {
          updatedList[index] = {
            ...existing,
            ...incoming,
            id: existing.id,
            updatedAt: new Date().toISOString()
          };
          updated++;
        }
      } else {
        updatedList.push(incoming);
        added++;
      }
    });

    setStudents(updatedList);

    if (gradesToImport && gradesToImport.length > 0) {
      setGrades(prev => {
        const gradeMap = new Map(prev.map(g => [g.id, g]));
        gradesToImport.forEach(g => gradeMap.set(g.id, g));
        return Array.from(gradeMap.values());
      });
    }

    try {
      await saveStudentsBatch(studentsToImport);
      if (gradesToImport && gradesToImport.length > 0) {
        await saveGradesBatch(gradesToImport);
      }
      showToast(`Importação concluída: ${added} novos adicionados, ${updated} atualizados.`);
    } catch (err) {
      console.error('Erro ao salvar lote no Firestore:', err);
      showToast(`Importação salva localmente: ${added} adicionados, ${updated} atualizados.`, 'info');
    } finally {
      setIsSaving(false);
    }

    return { added, updated };
  };

  // ==========================================
  // Assessment Operations
  // ==========================================
  const createAssessment = async (assData: Omit<Assessment, 'id' | 'teacherUid'>): Promise<Assessment> => {
    const newAss: Assessment = {
      ...assData,
      id: `ass-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherUid: effectiveUid,
      createdAt: new Date().toISOString()
    };
    setAssessments(prev => [...prev, newAss]);
    try {
      await saveAssessment(newAss);
      showToast(`Avaliação "${newAss.title}" adicionada!`);
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
    }
    return newAss;
  };

  const updateAssessment = async (ass: Assessment) => {
    setAssessments(prev => prev.map(a => a.id === ass.id ? ass : a));
    try {
      await saveAssessment(ass);
      showToast(`Avaliação "${ass.title}" atualizada.`);
    } catch (err) {
      console.error('Erro ao atualizar avaliação:', err);
    }
  };

  const removeAssessment = async (assessmentId: string) => {
    const target = assessments.find(a => a.id === assessmentId);
    setAssessments(prev => prev.filter(a => a.id !== assessmentId));
    setGrades(prev => prev.filter(g => g.assessmentId !== assessmentId));
    try {
      await deleteAssessment(assessmentId);
      showToast(`Avaliação "${target?.title || ''}" excluída.`);
    } catch (err) {
      console.error('Erro ao deletar avaliação:', err);
    }
  };

  // ==========================================
  // Grade Operations (Spreadsheet Cell Quick Update)
  // ==========================================
  const setGrade = async (
    assessmentId: string,
    studentId: string,
    classId: string,
    period: number,
    value: number | null,
    status: GradeRecord['status'] = 'graded',
    notes?: string
  ) => {
    const gradeId = `${assessmentId}_${studentId}`;
    const gradeObj: GradeRecord = {
      id: gradeId,
      assessmentId,
      studentId,
      classId,
      period,
      value,
      status: value === null && status === 'graded' ? 'pending' : status,
      notes,
      teacherUid: effectiveUid,
      updatedAt: new Date().toISOString()
    };

    // Optimistic UI update
    setGrades(prev => {
      const idx = prev.findIndex(g => g.id === gradeId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = gradeObj;
        return copy;
      }
      return [...prev, gradeObj];
    });

    try {
      await saveGrade(gradeObj);
    } catch (err) {
      console.error('Erro ao persistir nota:', err);
    }
  };

  // ==========================================
  // Qualitative Operations
  // ==========================================
  const createQualitative = async (recData: Omit<QualitativeRecord, 'id' | 'teacherUid' | 'createdAt'>) => {
    const newRec: QualitativeRecord = {
      ...recData,
      id: `qual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherUid: effectiveUid,
      createdAt: new Date().toISOString()
    };
    setQualitative(prev => [newRec, ...prev]);
    try {
      await saveQualitativeRecord(newRec);
      showToast('Registro formativo lançado com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar registro qualitativo:', err);
    }
  };

  const removeQualitative = async (id: string) => {
    setQualitative(prev => prev.filter(q => q.id !== id));
    try {
      await deleteQualitativeRecord(id);
      showToast('Registro qualitativo removido.');
    } catch (err) {
      console.error('Erro ao remover qualitativo:', err);
    }
  };

  // ==========================================
  // Attendance Operations
  // ==========================================
  const recordAttendance = async (
    classId: string,
    date: string,
    records: AttendanceRecord['records'],
    topic?: string
  ) => {
    const attId = `att-${classId}-${date}`;
    const newAtt: AttendanceRecord = {
      id: attId,
      classId,
      date,
      lessonTopic: topic || 'Aula Regular',
      records,
      teacherUid: effectiveUid,
      createdAt: new Date().toISOString()
    };

    setAttendance(prev => {
      const idx = prev.findIndex(a => a.id === attId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newAtt;
        return copy;
      }
      return [...prev, newAtt];
    });

    try {
      await saveAttendance(newAtt);
      showToast(`Frequência da aula de ${date} registrada!`);
    } catch (err) {
      console.error('Erro ao salvar frequência:', err);
    }
  };

  // ==========================================
  // Settings
  // ==========================================
  const saveSettingsConfig = async (newSettings: Partial<SchoolSettings>) => {
    const merged: SchoolSettings = {
      ...settings,
      ...newSettings,
      teacherUid: effectiveUid
    };
    setSettings(merged);
    try {
      await saveSettings(merged);
      showToast('Configurações pedagógicas atualizadas!');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    }
  };

  // ==========================================
  // 430 Students Physics Dataset Seeding
  // ==========================================
  const loadSeed430Students = async () => {
    setIsSaving(true);
    try {
      const activeUid = currentUser ? currentUser.uid : effectiveUid;
      const dataset = generate430StudentsDataset(activeUid);
      setClasses(dataset.classes);
      setStudents(dataset.students);
      setAssessments(dataset.assessments);
      setGrades(dataset.grades);
      setQualitative(dataset.qualitative);
      setAttendance(dataset.attendance);

      if (currentUser) {
        seedCompleteDatasetToFirestore(currentUser.uid).catch(err => {
          console.warn('Persistência em background finalizada com fallback local:', err);
        });
      }

      showToast(`Base completa carregada com 430 estudantes em 12 turmas de Física!`, 'success');
    } catch (err) {
      console.error('Erro ao carregar dados de 430 estudantes:', err);
      showToast('Erro ao carregar dados simulados.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const clearWorkspace = async () => {
    setClasses([]);
    setStudents([]);
    setAssessments([]);
    setGrades([]);
    setQualitative([]);
    setAttendance([]);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}data_${effectiveUid}`);
    showToast('Área de trabalho limpa com sucesso. Pronto para novos cadastros ou importação.', 'info');
  };

  const refreshAllData = async () => {
    await loadData();
    showToast('Dados atualizados com sucesso.');
  };

  return (
    <AcademicContext.Provider
      value={{
        classes,
        students,
        assessments,
        grades,
        qualitative,
        attendance,
        settings,
        isLoading,
        isSaving,
        lastSyncTime,
        notification,
        clearNotification,
        showToast,
        selectedClassId,
        setSelectedClassId,
        selectedPeriod,
        setSelectedPeriod,
        selectedYear,
        setSelectedYear,
        searchQuery,
        setSearchQuery,
        currentClass,
        refreshAllData,
        createClass,
        updateClass,
        removeClass,
        createStudent,
        updateStudent,
        removeStudent,
        importStudentsBulk,
        createAssessment,
        updateAssessment,
        removeAssessment,
        setGrade,
        createQualitative,
        removeQualitative,
        recordAttendance,
        saveSettingsConfig,
        loadSeed430Students,
        clearWorkspace
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademic = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademic deve ser utilizado dentro de AcademicProvider');
  }
  return context;
};
