import React from 'react';
import { motion } from 'motion/react';
import { FileArchive, UserProfile } from '../types';
import { 
  FileText, 
  FileImage, 
  Download, 
  CheckCircle2, 
  Clock, 
  Layers, 
  School, 
  Trash2, 
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface FileCardProps {
  file: FileArchive;
  user: UserProfile | null;
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
  onApprove?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  key?: string | number;
}

export default function FileCard({ file, user, onDownload, onPreview, onApprove, onDelete }: FileCardProps) {
  const { t } = useThemeLanguage();

  // Determine relevant icon of the premium list
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type === 'pdf') {
      return <FileText className="w-10 h-10 text-red-500" />;
    } else if (type === 'doc' || type === 'docx') {
      return <FileText className="w-10 h-10 text-blue-500" />;
    } else if (type === 'ppt' || type === 'pptx') {
      return <FileText className="w-10 h-10 text-orange-500 animate-pulse" />;
    } else if (['png', 'jpg', 'jpeg'].includes(type)) {
      return <FileImage className="w-10 h-10 text-green-500" />;
    }
    return <FileText className="w-10 h-10 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const isApproved = file.isApproved;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between overflow-hidden file-card text-left" 
      id={`file-card-${file.id}`}
    >
      <div className="p-5">
        {/* Header Metadata */}
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
            {getFileIcon(file.fileType)}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-mono tracking-wider font-semibold uppercase bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
              .{file.fileType}
            </span>
            {isApproved ? (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/40">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>{t("Approved")}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>{t("PENDING APPROVAL")}</span>
              </span>
            )}
          </div>
        </div>

        {/* File name & info */}
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 tracking-tight leading-snug line-clamp-2 min-h-[44px] mb-2 hover:text-brand-500 dark:hover:text-brand-400 hover:cursor-pointer" title={file.fileName} onClick={() => onPreview ? onPreview(file) : onDownload(file)}>
          {file.fileName}
        </h3>

        {/* Short description notes */}
        <p className="text-xs text-gray-400 dark:text-gray-400 line-clamp-2 min-h-[32px] mb-4">
          {file.description || t("No archive description notes provided.")}
        </p>

        {/* Decoupled Info Rows */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <School className="w-3.5 h-3.5 shrink-0 text-brand-500" />
            <span className="truncate" title={t(file.branch)}>{t(file.branch)}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-gray-50 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Layers className="w-3.5 h-3.5 shrink-0 text-brand-500" />
              <span className="font-semibold text-gray-750 dark:text-gray-300 truncate" title={t(file.subject)}>{t(file.subject)}</span>
            </div>
            {file.chapter && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-bold text-[9px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase">{t("Ch")}</span>
                <span className="truncate font-medium text-gray-700 dark:text-gray-300" title={file.chapter}>{file.chapter}</span>
              </div>
            )}
            {file.topic && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 col-span-2 mt-0.5">
                <span className="font-bold text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase">{t("Topic")}</span>
                <span className="truncate font-bold text-indigo-600 dark:text-indigo-400" title={file.topic}>{file.topic}</span>
              </div>
            )}
            {file.itemType && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 col-span-2 mt-0.5">
                <span className="font-bold text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 px-1.5 py-0.5 rounded uppercase">{t("Type")}</span>
                <span className="truncate font-bold text-emerald-600 dark:text-emerald-400" title={t(file.itemType)}>{t(file.itemType)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Uploader Details info block */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">{t("Uploaded By")}</p>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={file.uploaderName}>{file.uploaderName}</p>
          </div>
          <div className="text-right text-[10px] text-gray-400 dark:text-gray-500">
            <p>{formatSize(file.fileSize)}</p>
            <p className="flex items-center justify-end gap-1 font-mono text-[9px] mt-0.5">
              <span>{file.downloadCount} {t("Downloads").toLowerCase()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Controller Buttons panel */}
      <div className="bg-gray-50/70 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 px-5 py-3.5 flex gap-2 justify-end">
        {user?.role === 'master_admin' && onDelete && (
          <button
            onClick={() => onDelete(file.id)}
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
            title="Delete this file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Approve file if Admin of matching branch or Master Admin */}
        {!isApproved && onApprove && (
          (user?.role === 'master_admin' || 
           (user?.role === 'admin' && user?.branch === file.branch))
        ) && (
          <button
            onClick={() => onApprove(file.id)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg font-semibold flex items-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
            title="Verify and Approve archive"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t("Approve")}</span>
          </button>
        )}

        <button
          onClick={() => onPreview ? onPreview(file) : onDownload(file)}
          className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 px-3.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
          title={t("Preview")}
        >
          <Eye className="w-4 h-4 text-brand-500 shrink-0" />
          <span>{t("Preview")}</span>
        </button>

        <button
          onClick={() => onDownload(file)}
          className="bg-brand-500 hover:bg-brand-600 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-xs shadow-xs hover:shadow-md transition-all ease-out cursor-pointer flex-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t("Download Material")}</span>
        </button>
      </div>
    </motion.div>
  );
}
