import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Modal } from '@/components/shared/Modal';
import toast from 'react-hot-toast';
import {
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  Copy,
  LockKeyhole,
  Check,
  AlertCircle,
} from 'lucide-react';

interface AdminListItem {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface AdminCredentialDetail extends AdminListItem {
  password: string;
  hasStoredPassword: boolean;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data &&
    typeof error.response.data.error === 'string'
  ) {
    return error.response.data.error;
  }

  return fallback;
};

const fallbackCopyText = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export default function AdminCredentials() {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminCredentialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealingUid, setRevealingUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isOrganizationAdmin = user?.role?.toLowerCase()?.trim() === 'organization admin';

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/org-admin/admin-credentials');
      setAdmins(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load admin credentials'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOrganizationAdmin) {
      fetchAdmins();
    } else {
      setLoading(false);
    }
  }, [isOrganizationAdmin]);

  const openCredentials = async (uid: string) => {
    try {
      setRevealingUid(uid);
      const { data } = await api.get(`/org-admin/admin-credentials/${uid}`);
      setSelectedAdmin(data);
      setShowPassword(false);
      setIsModalOpen(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to reveal admin credentials'));
    } finally {
      setRevealingUid(null);
    }
  };

  const copyValue = async (value: string, fieldKey: string, label: string) => {
    if (!value) {
      toast.error(`No ${label.toLowerCase()} available to copy`);
      return;
    }

    const doCopy = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return fallbackCopyText(value);
    };

    try {
      const ok = await doCopy();
      if (!ok) throw new Error('Copy failed');
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField((prev) => (prev === fieldKey ? null : prev)), 1500);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const filteredAdmins = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((admin) => {
      const haystack = `${admin.name} ${admin.email} ${admin.role} ${admin.uid}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [admins, searchTerm]);

  if (!isOrganizationAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-amber-900">Restricted page</h1>
              <p className="text-sm text-amber-800 mt-1">
                Only the Organization Admin can view stored admin credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Admin Credentials
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Seeded admin-panel passwords. Only you can view these.
              </p>
            </div>
          </div>

          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search + summary */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, role, or UID"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900 tabular-nums">
                {filteredAdmins.length}
              </span>
              <span className="text-slate-400"> / {admins.length}</span>
              <span className="ml-1 text-slate-500">records</span>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="px-6 py-20 text-center">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading admin records…</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <AlertCircle className="w-5 h-5 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {searchTerm ? 'No administrators matched your search.' : 'No admin records found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Administrator
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Role
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                      UID
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Credentials
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.uid} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            {getInitials(admin.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{admin.name}</p>
                            <p className="truncate text-xs text-slate-500">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <button
                          onClick={() => copyValue(admin.uid, `uid:${admin.uid}`, 'UID')}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-slate-900 transition"
                          title="Copy UID"
                        >
                          {admin.uid}
                          {copiedField === `uid:${admin.uid}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openCredentials(admin.uid)}
                          disabled={revealingUid === admin.uid}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition"
                        >
                          {revealingUid === admin.uid ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          Reveal
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAdmin(null);
          setShowPassword(false);
        }}
        title="Admin login credentials"
        maxWidth="md"
      >
        {selectedAdmin && (
          <div className="space-y-4">
            {/* Identity block */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold">
                {getInitials(selectedAdmin.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{selectedAdmin.name}</p>
                <p className="truncate text-xs text-slate-500">{selectedAdmin.role}</p>
              </div>
            </div>

            {/* Login ID */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Login ID</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <code className="flex-1 truncate font-mono text-sm text-slate-900">
                  {selectedAdmin.uid}
                </code>
                <button
                  onClick={() => copyValue(selectedAdmin.uid, 'modal:uid', 'Login ID')}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                  title="Copy login ID"
                >
                  {copiedField === 'modal:uid' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <code className="flex-1 truncate font-mono text-sm text-slate-900">
                  {selectedAdmin.email}
                </code>
                <button
                  onClick={() => copyValue(selectedAdmin.email, 'modal:email', 'Email')}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                  title="Copy email"
                >
                  {copiedField === 'modal:email' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
              {selectedAdmin.hasStoredPassword ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                  <code className="flex-1 truncate font-mono text-sm text-slate-900">
                    {showPassword ? selectedAdmin.password : '•'.repeat(Math.min(selectedAdmin.password.length, 16))}
                  </code>
                  <button
                    onClick={() => setShowPassword((v) => !v)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyValue(selectedAdmin.password, 'modal:pw', 'Password')}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                    title="Copy password"
                  >
                    {copiedField === 'modal:pw' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  No stored password available for this admin.
                </div>
              )}
            </div>

            <div className="pt-2 text-xs text-slate-500 leading-relaxed">
              Treat these credentials as sensitive. The admin-panel password is the shared key for the
              seeded role — rotate it through the role settings if it has been exposed.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
