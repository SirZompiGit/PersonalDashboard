import React, { useState, useEffect, useRef } from 'react';
import { HealthBar } from '../types';
import { ShieldAlert, Edit2, Trash2 } from 'lucide-react';
import { playDamageSound, playHealSound, playDeathSound, playMaxHealthSound, playClickSound } from '../utils/audio';

interface Particle {
  id: string;
  value: number;
  offsetX: number;
}

interface HealthBarItemProps {
  bar: HealthBar;
  onEdit: (bar: HealthBar) => void;
  onDelete: (id: string) => void;
  getBarColor: (bar: HealthBar) => string;
  isMouseDown: boolean;
  activeBarIdRef: React.MutableRefObject<string | null>;
  setIsMouseDown: (val: boolean) => void;
  handleSegmentInteraction: (bar: HealthBar, segValue: number) => void;
  readOnly?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const HealthBarItem: React.FC<HealthBarItemProps> = ({
  bar,
  onEdit,
  onDelete,
  getBarColor,
  isMouseDown,
  activeBarIdRef,
  setIsMouseDown,
  handleSegmentInteraction,
  readOnly = false,
  layout = 'horizontal'
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flashState, setFlashState] = useState<'damage' | 'heal' | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const prevValueRef = useRef(bar.currentValue);
  const barContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMouseDown || activeBarIdRef.current !== bar.id || readOnly) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!barContainerRef.current) return;
      const rect = barContainerRef.current.getBoundingClientRect();
      let newPercentage = 0;
      if (layout === 'vertical') {
        const y = e.clientY - rect.top;
        newPercentage = 1 - (y / rect.height);
      } else {
        const x = e.clientX - rect.left;
        newPercentage = x / rect.width;
      }
      newPercentage = Math.max(0, Math.min(1, newPercentage));
      const newValue = Math.round(newPercentage * bar.maxValue);
      if (newValue !== bar.currentValue) {
        handleSegmentInteraction(bar, newValue);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMouseDown, bar, layout, readOnly, handleSegmentInteraction, activeBarIdRef]);

  useEffect(() => {
    if (bar.currentValue !== prevValueRef.current) {
      const diff = bar.currentValue - prevValueRef.current;
      const ratio = bar.maxValue > 0 ? bar.currentValue / bar.maxValue : 0;
      
      if (diff < 0) {
        setFlashState('damage');
        setIsShaking(true);
        if (bar.currentValue <= 0) {
          playDeathSound();
        } else {
          playDamageSound(ratio);
        }
        setTimeout(() => setIsShaking(false), 300);
      } else if (diff > 0) {
        setFlashState('heal');
        if (bar.currentValue >= bar.maxValue) {
          playMaxHealthSound();
        } else {
          playHealSound(ratio);
        }
      }
      setTimeout(() => setFlashState(null), 400);

      const newParticle = {
        id: crypto.randomUUID(),
        value: diff,
        offsetX: (Math.random() - 0.5) * 80
      };
      setParticles(p => [...p, newParticle]);
      setTimeout(() => {
        setParticles(p => p.filter(part => part.id !== newParticle.id));
      }, 1000);

      prevValueRef.current = bar.currentValue;
    }
  }, [bar.currentValue, bar.maxValue]);

  const percentage = bar.maxValue > 0 ? (bar.currentValue / bar.maxValue) * 100 : 0;
  const activeColor = getBarColor(bar);
  
  const segments = [];
  for (let i = 1; i <= bar.maxValue; i++) {
    segments.push(i);
  }

  const glowShadow = `0 0 15px ${activeColor}70`;
  const inactiveColor = activeColor; 

  
  if (layout === 'vertical') {
    return (
      <>
        <style>{`
          @keyframes healthParticleFloat {
            0% { transform: translate(calc(-50% + var(--ox)), -50%) scale(0.5); opacity: 0; }
            20% { transform: translate(calc(-50% + var(--ox)), -120%) scale(1.3); opacity: 1; }
            100% { transform: translate(calc(-50% + var(--ox)), -250%) scale(0.8); opacity: 0; }
          }
          @keyframes healthShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
        `}</style>
        <div 
          className={`bg-[#0c0d10] border border-bento-border rounded-xl p-2 pr-3 ${readOnly ? '' : 'hover:border-slate-600'} transition-all relative group flex flex-row items-center justify-center gap-1.5 h-full min-h-[160px] max-h-[300px] min-w-[50px] shrink-0`}
          style={{ animation: isShaking ? 'healthShake 0.15s ease-in-out 2' : 'none' }}
        >
          {/* Name Section */}
          <div className="flex items-center justify-center h-full">
            <span className="font-display font-bold text-slate-200 tracking-wider text-[13px] leading-none [writing-mode:vertical-rl] rotate-180 uppercase truncate max-h-[140px]">
              {bar.name}
            </span>
          </div>

          {/* Bar Section */}
          <div className="flex flex-col items-center justify-between h-full w-[28px]">
            {/* The Bar */}
            <div className="relative flex-grow flex justify-center w-full mb-1">
              <div 
                ref={barContainerRef}
                className={`flex flex-col-reverse w-full h-full rounded bg-[#1a1d23] overflow-hidden border border-[#2d333d] ${bar.maxValue > 60 ? 'gap-0' : bar.maxValue > 30 ? 'gap-[1px]' : 'gap-[1px]'} p-[2px] select-none ${readOnly ? '' : 'cursor-pointer'} transition-shadow relative z-10 ${
                  flashState === 'damage' ? 'ring-2 ring-[#ff0055]/30 shadow-[inset_0_0_10px_rgba(255,0,85,0.2)]' : 
                  flashState === 'heal' ? 'ring-2 ring-[#00ff88]/30 shadow-[inset_0_0_10px_rgba(0,255,136,0.2)]' : ''
                }`}
                onMouseDown={() => {
                  if (readOnly) return;
                  setIsMouseDown(true);
                  activeBarIdRef.current = bar.id;
                }}
              >
                {segments.map((segIndex) => {
                  const isSegmentActive = segIndex <= bar.currentValue;
                  const segValue = segIndex;
                  return (
                    <div
                      key={segIndex}
                      className="w-full flex-grow rounded-[2px] transition-all duration-200"
                      style={{
                        backgroundColor: isSegmentActive ? activeColor : inactiveColor,
                        opacity: isSegmentActive ? 1 : 0.08,
                        boxShadow: isSegmentActive ? glowShadow : 'none',
                        transform: isSegmentActive ? 'scale(1)' : 'scale(0.98)',
                      }}
                      onClick={() => { if (!readOnly) { playClickSound(); handleSegmentInteraction(bar, segValue); } }}
                      onMouseEnter={() => {
                        if (readOnly) return;
                        if (isMouseDown && activeBarIdRef.current === bar.id) {
                          handleSegmentInteraction(bar, segValue);
                        }
                      }}
                    />
                  );
                })}
              </div>
              {particles.map(p => (
                <div
                  key={p.id}
                  className="absolute top-1/2 left-1/2 z-50 pointer-events-none font-display font-black text-xl"
                  style={{
                    '--ox': `${p.offsetX}px`,
                    color: p.value > 0 ? '#00ff88' : '#ff0055',
                    textShadow: `0 0 10px ${p.value > 0 ? '#00ff88' : '#ff0055'}`,
                    animation: 'healthParticleFloat 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                  } as React.CSSProperties}
                >
                  {p.value > 0 ? '+' : ''}{p.value}
                </div>
              ))}
            </div>

            {/* Numbers and Percentage at Bottom */}
            <div className="font-mono text-[10px] text-slate-400 shrink-0 flex flex-col items-center leading-none">
              <div className="flex items-center whitespace-nowrap">
                <span className="font-bold text-slate-100 text-[11px]">{bar.currentValue}</span>
                <span className="text-slate-600 mx-[1px]">/</span>
                <span>{bar.maxValue}</span>
              </div>
              <span className="text-slate-500 text-[9px] mt-0.5 font-bold">({Math.round(percentage)}%)</span>
            </div>
          </div>
        </div>
      </>
    );
  }


  return (
    <>
      <style>{`
        @keyframes healthParticleFloat {
          0% { transform: translate(calc(-50% + var(--ox)), -50%) scale(0.5); opacity: 0; }
          20% { transform: translate(calc(-50% + var(--ox)), -120%) scale(1.3); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--ox)), -250%) scale(0.8); opacity: 0; }
        }
        @keyframes healthShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
      <div 
        className={`bg-[#0c0d10] border border-bento-border rounded-xl p-4 ${readOnly ? '' : 'hover:border-slate-600'} transition-all relative group`}
        style={{ animation: isShaking ? 'healthShake 0.15s ease-in-out 2' : 'none' }}
      >
        {!readOnly && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-20">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClickSound(); handleSegmentInteraction(bar, Math.max(0, bar.currentValue - 5)); }}
              className="p-1.5 font-mono text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
              title="-5 HP"
            >
              -5
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClickSound(); handleSegmentInteraction(bar, Math.max(0, bar.currentValue - 1)); }}
              className="p-1.5 font-mono text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
              title="-1 HP"
            >
              -1
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClickSound(); handleSegmentInteraction(bar, Math.min(bar.maxValue, bar.currentValue + 1)); }}
              className="p-1.5 font-mono text-xs font-bold text-slate-400 hover:text-green-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
              title="+1 HP"
            >
              +1
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClickSound(); handleSegmentInteraction(bar, Math.min(bar.maxValue, bar.currentValue + 5)); }}
              className="p-1.5 font-mono text-xs font-bold text-slate-400 hover:text-green-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
              title="+5 HP"
            >
              +5
            </button>
            <div className="w-px h-4 bg-bento-border mx-1" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClickSound(); onEdit(bar); }}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
              title="Modifica Barra"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); playClickSound(); onDelete(bar.id); }}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
              title="Elimina Barra"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className={`flex justify-between items-center mb-2.5 relative z-10 transition-all duration-200 ${readOnly ? 'pr-2' : 'pr-2 group-hover:pr-[220px] group-focus-within:pr-[220px]'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-bold text-slate-200 tracking-wide text-sm md:text-base truncate">
              {bar.name}
            </span>
            {bar.currentValue === 0 && (
              <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {bar.zeroHpText || 'DEFUNTO'}
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-slate-400 shrink-0">
            <span className="font-bold text-slate-100 text-sm">{bar.currentValue}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{bar.maxValue}</span>
            <span className="text-slate-500 ml-1.5">({Math.round(percentage)}%)</span>
          </div>
        </div>

        <div className="relative">
          <div 
            ref={barContainerRef}
            className={`flex h-8 w-full rounded-lg bg-[#1a1d23] overflow-hidden border border-[#2d333d] ${bar.maxValue > 60 ? 'gap-0' : bar.maxValue > 30 ? 'gap-[1px]' : 'gap-[2px]'} p-[3px] select-none ${readOnly ? '' : 'cursor-pointer'} transition-shadow relative z-10 ${
              flashState === 'damage' ? 'ring-2 ring-[#ff0055]/30 shadow-[inset_0_0_10px_rgba(255,0,85,0.2)]' : 
              flashState === 'heal' ? 'ring-2 ring-[#00ff88]/30 shadow-[inset_0_0_10px_rgba(0,255,136,0.2)]' : ''
            }`}
            onMouseDown={() => {
              if (readOnly) return;
              setIsMouseDown(true);
              activeBarIdRef.current = bar.id;
            }}
          >
            {segments.map((segIndex) => {
              const isSegmentActive = segIndex <= bar.currentValue;
              const segValue = segIndex;

              return (
                <div
                  key={segIndex}
                  className="h-full flex-grow rounded-[2px] transition-all duration-200"
                  style={{
                    backgroundColor: isSegmentActive ? activeColor : inactiveColor,
                    opacity: isSegmentActive ? 1 : 0.08,
                    boxShadow: isSegmentActive ? glowShadow : 'none',
                    transform: isSegmentActive ? 'scale(1)' : 'scale(0.98)',
                  }}
                  onClick={() => { if (!readOnly) { playClickSound(); handleSegmentInteraction(bar, segValue); } }}
                  onMouseEnter={() => {
                    if (readOnly) return;
                    if (isMouseDown && activeBarIdRef.current === bar.id) {
                      handleSegmentInteraction(bar, segValue);
                    }
                  }}
                />
              );
            })}
          </div>

          {particles.map(p => (
            <div
              key={p.id}
              className="absolute top-1/2 left-1/2 z-50 pointer-events-none font-display font-black text-2xl"
              style={{
                '--ox': `${p.offsetX}px`,
                color: p.value > 0 ? '#00ff88' : '#ff0055',
                textShadow: `0 0 10px ${p.value > 0 ? '#00ff88' : '#ff0055'}`,
                animation: 'healthParticleFloat 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
              } as React.CSSProperties}
            >
              {p.value > 0 ? '+' : ''}{p.value}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
