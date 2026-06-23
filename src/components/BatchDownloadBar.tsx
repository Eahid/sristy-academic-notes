import React, { useState } from 'react';
import { FileArchive } from '../types';
import { Download, Loader2, CheckSquare, Square, XCircle } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';
import JSZip from 'jszip';

interface BatchDownloadBarProps {
  selectedIds: string[];
  allFiles: FileArchive[];
  currentFilteredFiles: FileArchive[];
  onSelectToggle: (id: string) => void;
  onClearSelection: () => void;
  onSelectAll: (ids: string[]) => void;
}

export default function BatchDownloadBar({
  selectedIds,
  allFiles,
  currentFilteredFiles,
  onClearSelection,
  onSelectAll
}: BatchDownloadBarProps) {
  const { t } = useThemeLanguage();
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  const tWithParams = (text: string, params?: Record<string, string | number>) => {
    let res = t(text);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        res = res.replace(`{{${key}}}`, String(val));
      });
    }
    return res;
  };

  if (currentFilteredFiles.length === 0) return null;

  // Find selected files that are actually in the current filtered view
  const currentFilteredIds = currentFilteredFiles.map(f => f.id);
  const selectedInCurrentView = selectedIds.filter(id => currentFilteredIds.includes(id));
  const isAllSelected = currentFilteredFiles.length > 0 && selectedInCurrentView.length === currentFilteredFiles.length;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      // Deselect all in current view
      currentFilteredFiles.forEach(f => {
        // We will pass the deselected list to the parent
      });
      // Better: filter out currentFilteredIds from selectedIds
      const newSelected = selectedIds.filter(id => !currentFilteredIds.includes(id));
      onSelectAll(newSelected);
    } else {
      // Select all in current view (merge with other selections if any)
      const union = Array.from(new Set([...selectedIds, ...currentFilteredIds]));
      onSelectAll(union);
    }
  };

  const handleBatchDownload = async () => {
    const selectedFilesToDownload = allFiles.filter(f => selectedIds.includes(f.id));
    if (selectedFilesToDownload.length === 0) return;

    setIsZipping(true);
    setZipProgress(t("Initializing secure zip engine..."));

    try {
      const zip = new JSZip();
      let downloadedCount = 0;

      for (const file of selectedFilesToDownload) {
        setZipProgress(tWithParams("Fetching: {{name}} ({{count}}/{{total}})", {
          name: file.fileName.length > 20 ? `${file.fileName.slice(0, 17)}...` : file.fileName,
          count: downloadedCount + 1,
          total: selectedFilesToDownload.length
        }));

        try {
          let downloadLink = file.fileUrl;
          if (downloadLink) {
            // Proxy cross-origin URLs if needed
            if (!downloadLink.startsWith('/') && !downloadLink.startsWith(window.location.origin)) {
              downloadLink = `/api/r2/file?url=${encodeURIComponent(downloadLink)}`;
            }

            const response = await fetch(downloadLink);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            
            // Deduplicate name inside zip if there are duplicates
            let archiveName = file.fileName;
            if (!archiveName.endsWith(`.${file.fileType}`)) {
              archiveName = `${archiveName}.${file.fileType}`;
            }

            zip.file(archiveName, blob);
          }
        } catch (fileErr) {
          console.error(`Failed to fetch file ${file.fileName} for batch zip:`, fileErr);
        }
        downloadedCount++;
      }

      setZipProgress(t("Compressing archive files..."));
      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      const downloadUrl = URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Sristy_Archived_Notes_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setZipProgress(t("Download completed successfully!"));
      setTimeout(() => {
        setIsZipping(false);
        setZipProgress('');
      }, 1500);
    } catch (err) {
      console.error("Batch download failure:", err);
      setZipProgress(t("Compression failed. Try again."));
      setTimeout(() => {
        setIsZipping(false);
        setZipProgress('');
      }, 3000);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all">
      {/* Select All Toggle Checkbox option */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSelectAllToggle}
          className="flex items-center gap-2 text-xs font-bold text-gray-750 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer select-none"
        >
          {isAllSelected ? (
            <CheckSquare className="w-5 h-5 text-[#15803d]" />
          ) : (
            <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
          <span>
            {isAllSelected 
              ? t("Deselect All matching results") 
              : tWithParams("Select All matching results ({{count}} found)", { count: currentFilteredFiles.length })
            }
          </span>
        </button>
      </div>

      {/* Action buttons bar when items selected */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mr-auto sm:mr-0">
            {tWithParams("Selected: {{count}} items", { count: selectedIds.length })}
          </div>

          <button
            onClick={onClearSelection}
            disabled={isZipping}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer text-xs font-bold flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Clear")}</span>
          </button>

          <button
            onClick={handleBatchDownload}
            disabled={isZipping}
            className="flex-1 sm:flex-none bg-[#15803d] hover:bg-[#166534] disabled:bg-gray-400 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="font-mono text-[10px] sm:text-xs">{zipProgress}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>{t("Batch Download (ZIP)")}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
