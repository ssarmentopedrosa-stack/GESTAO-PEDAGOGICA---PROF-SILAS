export type StudentStatus = 'active' | 'transferred' | 'graduated' | 'inactive';

export type AssessmentType = 'prova' | 'trabalho' | 'atividade' | 'projeto' | 'participacao' | 'recuperacao';

export type GradeStatus = 'graded' | 'pending' | 'absent' | 'excused' | 'not_applicable';

export type QualitativeLevel = 'excelente' | 'bom' | 'em_desenvolvimento' | 'necessita_acompanhamento';

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

export type CalculationMode = 'weighted' | 'simple';

export type RecoveryPolicy = 'replaces_if_higher' | 'weighted_average' | 'simple_average';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'teacher' | 'admin' | 'coordinator';
}

export interface ClassEntity {
  id: string;
  name: string; // e.g. "1º Ano A - Informática"
  gradeYear: '1º Ano' | '2º Ano' | '3º Ano';
  technicalCourse: string; // e.g. "Informática para Internet", "Mecatrônica", "Eletrotécnica", "Edificações", "Administração"
  academicYear: number; // e.g. 2026
  shift: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
  teacherUid: string;
  studentCount?: number;
  subjectName?: string; // e.g. "Física"
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  name: string;
  registration: string; // Matrícula escolar
  academicYear: number;
  classId: string;
  className: string;
  gradeYear: string;
  technicalCourse: string;
  status: StudentStatus;
  observations?: string;
  birthDate?: string;
  email?: string;
  guardianContact?: string;
  teacherUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  title: string;
  classId: string;
  subjectId?: string;
  period: number; // 1, 2, 3, 4 (Bimestres)
  type: AssessmentType;
  maxGrade: number; // e.g. 10.0
  weight: number; // e.g. 1, 2, 3
  date: string; // YYYY-MM-DD
  notes?: string;
  academicYear: number;
  teacherUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradeRecord {
  id: string; // `${assessmentId}_${studentId}`
  assessmentId: string;
  studentId: string;
  classId: string;
  period: number;
  value: number | null; // e.g. 8.5
  status: GradeStatus;
  recoveryOriginalGrade?: number | null;
  notes?: string;
  teacherUid: string;
  updatedAt?: string;
}

export interface QualitativeRecord {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  period: number;
  date: string;
  criterion: string; // e.g. "participacao", "autonomia", "colaboracao", "organizacao"
  criterionLabel: string;
  level: QualitativeLevel;
  comment?: string;
  teacherUid: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  lessonTopic?: string;
  records: Record<string, {
    status: AttendanceStatus;
    notes?: string;
  }>;
  teacherUid: string;
  createdAt?: string;
}

export interface SchoolSettings {
  teacherUid: string;
  passingGrade: number; // default 6.0
  gradeScale: number; // 10 or 100
  calculationMode: CalculationMode; // 'weighted' | 'simple'
  recoveryPolicy: RecoveryPolicy;
  periodsCount: number; // 4 bimestres
  academicYear: number;
  schoolName: string;
  subjectName: string; // "Física"
  teacherName: string;
  updatedAt?: string;
}

export interface StudentAcademicSummary {
  student: Student;
  periodGrades: Record<number, number | null>; // period 1..4 -> calculated average
  periodValidWeights: Record<number, number>;
  annualAverage: number | null;
  neededForPassing: number | null;
  academicStatus: 'Aprovado' | 'Em Andamento' | 'Em Recuperação' | 'Abaixo da Média' | 'Retido';
  attendanceRate: number | null; // percentage e.g. 92.5
  totalAbsences: number;
  qualitativeCount: number;
  pendingAssessmentsCount: number;
}
