import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: PaginationProps) {
  const { t } = useThemeLanguage();

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers array with intelligent ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-150 dark:border-slate-800">
      {/* Items count summary */}
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        {t("Showing")} <span className="font-bold text-gray-800 dark:text-gray-200">{startItem}</span>–<span className="font-bold text-gray-800 dark:text-gray-200">{endItem}</span> {t("of")} <span className="font-bold text-gray-800 dark:text-gray-200">{totalItems}</span> {t("items")}
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-750 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          title={t("Previous Page")}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t("Previous")}</span>
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={idx} className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 font-bold select-none">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={idx}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#15803d] text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-150 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-750 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          title={t("Next Page")}
        >
          <span className="hidden sm:inline">{t("Next")}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
