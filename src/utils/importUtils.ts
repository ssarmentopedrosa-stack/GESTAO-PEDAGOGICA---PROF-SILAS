import * as XLSX from 'xlsx';
import { Student, ClassEntity, Assessment, GradeRecord } from '../types';

export interface ParsedSpreadsheet {
  sheetNames: string[];
  currentSheet: string;
  rawData: any[][];
  headers: string[];
  headerRowIndex: number;
}

export type TargetField = 
  | 'name'
  | 'registration'
  | 'gradeYear'
  | 'className'
  | 'technicalCourse'
  | 'status'
  | 'email'
  | 'guardianContact'
  | 'observations'
  | 'gradeP1'
  | 'gradeT1'
  | 'gradeRec'
  | 'ignore';

export interface ColumnMapping {
  columnIndex: number;
  columnHeader: string;
  targetField: TargetField;
}

export interface ValidationIssue {
  rowIndex: number;
  field: string;
  value: any;
  message: string;
  type: 'error' | 'warning';
}

export interface ParsedRowResult {
  rowIndex: number;
  raw: any;
  mappedStudent: Partial<Student>;
  gradesToImport?: {
    p1?: number;
    t1?: number;
    rec?: number;
  };
  errors: string[];
  warnings: string[];
  isDuplicateRegistration: boolean;
  isExistingMatch: boolean;
  matchedStudentId?: string;
}

export interface ImportSummary {
  totalRows: number;
  addedCount: number;
  updatedCount: number;
  ignoredCount: number;
  rejectedCount: number;
  details: string[];
}

export async function readSpreadsheetFile(file: File): Promise<{ workbook: XLSX.WorkBook; sheetNames: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        resolve({ workbook, sheetNames: workbook.SheetNames });
      } catch (err) {
        reject(new Error('Formato de arquivo inválido ou corrompido. Certifique-se de enviar um arquivo .xlsx, .xls ou .csv válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsBinaryString(file);
  });
}

