import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldAlert, Search, Terminal, Lock, Clock, Eye } from 'lucide-react';
import CredentialRequestModal from './CredentialRequestModal';
import CredentialRevealConsole from './CredentialRevealConsole';
import toast from 'react-hot-toast';

export default function SecurityControl() {
  const [centers, setCenters] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeRevealId, setActiveRevealId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [centerRes, reqRes] = await Promise.all([
        api.get('/academic/centers'), 
        api.get('/academic/credentials/requests') 
      ]);
      setCenters(centerRes.data);
      setRequests(reqRes.data);
    } catch (error) {
       console.error('Security fetch failed');
    } finally {
       setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      const res = await api.post(`/academic/credentials/request/${requestId}/cancel`);
      toast.success(res.data.message || 'Request withdrawn');
      fetchData();
    } catch (error) {
      toast.error('Failed to withdraw request');
    }
  };

  const filteredCenters = centers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.uid.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center animate-pulse">Syncing Security Mesh...</div>;

  return (
    <div className="p-2 space-y-4 min-h-screen">
      {activeRevealId ? (
         <CredentialRevealConsole 
           requestId={activeRevealId} 
           onExpiry={() => setActiveRevealId(null)} 
         />
      ) : (
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6 mb-6">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
               <Lock className="w-6 h-6" />
             </div>
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Institutional security control</h1>
               <p className="text-slate-500 font-medium text-sm">Manage and audit time-limited center credential access.</p>
             </div>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
               <Search className="w-5 h-5 text-slate-400" />
               <input 
                 type="text"
                 className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400"
                 placeholder="Search by Center Name or Institutional UID..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredCenters.map(center => {
                 const activeReq = requests.find(r => r.centerId === center.id && r.status === 'approved' && new Date(r.revealUntil) > new Date());
                 const pendingReq = requests.find(r => r.centerId === center.id && r.status === 'pending');

                 return (
                   <div key={center.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-slate-900 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100">
                            <Terminal className="w-5 h-5" />
                         </div>
                         {activeReq && <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest animate-pulse">Reveal Active</span>}
                      </div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight truncate">{center.name}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{center.uid}</p>
                      
                      <div className="mt-6">
                        {activeReq ? (
                           <button 
                             onClick={() => setActiveRevealId(activeReq.id)}
                             className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                           >
                              <Eye className="w-4 h-4" /> View Credentials
                           </button>
                        ) : pendingReq ? (
                           <button 
                             onClick={() => handleCancelRequest(pendingReq.id)}
                             className="w-full bg-rose-50 text-rose-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100"
                           >
                              <Clock className="w-4 h-4" /> Withdraw Request
                           </button>
                        ) : (
                           <button 
                             onClick={() => {
                               setSelectedCenter(center);
                               setIsRequestModalOpen(true);
                             }}
                             className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                           >
                              <ShieldAlert className="w-4 h-4" /> Request Reveal
                           </button>
                        )}
                      </div>
                   </div>
                 );
               })}
            </div>
         </div>

         <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit space-y-6">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2 border-b border-slate-100 pb-4">
               <Clock className="w-5 h-5 text-blue-600" />
               Recent Requests
            </h3>
            <div className="space-y-3">
               {requests.slice(0, 5).map(req => (
                 <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px]">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-black text-slate-900 uppercase">{req.center?.name}</span>
                       <span className={`px-2 py-0.5 rounded-full font-black uppercase ${
                         req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                         req.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 
                         req.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 
                         'bg-amber-50 text-amber-600'
                       }`}>
                         {req.status}
                       </span>
                    </div>
                    <p className="text-slate-500 truncate font-medium">"{req.remarks}"</p>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {selectedCenter && (
        <CredentialRequestModal 
          isOpen={isRequestModalOpen} 
          onClose={() => {
            setIsRequestModalOpen(false);
            fetchData();
          }} 
          centerId={selectedCenter.id}
          centerName={selectedCenter.name}
        />
      )}
    </div>
  );
}
