import { Routes, Route } from 'react-router-dom';
import Invoices from './Invoices';
import Documents from './Documents';
import Transcript from './Transcript';
import { useAuthStore } from '@/store/authStore';

export default function StudentPortal() {
  const user = useAuthStore(state => state.user);

  return (
    <Routes>
      <Route path="/" element={
        <div className="p-6 mt-10 text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.name}!</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            This is your personal student gateway. Here you can efficiently access your fee history, download generated invoices, and manage your important academic documents.
          </p>
        </div>
      } />
      <Route path="invoices" element={<Invoices />} />
      <Route path="documents" element={<Documents />} />
      <Route path="transcript" element={<Transcript />} />
    </Routes>
  );
}
