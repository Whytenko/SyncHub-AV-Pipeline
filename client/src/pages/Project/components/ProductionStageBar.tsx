import React, { useState } from 'react';
import { CheckCircle2, Circle, Lock, ChevronRight, ArrowLeft, BookOpen, Clapperboard, Video, Scissors, Award, ClipboardList, BarChart2 } from 'lucide-react';
import Modal from '../../../components/Modal';
import type { ProductionStage, Scene, ShootingDay } from '../../../types';

interface ProductionStageBarProps {
  stage: ProductionStage;
  scenes: Scene[];
  shootingDays: ShootingDay[];
  isOwner: boolean;
  canEdit: boolean;
  onAdvance: (next: ProductionStage) => void;
  onRetreat: (prev: ProductionStage) => void;
  t: (key: string) => string;
}

import type { LucideIcon } from 'lucide-react';

const STAGES: {
  id: ProductionStage;
  label: string;
  Icon: LucideIcon;
  color: string;
  description: string;
  includes: string[];
}[] = [
  {
    id: 'development',
    label: 'Разработка',
    Icon: BookOpen,
    color: '#9C27B0',
    description: 'Начальный этап: формируется концепция, пишется сценарий, создаются сцены. Вся команда знакомится с материалом.',
    includes: [
      'Сценарист создаёт и редактирует список сцен (INT/EXT, персонажи, хронометраж)',
      'Описываются параметры съёмки: актёрский состав, локации, формат, жанр',
      'Определяется бюджетный уровень и логлайн проекта',
      'Остальные отделы знакомятся с материалом в режиме просмотра',
    ],
  },
  {
    id: 'pre_production',
    label: 'Пре-продакшн',
    Icon: Clapperboard,
    color: '#2196F3',
    description: 'Подготовительный этап перед выездом на съёмку. Все отделы готовят материальную часть.',
    includes: [
      'Режиссёр создаёт раскадровку — кадры привязаны к сценам',
      'Костюмер формирует образы для каждого персонажа и сцены',
      'Визажист разрабатывает грим-карты по персонажам',
      'Менеджер строит съёмочный календарь — распределяет сцены по дням',
      'Назначаются задачи отделам, отслеживаются дедлайны',
    ],
  },
  {
    id: 'production',
    label: 'Съёмки',
    Icon: Video,
    color: '#FF9800',
    description: 'Основной съёмочный период. Команда работает по календарю съёмочных дней.',
    includes: [
      'Менеджер ведёт съёмочный календарь: открывает и закрывает дни',
      'После каждой сцены статус меняется с «Заблокировано» на «Снято»',
      'Костюмер и визажист работают на площадке по своим образам',
      'Звукорежиссёр записывает звук, ставит метки на таймлайне',
      'По завершении всех дней — переход в пост-продакшн',
    ],
  },
  {
    id: 'post_production',
    label: 'Пост-продакшн',
    Icon: Scissors,
    color: '#FF391A',
    description: 'Работа с отснятым материалом: монтаж, звук, цветокоррекция, VFX.',
    includes: [
      'Монтажёр обрабатывает сцены: Снято → Смонтировано → Утверждено',
      'Звукорежиссёр сводит звук, добавляет музыку и эффекты по сценам',
      'Медиафайлы загружаются и привязываются к проекту',
      'Комментарии команды фиксируются и разрешаются',
      'Каждая сцена проходит финальное утверждение',
    ],
  },
  {
    id: 'delivery',
    label: 'Сдача',
    Icon: Award,
    color: '#22c55e',
    description: 'Финальный этап. Все сцены утверждены, произведение готово к сдаче или публикации.',
    includes: [
      'Все сцены имеют статус «Утверждено»',
      'Менеджер скачивает итоговый отчёт по проекту',
      'Производится финальный экспорт данных проекта',
      'Проект считается завершённым',
    ],
  },
];

