import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import { QualitativeRecord, QualitativeLevel } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { PageHeader } from '../common/PageHeader';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';

export const QUALITATIVE_CRITERIA = [
  { id: 'participacao', label: 'Participação e Engajamento nas Aulas' },
  { id: 'realizacao_atividades', label: 'Realização e Entrega das Atividades' },
  { id: 'organizacao', label: 'Organização e Responsabilidade com Materiais' },
  { id: 'autonomia', label: 'Autonomia na Aprendizagem e Resolução de Problemas' },
  { id: 'colaboracao', label: 'Colaboração e Trabalho em Equipe no Laboratório' },
  { id: 'convivencia', label: 'Respeito às Regras de Convivência Escolar' },
  { id: 'evolucao', label: 'Evolução e Superação Individual de Dificuldades' },
  { id: 'dificuldades', label: 'Dificuldades Conceituais Específicas em Física' },
  { id: 'pontos_fortes', label: 'Potencialidades e Habilidades Técnicas Destacadas' },
];

export const QualitativeView: React.FC = () => {
  const {
    students,
    classes,
    qualitative,
    selectedClassId,
    selectedPeriod,
    createQualitative,
    removeQualitative,
    showToast
  } = useAcademic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCriterion, setFilterCriterion] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Form State
  const [formStudentId, setFormStudentId] = useState('');
  const [formCriterion, setFormCriterion] = useState(QUALITATIVE_CRITERIA[0].id);
  const [formLevel, setFormLevel] = useState<QualitativeLevel>('bom');
  const [formPeriod, setFormPeriod] = useState<number>(selectedPeriod);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formComment, setFormComment] = useState('');

  // Class students for select
  const currentClassStudents = useMemo(() => {
    if (selectedClassId === 'all') return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Filtered qualitative list
  const filteredRecords = useMemo(() => {
    return qualitative.filter(rec => {
      const student = students.find(s => s.id === rec.studentId);
      const studentName = student?.name || rec.studentName || '';

      const matchSearch = search.trim() === '' || studentName.toLowerCase().includes(search.toLowerCase());
      const matchClass = selectedClassId === 'all' || rec.classId === selectedClassId;
      const matchCriterion = filterCriterion === 'all' || rec.criterion === filterCriterion;
      const matchLevel = filterLevel === 'all' || rec.level === filterLevel;
      const matchPeriod = rec.period === selectedPeriod;

      return matchSearch && matchClass && matchCriterion && matchLevel && matchPeriod;
    });
  }, [qualitative, students, search, selectedClassId, filterCriterion, filterLevel, selectedPeriod]);

  const handleOpenModal = () => {
    setFormStudentId(currentClassStudents[0]?.id || '');
    setFormCriterion(QUALITATIVE_CRITERIA[0].id);
    setFormLevel('bom');
    setFormPeriod(selectedPeriod);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormComment('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) return;

    const student = students.find(s => s.id === formStudentId);
    const critObj = QUALITATIVE_CRITERIA.find(c => c.id === formCriterion);

    await createQualitative({
      studentId: formStudentId,
      studentName: student?.name || '',
      classId: student?.classId || selectedClassId,
      period: formPeriod,
      date: formDate,
      criterion: formCriterion,
      criterionLabel: critObj?.label || formCriterion,
      level: formLevel,
      comment: formComment.trim() || undefined
    });

    setIsModalOpen(false);
    showToast('Anotação formativa registrada com sucesso!');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Acompanhamento Formativo & Qualitativo"
        subtitle="Registro de observações atitudinais, socioemocionais e de evolução na aprendizagem de Física."
        badge={
          <Badge variant="info">
            {filteredRecords.length} Registros ({selectedPeriod}º Bimestre)
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Novo Registro Formativo
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por estudante..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Criterion */}
        <div>
          <select
            value={filterCriterion}
            onChange={(e) => setFilterCriterion(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Dimensões / Critérios</option>
            {QUALITATIVE_CRITERIA.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Filter Concept */}
        <div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Escalas Conceituais</option>
            <option value="excelente">Excelente</option>
            <option value="bom">Bom</option>
            <option value="em_desenvolvimento">Em Desenvolvimento</option>
            <option value="necessita_acompanhamento">Necessita de Acompanhamento</option>
          </select>
        </div>
      </div>

      {/* Chronological List of Records */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake className="h-6 w-6" />}
            title="Nenhum registro qualitativo"
            description={`Não há anotações cadastradas para o ${selectedPeriod}º Bimestre com os filtros selecionados.`}
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenModal}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Registrar Primeiro Parecer
              </Button>
            }
          />
        ) : (
          filteredRecords.map(rec => {
            const student = students.find(s => s.id === rec.studentId);
            return (
              <Card
                key={rec.id}
                className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {student?.name || rec.studentName}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {student?.className || 'Turma'} ({student?.registration})
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      rec.level === 'excelente' ? 'success' :
                      rec.level === 'bom' ? 'info' :
                      rec.level === 'em_desenvolvimento' ? 'warning' : 'danger'
                    }>
                      {rec.level === 'excelente' ? 'Excelente' : rec.level === 'bom' ? 'Bom' : rec.level === 'em_desenvolvimento' ? 'Em Desenvolvimento' : 'Necessita Acompanhamento'}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">
                      {rec.date}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Excluir este parecer qualitativo?')) {
                          removeQualitative(rec.id);
                        }
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir parecer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block mb-1">
                    Dimensão: {rec.criterionLabel || rec.criterion}
                  </span>
                  {rec.comment && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{rec.comment}"
                    </p>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Qualitative Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Acompanhamento Qualitativo"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Estudante Avaliado *
            </label>
            <select
              required
              value={formStudentId}
              onChange={(e) => setFormStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {currentClassStudents.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.registration} • {st.className})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Dimensão / Critério de Acompanhamento *
              </label>
              <select
                value={formCriterion}
                onChange={(e) => setFormCriterion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {QUALITATIVE_CRITERIA.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Conceito / Nível Atribuído *
              </label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="excelente">Excelente (Supera expectativas)</option>
                <option value="bom">Bom (Plenamente satisfatório)</option>
                <option value="em_desenvolvimento">Em Desenvolvimento (Requer estímulo)</option>
                <option value="necessita_acompanhamento">Necessita de Acompanhamento (Alerta)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Bimestre de Referência
              </label>
              <select
                value={formPeriod}
                onChange={(e) => setFormPeriod(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4].map(p => (
                  <option key={p} value={p}>{p}º Bimestre</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Data do Registro
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Parecer Pedagógico Descritivo (Evidências e Orientações)
            </label>
            <textarea
              rows={3}
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="Descreva fatos observados, evolução de postura, colaboração ou necessidade de reforço em conceitos..."
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
              Salvar Registro
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
