import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  FileSpreadsheet,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { Student } from '../../types';
import { exportStudentsToExcel, exportStudentsToCSV, exportIndividualReportCardPDF } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { PageHeader } from '../common/PageHeader';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';

interface StudentsViewProps {
  onSelectStudentProfile: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({ onSelectStudentProfile }) => {
  const {
    students,
    classes,
    assessments,
    grades,
    qualitative,
    attendance,
    settings,
    createStudent,
    updateStudent,
    removeStudent,
    showToast
  } = useAcademic();

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal create/edit student
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formReg, setFormReg] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formStatus, setFormStatus] = useState<Student['status']>('active');
  const [formEmail, setFormEmail] = useState('');
  const [formGuardian, setFormGuardian] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const matchSearch =
        search.trim() === '' ||
        st.name.toLowerCase().includes(search.toLowerCase()) ||
        st.registration.toLowerCase().includes(search.toLowerCase()) ||
        st.className.toLowerCase().includes(search.toLowerCase());

      const matchClass = filterClass === 'all' || st.classId === filterClass;
      const matchStatus = filterStatus === 'all' || st.status === filterStatus;

      return matchSearch && matchClass && matchStatus;
    });
  }, [students, search, filterClass, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Open modal for new student
  const handleOpenCreateModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormReg('');
    setFormClassId(classes[0]?.id || '');
    setFormStatus('active');
    setFormEmail('');
    setFormGuardian('');
    setFormObs('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormReg(student.registration);
    setFormClassId(student.classId);
    setFormStatus(student.status);
    setFormEmail(student.email || '');
    setFormGuardian(student.guardianContact || '');
    setFormObs(student.observations || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit student form
  const handleSaveStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetClass = classes.find(c => c.id === formClassId);
    if (!targetClass) {
      setFormError('Selecione uma turma válida.');
      return;
    }

    if (!formName.trim() || !formReg.trim()) {
      setFormError('Preencha os campos obrigatórios (Nome e Matrícula).');
      return;
    }

    // Check unique registration if creating or changing
    const duplicate = students.find(s => s.registration === formReg.trim() && s.id !== editingStudent?.id);
    if (duplicate) {
      setFormError(`Já existe um estudante com a matrícula ${formReg.trim()} (${duplicate.name}).`);
      return;
    }

    try {
      if (editingStudent) {
        await updateStudent({
          ...editingStudent,
          name: formName.trim(),
          registration: formReg.trim(),
          classId: targetClass.id,
          className: targetClass.name,
          gradeYear: targetClass.gradeYear,
          technicalCourse: targetClass.technicalCourse,
          status: formStatus,
          email: formEmail.trim() || undefined,
          guardianContact: formGuardian.trim() || undefined,
          observations: formObs.trim() || undefined,
          updatedAt: new Date().toISOString()
        });
        showToast('Estudante atualizado com sucesso!');
      } else {
        await createStudent({
          name: formName.trim(),
          registration: formReg.trim(),
          classId: targetClass.id,
          className: targetClass.name,
          gradeYear: targetClass.gradeYear,
          technicalCourse: targetClass.technicalCourse,
          academicYear: settings.academicYear,
          status: formStatus,
          email: formEmail.trim() || undefined,
          guardianContact: formGuardian.trim() || undefined,
          observations: formObs.trim() || undefined,
        });
        showToast('Estudante cadastrado com sucesso!');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar estudante.');
    }
  };

  const handleDeleteStudent = (st: Student) => {
    if (confirm(`Excluir permanentemente o estudante ${st.name} (Matrícula: ${st.registration}) e todo o seu histórico pedagógico?`)) {
      removeStudent(st.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Cadastro & Gestão de Estudantes"
        subtitle={`Listagem nominal com matrícula, curso técnico integrado e prontuário acadêmico (${students.length} estudantes no total).`}
        badge={
          <Badge variant="info">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'estudante' : 'estudantes'}
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportStudentsToExcel(filteredStudents, 'Listagem_Geral')}
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
            >
              Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportStudentsToCSV(filteredStudents, 'Listagem_Geral')}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              CSV
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Novo Estudante
            </Button>
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome, matrícula ou turma..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Class */}
        <div>
          <select
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Turmas ({classes.length})</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Situações</option>
            <option value="active">Apenas Ativos</option>
            <option value="transferred">Transferidos</option>
            <option value="graduated">Concluídos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* High Performance Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        {paginatedStudents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Nenhum estudante encontrado"
              description="Ajuste os filtros de pesquisa ou cadastre um novo estudante na turma."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateModal}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Cadastrar Estudante
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Nome Completo</th>
                  <th className="px-4 py-3">Turma & Série</th>
                  <th className="px-4 py-3">Curso Técnico Integrado</th>
                  <th className="px-4 py-3 text-center">Situação</th>
                  <th className="px-4 py-3 text-right">Ações Pedagógicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedStudents.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">
                      {st.registration}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                      {st.name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                      {st.className} ({st.gradeYear})
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {st.technicalCourse}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={st.status === 'active' ? 'success' : st.status === 'transferred' ? 'warning' : 'neutral'}>
                        {st.status === 'active' ? 'Ativo' : st.status === 'transferred' ? 'Transferido' : st.status === 'graduated' ? 'Concluído' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* 360 Profile */}
                        <button
                          onClick={() => onSelectStudentProfile(st.id)}
                          className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium text-[11px] transition-colors"
                          title="Visualizar histórico 360º"
                        >
                          Perfil 360º
                        </button>

                        {/* Quick PDF Report Card */}
                        <button
                          onClick={() => exportIndividualReportCardPDF(
                            st,
                            classes.find(c => c.id === st.classId),
                            assessments,
                            grades,
                            qualitative,
                            attendance,
                            settings
                          )}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Emitir Boletim PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditModal(st)}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Editar Cadastro"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteStudent(st)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Excluir Estudante"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span>Exibindo {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredStudents.length)} de {filteredStudents.length} alunos</span>
            <span>•</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value={20}>20 por página</option>
              <option value={35}>35 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={500}>Todos ({students.length})</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Student Form Modal (Create & Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? `Editar Cadastro: ${editingStudent.name}` : 'Cadastrar Novo Estudante'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStudentSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nome Completo do Estudante *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Ana Carolina Silva"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Matrícula / Código Escolar *
              </label>
              <input
                type="text"
                required
                value={formReg}
                onChange={(e) => setFormReg(e.target.value)}
                placeholder="Ex: 20261042"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Situação Cadastral
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Ativo</option>
                <option value="transferred">Transferido</option>
                <option value="graduated">Concluído</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Turma de Destino *
            </label>
            <select
              required
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gradeYear} • {c.technicalCourse})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="aluno@escola.sp.gov.br"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Contato do Responsável
              </label>
              <input
                type="text"
                value={formGuardian}
                onChange={(e) => setFormGuardian(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Observações Pedagógicas Iniciais (Opcional)
            </label>
            <textarea
              rows={2}
              value={formObs}
              onChange={(e) => setFormObs(e.target.value)}
              placeholder="Anotações de acolhimento, necessidades específicas ou histórico prévio..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {editingStudent ? 'Salvar Alterações' : 'Cadastrar Estudante'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
