import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Users,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { ClassEntity } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface ClassesViewProps {
  onSelectClassGradebook: (classId: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ onSelectClassGradebook }) => {
  const {
    classes,
    students,
    settings,
    createClass,
    updateClass,
    removeClass,
    setSelectedClassId
  } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formGradeYear, setFormGradeYear] = useState<ClassEntity['gradeYear']>('1º Ano');
  const [formCourse, setFormCourse] = useState('Informática para Internet');
  const [formShift, setFormShift] = useState<ClassEntity['shift']>('Matutino');
  const [formSubject, setFormSubject] = useState('Física I');

  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormName('');
    setFormGradeYear('1º Ano');
    setFormCourse('Informática para Internet');
    setFormShift('Matutino');
    setFormSubject('Física I');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassEntity) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormGradeYear(cls.gradeYear);
    setFormCourse(cls.technicalCourse);
    setFormShift(cls.shift);
    setFormSubject(cls.subjectName || 'Física');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingClass) {
      await updateClass({
        ...editingClass,
        name: formName.trim(),
        gradeYear: formGradeYear,
        technicalCourse: formCourse.trim(),
        shift: formShift,
        subjectName: formSubject.trim()
      });
    } else {
      await createClass({
        name: formName.trim(),
        gradeYear: formGradeYear,
        technicalCourse: formCourse.trim(),
        shift: formShift,
        academicYear: settings.academicYear,
        subjectName: formSubject.trim()
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (cls: ClassEntity) => {
    const studentCount = students.filter(s => s.classId === cls.id).length;
    if (confirm(`Atenção: Excluir a turma "${cls.name}" (${studentCount} alunos matriculados)? Todas as notas associadas a esta turma serão removidas.`)) {
      removeClass(cls.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Turmas & Séries do Ensino Médio Integrado
            </h2>
            <Badge variant="info">
              {classes.length} Turmas Ativas
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerenciamento das turmas, habilitações técnicas, turnos e distribuição da carga horária de {settings.subjectName || 'Física'}.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Turma</span>
        </button>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => {
          const classStudents = students.filter(s => s.classId === cls.id);
          const activeStudents = classStudents.filter(s => s.status === 'active');

          return (
            <div
              key={cls.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {cls.gradeYear} • {cls.shift}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Editar Turma"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Excluir Turma"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {cls.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {cls.technicalCourse}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Disciplina: {cls.subjectName || 'Física'}
                  </p>
                </div>

                <div className="mt-4 flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeStudents.length}</span>
                    <span>alunos ativos</span>
                  </div>
                  <div>
                    <span>Ano: </span>
                    <span className="font-semibold">{cls.academicYear}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    onSelectClassGradebook(cls.id);
                  }}
                  className="w-full inline-flex items-center justify-center space-x-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                >
                  <span>Abrir Diário desta Turma</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? `Editar Turma: ${editingClass.name}` : 'Cadastrar Nova Turma'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nome da Turma *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: 1º Ano A - Informática"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Série do Ensino Médio
              </label>
              <select
                value={formGradeYear}
                onChange={(e) => setFormGradeYear(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="1º Ano">1º Ano do Ensino Médio</option>
                <option value="2º Ano">2º Ano do Ensino Médio</option>
                <option value="3º Ano">3º Ano do Ensino Médio</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Turno
              </label>
              <select
                value={formShift}
                onChange={(e) => setFormShift(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Noturno">Noturno</option>
                <option value="Integral">Integral</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Curso Técnico Integrado
            </label>
            <input
              type="text"
              required
              value={formCourse}
              onChange={(e) => setFormCourse(e.target.value)}
              placeholder="Ex: Informática para Internet, Mecatrônica, Edificações..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Componente Curricular / Disciplina
            </label>
            <input
              type="text"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="Ex: Física I, Física Aplicada..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              {editingClass ? 'Salvar Turma' : 'Cadastrar Turma'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
