import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Users, 
  GraduationCap, 
  Database,
  Type,
  Calendar,
  CheckSquare,
  ChevronDown,
  Info
} from 'lucide-react';

export default function SettingsCustomFields() {
  const [selectedEntity, setSelectedEntity] = useState('Student');
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newField, setNewField] = useState({ label: '', type: 'Text' });

  useEffect(() => {
    fetchFields();
  }, [selectedEntity]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/org-admin/custom-fields?entity=${selectedEntity}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setFields(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch custom fields", error);
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!newField.label) return;
    try {
      const response = await fetch('/api/org-admin/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newField, entity: selectedEntity })
      });
      if (response.ok) {
        fetchFields();
        setNewField({ label: '', type: 'Text' });
      }
    } catch (error) {
      console.error("Failed to add field", error);
    }
  };

  const handleDeleteField = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const response = await fetch(`/api/org-admin/custom-fields/${id}`, { method: 'DELETE' });
      if (response.ok) fetchFields();
    } catch (error) {
      console.error("Failed to delete field", error);
    }
  };

  const fieldTypes = [
    { id: 'Text', icon: Type },
    { id: 'Number', icon: Database },
    { id: 'Date', icon: Calendar },
    { id: 'Dropdown', icon: ChevronDown },
    { id: 'Checkbox', icon: CheckSquare },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Entity Schema Extension</h1>
          <p className="text-slate-500 mt-1 font-medium">Dynamically add custom attributes to core system entities.</p>
        </div>
        <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl relative">
          <button 
            onClick={() => setSelectedEntity('Student')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center ${
              selectedEntity === 'Student' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Student Schema
          </button>
          <button 
            onClick={() => setSelectedEntity('Employee')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center ${
              selectedEntity === 'Employee' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Employee Schema
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Field Builder Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group border border-slate-800 sticky top-8">
            <Settings className="absolute -top-4 -right-4 w-24 h-24 text-white/5 rotate-12 transition-transform group-hover:rotate-[30deg] duration-700" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-lg font-bold font-display border-b border-white/10 pb-4">Add Attribute</h3>
              
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Attribute Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Blood Group" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all font-display tracking-tight" 
                      value={newField.label}
                      onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {fieldTypes.map(tf => (
                        <button 
                          key={tf.id} 
                          onClick={() => setNewField({ ...newField, type: tf.id })}
                          className={`p-3 border rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-2 ${
                            newField.type === tf.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          <tf.icon className={`w-4 h-4 ${newField.type === tf.id ? 'text-white' : 'text-blue-400'}`} />
                          {tf.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={handleAddField}
                      className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Inject Field
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Fields List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Database className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Active Schema Attributes: {selectedEntity}</h3>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Schema v2.4</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                   <div className="p-20 text-center text-slate-400 font-bold">Reserializing Entity Schema...</div>
                ) : fields.length === 0 ? (
                   <div className="p-20 text-center text-slate-400 font-bold">No custom attributes defined for {selectedEntity}.</div>
                ) : fields.map((field) => (
                  <div key={field.id} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-all">
                        <Settings className="w-6 h-6 text-slate-400 group-hover:text-white group-hover:rotate-45 transition-all duration-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 font-display">{field.label}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{field.type}</span>
                          {field.required && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">REQUIRED*</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Visibility</p>
                        <div className="flex gap-1 mt-1">
                          {(Array.isArray(field.visibleTo) ? field.visibleTo : (field.visibleTo || 'All Roles').split(',')).map((v: string) => (
                            <span key={v} className="text-[9px] font-bold text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">{v}</span>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteField(field.id)}
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            <div className="p-8 bg-blue-50/50 border-t border-slate-100 flex items-start gap-4 group">
              <Info className="w-6 h-6 text-blue-600 group-hover:rotate-12 transition-transform" />
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Custom fields added here will immediately appear in the {selectedEntity} profile management forms. 
                Data captured in these fields is automatically indexed and available for report generation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
