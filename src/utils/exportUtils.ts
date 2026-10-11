import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Student,
  ClassEntity,
  Assessment,
  GradeRecord,
  QualitativeRecord,
  AttendanceRecord,
  SchoolSettings
} from '../types';
import { calculatePeriodGrade, calculateAnnualAverage, formatGrade } from './calculations';

// ==========================================
// 1. EXCEL (.xlsx) & CSV EXPORTS
// ==========================================

export function exportStudentsToExcel(students: Student[], className?: string) {
  const data = students.map((s, index) => ({
    'Nº': index + 1,
    'Matrícula': s.registration,
    'Nome Completo': s.name,
    'Turma': s.className,
    'Série': s.gradeYear,
    'Curso Técnico': s.technicalCourse,
    'Situação': s.status === 'active' ? 'Ativo' : s.status === 'transferred' ? 'Transferido' : s.status === 'graduated' ? 'Concluído' : 'Inativo',
    'E-mail': s.email || '',
    'Contato Responsável': s.guardianContact || '',
    'Observações Pedagógicas': s.observations || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudantes');

  const filename = className 
    ? `Lista_Estudantes_${className.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
    : 'Lista_Completa_Estudantes.xlsx';

  XLSX.writeFile(workbook, filename);
}

export function exportStudentsToCSV(students: Student[], className?: string) {
  const data = students.map((s, index) => ({
    'Ordem': index + 1,
    'Matricula': s.registration,
    'Nome': s.name,
    'Turma': s.className,
    'Serie': s.gradeYear,
    'CursoTecnico': s.technicalCourse,
    'Situacao': s.status,
    'Email': s.email || '',
    'Contato': s.guardianContact || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  
  // Prepend UTF-8 BOM for Microsoft Excel compatibility
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', className ? `Estudantes_${className}.csv` : 'Estudantes.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportGradebookToExcel(
  cls: ClassEntity,
  students: Student[],
  assessments: Assessment[],
  grades: GradeRecord[],
  period: number,
  settings: SchoolSettings
) {
  const periodAssessments = assessments.filter(a => a.period === period);
  
  const headers: Record<string, any>[] = students.map((st, index) => {
    const row: Record<string, any> = {
      'Nº': index + 1,
      'Matrícula': st.registration,
      'Estudante': st.name,
    };

    // Add each assessment
    periodAssessments.forEach(ass => {
      const g = grades.find(grade => grade.studentId === st.id && grade.assessmentId === ass.id);
      let gradeDisplay: string | number = '-';
      if (g) {
        if (g.status === 'graded' && typeof g.value === 'number') gradeDisplay = g.value;
        else if (g.status === 'pending') gradeDisplay = 'Pend.';
        else if (g.status === 'absent') gradeDisplay = 'Faltou';
        else if (g.status === 'excused') gradeDisplay = 'Disp.';
      }
      row[`${ass.title} (Peso ${ass.weight})`] = gradeDisplay;
    });

    const calc = calculatePeriodGrade(period, assessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);
    row['Média Regular'] = calc.regularAverage !== null ? calc.regularAverage : '-';
    row['Nota Recuperação'] = calc.recoveryGrade !== null ? calc.recoveryGrade : '-';
    row['Média Final Bimestre'] = calc.finalAverage !== null ? calc.finalAverage : '-';
    row['Situação'] = calc.finalAverage === null ? 'Sem Nota' : calc.finalAverage >= settings.passingGrade ? 'Aprovado' : 'Abaixo da Média';

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(headers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${period}º Bimestre`);
  XLSX.writeFile(workbook, `Diario_Notas_${cls.name}_${period}Bimestre.xlsx`);
}

// Download Sample Templates for Excel & CSV
export function downloadSampleSpreadsheetTemplate(type: 'xlsx' | 'csv') {
  const sampleData = [
    {
      'Matrícula': '20261001',
      'Nome Completo': 'Ana Carolina Silva',
      'Série': '1º Ano',
      'Turma': '1º Ano A - Informática',
      'Curso Técnico': 'Informática para Internet',
      'Situação': 'Ativo',
      'E-mail': 'ana.silva@escola.sp.gov.br',
      'Telefone Contato': '(11) 98765-4321',
      'Nota P1': '8,5',
      'Nota T1': '9,0',
      'Nota REC': '',
      'Observações': 'Exemplo fictício demonstrativo'
    },
    {
      'Matrícula': '20261002',
      'Nome Completo': 'Bruno Henrique Santos',
      'Série': '1º Ano',
      'Turma': '1º Ano A - Informática',
      'Curso Técnico': 'Informática para Internet',
      'Situação': 'Ativo',
      'E-mail': 'bruno.santos@escola.sp.gov.br',
      'Telefone Contato': '(11) 98765-4322',
      'Nota P1': '4,5',
      'Nota T1': '5,0',
      'Nota REC': '7,0',
      'Observações': 'Exemplo fictício demonstrativo'
    },
    {
      'Matrícula': '20261003',
      'Nome Completo': 'Carlos Eduardo Oliveira',
      'Série': '1º Ano',
      'Turma': '1º Ano A - Informática',
      'Curso Técnico': 'Informática para Internet',
      'Situação': 'Ativo',
      'E-mail': 'carlos.oliveira@escola.sp.gov.br',
      'Telefone Contato': '(11) 98765-4323',
      'Nota P1': '7,0',
      'Nota T1': '7,5',
      'Nota REC': '',
      'Observações': 'Exemplo fictício demonstrativo'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo_Importacao');

  if (type === 'xlsx') {
    XLSX.writeFile(workbook, 'Modelo_Importacao_GestaoEscolarPRO.xlsx');
  } else {
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
    const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Modelo_Importacao_GestaoEscolarPRO.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ==========================================
// 2. PROFESSIONAL PDF REPORTS (jsPDF + autoTable)
// ==========================================

export function exportIndividualReportCardPDF(
  student: Student,
  cls: ClassEntity | undefined,
  assessments: Assessment[],
  grades: GradeRecord[],
  qualitative: QualitativeRecord[],
  attendance: AttendanceRecord[],
  settings: SchoolSettings
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.schoolName || 'GESTÃO ESCOLAR PRO', 105, 11, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('BOLETIM ACADÊMICO E PEDAGÓGICO INDIVIDUAL', 105, 18, { align: 'center' });

  // Student Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Estudante: ${student.name}`, 14, 34);
  doc.setFont('helvetica', 'normal');
  doc.text(`Matrícula: ${student.registration}`, 14, 40);
  doc.text(`Turma: ${student.className || cls?.name || '-'}`, 14, 46);
  doc.text(`Curso Técnico: ${student.technicalCourse || cls?.technicalCourse || '-'}`, 14, 52);

  doc.text(`Ano Letivo: ${student.academicYear}`, 130, 34);
  doc.text(`Disciplina: ${settings.subjectName || 'Física'}`, 130, 40);
  doc.text(`Professor(a): ${settings.teacherName || 'Docente Responsável'}`, 130, 46);
  doc.text(`Média para Aprovação: ${formatGrade(settings.passingGrade)}`, 130, 52);

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 56, 196, 56);

  // Grades Table by Period (Bimestres 1 a 4)
  const periodRows: any[] = [];
  let totalFinalSum = 0;
  let validFinalCount = 0;

  for (let p = 1; p <= settings.periodsCount; p++) {
    const calc = calculatePeriodGrade(p, assessments, grades, student.id, settings.calculationMode, settings.recoveryPolicy);
    const pAssessments = assessments.filter(a => a.period === p && a.type !== 'recuperacao');
    const assNames = pAssessments.map(a => {
      const g = grades.find(grade => grade.studentId === student.id && grade.assessmentId === a.id);
      return `${a.title.split(':')[0] || a.title}: ${g?.value !== null && g?.value !== undefined ? formatGrade(g.value) : '-'}`;
    }).join(' | ');

    if (calc.finalAverage !== null) {
      totalFinalSum += calc.finalAverage;
      validFinalCount++;
    }

    periodRows.push([
      `${p}º Bimestre`,
      assNames || 'Sem instrumentos',
      calc.regularAverage !== null ? formatGrade(calc.regularAverage) : '-',
      calc.recoveryGrade !== null ? formatGrade(calc.recoveryGrade) : '-',
      calc.finalAverage !== null ? formatGrade(calc.finalAverage) : '-',
      calc.finalAverage === null ? 'Pendente' : calc.finalAverage >= settings.passingGrade ? 'Satisfatório' : 'Necessita Apoio'
    ]);
  }

  const annualAvg = validFinalCount > 0 ? Number((totalFinalSum / validFinalCount).toFixed(2)) : null;

  autoTable(doc, {
    startY: 60,
    head: [['Período', 'Avaliações do Bimestre', 'Média Reg.', 'Recup.', 'Média Final', 'Situação']],
    body: periodRows,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 28, halign: 'center' },
    }
  });

  // Annual Summary Box
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO DESEMPENHO ACADÊMICO:', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Média Geral Acumulada: ${formatGrade(annualAvg)}`, 14, finalY + 6);
  const statusStr = annualAvg === null ? 'Em Andamento' : annualAvg >= settings.passingGrade ? 'Aprovado / Desempenho Satisfatório' : 'Abaixo da Média Mínima';
  doc.text(`Situação Provisória: ${statusStr}`, 14, finalY + 12);

  // Attendance summary
  let studentPresences = 0;
  let studentAbsences = 0;
  let studentJustified = 0;
  attendance.forEach(att => {
    const rec = att.records[student.id];
    if (rec) {
      if (rec.status === 'present' || rec.status === 'late') studentPresences++;
      else if (rec.status === 'absent') studentAbsences++;
      else if (rec.status === 'justified') studentJustified++;
    }
  });
  const totalClasses = studentPresences + studentAbsences + studentJustified;
  const attendanceRate = totalClasses > 0 ? ((studentPresences + studentJustified) / totalClasses) * 100 : 100;

  doc.text(`Aulas Registradas: ${totalClasses}  |  Presenças: ${studentPresences}  |  Faltas: ${studentAbsences} (${formatGrade(attendanceRate)}% frequência)`, 14, finalY + 18);

  // Qualitative Observations section
  const studentQual = qualitative.filter(q => q.studentId === student.id);
  const qualStartY = finalY + 26;

  doc.setFont('helvetica', 'bold');
  doc.text('ACOMPANHAMENTO FORMATIVO E QUALITATIVO:', 14, qualStartY);

  let afterQualY = qualStartY + 8;

  if (studentQual.length > 0) {
    const qualRows = studentQual.map(q => [
      `${q.period}º Bim. (${q.date || '-'})`,
      q.criterionLabel || q.criterion,
      q.level === 'excelente' ? 'Excelente' : q.level === 'bom' ? 'Bom' : q.level === 'em_desenvolvimento' ? 'Em Desenvolvimento' : 'Necessita Acompanhamento',
      q.comment || 'Sem parecer adicional'
    ]);

    autoTable(doc, {
      startY: qualStartY + 4,
      head: [['Data / Bim.', 'Dimensão / Critério', 'Conceito', 'Parecer Pedagógico']],
      body: qualRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 76 }
      }
    });
    afterQualY = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('Nenhum registro qualitativo extraordinário lançado no período.', 14, qualStartY + 6);
    afterQualY = qualStartY + 14;
  }

  // General Pedagogical Observations of the Student
  if (student.observations && student.observations.trim().length > 0) {
    if (afterQualY > 235) {
      doc.addPage();
      afterQualY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('OBSERVAÇÕES PEDAGÓGICAS GERAIS DO ESTUDANTE:', 14, afterQualY);

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitObs = doc.splitTextToSize(student.observations.trim(), 176);
    const boxHeight = Math.max(12, splitObs.length * 4.5 + 4);
    
    doc.roundedRect(14, afterQualY + 3, 182, boxHeight, 2, 2, 'FD');
    doc.text(splitObs, 17, afterQualY + 8);
    afterQualY += boxHeight + 8;
  }

  // Footer & Signatures
  const pageHeight = doc.internal.pageSize.height;
  if (afterQualY > pageHeight - 25) {
    doc.addPage();
  }
  const footerY = doc.internal.pageSize.height;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Documento emitido pelo Gestão Escolar PRO em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`, 105, footerY - 18, { align: 'center' });
  doc.line(60, footerY - 10, 150, footerY - 10);
  doc.text('Assinatura do Professor / Coordenação Pedagógica', 105, footerY - 6, { align: 'center' });

  doc.save(`Boletim_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}_${student.registration}.pdf`);
}

export function exportClassPerformancePDF(
  cls: ClassEntity,
  students: Student[],
  assessments: Assessment[],
  grades: GradeRecord[],
  period: number,
  settings: SchoolSettings
) {
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${settings.schoolName || 'GESTÃO ESCOLAR PRO'} - ATA DE RENDIMENTO BIMESTRAL`, 148, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Turma: ${cls.name} | Série: ${cls.gradeYear} | Curso: ${cls.technicalCourse} | Disciplina: ${settings.subjectName} | ${period}º Bimestre`, 148, 17, { align: 'center' });

  const pAssessments = assessments.filter(a => a.period === period);
  
  const headers = ['Nº', 'Matrícula', 'Nome do Estudante'];
  pAssessments.forEach(a => headers.push(`${a.title.slice(0, 15)} (P${a.weight})`));
  headers.push('Média Reg.', 'Recup.', 'Média Final', 'Situação');

  const rows = students.map((st, i) => {
    const row = [(i + 1).toString(), st.registration, st.name];
    pAssessments.forEach(a => {
      const g = grades.find(grade => grade.studentId === st.id && grade.assessmentId === a.id);
      row.push(g?.value !== null && g?.value !== undefined ? formatGrade(g.value) : '-');
    });
    const calc = calculatePeriodGrade(period, assessments, grades, st.id, settings.calculationMode, settings.recoveryPolicy);
    row.push(calc.regularAverage !== null ? formatGrade(calc.regularAverage) : '-');
    row.push(calc.recoveryGrade !== null ? formatGrade(calc.recoveryGrade) : '-');
    row.push(calc.finalAverage !== null ? formatGrade(calc.finalAverage) : '-');
    row.push(calc.finalAverage === null ? 'Pendente' : calc.finalAverage >= settings.passingGrade ? 'Aprovado' : 'Abaixo da Média');
    return row;
  });

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  doc.save(`Ata_Rendimento_${cls.name.replace(/[^a-zA-Z0-9]/g, '_')}_${period}Bim.pdf`);
}
