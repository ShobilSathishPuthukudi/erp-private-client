import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { UploadCloud, FileText } from 'lucide-react';

export default function Documents() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{name: string, path: string}[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    try {
      setIsUploading(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Document uploaded securely');
      setUploadedDocs([...uploadedDocs, { name: file.name, path: res.data.filePath }]);
      setFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">My secure documents</h1>
           <p className="text-slate-500">Upload your required ID proofs, previous transcripts, and compliance files.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Box */}
        <div className="bg-white border border-slate-200 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-105">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Upload New Document</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">
            Supports PDF, JPG, and PNG formats up to 5MB.
          </p>
          
          <input 
            type="file" 
            id="file-upload" 
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          
          <div className="flex flex-col space-y-3 w-full max-w-xs">
            <label 
              htmlFor="file-upload" 
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm w-full transition-colors"
            >
              {file ? file.name : 'Select File from Device'}
            </label>
            
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {isUploading ? 'Uploading to Vault...' : 'Securely Upload'}
            </button>
          </div>
        </div>

        {/* Existing Documents List */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Uploaded Vault</h3>
          </div>
          <div className="flex-1 p-5 overflow-y-auto">
            {uploadedDocs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm">No documents uploaded yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {uploadedDocs.map((doc, idx) => (
                  <li key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700 truncate">{doc.name}</span>
                    </div>
                    <a 
                      href={doc.path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 font-semibold hover:underline bg-blue-50 px-2 py-1 rounded"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
