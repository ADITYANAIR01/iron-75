'use client';

import { motion } from 'framer-motion';

export interface QuestPathStep {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  done: boolean;
  active?: boolean;
  doneColor?: string;
}

interface QuestPathProps {
  title: string;
  titleColor?: string;
  background?: string;
  borderColor?: string;
  steps: QuestPathStep[];
  hint?: string;
}

export default function QuestPath({
  title,
  titleColor = '#FFE66D',
  background = 'linear-gradient(135deg, rgba(255,230,109,0.08), rgba(255,107,53,0.06))',
  borderColor = 'rgba(255,230,109,0.2)',
  steps,
  hint,
}: QuestPathProps) {
  const completed = steps.filter((step) => step.done).length;

  return (
    <motion.div
      className="surface-2026 rounded-2xl p-4"
      style={{ background, border: `1px solid ${borderColor}` }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-black uppercase tracking-wider" style={{ color: titleColor }}>
          {title}
        </div>
        <span className="text-[10px] font-bold" style={{ color: '#F1F5F9' }}>
          {completed}/{steps.length}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2" role="list" aria-label={title}>
        {steps.map((step, index) => {
          const doneColor = step.doneColor ?? '#00F5D4';
          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0" role="listitem">
              <motion.div
                className="rounded-xl px-2 py-2 flex-1 interactive-press"
                style={{
                  background: step.done ? `${doneColor}1A` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${step.done ? `${doneColor}66` : 'rgba(255,255,255,0.08)'}`,
                }}
                animate={step.active ? { scale: [1, 1.04, 1] } : step.done ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 0.8, repeat: step.active ? Infinity : 0, repeatDelay: 0.35 }}
              >
                <div className="text-[10px] font-black" style={{ color: step.done ? doneColor : '#94A3B8' }}>
                  {step.icon} {step.title}
                </div>
                <div className="text-[9px] mt-0.5 truncate" style={{ color: '#64748B' }}>
                  {step.subtitle}
                </div>
              </motion.div>
              {index < steps.length - 1 && (
                <div
                  className="h-[2px] w-2 mx-1 rounded-full"
                  style={{ background: steps[index + 1].done ? '#00F5D4' : 'rgba(255,255,255,0.15)' }}
                />
              )}
            </div>
          );
        })}
      </div>
      {hint && (
        <div className="mt-2">
          <span className="chip-2026" style={{ color: '#CBD5E1' }}>{hint}</span>
        </div>
      )}
    </motion.div>
  );
}