const STAGE_ORDER = STAGES.map(s => s.id);
const getStageIndex = (s: ProductionStage) => STAGE_ORDER.indexOf(s);

interface Gate { met: boolean; description: string }

const getGates = (toStage: ProductionStage, scenes: Scene[], days: ShootingDay[]): Gate[] => {
  switch (toStage) {
    case 'pre_production':
      return [
        { met: scenes.length > 0, description: 'Создана хотя бы одна сцена' },
        { met: scenes.some(s => s.status === 'locked' || s.status === 'shot' || s.status === 'approved'), description: 'Хотя бы одна сцена заблокирована сценаристом' },
      ];
    case 'production':
      return [
        { met: days.length > 0, description: 'Создан хотя бы один съёмочный день' },
        { met: scenes.length > 0 && scenes.every(s => s.status !== 'draft'), description: 'Ни одна сцена не находится в черновике' },
      ];
    case 'post_production':
      return [
        { met: days.length > 0 && days.every(d => d.status === 'wrapped' || d.status === 'postponed'), description: 'Все съёмочные дни завершены (Wrapped)' },
        { met: scenes.filter(s => s.shootingDayId).every(s => s.status === 'shot' || s.status === 'edited' || s.status === 'approved'), description: 'Все запланированные сцены отмечены как снятые' },
      ];
    case 'delivery':
      return [
        { met: scenes.length > 0 && scenes.every(s => s.status === 'approved'), description: 'Все сцены имеют статус «Утверждено»' },
      ];
    default:
      return [];
  }
};

