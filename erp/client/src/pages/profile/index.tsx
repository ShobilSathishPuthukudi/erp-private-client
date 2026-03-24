import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Camera, Save, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.newPassword || data.oldPassword || data.confirmPassword) {
    if (!data.oldPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current password is required to set a new password', path: ['oldPassword'] });
    }
    if (!data.newPassword || data.newPassword.length < 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'New password must be at least 6 characters', path: ['newPassword'] });
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Passwords don't match", path: ['confirmPassword'] });
    }
  }
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      name: user?.name || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const onProfileUpdate = async (data: ProfileForm) => {
    try {
      const response = await api.post('/auth/update-profile', {
        name: data.name,
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      toast.success(response.data.message);
      
      if (response.data.user?.name) {
        useAuthStore.getState().updateUser({ name: response.data.user.name });
      }

      reset({ name: response.data.user?.name || data.name, oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB');
        return;
      }
      setIsUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const res = await api.post('/auth/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success(res.data.message);
        useAuthStore.getState().updateUser({ avatar: res.data.avatarUrl });
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(`/dashboard/${user.role}`)}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group w-max"
      >
        <ArrowLeft className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
            <div className="relative inline-block mb-4 group cursor-pointer" onClick={handlePhotoUpload}>
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-3xl mx-auto border-4 border-white shadow-md overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            
            <h2 className="text-lg font-bold text-slate-900">{user.name || 'System User'}</h2>
            <p className="text-sm font-medium text-slate-500 mb-1">{user.email}</p>
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full uppercase tracking-wider">
              {user.role.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Settings Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-2 mb-6 border-b border-slate-100 pb-4">
              <UserIcon className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-800">Update Profile</h3>
            </div>
            
            <form onSubmit={handleSubmit(onProfileUpdate)} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter a new display name"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div className="pt-6 pb-2 border-t border-slate-100">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold">Change Password</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('oldPassword')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.oldPassword && <p className="text-red-500 text-sm mt-1">{errors.oldPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={!isDirty || isSubmitting}
                  className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