export function extractSheetData(workbook: XLSX.WorkBook, sheetName: string, headerRowIndex: number = 0): ParsedSpreadsheet {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Aba "${sheetName}" não encontrada.`);

  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  const headers = (rawData[headerRowIndex] || []).map((h, i) => String(h || `Coluna_${i + 1}`).trim());

  return {
    sheetNames: workbook.SheetNames,
    currentSheet: sheetName,
    rawData,
    headers,
    headerRowIndex
  };
}

/**
 * Suggests intelligent mapping based on typical Brazilian school column headers
 */
export function autoDetectColumnMappings(headers: string[]): ColumnMapping[] {
  return headers.map((header, idx) => {
    const lower = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let target: TargetField = 'ignore';

    if (lower.includes('matricula') || lower.includes('cod') || lower.includes('registro') || lower.includes('ra')) {
      target = 'registration';
    } else if (lower.includes('nome') || lower.includes('aluno') || lower.includes('estudante')) {
      target = 'name';
    } else if (lower.includes('turma')) {
      target = 'className';
    } else if (lower.includes('serie') || lower.includes('ano')) {
      target = 'gradeYear';
    } else if (lower.includes('curso') || lower.includes('habilitacao')) {
      target = 'technicalCourse';
    } else if (lower.includes('situacao') || lower.includes('status')) {
      target = 'status';
    } else if (lower.includes('email') || lower.includes('e-mail')) {
      target = 'email';
    } else if (lower.includes('telefone') || lower.includes('contato') || lower.includes('responsavel')) {
      target = 'guardianContact';
    } else if (lower.includes('obs') || lower.includes('parecer')) {
      target = 'observations';
    } else if (lower.includes('recuperacao') || lower.includes('rec')) {
      target = 'gradeRec';
    } else if (lower.includes('p1') || lower.includes('prova') || lower.includes('nota 1')) {
      target = 'gradeP1';
    } else if (lower.includes('t1') || lower.includes('trabalho') || lower.includes('nota 2')) {
      target = 'gradeT1';
    }

    return {
      columnIndex: idx,
      columnHeader: header,
      targetField: target
    };
  });
}

/**
 * Converts string or number into valid float, handling Brazilian comma ('7,5' -> 7.5)
 */
export function parseBrazilianNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Validates and maps sheet rows to preview candidates
 */
export function processImportRows(
  rawData: any[][],
  headerRowIndex: number,
  mappings: ColumnMapping[],
  existingStudents: Student[],
  defaultClassId: string,
  defaultClassName: string,
  teacherUid: string,
  maxAllowedGrade: number = 10
): ParsedRowResult[] {
  const results: ParsedRowResult[] = [];
  const rows = rawData.slice(headerRowIndex + 1);
  const seenRegistrations = new Set<string>();

  rows.forEach((row, rowIndex) => {
    if (!row || row.length === 0 || row.every(c => c === '' || c === null || c === undefined)) {
      return; // Skip empty row
    }

    const mappedStudent: Partial<Student> = {
      id: `st-${Date.now()}-${rowIndex}-${Math.random().toString(36).substring(2, 6)}`,
      academicYear: 2026,
      classId: defaultClassId,
      className: defaultClassName,
      status: 'active',
      teacherUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const gradesToImport: { p1?: number; t1?: number; rec?: number } = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    mappings.forEach(m => {
      const val = row[m.columnIndex];
      if (val === undefined || val === null || val === '') return;

      switch (m.targetField) {
        case 'name':
          mappedStudent.name = String(val).trim();
          break;
        case 'registration':
          mappedStudent.registration = String(val).trim();
          break;
        case 'className':
          mappedStudent.className = String(val).trim();
          break;
        case 'gradeYear':
          mappedStudent.gradeYear = String(val).trim();
          break;
        case 'technicalCourse':
          mappedStudent.technicalCourse = String(val).trim();
          break;
        case 'status': {
          const stStr = String(val).toLowerCase();
          if (stStr.includes('transf')) mappedStudent.status = 'transferred';
          else if (stStr.includes('conc')) mappedStudent.status = 'graduated';
          else if (stStr.includes('inat')) mappedStudent.status = 'inactive';
          else mappedStudent.status = 'active';
          break;
        }
        case 'email':
          mappedStudent.email = String(val).trim();
          break;
        case 'guardianContact':
          mappedStudent.guardianContact = String(val).trim();
          break;
        case 'observations':
          mappedStudent.observations = String(val).trim();
          break;
        case 'gradeP1': {
          const parsed = parseBrazilianNumber(val);
          if (parsed !== null) {
            if (parsed < 0 || parsed > maxAllowedGrade) {
              errors.push(`Nota P1 (${val}) fora dos limites permitidos (0 a ${maxAllowedGrade})`);
            } else {
              gradesToImport.p1 = parsed;
            }
          }
          break;
        }
        case 'gradeT1': {
          const parsed = parseBrazilianNumber(val);
          if (parsed !== null) {
            if (parsed < 0 || parsed > maxAllowedGrade) {
              errors.push(`Nota T1 (${val}) fora dos limites permitidos (0 a ${maxAllowedGrade})`);
            } else {
              gradesToImport.t1 = parsed;
            }
          }
          break;
        }
        case 'gradeRec': {
          const parsed = parseBrazilianNumber(val);
          if (parsed !== null) {
            if (parsed < 0 || parsed > maxAllowedGrade) {
              errors.push(`Nota REC (${val}) fora dos limites permitidos (0 a ${maxAllowedGrade})`);
            } else {
              gradesToImport.rec = parsed;
            }
          }
          break;
        }
      }
    });

    // Validation
    if (!mappedStudent.name || mappedStudent.name.length < 2) {
      errors.push('Nome do estudante ausente ou inválido (mínimo de 2 caracteres).');
    }

    let isDuplicateRegistration = false;
    let isExistingMatch = false;
    let matchedStudentId: string | undefined = undefined;

    if (mappedStudent.registration) {
      if (seenRegistrations.has(mappedStudent.registration)) {
        isDuplicateRegistration = true;
        warnings.push(`Matrícula ${mappedStudent.registration} duplicada nesta mesma planilha.`);
      } else {
        seenRegistrations.add(mappedStudent.registration);
      }

      const existing = existingStudents.find(s => s.registration === mappedStudent.registration);
      if (existing) {
        isExistingMatch = true;
        matchedStudentId = existing.id;
        mappedStudent.id = existing.id; // PRESERVE EXISTING ID TO PREVENT DUPLICATES
        warnings.push(`Estudante já cadastrado (${existing.name}). Será atualizado/mesclado sem duplicação.`);
      }
    } else {
      // Generate temporary registration if none provided
      mappedStudent.registration = `TEMP-${Date.now().toString().slice(-4)}-${rowIndex + 1}`;
      warnings.push('Matrícula não informada. Código temporário gerado.');
    }

    results.push({
      rowIndex: rowIndex + headerRowIndex + 2,
      raw: row,
      mappedStudent,
      gradesToImport: Object.keys(gradesToImport).length > 0 ? gradesToImport : undefined,
      errors,
      warnings,
      isDuplicateRegistration,
      isExistingMatch,
      matchedStudentId
    });
  });

  return results;
}

/**
 * Generates and downloads a detailed CSV/TXT error report of inconsistencies
 */
export function downloadImportErrorReport(processedRows: ParsedRowResult[]) {
  const issueRows = processedRows.filter(r => r.errors.length > 0 || r.warnings.length > 0);
  if (issueRows.length === 0) return;

  const header = ['Linha', 'Matrícula', 'Nome', 'Tipo', 'Inconsistência/Validação'];
  const data = issueRows.map(r => [
    r.rowIndex,
    r.mappedStudent.registration || '-',
    r.mappedStudent.name || 'Não Identificado',
    r.errors.length > 0 ? 'ERRO CRÍTICO' : 'AVISO/DUPLICIDADE',
    [...r.errors, ...r.warnings].join(' | ')
  ]);

  const csvRows = [header, ...data].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\r\n');

  const blob = new Blob(['\uFEFF' + csvRows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Relatorio_Inconsistencias_Importacao_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
