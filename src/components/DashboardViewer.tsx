import React, { useState } from 'react';
import { FileArchive, UserProfile } from '../types';
import { useBranchSubject } from './BranchSubjectContext';
import { Search, SlidersHorizontal, BookOpen, School, FileCheck, CheckCircle2, ChevronDown } from 'lucide-react';
import FileCard from './FileCard';
import { useThemeLanguage } from './ThemeLanguageContext';

interface DashboardViewerProps {
  user: UserProfile;
  files: FileArchive[];
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
}

export default function DashboardViewer({ user, files, onDownload, onPreview }: DashboardViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
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

    return matchesSearch && matchesBranch && matchesSubject;
  });

  return (
    <div className="space-y-8" id="viewer-student-dashboard">
      {/* Search and Filters Hub */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-brand-500" />
          <span>{t("Interactive Resource Directory Search")}</span>
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
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
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
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
        </div>

        {/* Clear Filters Shortcuts */}
        {(searchQuery || selectedBranch || selectedSubject) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('');
                setSelectedSubject('');
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
          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{filteredArchives.length} {t("Available Note's")}</span>
          </span>
        </div>

        {filteredArchives.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 space-y-2">
            <FileCheck className="w-12 h-12 mx-auto opacity-50 stroke-1" />
            <p className="text-xs">{t("No matching verified files found in Sristy Education Family's digital database.")}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredArchives.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                user={user}
                onDownload={onDownload}
                onPreview={onPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
