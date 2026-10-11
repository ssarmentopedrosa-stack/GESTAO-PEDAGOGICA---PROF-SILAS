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
      comment: formComment.trim()
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Avaliação Qualitativa & Formativa
            </h2>
            <Badge variant="purple">
              {selectedPeriod}º Bimestre
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro autônomo de observações comportamentais, atitudinais e de desenvolvimento, independente de notas numéricas.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Registro Formativo</span>
        </button>
      </div>

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
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Criterion */}
        <div>
          <select
            value={filterCriterion}
            onChange={(e) => setFilterCriterion(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
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
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
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
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 text-xs">
            Nenhum registro qualitativo cadastrado para o {selectedPeriod}º Bimestre com os filtros selecionados.
          </div>
        ) : (
          filteredRecords.map(rec => {
            const student = students.find(s => s.id === rec.studentId);
            return (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-indigo-600" />
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
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition"
                      title="Excluir parecer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 block mb-1">
                    Dimensão: {rec.criterionLabel || rec.criterion}
                  </span>
                  {rec.comment && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{rec.comment}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Qualitative Record Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Parecer Formativo e Qualitativo"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Estudante *
            </label>
            <select
              required
              value={formStudentId}
              onChange={(e) => setFormStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {currentClassStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.registration} • {s.className})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Critério / Dimensão Avaliativa *
              </label>
              <select
                value={formCriterion}
                onChange={(e) => setFormCriterion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                {QUALITATIVE_CRITERIA.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Conceito / Nível Observado *
              </label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="excelente">Excelente (Autonomia e Proatividade)</option>
                <option value="bom">Bom (Atende com consistência)</option>
                <option value="em_desenvolvimento">Em Desenvolvimento (Progredindo)</option>
                <option value="necessita_acompanhamento">Necessita de Acompanhamento (Ponto de Atenção)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Bimestre
              </label>
              <select
                value={formPeriod}
                onChange={(e) => setFormPeriod(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value={1}>1º Bimestre</option>
                <option value={2}>2º Bimestre</option>
                <option value={3}>3º Bimestre</option>
                <option value={4}>4º Bimestre</option>
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
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Parecer Pedagógico Contextualizado (Respeitoso e Objetivo)
            </label>
            <textarea
              rows={3}
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="Descreva comportamentos observáveis, evolução individual e recomendações pedagógicas. Evite rótulos pessoais."
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
              Registrar Parecer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