const ProductionStageBar: React.FC<ProductionStageBarProps> = ({
  stage, scenes, shootingDays, isOwner, onAdvance, onRetreat
}) => {
  const [modalStage, setModalStage] = useState<ProductionStage | null>(null);
  const currentIdx = getStageIndex(stage);

  const nextStage = STAGE_ORDER[currentIdx + 1] as ProductionStage | undefined;
  const prevStage = STAGE_ORDER[currentIdx - 1] as ProductionStage | undefined;
  const nextGates = nextStage ? getGates(nextStage, scenes, shootingDays) : [];
  const allNextMet = nextGates.every(g => g.met);

  const modalData = modalStage ? STAGES.find(s => s.id === modalStage) : null;
  const modalIdx = modalStage ? getStageIndex(modalStage) : -1;
  const modalIsDone = modalIdx < currentIdx;
  const modalIsCurrent = modalIdx === currentIdx;
  const modalIsNext = modalStage === nextStage;
  const modalGates = modalStage ? getGates(modalStage, scenes, shootingDays) : [];
  const modalAllGatesMet = modalGates.length === 0 || modalGates.every(g => g.met);

  return (
    <>
      <div className="stage-bar">
        <div className="stage-bar-track">
          {STAGES.map((s, idx) => {
            const isDone    = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isLocked  = idx > currentIdx;
            const SIcon = s.Icon;

            return (
              <React.Fragment key={s.id}>
                <button
                  className={`stage-node${isCurrent ? ' stage-node--current' : ''}${isDone ? ' stage-node--done' : ''}${isLocked ? ' stage-node--locked' : ''}`}
                  onClick={() => setModalStage(s.id)}
                  title={`${s.label} — нажмите для подробностей`}
                  style={{ '--stage-color': s.color } as React.CSSProperties}
                >
                  <div className="stage-icon-wrap">
                    {isDone
                      ? <CheckCircle2 size={17} className="stage-icon-check" />
                      : isLocked
                      ? <Lock size={15} className="stage-icon-lock" />
                      : <SIcon size={15} style={{ color: s.color }} />
                    }
                  </div>
                  <span className="stage-label">{s.label}</span>
                </button>

                {idx < STAGES.length - 1 && (
                  <div className={`stage-connector${isDone ? ' stage-connector--done' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {isOwner && (
          <div className="stage-bar-actions">
            {prevStage && (
              <button className="stage-retreat-btn" onClick={() => onRetreat(prevStage)}>
                <ArrowLeft size={13} /> Назад
              </button>
            )}
            {nextStage && (
              <button
                className={`stage-advance-btn${allNextMet ? '' : ' stage-advance-btn--warn'}`}
                onClick={() => allNextMet ? onAdvance(nextStage) : setModalStage(nextStage)}
              >
                {allNextMet
                  ? <><ChevronRight size={14} /> {STAGES.find(s => s.id === nextStage)?.label}</>
                  : <>Условия не выполнены</>
                }
              </button>
            )}
          </div>
        )}
      </div>

      {modalData && (
        <Modal
          title={modalData.label}
          isOpen={true}
          onClose={() => setModalStage(null)}
          actions={
            <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
              <span className={`stage-modal-status-badge stage-modal-status-badge--${
                modalIsDone ? 'done' : modalIsCurrent ? 'current' : 'locked'
              }`}>
                {modalIsDone ? 'Завершён' : modalIsCurrent ? 'Текущий этап' : 'Заблокирован'}
              </span>
              <span style={{ flex: 1 }} />
              {isOwner && modalIsNext && (
                <button
                  className={`primary-btn${!modalAllGatesMet ? ' stage-modal-advance-disabled' : ''}`}
                  onClick={() => {
                    if (!modalAllGatesMet) return;
                    onAdvance(modalData.id);
                    setModalStage(null);
                  }}
                  title={!modalAllGatesMet ? 'Выполните все условия' : undefined}
                >
                  {modalAllGatesMet ? `Перейти в «${modalData.label}»` : 'Условия не выполнены'}
                </button>
              )}
              <button className="secondary-btn" onClick={() => setModalStage(null)}>Закрыть</button>
            </div>
          }
        >
          <div className="stage-modal-body">
            <div className="stage-modal-desc">{modalData.description}</div>

            <div className="stage-modal-section">
              <div className="stage-modal-section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <ClipboardList size={13} /> Что входит в этап
              </div>
              <ul className="stage-modal-list">
                {modalData.includes.map((item, i) => (
                  <li key={i} className="stage-modal-list-item">
                    <span className="stage-modal-list-dot" style={{ background: modalData.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {modalGates.length > 0 && (
              <div className="stage-modal-section">
                <div className="stage-modal-section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {modalAllGatesMet
                    ? <><CheckCircle2 size={13} style={{ color:'#22c55e' }} /> Все условия выполнены — можно переходить</>
                    : <><Lock size={13} /> Условия для перехода на этот этап</>
                  }
                </div>
                <div className="stage-modal-gates">
                  {modalGates.map((g, gi) => (
                    <div key={gi} className={`stage-gate-row${g.met ? ' stage-gate-row--met' : ''}`}>
                      {g.met
                        ? <CheckCircle2 size={14} className="stage-gate-icon-ok" />
                        : <Circle size={14} className="stage-gate-icon-no" />}
                      <span>{g.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(modalIsCurrent || modalIsDone) && scenes.length > 0 && (
              <div className="stage-modal-section">
                <div className="stage-modal-section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <BarChart2 size={13} /> Прогресс сцен
                </div>
                <div className="stage-modal-progress-row">
                  {(['draft','locked','shot','edited','approved'] as const).map(st => {
                    const count = scenes.filter(s => s.status === st).length;
                    if (count === 0) return null;
                    const labels = { draft:'Черновик', locked:'Заблок.', shot:'Снято', edited:'Смонт.', approved:'Утверждено' };
                    const colors = { draft:'#6b7280', locked:'#2196F3', shot:'#FF9800', edited:'#9C27B0', approved:'#22c55e' };
                    return (
                      <div key={st} className="stage-modal-progress-chip" style={{ borderColor: colors[st] }}>
                        <span style={{ color: colors[st], fontWeight: 800 }}>{count}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{labels[st]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default ProductionStageBar;
