import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DashboardGreetingProps {
  role: string;
  name: string;
  subtitle: string;
  actions?: Array<{
    label: string;
    link?: string;
    onClick?: () => void;
    icon: LucideIcon;
  }>;
}

export const DashboardGreeting: React.FC<DashboardGreetingProps> = ({
  role,
  name,
  subtitle,
  actions = []
}) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-xl border border-indigo-500/20 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {role}
          </span>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-tight">
          <span className="text-slate-400 block mb-1 text-lg md:text-xl tracking-normal">{greeting},</span>
          <span className="text-indigo-400 font-outline-2 capitalize break-words">
            {name}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-10 max-w-3xl text-balance">
          {subtitle}
        </p>

        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            {actions.map((action, i) => {
              const baseStyles = "flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-lg hover:shadow-blue-600/10 transition-all active:scale-95 group";

              if (action.onClick) {
                return (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className={baseStyles}
                    data-theme-surface="true"
                  >
                    <action.icon className="w-5 h-5" />
                    {action.label}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              }

              return (
                <Link
                  key={i}
                  to={action.link || '#'}
                  className={baseStyles}
                  data-theme-surface="true"
                >
                  <action.icon className="w-5 h-5" />
                  {action.label}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Abstract architectural shapes for premium depth */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Dynamic Light Vector Background Mesh */}
      <div className="absolute bottom-0 right-0 w-full md:w-[80%] h-[120%] pointer-events-none opacity-[0.06] mix-blend-overlay">
        <svg viewBox="0 0 1000 300" className="w-full h-full object-fill object-bottom translate-y-1/4" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,80 C300,220 500,-40 1000,100 L1000,300 L0,300 Z" fill="#ffffff" />
          <path d="M0,130 C250,260 600,0 1000,160 L1000,300 L0,300 Z" fill="#ffffff" opacity="0.6" />
          <path d="M0,180 C400,300 700,50 1000,220 L1000,300 L0,300 Z" fill="#ffffff" opacity="0.3" />
        </svg>
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
    </div>
  );
};
