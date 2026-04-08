import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShieldAlert, Search, Terminal, Lock, Clock, Eye } from 'lucide-react';
import CredentialRequestModal from './CredentialRequestModal';
import CredentialRevealConsole from './CredentialRevealConsole';

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

  const filteredCenters = centers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.uid.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center animate-pulse">Syncing Security Mesh...</div>;

  return (
    <div className="space-y-8">
      {activeRevealId ? (
         <CredentialRevealConsole 
           requestId={activeRevealId} 
           onExpiry={() => setActiveRevealId(null)} 
         />
      ) : (
        <div className="bg-slate-900 rounded-[32px] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-12 opacity-5">
              <Lock className="w-64 h-64" />
           </div>
           <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Institutional Security Control</h2>
              <p className="text-slate-400 font-medium mb-8 leading-relaxed ">Manage time-limited access to Study Center credentials. All requests are forensically audited and require Finance authorization.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4">
               <Search className="w-5 h-5 text-slate-400" />
               <input 
                 type="text"
                 className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
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
                   <div key={center.id} className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 border border-slate-100">
                            <Terminal className="w-5 h-5" />
                         </div>
                         {activeReq && <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest animate-pulse">Reveal Active</span>}
                      </div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight truncate">{center.name}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{center.uid}</p>
                      
                      <div className="mt-6">
                        {activeReq ? (
                           <button 
                             onClick={() => setActiveRevealId(activeReq.id)}
                             className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                           >
                              <Eye className="w-4 h-4" /> View Credentials
                           </button>
                        ) : pendingReq ? (
                           <button 
                             disabled
                             className="w-full bg-slate-50 text-slate-400 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed flex items-center justify-center gap-2"
                           >
                              <Clock className="w-4 h-4" /> Authorization Pending
                           </button>
                        ) : (
                           <button 
                             onClick={() => {
                               setSelectedCenter(center);
                               setIsRequestModalOpen(true);
                             }}
                             className="w-full border-2 border-slate-100 hover:border-slate-900 text-slate-900 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
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

         <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm h-fit">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
               <Clock className="w-5 h-5 text-blue-600" />
               Recent Requests
            </h3>
            <div className="space-y-4">
               {requests.slice(0, 5).map(req => (
                 <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px]">
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-black text-slate-900 uppercase">{req.center?.name}</span>
                       <span className={`px-2 py-0.5 rounded-full font-black uppercase ${
                         req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                         req.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                       }`}>
                         {req.status}
                       </span>
                    </div>
                    <p className="text-slate-500 truncate">"{req.remarks}"</p>
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
