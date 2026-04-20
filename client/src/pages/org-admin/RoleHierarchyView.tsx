import { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Crown, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Layout,
  Plus,
  Minus,
  RotateCcw,
  UserCheck,
  MapPin,
  ExternalLink,
  X,
  Mail,
  Calendar,
  Fingerprint,
  AlignLeft
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface RoleNode {
  id: string | number;
  name: string;
  description: string;
  count: number;
  status: string;
  category?: string;
  tierColor?: string;
  createdAt?: string | Date;
  isCustom?: boolean;
  isAdminEligible?: boolean;
  isAudited?: boolean;
  representativeEmail?: string;
  isConflict?: boolean;
  children?: RoleNode[];
  isExpanded?: boolean;
}

export default function RoleHierarchyView() {
  const [treeData, setTreeData] = useState<RoleNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  // Zoom and Pan State
  const [viewState, setViewState] = useState({ scale: 0.8, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const zoomTimeout = useRef<any>(null);
  const animationTimeout = useRef<any>(null);

  useEffect(() => {
    fetchAndTransformData();
  }, []);

  const triggerSmoothTransition = () => {
    setIsAnimating(true);
    if (animationTimeout.current) clearTimeout(animationTimeout.current);
    animationTimeout.current = setTimeout(() => setIsAnimating(false), 600);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setViewState(prev => ({
      ...prev,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setIsZooming(true);
      if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
      zoomTimeout.current = setTimeout(() => setIsZooming(false), 150);

      const delta = e.deltaY;
      const zoomFactor = 1.08; 
      const newScale = delta > 0 
        ? Math.max(viewState.scale / zoomFactor, 0.2) 
        : Math.min(viewState.scale * zoomFactor, 2.5);
      
      setViewState(prev => ({ ...prev, scale: newScale }));
    }
  };

  const zoomIn = () => {
    triggerSmoothTransition();
    setViewState(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 2.5) }));
  };
  
  const zoomOut = () => {
    triggerSmoothTransition();
    setViewState(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.2) }));
  };
  
  const fitToScreen = () => {
    if (!containerRef.current || !treeRef.current) return;
    triggerSmoothTransition();
    const container = containerRef.current;
    const tree = treeRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight - 100; // Account for header and top padding
    const treeWidth = tree.scrollWidth;
    const treeHeight = tree.scrollHeight;
    const padding = 40;
    const scaleX = (containerWidth - padding * 2) / treeWidth;
    const scaleY = (containerHeight - padding * 2) / treeHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    
    // Smoothly focus the tree below the header
    setViewState({ scale: newScale, x: 0, y: 0 });
  };

  const resetView = () => fitToScreen();

  const fetchAndTransformData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/org-admin/roles/hierarchy');
      const tiers = response.data;
      const getRolesByTier = (tierId: string) => {
        const tier = tiers.find((t: any) => t.id === tierId);
        return (tier?.roles || []).map((r: any) => ({ 
          ...r, 
          category: tier.name,
          tierColor: tier.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                     tier.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                     tier.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                     tier.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                     tier.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                     tier.color === 'violet' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                     'bg-slate-50 text-slate-600 border-slate-100'
        }));
      };

      const orgAdmin = getRolesByTier('governance')[0] || { id: 'root', name: 'Institutional Governance', count: 0, status: 'active', tierColor: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
      const ceos = getRolesByTier('executive');
      const pillars = getRolesByTier('pillars');
      const units = getRolesByTier('units');
      const partners = getRolesByTier('partners');
      const workforce = getRolesByTier('workforce');
      const stakeholders = getRolesByTier('stakeholders');

      const root: RoleNode = {
        ...orgAdmin,
        isExpanded: true,
        children: ceos.map((ceo: any) => ({
          ...ceo,
          isExpanded: true,
          children: pillars.map((pillar: any) => {
            let pillarChildren: RoleNode[] = [];
            if (pillar.name.includes('Finance')) pillarChildren = workforce.filter((w: any) => w.name.includes('Finance'));
            else if (pillar.name.includes('HR')) pillarChildren = workforce.filter((w: any) => w.name.includes('HR') || !w.name.includes('Finance'));
            else if (pillar.name.includes('Ops') || pillar.name.includes('Academic')) pillarChildren = [...units, ...partners, ...stakeholders];
            return { ...pillar, isExpanded: true, children: pillarChildren.length > 0 ? pillarChildren : undefined };
          })
        }))
      };

      setTreeData(root);
      setTimeout(fitToScreen, 100);
    } catch (error) {
      toast.error('Failed to reconstruct institutional role tree');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string | number) => {
    triggerSmoothTransition();
    const updateNode = (node: RoleNode): RoleNode => {
      if (node.id === nodeId) return { ...node, isExpanded: !node.isExpanded };
      if (node.children) return { ...node, children: node.children.map(updateNode) };
      return node;
    };
    if (treeData) setTreeData(updateNode(treeData));
  };

  const toggleCompactView = () => {
    setIsCompact(!isCompact);
    setTimeout(fitToScreen, 300);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
        <div className="relative">
             <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
        </div>
        <p className="text-slate-500 font-black text-xs tracking-widest uppercase animate-pulse">Synchronizing Authority Matrices...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-white relative overflow-hidden flex flex-col select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={resetView}
    >
      <div 
        className="fixed bottom-8 right-8 z-[100] flex flex-col gap-2 items-center bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-xl animate-in slide-in-from-right-10 duration-500"
        onDoubleClick={(e) => e.stopPropagation()}
      >
         <button onClick={zoomIn} title="Zoom In" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
         <div className="w-8 h-[1px] bg-slate-100"></div>
         <button onClick={resetView} title="Fit to Screen" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><RotateCcw className="w-4 h-4" /></button>
         <div className="w-8 h-[1px] bg-slate-100"></div>
         <button onClick={zoomOut} title="Zoom Out" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Minus className="w-4 h-4" /></button>
      </div>

      <div 
        className="relative z-10 p-8 flex-1 flex flex-col gap-8"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                      <Layout className="w-6 h-6 text-indigo-600" />
                 </div>
                 <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional role hierarchy</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Governing Authority & Structural Chain</p>
                 </div>
            </div>
            <div className="flex items-center gap-4">
                {/* Minimalist Switch */}
                <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-1 rounded-2xl flex items-center shadow-sm">
                    <button 
                      onClick={() => isCompact && toggleCompactView()}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!isCompact ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Layout className="w-3.5 h-3.5" />
                        Detailed
                    </button>
                    <button 
                      onClick={() => !isCompact && toggleCompactView()}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCompact ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                        Minimalist
                    </button>
                </div>

                {selectedId && (
                    <button 
                      onClick={() => setSelectedId(null)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                    >
                      Clear Selection
                    </button>
                )}
            </div>
        </div>

        <div 
          className={`flex-1 relative flex items-start justify-center pt-20 will-change-transform h-full w-full pointer-events-none ${(isPanning || isZooming || !isAnimating) ? '' : 'transition-transform duration-500 ease-out'}`}
          style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, transformOrigin: 'center top' }}
        >
           <div ref={treeRef} className="pointer-events-auto">
             {treeData && <TreeNode root={treeData} node={treeData} onToggle={toggleNode} onSelect={(id) => { setSelectedId(id === selectedId ? null : id); }} selectedId={selectedId} isCompact={isCompact} />}
           </div>
        </div>
      </div>
    </div>
  );
}

