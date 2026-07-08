import React, { useState } from 'react';
import { FileArchive, UserProfile } from '../types';
import { useBranchSubject } from './BranchSubjectContext';
import { Search, SlidersHorizontal, BookOpen, School, FileCheck, CheckCircle2, ChevronDown, List, Grid, FileText, FileImage, Download, Eye, ArrowUpDown } from 'lucide-react';
import FileCard from './FileCard';
import BatchDownloadBar from './BatchDownloadBar';
import { useThemeLanguage } from './ThemeLanguageContext';
import { CLASS_LEVELS } from '../constants';

interface DashboardViewerProps {
  user: UserProfile;
  files: FileArchive[];
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
  onViewTeacherDetails?: (teacherUid: string) => void;
}

export default function DashboardViewer({ user, files, onDownload, onPreview, onViewTeacherDetails }: DashboardViewerProps) {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassLevel, setSelectedClassLevel] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'>('date_desc');
  const { t } = useThemeLanguage();
  const { branches, subjects } = useBranchSubject();

  // Only approved files should be shown to viewers
  const approvedFiles = files.filter(f => f.isApproved);

  const filteredArchives = approvedFiles.filter((file) => {
    const matchesSearch = searchQuery.trim() === '' || 
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBranch = selectedBranch === '' || file.branch === selectedBranch;
    const matchesSubject = selectedSubject === '' || file.subject === selectedSubject;
    const matchesClassLevel = selectedClassLevel === '' || file.classLevel === selectedClassLevel;

    return matchesSearch && matchesBranch && matchesSubject && matchesClassLevel;
  });

  // Sort files dynamically
  const sortedArchives = [...filteredArchives].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);

    if (sortBy === 'date_desc') {
      return dateB - dateA;
    } else if (sortBy === 'date_asc') {
      return dateA - dateB;
    } else if (sortBy === 'name_asc') {
      return (a.fileName || '').localeCompare(b.fileName || '');
    } else if (sortBy === 'name_desc') {
      return (b.fileName || '').localeCompare(a.fileName || '');
    } else if (sortBy === 'size_desc') {
      return b.fileSize - a.fileSize;
    } else if (sortBy === 'size_asc') {
      return a.fileSize - b.fileSize;
    }
    return 0;
  });

  return (
    <div className="space-y-8" id="viewer-student-dashboard">
      {/* Search and Filters Hub */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-brand-500" />
          <span>{t("Interactive Resource Directory Search")}</span>
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Text Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search file name, topic, notes...")}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold text-gray-750 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
              <School className="w-4 h-4 text-brand-500" />
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-gray-750 dark:text-gray-200 appearance-none cursor-pointer transition-all"
            >
              <option value="">{t("-- Apply Branch Filter --")}</option>
              {branches.map((bName, idx) => (
                <option key={idx} value={bName}>{t(bName)}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Subject Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
              <BookOpen className="w-4 h-4 text-brand-500" />
            </span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-gray-750 dark:text-gray-200 appearance-none cursor-pointer transition-all"
            >
              <option value="">{t("-- Apply Subject Filter --")}</option>
              {subjects.map((sub, idx) => (
                <option key={idx} value={sub}>{t(sub)}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Class Filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
              <BookOpen className="w-4 h-4 text-brand-500" />
            </span>
            <select
              value={selectedClassLevel}
              onChange={(e) => setSelectedClassLevel(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-gray-750 dark:text-gray-200 appearance-none cursor-pointer transition-all"
            >
              <option value="">{t("-- Apply Class Filter --")}</option>
              {CLASS_LEVELS.map((cls, idx) => (
                <option key={idx} value={cls}>{t(cls)}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Sort selection */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#15803d] dark:text-emerald-450 pointer-events-none">
              <ArrowUpDown className="w-4 h-4" />
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-[#15803d] dark:text-emerald-450 appearance-none cursor-pointer transition-all"
            >
              <option value="date_desc">{t("Sort: Newest First")}</option>
              <option value="date_asc">{t("Sort: Oldest First")}</option>
              <option value="name_asc">{t("Sort: Name A to Z")}</option>
              <option value="name_desc">{t("Sort: Name Z to A")}</option>
              <option value="size_desc">{t("Sort: Largest First")}</option>
              <option value="size_asc">{t("Sort: Smallest First")}</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#15803d] pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Clear Filters Shortcuts */}
        {(searchQuery || selectedBranch || selectedSubject || selectedClassLevel || sortBy !== 'date_desc') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('');
                setSelectedSubject('');
                setSelectedClassLevel('');
                setSortBy('date_desc');
              }}
              className="text-[10px] font-bold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
            >
              {t("Clear Search Parameters & Filters")}
            </button>
          </div>
        )}
      </div>

      {/* Directory Archive Display Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-gray-50 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Sristy Education Family Storage")}</h3>
            <p className="text-xs text-gray-400 mt-1">{t("Viewing approved files matching your current parameters.")}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit border border-gray-150/40 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-[#15803d] dark:text-brand-400 shadow-xs'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-650 dark:hover:text-gray-350'
                }`}
                title={t("Grid View")}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-[#15803d] dark:text-brand-400 shadow-xs'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-650 dark:hover:text-gray-350'
                }`}
                title={t("List View")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 font-mono text-[10px] font-bold px-3 py-1.5 rounded-full uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{sortedArchives.length} {t("Available Note's")}</span>
            </span>
          </div>
        </div>

        {sortedArchives.length > 0 && (
          <BatchDownloadBar
            selectedIds={selectedFileIds}
            allFiles={files}
            currentFilteredFiles={sortedArchives}
            onSelectToggle={(id) => {
              setSelectedFileIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              );
            }}
            onClearSelection={() => setSelectedFileIds([])}
            onSelectAll={(ids) => setSelectedFileIds(ids)}
          />
        )}

        {sortedArchives.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 space-y-2">
            <FileCheck className="w-12 h-12 mx-auto opacity-50 stroke-1" />
            <p className="text-xs">{t("No matching verified files found in Sristy Education Family's digital database.")}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedArchives.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                user={user}
                onDownload={onDownload}
                onPreview={onPreview}
                isSelected={selectedFileIds.includes(file.id)}
                onSelectToggle={(id) => {
                  setSelectedFileIds(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  );
                }}
                onViewTeacherDetails={onViewTeacherDetails}
                allFiles={files}
              />
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-800 shadow-xs transition-colors">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-850/30 text-gray-400 uppercase font-extrabold text-[9px] tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.length > 0 && selectedFileIds.length === sortedArchives.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFileIds(sortedArchives.map(f => f.id));
                        } else {
                          setSelectedFileIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-[#15803d] dark:text-[#22c55e] focus:ring-[#15803d] cursor-pointer accent-[#15803d]"
                    />
                  </th>
                  <th className="py-3 px-4">{t("Document")}</th>
                  <th className="py-3 px-4">{t("Campus/Branch")}</th>
                  <th className="py-3 px-4">{t("Department/Subject")}</th>
                  <th className="py-3 px-4">{t("Chapter & Topic")}</th>
                  <th className="py-3 px-4 text-center">{t("Size")}</th>
                  <th className="py-3 px-4 text-center">{t("Author")}</th>
                  <th className="py-3 px-4 text-center">{t("Downloads")}</th>
                  <th className="py-3 px-4 text-right pr-6">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-gray-300">
                {sortedArchives.map((file) => {
                  // Format helper for bytes inside map
                  const formatSizeMap = (bytes: number) => {
                    if (bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                  };

                  return (
                    <tr key={file.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/15 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.includes(file.id)}
                          onChange={() => {
                            setSelectedFileIds(prev =>
                              prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-[#15803d] dark:text-[#22c55e] focus:ring-[#15803d] cursor-pointer accent-[#15803d]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                            {(file.fileType || '').toLowerCase() === 'pdf' ? (
                              <FileText className="w-4 h-4 text-red-500" />
                            ) : ['doc', 'docx'].includes((file.fileType || '').toLowerCase()) ? (
                              <FileText className="w-4 h-4 text-blue-500" />
                            ) : ['ppt', 'pptx'].includes((file.fileType || '').toLowerCase()) ? (
                              <FileText className="w-4 h-4 text-orange-500" />
                            ) : ['png', 'jpg', 'jpeg'].includes((file.fileType || '').toLowerCase()) ? (
                              <FileImage className="w-4 h-4 text-green-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="max-w-[180px] sm:max-w-[220px] truncate">
                            <p 
                              className="font-bold text-gray-800 dark:text-gray-150 truncate hover:text-[#15803d] dark:hover:text-brand-400 cursor-pointer"
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
                            </p>
                            {file.description && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate" title={file.description}>
                                {file.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10.5px] font-semibold text-gray-650 dark:text-gray-350 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">
                          {t(file.branch)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10.5px] font-semibold text-gray-650 dark:text-gray-350 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">
                          {t(file.subject)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {file.chapter && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[130px]" title={file.chapter}>
                              <span className="font-bold mr-1 text-[8.5px] uppercase tracking-wide opacity-75">{t("Ch:")}</span>
                              {file.chapter}
                            </p>
                          )}
                          {file.topic && (
                            <p className="text-[10px] text-[#15803d] dark:text-brand-450 font-semibold truncate max-w-[130px]" title={file.topic}>
                              <span className="font-bold mr-1 text-[8.5px] uppercase tracking-wide opacity-75">{t("Topic:")}</span>
                              {file.topic}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatSizeMap(file.fileSize)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div 
                          className={`truncate max-w-[100px] text-[11px] ${onViewTeacherDetails ? 'cursor-pointer hover:text-[#15803d] hover:underline' : ''}`}
                          onClick={() => onViewTeacherDetails && onViewTeacherDetails(file.uploadedBy)}
                          title={file.uploaderName}
                        >
                          {file.uploaderName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-gray-750 dark:text-gray-300">
                        {file.downloadCount}
                      </td>
                      <td className="py-3 px-4 text-right pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((file.fileType || '').toLowerCase()) && (
                            <button
                              onClick={() => onPreview ? onPreview(file) : onDownload(file)}
                              className="p-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-750 text-gray-600 dark:text-gray-300 rounded border border-gray-150 dark:border-slate-700 cursor-pointer"
                              title={t("Preview")}
                            >
                              <Eye className="w-3.5 h-3.5 text-brand-500" />
                            </button>
                          )}
                          <button
                            onClick={() => onDownload(file)}
                            className="p-1.5 bg-emerald-50 dark:bg-emerald-955/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-955/40 text-emerald-600 dark:text-[#22c55e] rounded border border-emerald-100 dark:border-emerald-900/40 cursor-pointer"
                            title={t("Download")}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
