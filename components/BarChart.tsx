'use client';
import { useRef, useEffect, useState } from 'react';

export type DayBar = {
  label: string;
  value: number;
  isToday: boolean;
  newMonth: boolean;
  monthLabel: string;
};

const BASE_SLOT = 38; // min px per bar slot

export default function BarChart({ data }: { data: DayBar[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState(BASE_SLOT);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cw = el.clientWidth;
    const natural = BASE_SLOT * data.length;
    // Expand bars to fill container if they fit; otherwise fixed + scroll
    setSlot(natural < cw ? cw / data.length : BASE_SLOT);
    el.scrollLeft = el.scrollWidth;
  }, [data.length]);

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-32">
      <p className="text-[13px] text-c4">Немає даних для відображення</p>
    </div>
  );

  const max     = Math.max(...data.map(d => d.value), 1);
  const SLOT    = slot;
  const BAR_W   = Math.min(Math.floor(SLOT * 0.62), 42);
  const H       = 140;
  const MONTH_H = 22;
  const LABEL_H = 24;
  const PX      = 4;
  const W       = SLOT * data.length + PX * 2;
  const totalH  = MONTH_H + H + LABEL_H;

  return (
    <div ref={ref} className="overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
      <svg
        width={Math.max(W, 400)}
        height={totalH}
        style={{ display: 'block', minWidth: '100%' }}
      >
        <defs>
          <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3"/>
          </linearGradient>
          <linearGradient id="bGT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="1"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6"/>
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={PX} y1={MONTH_H + Math.round(H * (1 - f))}
            x2={Math.max(W, 400) - PX} y2={MONTH_H + Math.round(H * (1 - f))}
            stroke="rgba(100,116,139,0.1)" strokeWidth="1" strokeDasharray="3 3"
          />
        ))}

        {data.map((d, i) => {
          const slotX  = PX + i * SLOT;
          const x      = slotX + (SLOT - BAR_W) / 2;
          const barH   = Math.max((d.value / max) * H, d.value > 0 ? 5 : 0);
          const barY   = MONTH_H + H - barH;
          const fill   = d.isToday ? 'url(#bGT)' : 'url(#bG)';

          // Value label: above bar, but clamp so it never overlaps month area
          const rawLabelY = barY - 5;
          const insideBar = rawLabelY < MONTH_H + 4;
          const valueLabelY  = insideBar ? barY + barH / 2 + 4 : rawLabelY;
          const valueLabelFill = insideBar
            ? 'rgba(255,255,255,0.85)'
            : (d.isToday ? '#818cf8' : 'rgba(99,102,241,0.75)');

          return (
            <g key={i}>
              {/* Month separator line */}
              {d.newMonth && i > 0 && (
                <line
                  x1={slotX} y1={MONTH_H}
                  x2={slotX} y2={MONTH_H + H}
                  stroke="rgba(100,116,139,0.2)" strokeWidth="1" strokeDasharray="2 3"
                />
              )}

              {/* Month label */}
              {d.newMonth && (
                <text
                  x={slotX + (i === 0 ? PX : 3)} y={MONTH_H - 6}
                  fontSize="10" fontWeight="700"
                  fill="rgba(100,116,139,0.6)" textAnchor="start"
                >
                  {d.monthLabel}
                </text>
              )}

              {/* Background track */}
              <rect
                x={x} y={MONTH_H} width={BAR_W} height={H}
                fill={d.isToday ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.03)'}
                rx="7"
              />

              {/* Bar */}
              {barH > 0 && (
                <rect
                  x={x} y={barY} width={BAR_W} height={barH}
                  fill={fill} rx="7"
                />
              )}

              {/* Value label */}
              {d.value > 0 && (
                <text
                  x={x + BAR_W / 2} y={valueLabelY}
                  textAnchor="middle" fontSize="9" fontWeight="600"
                  fill={valueLabelFill}
                >
                  {d.value}
                </text>
              )}

              {/* Day number label */}
              <text
                x={x + BAR_W / 2} y={MONTH_H + H + 15}
                textAnchor="middle" fontSize="10"
                fontWeight={d.isToday ? '700' : '400'}
                fill={d.isToday ? '#818cf8' : 'rgba(100,116,139,0.5)'}
              >
                {d.label}
              </text>

              {/* Today indicator dot */}
              {d.isToday && (
                <circle cx={x + BAR_W / 2} cy={MONTH_H + H + 21} r="2.2" fill="#818cf8"/>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
