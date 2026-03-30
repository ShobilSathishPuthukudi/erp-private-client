import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Camera, Save, User as UserIcon, ArrowLeft, ShieldCheck, Briefcase, Mail, Phone, Calendar, MapPin, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      name: user?.name || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth || '',
      bio: user?.bio || '',
      address: user?.address || '',
    }
  });

  const onProfileUpdate = async (data: ProfileForm) => {
    setIsSubmittingExt(true);
    let avatarUrl = user?.avatar;

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('avatar', selectedFile);
        const res = await api.post('/auth/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        avatarUrl = res.data.avatarUrl;
        updateUser({ avatar: avatarUrl });
      }

      const response = await api.post('/auth/update-profile', {
        name: data.name,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        bio: data.bio,
        address: data.address
      });
      
      toast.success('Core profile synchronized successfully');
      
      if (response.data.user) {
        updateUser({ ...response.data.user, avatar: avatarUrl });
      }

      reset({ 
        name: response.data.user?.name || data.name,
        phone: response.data.user?.phone || data.phone,
        dateOfBirth: response.data.user?.dateOfBirth || data.dateOfBirth,
        bio: response.data.user?.bio || data.bio,
        address: response.data.user?.address || data.address
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Data synchronization failed');
    } finally {
      setIsSubmittingExt(false);
    }
  };

  const handlePhotoSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    };
    input.click();
  };

  if (!user) return null;

  const currentAvatar = previewUrl || user.avatar;

  return (
    <div className="profile-redesign-container animate-in fade-in duration-500 max-w-5xl mx-auto p-6">
      <button 
        type="button"
        onClick={() => {
          const role = user.role.toLowerCase();
          const dashboardPath = (role === 'center' || role === 'study-center') ? 'study-center' : role;
          navigate(`/dashboard/${dashboardPath}`);
        }}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group w-max mb-6"
      >
        <ArrowLeft className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      {/* Hero Section */}
      <div className="profile-hero-section glassmorphism-premium-dark mb-6">
        <div className="hero-background-glow" />
        <div className="hero-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {currentAvatar ? (
                 <img 
                    src={currentAvatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover rounded-[26px] z-10" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      // Force showing the initials by making the container empty or similar
                      // Actually, a better way is to use state, but since we are doing simple edits:
                      (e.target as HTMLImageElement).parentElement!.classList.add('image-load-failed');
                    }}
                 />
              ) : null}
              <div className="avatar-initials-fallback">
                {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </div>
              <button type="button" className="avatar-edit-overlay z-20" onClick={handlePhotoSelect}>
                <Camera size={24} />
              </button>
            </div>
          </div>

          <div className="hero-text-content">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="hero-name">{user?.name || 'System User'}</h1>
              <span className="hero-role-badge">
                <ShieldCheck size={14} className="mr-1 inline" />
                {user?.role === 'org-admin' ? 'Organization Admin' : user?.role?.replace('-', ' ')}
              </span>
            </div>
            <p className="hero-subtext mt-2">
               <Briefcase size={16} className="mr-2 text-blue-400 inline" />
               Administrator at IITS Enterprise System
            </p>
            <div className="hero-stats-row mt-4 flex gap-6">
               <div className="stat-pill flex flex-col">
                   <span className="stat-label text-[0.7rem] text-white/40 uppercase tracking-widest">System Access Email</span>
                   <span className="stat-val text-[0.95rem] text-white font-semibold">{user?.email}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
         <div className="glassmorphism-premium bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
             <form onSubmit={handleSubmit(onProfileUpdate)} className="profile-form">
                <h3 className="section-title-premium mb-6 text-xl font-extrabold text-slate-900 tracking-tight">
                   Identity Specification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="premium-input-group mb-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"><UserIcon size={14} className="text-blue-600"/> Full Legal Name</label>
                        <input
                            type="text"
                            {...register('name')}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                        />
                         {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                    </div>
                    
                    <div className="premium-input-group mb-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"><Mail size={14} className="text-blue-600"/> Critical Email</label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl transition-all font-medium text-slate-400 cursor-not-allowed"
                        />
                    </div>
                    
                    <div className="premium-input-group mb-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"><Phone size={14} className="text-blue-600"/> Contact Relay</label>
                        <input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            {...register('phone')}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                        />
                    </div>
                    
                    <div className="premium-input-group mb-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"><Calendar size={14} className="text-blue-600"/> Date of Birth</label>
                        <input
                            type="date"
                            {...register('dateOfBirth')}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                        />
                    </div>
                    
                    <div className="premium-input-group mb-4 col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"><FileText size={14} className="text-blue-600"/> Professional Byte (Bio)</label>
                        <textarea
                            rows={3}
                            {...register('bio')}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700 resize-none"
                        />
                    </div>
                    
                    <div className="premium-input-group col-span-1 md:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"><MapPin size={14} className="text-blue-600"/> Logistics Hub (Address)</label>
                        <textarea
                            rows={2}
                            {...register('address')}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700 resize-none"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button type="submit" disabled={(!isDirty && !selectedFile) || isSubmitting || isSubmittingExt} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 font-semibold group cursor-pointer">
                        {isSubmittingExt ? <div className="animate-spin w-5 h-5 border-2 border-white rounded-full border-t-transparent" /> : <Save size={18} className="transform group-hover:scale-110 transition-transform"/>}
                        <span>Update Profile Matrix</span>
                    </button>
                </div>
             </form>
         </div>
      </div>

      <style>{`
        .profile-hero-section {
            position: relative;
            padding: 3rem 2.5rem;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 3rem;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hero-background-glow {
            position: absolute;
            top: -50%;
            right: -20%;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%);
            pointer-events: none;
        }
        .hero-content {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 3rem;
            width: 100%;
        }
        .profile-avatar-wrapper {
            position: relative;
        }
        .profile-avatar-large {
            width: 140px;
            height: 140px;
            border-radius: 30px;
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.5rem;
            font-weight: 700;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 4px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }
        .avatar-edit-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s;
            border: 0;
            cursor: pointer;
            color: white;
            border-radius: 26px;
        }
        .profile-avatar-large:hover .avatar-edit-overlay {
            opacity: 1;
        }
        .image-load-failed .avatar-initials-fallback {
            display: flex !important;
        }
        .profile-avatar-large:not(.image-load-failed) img {
            display: block;
        }
        .avatar-initials-fallback {
            display: none;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
        }
        .profile-avatar-large:not(:has(img)) .avatar-initials-fallback {
            display: flex;
        }
        .hero-name {
            font-size: 2.5rem;
            font-weight: 800;
            color: white;
            margin: 0;
            letter-spacing: -0.02em;
        }
        .hero-role-badge {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(4px);
            color: #93c5fd;
            padding: 0.4rem 1rem;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-subtext {
            color: rgba(255, 255, 255, 0.6);
            font-size: 1.1rem;
            display: flex;
            align-items: center;
        }

        @media (max-width: 991px) {
            .profile-hero-section {
                flex-direction: column;
                text-align: center;
                gap: 2rem;
                padding: 2.5rem 1.5rem;
            }
            .hero-content {
                flex-direction: column;
                gap: 1.5rem;
            }
            .hero-stats-row {
                justify-content: center;
            }
        }
      `}</style>
    </div>
  );
}
