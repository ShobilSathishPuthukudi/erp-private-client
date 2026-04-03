import React from 'react';
import { Plus, ChevronRight, type LucideIcon } from 'lucide-react';

interface DashCardProps {
  title: string;
  description: string;
  onClick: () => void;
  icon?: LucideIcon;
  actionLabel?: string;
  className?: string;
}

export const DashCard: React.FC<DashCardProps> = ({ 
  title, 
  description, 
  onClick, 
  icon: Icon = Plus, 
  actionLabel = "Get Started",
  className = ""
}) => {
  return (
    <button 
      onClick={onClick}
      className={`w-full bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center group hover:bg-white hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 ${className}`}
    >
      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
        <Icon className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
      </div>
      <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg mb-2">{title}</h4>
      <p className="text-sm text-slate-500 font-medium max-w-3xl leading-relaxed mb-10">{description}</p>
      
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
        {actionLabel}
        <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
};
