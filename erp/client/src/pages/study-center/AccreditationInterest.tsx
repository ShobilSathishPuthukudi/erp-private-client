import { useState } from 'react';
import { api } from '@/lib/api';
import { Send, Layout, Building, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function AccreditationInterest() {
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    const onSubmit = async (data: any) => {
        try {
            setIsLoading(true);
            await api.post('/accreditation/request', data);
            toast.success('Interest request broadcasted to Sub-Department Admins');
            reset();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Broadcasting protocol failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl shadow-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Building className="w-24 h-24" />
                </div>
                <h1 className="text-2xl font-bold">Accreditation Interest</h1>
                <p className="text-slate-400 text-sm mt-1">Request institutional tie-ups for programs already within our university network.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            Proposed Program Designation
                        </label>
                        <input 
                            {...register('courseName', { required: true })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Diploma in Computer Architecture"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-500" />
                            Target University Endpoint
                        </label>
                        <input 
                            {...register('universityName', { required: true })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Bangalore Central University"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter flex items-center gap-2">
                            <Layout className="w-4 h-4 text-blue-500" />
                            Deployment Sub-Department
                        </label>
                        <select 
                            {...register('type', { required: true })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="BVoc">BVoc</option>
                            <option value="Skill">Skill</option>
                            <option value="Online">Online</option>
                            <option value="OpenSchool">OpenSchool</option>
                        </select>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 uppercase">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                    >
                        {isLoading ? "Broadcasting..." : <><Send className="w-4 h-4" /> Initiate Request Protocol</>}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-4">
                        Requests are historically tracked and subject to jurisdictional review by institutional administrators.
                    </p>
                </div>
            </form>
        </div>
    );
}
