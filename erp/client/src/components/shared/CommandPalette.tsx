import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, X, User, Building, GraduationCap, ClipboardList, Briefcase, Plus, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface SearchResult {
  id: string | number;
  title: string;
  type: 'User' | 'Department' | 'Student' | 'Task' | 'Lead';
  path: string;
  role?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle Command Palette with CMD+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle search with debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${query}`);
        setResults(res.data);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult | QuickAction) => {
    if ('path' in result) {
      navigate(result.path);
    } else if ('action' in result) {
      result.action();
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length + quickActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (results.length + quickActions.length)) % (results.length + quickActions.length));
    } else if (e.key === 'Enter') {
      const combined = [...quickActions, ...results];
      if (combined[selectedIndex]) {
        handleSelect(combined[selectedIndex] as any);
      }
    }
  };

  interface QuickAction {
    id: string;
    title: string;
    type: 'Action';
    icon: any;
    action: () => void;
  }

  const quickActions: QuickAction[] = [];
  
  if (user) {
    if (['org-admin', 'hr'].includes(user.role)) {
      quickActions.push({ id: 'add-emp', title: 'Add New Employee', type: 'Action', icon: Plus, action: () => navigate('/dashboard/hr/employees') });
    }
    if (['org-admin', 'academic'].includes(user.role)) {
      quickActions.push({ id: 'add-student', title: 'Register Student', type: 'Action', icon: Plus, action: () => navigate('/dashboard/academic/students') });
    }
    if (['sales', 'org-admin'].includes(user.role)) {
      quickActions.push({ id: 'add-lead', title: 'Capture Sales Lead', type: 'Action', icon: Send, action: () => navigate('/dashboard/sales') });
    }
    quickActions.push({ id: 'leave-req', title: 'Request Leave', type: 'Action', icon: Briefcase, action: () => navigate('/dashboard/employee/leaves') });
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'User': return User;
      case 'Department': return Building;
      case 'Student': return GraduationCap;
      case 'Task': return ClipboardList;
      case 'Lead': return Send;
      default: return Command;
    }
  };

  if (!isOpen) return null;

  const combinedItems = [...quickActions, ...results];

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Panel */}
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col max-h-[60vh] animate-in fade-in zoom-in duration-200"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 py-4 text-slate-900 placeholder-slate-400 focus:outline-none text-lg"
            placeholder="Search anything... (Try 'John', 'IT', 'Sales')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center space-x-2">
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">ESC</span>
            <X 
              className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600" 
              onClick={() => setIsOpen(false)}
            />
          </div>
        </div>

        <div className="overflow-y-auto p-2 scrollbar-hide">
          {loading && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto"></div>
              <p className="text-sm text-slate-500 mt-2">Searching the registry...</p>
            </div>
          )}

          {!loading && combinedItems.length === 0 && query.length >= 2 && (
            <div className="py-12 text-center text-slate-500">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {!loading && query.length < 2 && combinedItems.length > 0 && (
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2">Quick Actions</p>
          )}

          {!loading && combinedItems.map((item, index) => {
            const Icon = 'icon' in item ? item.icon : getIcon(item.type);
            const isSelected = index === selectedIndex;
            
            return (
              <div
                key={item.id}
                className={`flex items-center px-3 py-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-slate-900 text-white translate-x-1' : 'hover:bg-slate-50 text-slate-700'}`}
                onClick={() => handleSelect(item as any)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={`p-2 rounded-lg mr-4 ${isSelected ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                    {item.type} {('role' in item && item.role) ? `• ${item.role}` : ''}
                  </p>
                </div>
                {isSelected && (
                  <Command className="w-4 h-4 text-white/40" />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center space-x-3">
             <span className="flex items-center"><span className="bg-white border px-1 rounded mr-1">↑↓</span> to navigate</span>
             <span className="flex items-center"><span className="bg-white border px-1 rounded mr-1">Enter</span> to select</span>
          </div>
          <p>Phase 18 Core Engine</p>
        </div>
      </div>
    </div>
  );
}
