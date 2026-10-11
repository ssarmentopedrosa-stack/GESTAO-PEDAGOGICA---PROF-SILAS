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
import { PageHeader } from '../common/PageHeader';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';

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
      <PageHeader
        title="Turmas & Cursos do Ensino Médio"
        subtitle={`Gerenciamento das turmas, cursos técnicos, turnos e distribuição da carga horária de ${settings.subjectName || 'Física'}.`}
        badge={
          <Badge variant="info">
            {classes.length} Turmas Ativas
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nova Turma
          </Button>
        }
      />

      {/* Grid of Classes */}
      {classes.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title="Nenhuma turma cadastrada"
          description="Crie turmas para organizar os estudantes e os diários de notas."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Criar Primeira Turma
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => {
            const classStudents = students.filter(s => s.classId === cls.id);
            const activeStudents = classStudents.filter(s => s.status === 'active');

            return (
              <Card
                key={cls.id}
                className="hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <Badge variant="info">
                      {cls.gradeYear} • {cls.shift}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar Turma"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cls)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
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
                    className="w-full inline-flex items-center justify-center space-x-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span>Abrir Diário desta Turma</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Série / Ano Escolar
              </label>
              <select
                value={formGradeYear}
                onChange={(e) => setFormGradeYear(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
              Curso Técnico Integrado *
            </label>
            <input
              type="text"
              required
              value={formCourse}
              onChange={(e) => setFormCourse(e.target.value)}
              placeholder="Ex: Informática para Internet"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Disciplina Ministrada
            </label>
            <input
              type="text"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="Ex: Física I ou Física Geral"
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
              {editingClass ? 'Salvar Turma' : 'Cadastrar Turma'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
