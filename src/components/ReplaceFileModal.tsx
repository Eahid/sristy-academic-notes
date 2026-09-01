import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileArchive } from '../types';
import { RefreshCw, Upload, X, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface ReplaceFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileArchive | null;
  onReplace: (fileId: string, newFile: File, changeNote?: string) => Promise<void>;
}

export default function ReplaceFileModal({ isOpen, onClose, file, onReplace }: ReplaceFileModalProps) {
  const { t } = useThemeLanguage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !file) return null;

  const currentVersion = (file.updateHistory?.length || 0) + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setSelectedFile(selected);
      setErrorMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage(t("Please select a replacement file first."));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onReplace(file.id, selectedFile, changeNote.trim());
      setSuccessMessage(t("File replaced successfully! Update history recorded."));
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage('');
        setSelectedFile(null);
        setChangeNote('');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || t("Failed to replace file. Please try again."));
      setIsSubmitting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadTimestamp = (createdAt: any) => {
    if (!createdAt) return t("Not Available");
    let date: Date;
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden select-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-5 text-gray-900 dark:text-gray-100 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 tracking-tight">
                  {t("Replace Educational File")}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  {t("Update file binary while maintaining original topic & update history.")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current File Banner */}
          <div className="bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                {t("Current Active File")} (v{currentVersion})
              </span>
              <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{t("Uploaded")}: {getUploadTimestamp(file.createdAt)}</span>
              </span>
            </div>
            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{file.fileName}</p>
            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatSize(file.fileSize)}</span>
              <span>•</span>
              <span className="uppercase text-brand-600 dark:text-brand-400 font-bold">{file.fileType}</span>
              <span>•</span>
              <span>{t(file.subject)} ({t(file.classLevel || '')})</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>{t("Select New Replacement File *")}</span>
                <span className="text-[10px] text-gray-400 font-normal">PDF, DOCX, PPTX, Images</span>
              </label>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  selectedFile
                    ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-gray-250 dark:border-slate-700 hover:border-brand-500 bg-gray-50/50 dark:bg-slate-950/50'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="replace-file-input"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                />

                {!selectedFile ? (
                  <label htmlFor="replace-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-brand-500 stroke-1.5" />
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {t("Click to browse or drag replacement file here")}
                    </p>
                    <span className="text-[10px] text-gray-400">{t("This will replace the current file binary.")}</span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-200 dark:border-blue-900/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{formatSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <label htmlFor="replace-file-input" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer shrink-0 ml-2">
                      {t("Change")}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Note/Reason for replacement */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t("Change Note / Summary (Optional)")}
              </label>
              <textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder={t("Briefly describe what changed in this version (e.g. Corrected solution set for Chapter 3)...")}
                rows={3}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-3 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t("Uploading Replacement...")}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>{t("Confirm & Replace")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
