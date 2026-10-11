import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Student,
  ClassEntity,
  Assessment,
  GradeRecord,
  QualitativeRecord,
  AttendanceRecord,
  SchoolSettings
} from '../types';

export const DEFAULT_SETTINGS: SchoolSettings = {
  teacherUid: 'default',
  passingGrade: 6.0,
  gradeScale: 10,
  calculationMode: 'weighted',
  recoveryPolicy: 'replaces_if_higher',
  periodsCount: 4,
  academicYear: 2026,
  schoolName: 'Instituto Estadual de Educação Profissional e Tecnológica',
  subjectName: 'Física',
  teacherName: 'Prof. Sérgio Pedrosa',
};

// ==========================================
// 1. CLASSES (TURMAS)
// ==========================================

export async function fetchClasses(teacherUid: string): Promise<ClassEntity[]> {
  const path = 'classes';
  try {
    const q = query(collection(db, path), where('teacherUid', '==', teacherUid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ClassEntity);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveClass(cls: ClassEntity): Promise<void> {
  const path = `classes/${cls.id}`;
  try {
    await setDoc(doc(db, 'classes', cls.id), {
      ...cls,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClass(classId: string, teacherUid: string): Promise<void> {
  const path = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 2. STUDENTS (ESTUDANTES)
// ==========================================

export async function fetchStudents(teacherUid: string, classId?: string): Promise<Student[]> {
  const path = 'students';
  try {
    let q = query(collection(db, path), where('teacherUid', '==', teacherUid));
    if (classId) {
      q = query(collection(db, path), where('teacherUid', '==', teacherUid), where('classId', '==', classId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStudent(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, 'students', student.id), {
      ...student,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveStudentsBatch(students: Student[]): Promise<void> {
  const path = 'students';
  try {
    // Firestore batches allow max 500 operations per batch
    const batchSize = 400;
    for (let i = 0; i < students.length; i += batchSize) {
      const slice = students.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const st of slice) {
        const ref = doc(db, 'students', st.id);
        batch.set(ref, {
          ...st,
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 3. ASSESSMENTS (AVALIAÇÕES)
// ==========================================

export async function fetchAssessments(teacherUid: string, classId?: string): Promise<Assessment[]> {
  const path = 'assessments';
  try {
    let q = query(collection(db, path), where('teacherUid', '==', teacherUid));
    if (classId) {
      q = query(collection(db, path), where('teacherUid', '==', teacherUid), where('classId', '==', classId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Assessment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const path = `assessments/${assessment.id}`;
  try {
    await setDoc(doc(db, 'assessments', assessment.id), {
      ...assessment,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAssessment(assessmentId: string): Promise<void> {
  const path = `assessments/${assessmentId}`;
  try {
    await deleteDoc(doc(db, 'assessments', assessmentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 4. GRADES (NOTAS)
// ==========================================

export async function fetchGrades(teacherUid: string, classId?: string): Promise<GradeRecord[]> {
  const path = 'grades';
  try {
    let q = query(collection(db, path), where('teacherUid', '==', teacherUid));
    if (classId) {
      q = query(collection(db, path), where('teacherUid', '==', teacherUid), where('classId', '==', classId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as GradeRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveGrade(grade: GradeRecord): Promise<void> {
  const path = `grades/${grade.id}`;
  try {
    await setDoc(doc(db, 'grades', grade.id), {
      ...grade,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveGradesBatch(gradesList: GradeRecord[]): Promise<void> {
  const path = 'grades';
  try {
    const batchSize = 400;
    for (let i = 0; i < gradesList.length; i += batchSize) {
      const slice = gradesList.slice(i, i + batchSize);
      const batch = writeBatch(db);
      for (const gr of slice) {
        const ref = doc(db, 'grades', gr.id);
        batch.set(ref, {
          ...gr,
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// 5. QUALITATIVE RECORDS
// ==========================================

export async function fetchQualitativeRecords(teacherUid: string, classId?: string): Promise<QualitativeRecord[]> {
  const path = 'qualitative';
  try {
    let q = query(collection(db, path), where('teacherUid', '==', teacherUid));
    if (classId) {
      q = query(collection(db, path), where('teacherUid', '==', teacherUid), where('classId', '==', classId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as QualitativeRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveQualitativeRecord(rec: QualitativeRecord): Promise<void> {
  const path = `qualitative/${rec.id}`;
  try {
    await setDoc(doc(db, 'qualitative', rec.id), rec);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQualitativeRecord(id: string): Promise<void> {
  const path = `qualitative/${id}`;
  try {
    await deleteDoc(doc(db, 'qualitative', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 6. ATTENDANCE (FREQUÊNCIA)
// ==========================================

export async function fetchAttendance(teacherUid: string, classId?: string): Promise<AttendanceRecord[]> {
  const path = 'attendance';
  try {
    let q = query(collection(db, path), where('teacherUid', '==', teacherUid));
    if (classId) {
      q = query(collection(db, path), where('teacherUid', '==', teacherUid), where('classId', '==', classId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as AttendanceRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveAttendance(att: AttendanceRecord): Promise<void> {
  const path = `attendance/${att.id}`;
  try {
    await setDoc(doc(db, 'attendance', att.id), att);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// 7. SETTINGS
// ==========================================

export async function fetchSettings(teacherUid: string): Promise<SchoolSettings> {
  const path = `settings/${teacherUid}`;
  try {
    const docRef = doc(db, 'settings', teacherUid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SchoolSettings;
    }
    // Return default settings
    return { ...DEFAULT_SETTINGS, teacherUid };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSettings(settings: SchoolSettings): Promise<void> {
  const path = `settings/${settings.teacherUid}`;
  try {
    await setDoc(doc(db, 'settings', settings.teacherUid), {
      ...settings,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// 8. HIGH-SCALE 430 STUDENTS SEED DATA GENERATOR
// ==========================================

export function generate430StudentsDataset(teacherUid: string): {
  classes: ClassEntity[];
  students: Student[];
  assessments: Assessment[];
  grades: GradeRecord[];
  qualitative: QualitativeRecord[];
  attendance: AttendanceRecord[];
} {
  // 12 High School Vocational Classes in Physics
  const classConfigs: Array<{
    id: string;
    name: string;
    gradeYear: '1º Ano' | '2º Ano' | '3º Ano';
    technicalCourse: string;
    shift: 'Matutino' | 'Vespertino';
    count: number;
  }> = [
    { id: 'cls-1a-info', name: '1º Ano A - Informática', gradeYear: '1º Ano', technicalCourse: 'Informática para Internet', shift: 'Matutino', count: 36 },
    { id: 'cls-1b-info', name: '1º Ano B - Informática', gradeYear: '1º Ano', technicalCourse: 'Informática para Internet', shift: 'Vespertino', count: 35 },
    { id: 'cls-1a-meca', name: '1º Ano A - Mecatrônica', gradeYear: '1º Ano', technicalCourse: 'Mecatrônica Industrial', shift: 'Matutino', count: 36 },
    { id: 'cls-1b-edif', name: '1º Ano B - Edificações', gradeYear: '1º Ano', technicalCourse: 'Edificações', shift: 'Matutino', count: 35 },
    
    { id: 'cls-2a-info', name: '2º Ano A - Informática', gradeYear: '2º Ano', technicalCourse: 'Informática para Internet', shift: 'Matutino', count: 37 },
    { id: 'cls-2b-meca', name: '2º Ano B - Mecatrônica', gradeYear: '2º Ano', technicalCourse: 'Mecatrônica Industrial', shift: 'Vespertino', count: 36 },
    { id: 'cls-2a-eletro', name: '2º Ano A - Eletrotécnica', gradeYear: '2º Ano', technicalCourse: 'Eletrotécnica', shift: 'Matutino', count: 35 },
    { id: 'cls-2b-edif', name: '2º Ano B - Edificações', gradeYear: '2º Ano', technicalCourse: 'Edificações', shift: 'Matutino', count: 36 },
    
    { id: 'cls-3a-info', name: '3º Ano A - Informática', gradeYear: '3º Ano', technicalCourse: 'Informática para Internet', shift: 'Matutino', count: 37 },
    { id: 'cls-3b-meca', name: '3º Ano B - Mecatrônica', gradeYear: '3º Ano', technicalCourse: 'Mecatrônica Industrial', shift: 'Vespertino', count: 36 },
    { id: 'cls-3a-eletro', name: '3º Ano A - Eletrotécnica', gradeYear: '3º Ano', technicalCourse: 'Eletrotécnica', shift: 'Matutino', count: 36 },
    { id: 'cls-3b-edif', name: '3º Ano B - Edificações', gradeYear: '3º Ano', technicalCourse: 'Edificações', shift: 'Matutino', count: 35 },
  ]; // Total = 36+35+36+35 + 37+36+35+36 + 37+36+36+35 = 430 students!

  const classes: ClassEntity[] = classConfigs.map(c => ({
    id: c.id,
    name: c.name,
    gradeYear: c.gradeYear,
    technicalCourse: c.technicalCourse,
    academicYear: 2026,
    shift: c.shift,
    teacherUid,
    studentCount: c.count,
    subjectName: `Física ${c.gradeYear === '1º Ano' ? 'I' : c.gradeYear === '2º Ano' ? 'II' : 'III'}`,
    createdAt: new Date().toISOString()
  }));

  const firstNames = [
    'Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena',
    'Igor', 'Juliana', 'Lucas', 'Mariana', 'Matheus', 'Natália', 'Otávio', 'Patrícia',
    'Rafael', 'Sabrina', 'Thiago', 'Vitória', 'Arthur', 'Beatriz', 'Caio', 'Débora',
    'Felipe', 'Giovanna', 'Guilherme', 'Isabela', 'João', 'Larissa', 'Leonardo', 'Manuela',
    'Murilo', 'Nicole', 'Pedro', 'Rafaela', 'Rodrigo', 'Sofia', 'Vinícius', 'Yasmin',
    'Samuel', 'Lívia', 'Enzo', 'Alice', 'Davi', 'Luiza', 'Heitor', 'Lorena', 'Bernardo'
  ];

  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
    'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
    'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
    'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos'
  ];

  const students: Student[] = [];
  const assessments: Assessment[] = [];
  const grades: GradeRecord[] = [];
  const qualitative: QualitativeRecord[] = [];
  const attendance: AttendanceRecord[] = [];

  let regCounter = 20261001;

  for (const c of classConfigs) {
    // Generate assessments for this class
    // 1º Bimestre: P1 (Prova Cinemática/Mecânica), T1 (Laboratório/Relatório), REC1 (Recuperação)
    // 2º Bimestre: P2 (Prova Dinâmica/Termodinâmica), T2 (Projeto Integrador), REC2
    // 3º Bimestre: P3 (Óptica/Eletromagnetismo), T3 (Atividade Prática)
    const assP1: Assessment = {
      id: `ass-${c.id}-b1-p1`,
      title: 'P1: Prova Bimestral Teórica',
      classId: c.id,
      period: 1,
      type: 'prova',
      maxGrade: 10,
      weight: 6,
      date: '2026-03-25',
      notes: 'Avaliação individual sem consulta',
      academicYear: 2026,
      teacherUid
    };
    const assT1: Assessment = {
      id: `ass-${c.id}-b1-t1`,
      title: 'T1: Prática Experimental e Relatório',
      classId: c.id,
      period: 1,
      type: 'trabalho',
      maxGrade: 10,
      weight: 4,
      date: '2026-04-10',
      notes: 'Relatório em duplas com análise de incertezas',
      academicYear: 2026,
      teacherUid
    };
    const assRec1: Assessment = {
      id: `ass-${c.id}-b1-rec`,
      title: 'REC1: Recuperação Paralela Bimestral',
      classId: c.id,
      period: 1,
      type: 'recuperacao',
      maxGrade: 10,
      weight: 10,
      date: '2026-04-22',
      notes: 'Destinada aos estudantes com média inferior a 6,0',
      academicYear: 2026,
      teacherUid
    };

    const assP2: Assessment = {
      id: `ass-${c.id}-b2-p1`,
      title: 'P2: Avaliação Intermediária',
      classId: c.id,
      period: 2,
      type: 'prova',
      maxGrade: 10,
      weight: 5,
      date: '2026-06-08',
      academicYear: 2026,
      teacherUid
    };
    const assT2: Assessment = {
      id: `ass-${c.id}-b2-t1`,
      title: 'T2: Projeto Técnico Integrado',
      classId: c.id,
      period: 2,
      type: 'projeto',
      maxGrade: 10,
      weight: 5,
      date: '2026-06-25',
      academicYear: 2026,
      teacherUid
    };

    assessments.push(assP1, assT1, assRec1, assP2, assT2);

    // Create 3 attendance sessions for this class
    const att1: AttendanceRecord = {
      id: `att-${c.id}-1`,
      classId: c.id,
      date: '2026-03-10',
      lessonTopic: 'Apresentação do Plano de Ensino e Grandezas Físicas',
      records: {},
      teacherUid,
      createdAt: new Date().toISOString()
    };
    const att2: AttendanceRecord = {
      id: `att-${c.id}-2`,
      classId: c.id,
      date: '2026-03-17',
      lessonTopic: 'Vetores e Cinemática Vetorial Aplicada ao Curso Técnico',
      records: {},
      teacherUid,
      createdAt: new Date().toISOString()
    };
    const att3: AttendanceRecord = {
      id: `att-${c.id}-3`,
      classId: c.id,
      date: '2026-03-24',
      lessonTopic: 'Leis de Newton e Dinâmica de Sistemas',
      records: {},
      teacherUid,
      createdAt: new Date().toISOString()
    };

    for (let i = 0; i < c.count; i++) {
      const fName = firstNames[(i * 3 + regCounter) % firstNames.length];
      const lName = lastNames[(i * 7 + regCounter) % lastNames.length];
      const studentId = `st-${regCounter}`;
      const reg = `${regCounter}`;
      regCounter++;

      const student: Student = {
        id: studentId,
        name: `${fName} ${lName}`,
        registration: reg,
        academicYear: 2026,
        classId: c.id,
        className: c.name,
        gradeYear: c.gradeYear,
        technicalCourse: c.technicalCourse,
        status: i === 34 && c.id === 'cls-1b-edif' ? 'transferred' : 'active',
        observations: i % 10 === 0 ? 'Aluno demonstrou grande afinidade com cálculo vetorial.' : '',
        birthDate: `2008-${String((i % 12) + 1).padStart(2, '0')}-15`,
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@etec.edu.br`,
        guardianContact: `(11) 98${String(1000000 + i).slice(0, 7)}`,
        teacherUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      students.push(student);

      // Generate grades with realistic Gaussian distribution around 6.8
      // Seed deterministic pseudorandom
      const seedVal = (i * 17 + c.id.charCodeAt(5)) % 100;
      let p1Score: number;
      if (seedVal < 15) {
        p1Score = Number((3.5 + (seedVal / 15) * 2.0).toFixed(1)); // 3.5 - 5.5 (needs recovery)
      } else if (seedVal < 60) {
        p1Score = Number((6.0 + ((seedVal - 15) / 45) * 2.2).toFixed(1)); // 6.0 - 8.2 (solid)
      } else {
        p1Score = Number((8.3 + ((seedVal - 60) / 40) * 1.7).toFixed(1)); // 8.3 - 10.0 (high performance)
      }

      let t1Score = Number(Math.min(10, Math.max(0, p1Score + (seedVal % 2 === 0 ? 0.8 : -0.4))).toFixed(1));

      grades.push({
        id: `${assP1.id}_${studentId}`,
        assessmentId: assP1.id,
        studentId,
        classId: c.id,
        period: 1,
        value: p1Score,
        status: 'graded',
        teacherUid
      });

      grades.push({
        id: `${assT1.id}_${studentId}`,
        assessmentId: assT1.id,
        studentId,
        classId: c.id,
        period: 1,
        value: t1Score,
        status: 'graded',
        teacherUid
      });

      // Calculate B1 weighted average: (p1 * 6 + t1 * 4) / 10
      const b1Avg = (p1Score * 6 + t1Score * 4) / 10;
      if (b1Avg < 6.0) {
        // Did recovery
        const recScore = Number(Math.min(10, b1Avg + 2.0 + (seedVal % 1.5)).toFixed(1));
        grades.push({
          id: `${assRec1.id}_${studentId}`,
          assessmentId: assRec1.id,
          studentId,
          classId: c.id,
          period: 1,
          value: recScore,
          recoveryOriginalGrade: Number(b1Avg.toFixed(1)),
          status: 'graded',
          teacherUid,
          notes: 'Participou do plantão de dúvidas de Cinemática'
        });
      }

      // Period 2 grades (some graded, few pending)
      if (i % 8 !== 0) {
        const p2Score = Number(Math.min(10, Math.max(2, p1Score + (i % 3 === 0 ? -0.7 : 0.6))).toFixed(1));
        grades.push({
          id: `${assP2.id}_${studentId}`,
          assessmentId: assP2.id,
          studentId,
          classId: c.id,
          period: 2,
          value: p2Score,
          status: 'graded',
          teacherUid
        });
      } else {
        grades.push({
          id: `${assP2.id}_${studentId}`,
          assessmentId: assP2.id,
          studentId,
          classId: c.id,
          period: 2,
          value: null,
          status: 'pending',
          teacherUid
        });
      }

      // Qualitative records for students with notable behavior
      if (b1Avg < 5.5) {
        qualitative.push({
          id: `qual-${studentId}-1`,
          studentId,
          studentName: student.name,
          classId: c.id,
          period: 1,
          date: '2026-04-12',
          criterion: 'dificuldades',
          criterionLabel: 'Dificuldades Conceituais e Acompanhamento',
          level: 'necessita_acompanhamento',
          comment: 'Apresenta dificuldade na interpretação gráfica de funções da Cinemática. Orientado a comparecer ao laboratório de apoio pedagógico.',
          teacherUid,
          createdAt: new Date().toISOString()
        });
      } else if (b1Avg >= 8.5) {
        qualitative.push({
          id: `qual-${studentId}-1`,
          studentId,
          studentName: student.name,
          classId: c.id,
          period: 1,
          date: '2026-04-14',
          criterion: 'colaboracao',
          criterionLabel: 'Colaboração e Autonomia',
          level: 'excelente',
          comment: 'Demonstra protagonismo nos experimentos práticos e auxilia ativamente colegas de bancada na montagem dos circuitos e sensores.',
          teacherUid,
          createdAt: new Date().toISOString()
        });
      }

      // Attendance records
      att1.records[studentId] = {
        status: i % 18 === 0 ? 'absent' : 'present'
      };
      att2.records[studentId] = {
        status: i % 25 === 0 ? 'justified' : i % 30 === 0 ? 'late' : 'present',
        notes: i % 25 === 0 ? 'Atestado médico entregue à coordenação' : undefined
      };
      att3.records[studentId] = {
        status: i % 22 === 0 ? 'absent' : 'present'
      };
    }

    attendance.push(att1, att2, att3);
  }

  return { classes, students, assessments, grades, qualitative, attendance };
}

export async function seedCompleteDatasetToFirestore(teacherUid: string): Promise<number> {
  const dataset = generate430StudentsDataset(teacherUid);

  // 1. Save classes
  for (const cls of dataset.classes) {
    await saveClass(cls);
  }

  // 2. Save students in batches
  await saveStudentsBatch(dataset.students);

  // 3. Save assessments
  for (const ass of dataset.assessments) {
    await saveAssessment(ass);
  }

  // 4. Save grades in batches
  await saveGradesBatch(dataset.grades);

  // 5. Save qualitative
  for (const q of dataset.qualitative) {
    await saveQualitativeRecord(q);
  }

  // 6. Save attendance
  for (const att of dataset.attendance) {
    await saveAttendance(att);
  }

  return dataset.students.length;
}

export async function clearAllTeacherData(teacherUid: string): Promise<void> {
  // Cleans all collections for this teacherUid
  const classesList = await fetchClasses(teacherUid);
  for (const c of classesList) {
    await deleteClass(c.id, teacherUid);
  }

  const studentsList = await fetchStudents(teacherUid);
  for (const st of studentsList) {
    await deleteStudent(st.id);
  }

  const assessmentsList = await fetchAssessments(teacherUid);
  for (const a of assessmentsList) {
    await deleteAssessment(a.id);
  }

  const gradesList = await fetchGrades(teacherUid);
  const batch = writeBatch(db);
  for (let i = 0; i < Math.min(gradesList.length, 450); i++) {
    batch.delete(doc(db, 'grades', gradesList[i].id));
  }
  await batch.commit();
}
