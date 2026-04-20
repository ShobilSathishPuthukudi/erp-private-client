import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  Building2,
  Search,
  Globe,
  Loader2,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Activity,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';

type University = {
  id: number;
  name: string;
  shortName?: string;
  status?: 'active' | 'staged' | 'proposed' | string;
  accreditation?: string;
  websiteUrl?: string;
  totalPrograms?: number;
  activePrograms?: number;
  openPrograms?: number;
};

const STATUS_STYLES: Record<string, { dot: string; chip: string; label: string }> = {
  active: {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    label: 'Active',
  },
  staged: {
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    label: 'Staged',
  },
  proposed: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    label: 'Proposed',
  },
};

const getInitials = (name?: string, shortName?: string) => {
  if (shortName) return shortName.substring(0, 2).toUpperCase();
  if (!name) return 'UN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

type FilterKey = 'all' | 'active' | 'staged' | 'proposed';

export default function InstitutionalUniversities() {
  const [unis, setUnis] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    const fetchUnis = async () => {
      try {
        const res = await api.get('/academic/universities');
        setUnis(res.data);
      } catch (error) {
        console.error('Failed to fetch institutional universities');
      } finally {
        setLoading(false);
      }
    };
    fetchUnis();
  }, []);

  const counts = useMemo(() => {
    const base = { all: unis.length, active: 0, staged: 0, proposed: 0 };
    for (const uni of unis) {
      const key = (uni.status || '').toLowerCase();
      if (key === 'active') base.active++;
      else if (key === 'staged') base.staged++;
      else if (key === 'proposed') base.proposed++;
    }
    return base;
  }, [unis]);

  const filteredUnis = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return unis.filter((uni) => {
      const matchesTerm =
        !term ||
        uni.name?.toLowerCase().includes(term) ||
        uni.shortName?.toLowerCase().includes(term);
      const matchesFilter = filter === 'all' || (uni.status || '').toLowerCase() === filter;
      return matchesTerm && matchesFilter;
    });
  }, [unis, searchTerm, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold ring-1 ring-blue-100 mb-3">
            <Building2 className="w-3.5 h-3.5" />
            Institutional directory
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Institutional universities</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
            Authorized partner institutions you can reference during recruitment and
            enrollment conversations.
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or short code"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
        {(['all', 'active', 'staged', 'proposed'] as FilterKey[]).map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ring-1 ${
                active
                  ? 'bg-slate-900 text-white ring-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="capitalize">{key}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredUnis.map((uni) => {
          const statusKey = (uni.status || 'proposed').toLowerCase();
          const statusStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.proposed;
          const total = uni.totalPrograms || 0;
          const active = uni.activePrograms || 0;
          const open = uni.openPrograms || 0;

          return (
            <div
              key={uni.id}
              className="group relative bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_20px_40px_-15px_rgba(30,58,138,0.2)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden"
            >
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500 transition-all duration-500 group-hover:h-1.5" />

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 group-hover:from-blue-600 group-hover:to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                      {getInitials(uni.name, uni.shortName)}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${statusStyle.dot}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ${statusStyle.chip}`}
                      >
                        {statusStyle.label}
                      </span>
                      {uni.shortName && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {uni.shortName}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {uni.name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                      <BookOpen className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        Programs
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-900 leading-none">{total}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-1 text-emerald-600 mb-0.5">
                      <Activity className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <p className="text-base font-bold text-emerald-700 leading-none">{active}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
                    <div className="flex items-center gap-1 text-sky-600 mb-0.5">
                      <GraduationCap className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Open</span>
                    </div>
                    <p className="text-base font-bold text-sky-700 leading-none">{open}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Accreditation
                    </p>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {uni.accreditation || 'UGC Approved'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {uni.websiteUrl ? (
                    <a
                      href={uni.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-xs group/link"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Visit portal
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      No portal linked
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">
                    #{uni.id}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredUnis.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No institutions found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              {searchTerm || filter !== 'all'
                ? 'Try clearing your search or filter to see all partner institutions.'
                : 'No partner institutions are registered yet.'}
            </p>
            {(searchTerm || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
