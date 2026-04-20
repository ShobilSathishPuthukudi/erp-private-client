import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [passwordStrength, setPasswordStrength] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        if (name === 'newPassword') {
            calculatePasswordStrength(value);
        }
    };

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        setPasswordStrength(strength);
    };

    const getStrengthLabel = () => {
        switch (passwordStrength) {
            case 0:
            case 1:
                return { label: 'Weak', color: '#ef4444' };
            case 2:
                return { label: 'Fair', color: '#f59e0b' };
            case 3:
                return { label: 'Good', color: '#3b82f6' };
            case 4:
                return { label: 'Strong', color: '#10b981' };
            default:
                return { label: '', color: '#e2e8f0' };
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New password and confirm password do not match');
            return;
        }

        if (formData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        try {
            await api.post('/auth/update-profile', {
                oldPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            toast.success('Password changed successfully');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setPasswordStrength(0);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to change password');
        }
    };

    const strengthInfo = getStrengthLabel();

    return (
        <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Change password</h1>
                <p className="text-slate-500 mt-2">Update your account security credentials</p>
            </div>

            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-8 flex gap-4 text-blue-900">
                            <Shield className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <strong className="block mb-2 font-semibold text-blue-950">Password Requirements:</strong>
                                <ul className="list-disc ml-5 space-y-1 text-sm text-blue-800/80">
                                    <li>At least 8 characters long</li>
                                    <li>Contains uppercase and lowercase letters</li>
                                    <li>Contains at least one number</li>
                                    <li>Contains at least one special character</li>
                                </ul>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <Lock size={16} className="text-slate-400" />
                                    <span>Current Password</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <Lock size={16} className="text-slate-400" />
                                    <span>New Password</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                
                                {formData.newPassword && (
                                    <div className="mt-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${(passwordStrength / 4) * 100}%`,
                                                        background: strengthInfo.color
                                                    }}
                                                />
                                            </div>
                                            <span 
                                                className="text-xs font-bold uppercase tracking-wider min-w-[50px] text-right"
                                                style={{ color: strengthInfo.color }}
                                            >
                                                {strengthInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <Lock size={16} className="text-slate-400" />
                                    <span>Confirm New Password</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                                    <div className="mt-2 text-emerald-500 text-sm font-medium flex items-center gap-1.5 animate-in slide-in-from-top-1">
                                        <CheckCircle size={14} /> Passwords match
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    disabled={!formData.currentPassword || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold group"
                                >
                                    <Lock size={18} className="transform group-hover:scale-110 transition-transform" />
                                    <span>Change Password</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
