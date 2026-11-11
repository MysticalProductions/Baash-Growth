import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import api from '../../../services/api';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

interface PreviewResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  preview: Array<{
    rowNumber: number;
    fullName: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    gender: string;
    tags: string;
    notes: string;
    isValid: boolean;
    isDuplicate: boolean;
    errors: string[];
  }>;
  invalidDetails: Array<{
    rowNumber: number;
    fullName: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    gender: string;
    tags: string;
    notes: string;
    isValid: boolean;
    isDuplicate: boolean;
    errors: string[];
  }>;
}

interface ImportSummary {
  importId: string;
  totalRows: number;
  successfulRows: number;
  duplicateRows: number;
  failedRows: number;
  message: string;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'summary'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/customers/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'baash_customer_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to download template: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file');
      return;
    }

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      handlePreview(content, selectedFile.name);
    };
    reader.readAsText(selectedFile);
  };

  const handlePreview = async (csvContent: string, fileName: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/customers/import/preview', {
        csvData: csvContent,
        fileName,
      });
      setPreviewResult(res.data);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to preview CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvalidRows = () => {
    if (!previewResult || previewResult.invalidDetails.length === 0) return;

    const headers = ['Row', 'Full Name', 'Phone', 'Email', 'City', 'State', 'Gender', 'Errors'];
    const rows = previewResult.invalidDetails.map((r) => [
      r.rowNumber,
      `"${(r.fullName || '').replace(/"/g, '""')}"`,
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.city || '').replace(/"/g, '""')}"`,
      `"${(r.state || '').replace(/"/g, '""')}"`,
      `"${(r.gender || '').replace(/"/g, '""')}"`,
      `"${(r.errors || []).join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvString = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `invalid_rows_${previewResult.fileName || 'import'}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleConfirmImport = async () => {
    if (!previewResult) return;

    setLoading(true);
    setError('');
    try {
      // Send rows to confirm endpoint
      // We parse all parsed rows or let backend know
      // In previewResult, we have preview and invalidDetails, but for full batch we can send all parsed rows
      // The backend accept rows array in CsvConfirmDto
      // For clean MVP batch confirmation, we construct the rows array:
      const allRowsToImport = previewResult.preview.concat(
        previewResult.invalidDetails.filter((inv) => !inv.isValid)
      );

      // Map rows for confirm API
      const rowsForApi = previewResult.preview
        .filter((r) => r.isValid || (!skipDuplicates && r.isDuplicate))
        .map((r) => ({
          fullName: r.fullName,
          phone: r.phone,
          email: r.email,
          city: r.city,
          state: r.state,
          gender: r.gender,
          tags: r.tags,
          notes: r.notes,
        }));

      const res = await api.post('/customers/import/confirm', {
        rows: rowsForApi,
        fileName: previewResult.fileName,
        skipDuplicates,
      });

      setImportSummary(res.data);
      setStep('summary');
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete import');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setCsvRawText('');
    setPreviewResult(null);
    setImportSummary(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#7B35E8]/10 rounded-xl text-[#7B35E8]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Customers via CSV</h2>
              <p className="text-xs text-[#9E9E9E]">Bulk import customers, map fields, and detect duplicates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#1A1A2E]/60 border border-[#2A2A40] rounded-xl">
                <div>
                  <h3 className="text-sm font-semibold text-white">Need a starting format?</h3>
                  <p className="text-xs text-[#9E9E9E] mt-0.5">
                    Download our verified sample CSV template with standard fields and sample data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] border border-[#2A2A40] text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4 text-[#7B35E8]" />
                  Download CSV Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#2A2A40] hover:border-[#7B35E8]/60 bg-[#161622]/50 hover:bg-[#161622] rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-[#7B35E8]/10 text-[#7B35E8] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-semibold text-white mb-1">Click to select or drag CSV file</h4>
                <p className="text-xs text-[#9E9E9E] max-w-sm text-center">
                  Supports up to 10,000 rows. Columns: Full Name, Mobile Phone, Email, City, State, Gender, Tags, Notes.
                </p>
                {loading && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-[#7B35E8] animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Parsing and validating rows...
                  </div>
                )}
              </div>

              {/* Consent Warning */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 font-semibold block mb-0.5">Consent & Compliance Notice</strong>
                  Importing contacts does not grant marketing consent. In compliance with TRAI (DLT) and Meta guidelines, imported contacts default to <strong>UNKNOWN</strong> consent status until lawful opt-in consent is explicitly recorded.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {step === 'preview' && previewResult && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#1A1A2E]/70 border border-[#2A2A40] rounded-xl">
                  <span className="text-xs text-[#9E9E9E]">Total Rows</span>
                  <p className="text-xl font-bold text-white mt-1">{previewResult.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-xs text-emerald-400">Valid Records</span>
                  <p className="text-xl font-bold text-emerald-300 mt-1">{previewResult.validRows}</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-xs text-amber-400">Duplicates Detected</span>
                  <p className="text-xl font-bold text-amber-300 mt-1">{previewResult.duplicateRows}</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <span className="text-xs text-red-400">Invalid Records</span>
                  <p className="text-xl font-bold text-red-300 mt-1">{previewResult.invalidRows}</p>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#1A1A2E]/60 border border-[#2A2A40] rounded-xl gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2A40] text-[#7B35E8] focus:ring-[#7B35E8] focus:ring-offset-0 bg-[#12121A]"
                  />
                  <label htmlFor="skipDuplicates" className="text-xs text-white cursor-pointer select-none">
                    <span className="font-semibold block">Skip duplicates automatically</span>
                    <span className="text-[#9E9E9E]">
                      Do not overwrite or re-import contacts already existing in your database
                    </span>
                  </label>
                </div>

                {previewResult.invalidRows > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadInvalidRows}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download {previewResult.invalidRows} Invalid Rows
                  </button>
                )}
              </div>

              {/* Table Preview */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E] mb-2">
                  Preview (First {previewResult.preview.length} rows)
                </h4>
                <div className="overflow-x-auto border border-[#2A2A40] rounded-xl bg-[#12121A]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#1A1A2E] text-[#9E9E9E] border-b border-[#2A2A40]">
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#232336] text-white">
                      {previewResult.preview.map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-[#1A1A2E]/40">
                          <td className="py-2.5 px-3 text-[#9E9E9E]">#{row.rowNumber}</td>
                          <td className="py-2.5 px-3 font-medium">{row.fullName || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-[#D1D1DB]">{row.phone || '—'}</td>
                          <td className="py-2.5 px-3 text-[#D1D1DB]">{row.email || '—'}</td>
                          <td className="py-2.5 px-3 text-[#9E9E9E]">{row.city || '—'}</td>
                          <td className="py-2.5 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title={row.errors.join(', ')}>
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20" title={row.errors.join(', ')}>
                                <XCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUMMARY */}
          {step === 'summary' && importSummary && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Import Complete!</h3>
                <p className="text-xs text-[#9E9E9E] mt-1">{importSummary.message}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
                <div className="p-3 bg-[#1A1A2E] border border-[#2A2A40] rounded-xl text-center">
                  <span className="text-xs text-[#9E9E9E]">Processed</span>
                  <p className="text-lg font-bold text-white mt-0.5">{importSummary.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <span className="text-xs text-emerald-400">Imported</span>
                  <p className="text-lg font-bold text-emerald-300 mt-0.5">{importSummary.successfulRows}</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                  <span className="text-xs text-amber-400">Skipped/Dupes</span>
                  <p className="text-lg font-bold text-amber-300 mt-0.5">{importSummary.duplicateRows}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A1A2E] bg-[#0E0E17] flex items-center justify-between">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Back to Upload
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={loading || (previewResult?.validRows === 0 && (skipDuplicates || previewResult?.duplicateRows === 0))}
                className="flex items-center gap-2 px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Confirm & Import Customers
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : step === 'summary' ? (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  onClose();
                }}
                className="px-5 py-2 bg-[#7B35E8] hover:bg-[#6824D3] text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close & View Customers
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