function TreeNode({ root, node, onToggle, onSelect, selectedId, isCompact }: { 
    root: RoleNode;
    node: RoleNode; 
    onToggle: (id: string | number) => void; 
    onSelect: (id: string | number) => void;
    selectedId: string | number | null;
    isCompact: boolean;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const formattedDate = node.createdAt ? new Date(node.createdAt).toLocaleDateString() : 'N/A';

  const findPath = (curr: RoleNode, targetId: string | number, path: RoleNode[] = []): RoleNode[] | null => {
    if (curr.id === targetId) return [...path, curr];
    if (curr.children) {
      for (const child of curr.children) {
        const result = findPath(child, targetId, [...path, curr]);
        if (result) return result;
      }
    }
    return null;
  };

  const path = isSelected ? findPath(root, node.id) : null;

  return (
    <div className="flex flex-col items-center relative gap-12 group/node">
      <div 
        className={`relative w-[28rem] bg-white border cursor-pointer transition-all duration-500 overflow-hidden ${isSelected ? 'border-indigo-600 shadow-2xl ring-4 ring-indigo-50 z-40 rounded-[2.5rem]' : 'border-slate-200 shadow-sm rounded-[1.8rem] hover:border-indigo-300 hover:shadow-lg'}`}
        onClick={() => onSelect(node.id)}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className={isCompact && !isSelected ? "p-6" : "p-7"}>
            {/* Header: Icon + Tier Badge */}
            {!isCompact || isSelected ? (
                <div className="flex items-start justify-between mb-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                        {node.name.includes('Admin') ? <Shield className="w-7 h-7" /> : node.name.includes('CEO') ? <Crown className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${node.tierColor || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    {node.category || 'Institutional'}
                    </div>
                </div>
            ) : null}

            {/* Title & Alias */}
            <div className={isCompact && !isSelected ? "mb-4" : "mb-8 text-center"}>
                <div className="flex items-center gap-4">
                    {isCompact && !isSelected && (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${node.isConflict ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                            {node.name.includes('Admin') ? <Shield className="w-5 h-5" /> : node.name.includes('CEO') ? <Crown className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                    )}
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2">
                             <h4 className={`font-black tracking-tight leading-tight truncate ${isSelected ? 'text-2xl text-indigo-900' : isCompact ? 'text-lg text-slate-900' : 'text-xl text-slate-900'}`}>
                                {node.name}
                            </h4>
                            {node.isConflict && (
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                            )}
                        </div>
                        {!isCompact || isSelected ? (
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 opacity-60">
                                {node.name.split(' ').map(w => w[0]).join('')} Registry
                            </p>
                        ) : null}
                    </div>
                </div>
                {isSelected && (
                    <button className="absolute top-7 right-7 p-2 text-slate-300 hover:text-slate-600 transition-colors" onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}>
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {(!isCompact || isSelected) && <div className="w-full h-px bg-slate-100 mb-8"></div>}

            {/* Metadata Section */}
            <div className={`grid ${isCompact && !isSelected ? 'grid-cols-1 mt-4' : 'grid-cols-2'} gap-x-8 gap-y-6 mb-8`}>
                <div className="flex items-center gap-4 group/meta overflow-hidden">
                    <Mail className={`w-5 h-5 flex-shrink-0 ${isCompact && !isSelected ? 'text-slate-400' : 'text-indigo-600'}`} />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</span>
                        <span className="text-xs font-bold text-slate-700 truncate" title={node.representativeEmail}>{node.representativeEmail || 'system@erp.com'}</span>
                    </div>
                </div>

                {(!isCompact || isSelected) && (
                    <>
                        <div className="flex items-center gap-4 group/meta">
                            <Fingerprint className={`w-5 h-5 ${node.isCustom ? 'text-violet-500' : 'text-slate-300'}`} />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                <span className="text-xs font-bold text-slate-700">{node.isCustom ? 'Custom' : 'Default'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group/meta">
                            <Calendar className="w-5 h-5 text-slate-300" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Established</span>
                                <span className="text-xs font-bold text-slate-700">{formattedDate}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Footer: Status + Action */}
            {(!isCompact || isSelected) && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${node.status === 'active' ? 'bg-indigo-600 animate-pulse' : 'bg-rose-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{node.status}</span>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2">
                        Manage Role
                        <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Expanded Details Section */}
            {isSelected && (
                <div className="mt-8 space-y-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Structural Path</h4>
                        <div className="flex flex-col gap-0 border-l-2 border-white/10 ml-2 pl-4">
                            {path?.map((step, idx) => (
                                <div key={step.id} className="flex flex-col relative pb-3 last:pb-0">
                                    <div className={`text-[10px] font-bold ${idx === path.length - 1 ? 'text-indigo-400' : 'text-white/40'}`}>
                                        {step.name}
                                    </div>
                                    {idx === 0 && <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-white/20 border-2 border-slate-900"></div>}
                                    {idx === path.length - 1 && <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20"></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 px-2">
                        {node.isConflict && (
                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
                                <Shield className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Authority Conflict</p>
                                    <p className="text-xs font-bold text-rose-500 leading-relaxed">Institutional rule violation detected: This role is restricted to a single active identity, but {node.count} active users were found.</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <MapPin className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                            <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{node.description || 'System-level operational protocol.'}"</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <UserCheck className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                            <p className="text-sm font-black text-slate-900">{node.count} Active User Accounts</p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {hasChildren && !isSelected && (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all z-20 active:scale-90`}
          >
            {node.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {hasChildren && node.isExpanded && (
        <div className="flex gap-12 relative pt-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-200"></div>
          <svg className="absolute top-6 left-0 w-full h-12 -z-0 overflow-visible pointer-events-none">
             <line x1="50%" y1="0" x2="50%" y2="24" stroke="#E2E8F0" strokeWidth="2" />
             {node.children!.length > 1 && (
                 <>
                    <line x1={`${100 / (node.children!.length * 2)}%`} y1="24" x2={`${100 - (100 / (node.children!.length * 2))}%`} y2="24" stroke="#E2E8F0" strokeWidth="2" />
                    {node.children!.map((_: any, i: number) => (
                        <line key={i} x1={`${(100 / node.children!.length) * i + (50 / node.children!.length)}%`} y1="24" x2={`${(100 / node.children!.length) * i + (50 / node.children!.length)}%`} y2="48" stroke="#E2E8F0" strokeWidth="2" />
                    ))}
                    <circle cx="50%" cy="24" r="4" fill="white" stroke="#E2E8F0" strokeWidth="2" />
                 </>
             )}
          </svg>
          {node.children!.map((child: any) => (
            <TreeNode key={child.id} root={root} node={child} onToggle={onToggle} onSelect={onSelect} selectedId={selectedId} isCompact={isCompact} />
          ))}
        </div>
      )}
    </div>
  );
}
