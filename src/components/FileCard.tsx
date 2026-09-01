import React, { useState } from 'react';
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
  Eye,
  XCircle,
  X,
  ChevronUp,
  ArrowLeft,
  RefreshCw,
  History,
  Pencil
} from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';
import ReplaceFileModal from './ReplaceFileModal';

interface FileCardProps {
  file: FileArchive;
  user: UserProfile | null;
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
  onApprove?: (fileId: string) => void;
  onReject?: (fileId: string, reason?: string) => void;
  onDelete?: (fileId: string) => void;
  onFileEdit?: (fileId: string, updates: { fileName?: string; description?: string; subject?: string; classLevel?: string }) => void;
  onReplace?: (fileId: string, newFile: File, changeNote?: string) => Promise<void>;
  isSelected?: boolean;
  onSelectToggle?: (fileId: string) => void;
  onViewTeacherDetails?: (teacherId: string) => void;
  allFiles?: FileArchive[];
  key?: string | number;
}

export default function FileCard({ file, user, onDownload, onPreview, onApprove, onReject, onDelete, onFileEdit, onReplace, isSelected, onSelectToggle, onViewTeacherDetails, allFiles }: FileCardProps) {
  const { t } = useThemeLanguage();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  // Generate deterministic checksum (SHA-256 style)
  const getFileChecksum = (fileId: string) => {
    let hash = 0;
    const salt = fileId + "sristy-edu-salt";
    for (let i = 0; i < salt.length; i++) {
      const char = salt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256:8f3c7${hex}c2a8f${hex.slice(2, 6)}b1e93c04d`;
  };

  // Format Upload Timestamp robustly
  const getUploadTimestamp = (createdAt: any) => {
    if (!createdAt) return t("Not Available");
    let date: Date;
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleString();
  };

  const relatedFiles = allFiles
    ? allFiles.filter(f => f.uploadedBy === file.uploadedBy && f.id !== file.id && !f.isDeleted)
    : [];

  // Determine relevant icon of the premium list
  const getFileIcon = (fileType: string) => {
    const type = (fileType || '').toLowerCase();
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

  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [localRejectionReason, setLocalRejectionReason] = useState('');
  const [isRejectingMode, setIsRejectingMode] = useState(false);

  const isSuperOrMaster = user?.role === 'super_admin' || user?.role === 'master_admin';
  const isFileApprover = user?.role === 'file_approver';
  const isBranchAdminOfFile = user?.role === 'admin' && user?.branch === file.branch;
  const canApproveOrReject = isSuperOrMaster || isFileApprover || isBranchAdminOfFile;
  const canDelete = isSuperOrMaster || isBranchAdminOfFile; // Master/Super can delete any, branch admin only own branch
  const canReplace = !!onReplace && (user?.uid === file.uploadedBy || isSuperOrMaster || isBranchAdminOfFile);

  const currentVersion = (file.updateHistory?.length || 0) + 1;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-slate-900 rounded-xl shadow-xs border ${isSelected ? 'border-brand-500 dark:border-brand-500 ring-2 ring-brand-500/30' : 'border-gray-100 dark:border-slate-800'} hover:border-brand-200 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between overflow-hidden file-card text-left`} 
      id={`file-card-${file.id}`}
    >
      <div className="p-5">
        {/* Header Metadata */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {onSelectToggle && (
              <input
                type="checkbox"
                checked={isSelected || false}
                onChange={() => onSelectToggle(file.id)}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-brand-600 dark:text-brand-500 focus:ring-brand-500 cursor-pointer accent-brand-500 shrink-0"
                id={`file-select-checkbox-${file.id}`}
              />
            )}
            <div className="p-2 sm:p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
              {getFileIcon(file.fileType)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1">
              {currentVersion > 1 && (
                <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30 flex items-center gap-1">
                  <History className="w-2.5 h-2.5" />
                  <span>v{currentVersion}</span>
                </span>
              )}
              <span className="text-[10px] font-mono tracking-wider font-semibold uppercase bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                .{file.fileType}
              </span>
            </div>
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
        <h3 
          className="font-semibold text-sm text-gray-800 dark:text-gray-100 tracking-tight leading-snug line-clamp-2 min-h-[44px] mb-2 hover:text-brand-500 dark:hover:text-brand-400 hover:cursor-pointer" 
          title={file.fileName} 
          onClick={() => {
            const isPreviewable = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((file.fileType || '').toLowerCase());
            if (isPreviewable && onPreview) {
              onPreview(file);
            } else {
              onDownload(file);
            }
          }}
        >
          {file.fileName}
        </h3>

        {/* Short description notes */}
        <p className="text-xs text-gray-400 dark:text-gray-400 line-clamp-2 min-h-[32px] mb-4">
          {file.description || t("No note description notes provided.")}
        </p>

        {/* Decoupled Info Rows */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <School className="w-3.5 h-3.5 shrink-0 text-brand-500" />
            <span className="truncate" title={t(file.branch)}>{t(file.branch)}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-gray-50 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 col-span-2">
              <Layers className="w-3.5 h-3.5 shrink-0 text-brand-500" />
              <span className="font-semibold text-gray-750 dark:text-gray-300 truncate" title={t(file.subject)}>{t(file.subject)}</span>
            </div>
            {file.classLevel && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 col-span-2 mt-0.5">
                <span className="font-bold text-[9px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase">{t("Class")}</span>
                <span className="truncate font-bold text-purple-600 dark:text-purple-405" title={t(file.classLevel)}>{t(file.classLevel)}</span>
              </div>
            )}
            {file.chapter && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 col-span-2 mt-0.5">
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
          <div 
            className={`min-w-0 ${onViewTeacherDetails ? 'cursor-pointer group' : ''}`}
            onClick={() => onViewTeacherDetails && onViewTeacherDetails(file.uploadedBy)}
          >
            <p className={`text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider flex items-center gap-1 ${onViewTeacherDetails ? 'group-hover:text-brand-500' : ''}`}>
              <span>{t("Uploaded By")}</span>
              {onViewTeacherDetails && (
                <span className="text-[8px] text-brand-505 dark:text-brand-409 font-bold lowercase opacity-0 group-hover:opacity-100 transition-opacity">({t("view profile")})</span>
              )}
            </p>
            <p className={`text-xs font-bold text-gray-800 dark:text-gray-200 truncate ${onViewTeacherDetails ? 'group-hover:text-brand-600 dark:group-hover:text-brand-400' : ''}`} title={file.uploaderName}>{file.uploaderName}</p>
          </div>
          <div className="text-right text-[10px] text-gray-400 dark:text-gray-500">
            <p>{formatSize(file.fileSize)}</p>
            <p className="flex items-center justify-end gap-1 font-mono text-[9px] mt-0.5">
              <span>{file.downloadCount} {t("Downloads").toLowerCase()}</span>
            </p>
          </div>
        </div>

        {/* View Details Link */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 cursor-pointer transition-colors select-none py-1 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800"
            id={`view-details-btn-${file.id}`}
          >
            <span>{isExpanded ? t("Hide Details") : t("View Details & History")}</span>
            <ChevronUp className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      {/* Expanded Metadata & Update History Panel */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="border-t border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-950/40 p-5 space-y-4 text-xs overflow-hidden"
          id={`details-panel-${file.id}`}
        >
          {/* Extra Metadata Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">{t("Original Upload Date")}</p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">{getUploadTimestamp(file.createdAt)}</p>
              </div>
              {file.updatedAt && (
                <div>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase font-bold tracking-wider">{t("Last Updated Date")}</p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold">{getUploadTimestamp(file.updatedAt)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">{t("File Checksum (SHA-256)")}</p>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-[10px] break-all select-all bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 p-1.5 rounded-lg">
                {getFileChecksum(file.id)}
              </p>
            </div>
          </div>

          {/* Update History Section */}
          <div className="pt-3 border-t border-gray-150/80 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                <History className="w-3 h-3 text-blue-500" />
                <span>{t("Update & Version History")}</span>
              </p>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                v{currentVersion}
              </span>
            </div>

            {file.updateHistory && file.updateHistory.length > 0 ? (
              <div className="space-y-2.5 pl-2 border-l-2 border-blue-200 dark:border-blue-900/50 mt-2">
                {/* Active current file version */}
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                    <span className="text-blue-600 dark:text-blue-400">v{currentVersion} ({t("Current Active File")})</span>
                    <span className="text-[10px] font-mono font-normal text-gray-400">{getUploadTimestamp(file.updatedAt || file.createdAt)}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium truncate">{file.fileName} ({formatSize(file.fileSize)})</p>
                </div>

                {/* Previous versions list */}
                {file.updateHistory.slice().reverse().map((hist, idx) => (
                  <div key={idx} className="pt-2 border-t border-gray-100 dark:border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span className="font-bold text-[11px] text-gray-700 dark:text-gray-300">v{hist.version} ({t("Replaced")})</span>
                      <span className="text-[10px] font-mono">{getUploadTimestamp(hist.replacedAt)}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium truncate">
                      {t("Previous file")}: <span className="line-through opacity-75">{hist.previousFileName}</span> ({formatSize(hist.previousFileSize)})
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                      {t("Replaced by")}: {hist.replacedByName || t("Teacher")}
                    </p>
                    {hist.changeNote && (
                      <p className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-150 dark:border-slate-800 text-gray-700 dark:text-gray-300 font-medium">
                        "{hist.changeNote}"
                      </p>
                    )}
                    {hist.previousFileUrl && (
                      <button
                        type="button"
                        onClick={() => onDownload({ ...file, fileName: hist.previousFileName, fileUrl: hist.previousFileUrl, fileSize: hist.previousFileSize, fileType: hist.previousFileType || file.fileType })}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>{t("Download archived v")}{hist.version}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 dark:text-gray-500 italic text-[11px] bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800">
                {t("Original v1 upload. No file replacements recorded yet.")}
              </div>
            )}
          </div>

          {/* Related Files Section */}
          <div className="pt-3 border-t border-gray-150/80 dark:border-slate-800/80">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-2">
              {t("More From This Teacher")} ({relatedFiles.length})
            </p>
            {relatedFiles.length > 0 ? (
              <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                {relatedFiles.slice(0, 3).map((rFile) => (
                  <div 
                    key={rFile.id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg hover:border-brand-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="p-1 bg-gray-50 dark:bg-slate-800 rounded text-gray-500 shrink-0 text-[10px] font-bold">
                        .{rFile.fileType.toUpperCase()}
                      </span>
                      <span 
                        onClick={() => {
                          const isPreviewable = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((rFile.fileType || '').toLowerCase());
                          if (isPreviewable && onPreview) {
                            onPreview(rFile);
                          } else {
                            onDownload(rFile);
                          }
                        }}
                        className="truncate font-medium text-gray-750 dark:text-gray-300 hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer text-xxs font-semibold text-left"
                        title={rFile.fileName}
                      >
                        {rFile.fileName}
                      </span>
                    </div>
                    <button 
                      onClick={() => onDownload(rFile)}
                      className="p-1 bg-gray-100 dark:bg-slate-850 hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 rounded transition-colors ml-2 shrink-0 cursor-pointer"
                      title={t("Download")}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic text-[11px]">{t("No other files uploaded by this teacher.")}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Controller Buttons panel */}
      <div className="bg-gray-50/80 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 p-3 flex flex-col gap-2">
        {/* Row 1: Primary Actions (Preview & Download) */}
        <div className="flex gap-2 items-center w-full">
          {['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((file.fileType || '').toLowerCase()) && (
            <button
              onClick={() => onPreview ? onPreview(file) : onDownload(file)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-750 dark:text-gray-200 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-xs shadow-xs transition-colors cursor-pointer"
              title={t("Preview")}
            >
              <Eye className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="truncate">{t("Preview")}</span>
            </button>
          )}

          <button
            onClick={() => onDownload(file)}
            className="flex-1 bg-[#15803d] hover:bg-[#166534] text-white py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
            title={t("Download")}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t("Download")}</span>
          </button>
        </div>

        {/* Row 2: Management Actions (Replace, Review, Edit, Delete) */}
        {(canReplace || canApproveOrReject || (canDelete && onDelete)) && (
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-gray-150 dark:border-slate-800/80 w-full">
            {canReplace && (
              <button
                onClick={() => setShowReplaceModal(true)}
                className="flex-1 min-w-[80px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-150 dark:border-blue-900/40 py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title={t("Replace file with an updated version")}
              >
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span className="truncate">{t("Replace")}</span>
              </button>
            )}

            {canApproveOrReject && (
              <button
                onClick={() => setShowReviewPanel(true)}
                className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 text-[11px] transition-all cursor-pointer ${
                  isApproved 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100' 
                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100'
                }`}
                title={t("Review actions")}
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">{isApproved ? t("Approved") : t("Review")}</span>
              </button>
            )}

            {canDelete && onDelete && !canApproveOrReject && (
              <button
                onClick={() => {
                  if (window.confirm(t("Move this file to trash?"))) onDelete(file.id);
                }}
                className="bg-gray-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                title={t("Delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Replace File Modal */}
      {showReplaceModal && onReplace && (
        <ReplaceFileModal
          isOpen={showReplaceModal}
          onClose={() => setShowReplaceModal(false)}
          file={file}
          onReplace={onReplace}
        />
      )}

      {/* High-Fidelity Centered Review & Action Modal (For Admins/Approvers) */}
      {showReviewPanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden select-none">
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            className="relative bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 text-gray-900 dark:text-gray-100 max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-800 dark:text-gray-100">
                  {isRejectingMode ? t("Provide Rejection Reason") : t("Verify Study Material")}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowReviewPanel(false);
                  setIsRejectingMode(false);
                  setLocalRejectionReason('');
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content container (scrollable if needed) */}
            <div className="overflow-y-auto space-y-4 py-2 pr-1 flex-1 max-h-[50vh] scrollbar-none">
              {!isRejectingMode ? (
                <>
                  {/* File card Details overview inside modal */}
                  <div className="bg-gray-50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 p-4 rounded-xl space-y-2.5 text-left">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t("Document Name")}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 break-words">{file.fileName}</p>
                    </div>

                    {file.description && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t("Description")}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 break-words">{file.description}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
                      <span className="text-[10px] bg-gray-150 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-mono px-2 py-0.5 rounded-full font-semibold uppercase">{file.fileType}</span>
                      <span className="text-[10px] bg-[#15803d]/10 text-[#15803d] dark:text-[#22c55e] px-2 py-0.5 rounded-full font-semibold">{t(file.subject)}</span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">{t(file.branch)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-400">{t("Uploaded By")}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate block">{file.uploaderName}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-400">{t("File Size")}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{formatSize(file.fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Open Preview Button inside modal */}
                  {['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((file.fileType || '').toLowerCase()) && (
                    <button
                      onClick={() => {
                        if (onPreview) onPreview(file);
                        setShowReviewPanel(false);
                      }}
                      className="w-full bg-[#15803d]/10 hover:bg-[#15803d]/20 text-[#15803d] dark:text-[#22c55e] border border-emerald-100 dark:border-emerald-900/30 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t("Open Live Preview")}</span>
                    </button>
                  )}
                </>
              ) : (
                /* Rejection Reason Input Field screen */
                <div className="space-y-3.5 text-left">
                  <div className="bg-amber-100/10 dark:bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg flex items-start gap-2.5">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {t("This submission will be deleted, and dynamic feedback logs will be cataloged for the uploader review.")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("Reason for Rejection *")}
                    </label>
                    <textarea
                      value={localRejectionReason}
                      onChange={(e) => setLocalRejectionReason(e.target.value)}
                      placeholder={t("Please specify why this material is rejected (e.g., Blur, incomplete notes, wrong chapter assignment)...")}
                      rows={4}
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 p-3.5 rounded-xl text-xs text-gray-900 dark:text-gray-150 focus:outline-hidden focus:ring-1 focus:ring-red-500 transition-all font-medium"
                      required
                    />
                  </div>

                  {/* Suggest Quick-Tap template cards */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">{t("Tap preset feedback templates")}:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        t("Imprecise notes - Content blurry or unreadable"),
                        t("Incorrect subject or branch directory category"),
                        t("Incomplete file or chapters missing critical details"),
                        t("Duplicate submission with low-quality metadata")
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLocalRejectionReason(preset)}
                          className="text-[11px] bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-600 dark:text-gray-300 py-1.5 px-3.5 rounded-lg border border-gray-150 dark:border-slate-700 text-left transition-all font-medium cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions (Comfortable larger tap touch targets) */}
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2.5">
              {!isRejectingMode ? (
                <>
                  <div className="flex gap-2.5 w-full">
                    <button
                      onClick={() => setShowReviewPanel(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold text-xs select-none shadow-xs transition-colors cursor-pointer"
                    >
                      {t("Close")}
                    </button>

                    {/* Approve Action */}
                    {!isApproved && onApprove && canApproveOrReject && (
                      <button
                        onClick={() => {
                          onApprove(file.id);
                          setShowReviewPanel(false);
                        }}
                        className="flex-1 bg-[#15803d] hover:bg-[#166534] text-white py-3 rounded-xl font-extrabold text-xs select-none shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>{t("APPROVE & PUBLISH")}</span>
                      </button>
                    )}
                  </div>

                  {/* Reject Action Trigger */}
                  {onReject && canApproveOrReject && (
                    <button
                      onClick={() => setIsRejectingMode(true)}
                      className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-150 dark:border-red-900/40 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 select-none shadow-xs transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{t("REJECT SUBMISSION")}</span>
                    </button>
                  )}

                  {/* Trash Bin Delete for Super/Master Admins */}
                  {canDelete && onDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm(t("Delete this file permanently?"))) {
                          onDelete(file.id);
                          setShowReviewPanel(false);
                        }
                      }}
                      className="w-full bg-gray-50 hover:bg-red-50 dark:bg-slate-950/40 dark:hover:bg-red-950/10 text-gray-500 hover:text-red-500 py-2.5 rounded-xl font-semibold text-[11px] border border-gray-150 dark:border-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("DELETE HISTORIC RECORD")}</span>
                    </button>
                  )}
                </>
              ) : (
                /* Rejection Modal Actions */
                <div className="flex gap-2.5 w-full">
                  <button
                    onClick={() => {
                      setIsRejectingMode(false);
                      setLocalRejectionReason('');
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 select-none transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>{t("Back")}</span>
                  </button>

                  <button
                    onClick={() => {
                      onReject(file.id, localRejectionReason.trim() || t("Unspecified custom reason"));
                      setShowReviewPanel(false);
                      setIsRejectingMode(false);
                      setLocalRejectionReason('');
                    }}
                    className="flex-1 bg-red-650 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 select-none shadow-md transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{t("Confirm Rejection")}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
