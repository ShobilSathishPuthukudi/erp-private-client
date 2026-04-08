import { useState, useEffect } from 'react';
import { Shield, Save, Plus, Trash2, Edit3, Lock, Landmark, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from '../../components/shared/Modal';

export default function SettingsGovernance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<any>(null);
  const [initialPolicies, setInitialPolicies] = useState<any>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<'security_policy' | 'governance_policy' | 'audit_policy' | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/org-admin/config/policies');
      if (!response.ok) throw new Error('Failed to fetch policies');
      const data = await response.json();
      setPolicies(data);
      setInitialPolicies(JSON.parse(JSON.stringify(data)));
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load institutional policies");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/org-admin/config/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policies)
      });
      if (!response.ok) throw new Error('Failed to update');
      setInitialPolicies(JSON.parse(JSON.stringify(policies)));
      toast.success("Institutional policies updated successfully");
      setSelectedPolicy(null); // Close modal on save
    } catch (error) {
      toast.error("Failed to save policies");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(policies) !== JSON.stringify(initialPolicies);

  const updatePolicy = (key: string, field: string, value: any) => {
    setPolicies((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const addBlock = (key: string) => {
    const newBlock = { title: "New Policy Block", content: "" };
    updatePolicy(key, 'blocks', [...policies[key].blocks, newBlock]);
  };

  const removeBlock = (key: string, index: number) => {
    const newBlocks = policies[key].blocks.filter((_: any, i: number) => i !== index);
    updatePolicy(key, 'blocks', newBlocks);
  };

  const updateBlock = (key: string, index: number, field: string, value: string) => {
    const newBlocks = [...policies[key].blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    updatePolicy(key, 'blocks', newBlocks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentPolicy = selectedPolicy ? policies[selectedPolicy] : null;
  const accentColor = 
    selectedPolicy === 'security_policy' ? 'blue' : 
    selectedPolicy === 'governance_policy' ? 'indigo' : 'emerald';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Governance & Security Policies</h1>
          <p className="text-slate-500 mt-1 text-sm">Select a policy framework to review or modify institutional oversight protocols.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Security Policy Card */}
        <div 
          onClick={() => setSelectedPolicy('security_policy')}
          className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden h-full flex flex-col"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Lock className="w-14 h-14 text-blue-600" />
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl w-fit mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">{policies.security_policy.title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 line-clamp-2">
            {policies.security_policy.description}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
              {policies.security_policy.blocks.length} Security Blocks
            </span>
            <button className="flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Edit
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Governance Policy Card */}
        <div 
          onClick={() => setSelectedPolicy('governance_policy')}
          className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden h-full flex flex-col"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Landmark className="w-14 h-14 text-indigo-600" />
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-6">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">{policies.governance_policy.title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 line-clamp-2">
            {policies.governance_policy.description}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
              {policies.governance_policy.blocks.length} Hierarchy Blocks
            </span>
            <button className="flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Edit
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Policy Card */}
        <div 
          onClick={() => setSelectedPolicy('audit_policy')}
          className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden h-full flex flex-col"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck className="w-14 h-14 text-emerald-600" />
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl w-fit mb-6">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">{policies.audit_policy.title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 line-clamp-2">
            {policies.audit_policy.description}
          </p>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-wider">
              {policies.audit_policy.blocks.length} Audit Blocks
            </span>
            <button className="flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Edit
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Policy Editor Modal */}
      <Modal
        isOpen={!!selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
        title={currentPolicy?.title || "Policy Editor"}
        maxWidth="4xl"
      >
        <div className="flex flex-col max-h-[calc(90vh-140px)]">
          <div className="overflow-y-auto flex-1 px-6 pt-2 pr-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 block ml-1">Policy Title</label>
                <input 
                  type="text"
                  value={currentPolicy?.title || ''}
                  onChange={(e) => selectedPolicy && updatePolicy(selectedPolicy, 'title', e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-${accentColor}-500 outline-none transition-all font-bold text-slate-700`}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2 block ml-1">Main Description</label>
                <textarea 
                  rows={3}
                  value={currentPolicy?.description || ''}
                  onChange={(e) => selectedPolicy && updatePolicy(selectedPolicy, 'description', e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-${accentColor}-500 outline-none transition-all text-sm leading-relaxed text-slate-600`}
                />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Policy Content Blocks</h3>
                <button 
                  onClick={() => selectedPolicy && addBlock(selectedPolicy)}
                  className={`text-xs font-bold text-${accentColor}-600 hover:text-${accentColor}-700 flex items-center gap-1.5`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Block
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPolicy?.blocks.map((block: any, index: number) => (
                  <div key={index} className="p-4 border border-slate-200 rounded-2xl space-y-3 relative group bg-white shadow-sm transition-all hover:border-slate-300">
                    <button 
                      onClick={() => selectedPolicy && removeBlock(selectedPolicy, index)}
                      className="absolute -top-2 -right-2 p-1 bg-white border border-rose-200 text-rose-500 rounded-full shadow-sm hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <input 
                      type="text"
                      placeholder="Block Title"
                      value={block.title}
                      onChange={(e) => selectedPolicy && updateBlock(selectedPolicy, index, 'title', e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <textarea 
                      placeholder="Block Content"
                      value={block.content}
                      onChange={(e) => selectedPolicy && updateBlock(selectedPolicy, index, 'content', e.target.value)}
                      className="w-full text-xs text-slate-500 leading-relaxed focus:outline-none bg-transparent resize-none"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-slate-50/50 -mx-6 px-6 pb-2">
            <button 
              onClick={() => setSelectedPolicy(null)}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-sm"
            >
              Discard Changes
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
