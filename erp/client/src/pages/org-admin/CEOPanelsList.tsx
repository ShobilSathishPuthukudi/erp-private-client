import { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Shield, 
  Power, 
  Trash2
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Modal } from '../../components/shared/Modal';
import CEOPanelCreate from './CEOPanelCreate';

export default function CEOPanelsList() {
  const [panels, setPanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<any>(null);

  useEffect(() => {
    fetchPanels();
  }, []);

  const fetchPanels = async () => {
    try {
      const response = await fetch('/api/org-admin/ceo-panels');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPanels(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch CEO panels", error);
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const response = await fetch(`/api/org-admin/ceo-panels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchPanels();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const handleDelete = async (panel: any) => {
    if (!window.confirm(`Are you sure you want to delete the "${panel.name}" panel profile?`)) return;
    try {
      const response = await fetch(`/api/org-admin/ceo-panels/${panel.id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchPanels();
    } catch (error) {
      console.error("Failed to delete CEO panel", error);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredPanels = panels.filter(panel => 
    panel.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (panel.ceoUser?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">CEO Access Panels</h1>
          <p className="text-slate-500 mt-1">Configure specialized dashboards for executive oversight and scoped visibility.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Provision CEO Panel
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPanel(null);
        }}
        maxWidth="4xl"
        hideHeader={true}
      >
        <CEOPanelCreate 
          initialData={selectedPanel}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPanel(null);
          }}
          onSuccess={() => {
            fetchPanels();
          }}
        />
      </Modal>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by panel profile or user..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Provisioning Executive Interfaces...</p>
          </div>
        ) : filteredPanels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
            No CEO panels found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPanels.map((panel) => (
              <div key={panel.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:translate-y-[-4px]">
                <div className={`h-2 ${
                  panel.status?.toLowerCase() === 'active' ? 'bg-green-500' : 'bg-rose-500'
                }`}></div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate" title={panel.name}>{panel.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          panel.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {panel.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-1 whitespace-nowrap">CEO Oversight</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800 transition-all duration-300 shadow-sm shadow-slate-200/50">
                      <Shield className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Visibility Scope</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(panel.visibilityScope) ? panel.visibilityScope : (panel.visibilityScope || '').split(',')).map((s: string) => (
                        <span key={s} className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-slate-200/50">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 uppercase">
                      {(panel.ceoUser?.name || 'U')[0]}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Profile Assigned To</p>
                      <p className="text-xs font-bold text-slate-700">@{panel.ceoUser?.name || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      onClick={() => {
                        setSelectedPanel(panel);
                        setIsModalOpen(true);
                      }}
                      className="p-3 bg-slate-50/50 text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 hover:border-slate-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                      title="Edit Panel"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <NavLink 
                      to="/dashboard/org-admin/ceo-panels/visibility"
                      className="p-3 bg-slate-50/50 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 hover:border-blue-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                      title="Visibility Config"
                    >
                      <Shield className="w-4 h-4" />
                    </NavLink>
                    <button 
                       onClick={() => handleDelete(panel)}
                       className="p-3 bg-slate-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                       title="Delete Panel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(panel.id, panel.status)}
                      className={`p-3 rounded-xl transition-all border border-slate-100 active:scale-[0.95] ${
                        panel.status?.toLowerCase() === 'active' 
                        ? 'bg-rose-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200' 
                        : 'bg-green-50/50 text-slate-400 hover:text-green-600 hover:bg-green-100/50 hover:border-green-200'
                      }`}
                      title={panel.status?.toLowerCase() === 'active' ? 'Disable Access' : 'Enable Access'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <Shield className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <h2 className="text-2xl font-bold mb-3 font-display">Executive Governance & Oversight</h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            CEO Panels provide a centralized view of performance across multiple departments. 
            Ensure each executive has the appropriate visibility scope to facilitate data-driven 
            decision making while maintaining strict departmental boundaries.
          </p>
        </div>
        <button className="px-6 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.05] transition-all relative z-10">
          Security Policy
        </button>
      </div>
    </div>
  );
}
