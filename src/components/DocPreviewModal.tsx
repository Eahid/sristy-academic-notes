import React, { useState } from 'react';
import { FileArchive } from '../types';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  FileImage,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface DocPreviewModalProps {
  file: FileArchive | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileArchive) => void;
}

type ViewerEngine = 'native' | 'google-docs' | 'ms-office' | 'simulated';

export default function DocPreviewModal({ file, isOpen, onClose, onDownload }: DocPreviewModalProps) {
  const { t } = useThemeLanguage();
  const [engine, setEngine] = useState<ViewerEngine>('google-docs');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simulatedPage, setSimulatedPage] = useState(1);

  if (!isOpen || !file) return null;

  const isImage = ['png', 'jpg', 'jpeg'].includes(file.fileType.toLowerCase());
  const isPdf = file.fileType.toLowerCase() === 'pdf';
  const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx'].includes(file.fileType.toLowerCase());

  // Determine ideal initial engine
  React.useEffect(() => {
    if (!file.fileUrl) {
      setEngine('simulated');
    } else if (isImage) {
      setEngine('native');
    } else if (isPdf) {
      setEngine('google-docs'); // standard & reliable
    } else if (isOfficeDoc) {
      setEngine('ms-office');
    } else {
      setEngine('google-docs');
    }
  }, [file]);

  const rawUrl = file.fileUrl || '';
  const absoluteUrl = rawUrl.startsWith('/api') 
    ? `${window.location.origin}${rawUrl}` 
    : rawUrl;

  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;
  const msOfficeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;

  // Simulated content database for local offline/mock file types
  const getSimulatedPages = () => {
    const title = file.fileName;
    const subject = file.subject;
    const author = file.uploaderName || t("Senior Faculty member");
    const dateStr = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    const sections: { [key: string]: string[] } = {
      'physics': [
        "Lecture 1: Electrostatic Potential and Gauss's Law Applications of Flux.",
        "Section A: Charge distributions, line charge densities, and radial electric fields in hollow conductors.",
        "Derivation: Integral form of Gauss theorem of closed surfaces matching boundary conditions.",
        "Summary Practice Question 1: Find electrostatic energy density inside standard concentric spherical shells.",
        "Practical laboratory test assignments scheduled for Sristy Academic Science Unit (SLA Clause 12.3)."
      ],
      'chemistry': [
        "Lecture 1: Kinetics, Catalysis and Transition Metal Activation States.",
        "Mechanism: Rate constant determinations and reaction order plotting in acidic pathways.",
        "Mathematical Model: Arrhenius activation energy diagrams and collision frequency factors.",
        "Practice Task: Solve half-life properties of first-order chemical processes under standard atmospheric conditions.",
        "Reference guidelines are verified by Sristy Academic School Chemistry Board of Governors."
      ],
      'math': [
        "Lecture 1: Calculus, Advanced Integration & Differential Modeling.",
        "Formula Study: Partial fraction integration and complex substitution rules.",
        "System Analysis: Modeling second-order linear differential equations with initial values.",
        "Application Exercise: Calculate volume parameter of solid revolutions of curve f(x)=x^2 about y-axis.",
        "Sristy Board exams past question papers mapping module (Academic Segment 2026)."
      ],
      'english': [
        "Lecture 1: Critical Rhetoric, Advanced Synthesis and Narrative Devices.",
        "Text Study: Analysis of figurative language and situational irony in classic Bangladeshi essays.",
        "Syntax Matrix: Clauses structure, parallel syntax composition, and cohesive paragraph linking.",
        "Writing Assignment: Compose a structured analytical essay highlighting active modern learning frameworks.",
        "Study booklet calibrated for Sristy College of Tangail Humanities Department."
      ],
      'ict': [
        "Lecture 1: Database Normalization (1NF, 2NF, 3NF and Boyce-Codd normal forms).",
        "Framework: Keys, functional dependency mapping, and relational database integrity constraints.",
        "Query Logic: Understanding relational algebra selections, projections, and standard inner joins.",
        "Special Exercise: Draw a standard ER diagram representing a complex files archive tracking suite.",
        "Prepared for digital transformation labs at Sristy Education Family."
      ]
    };

    const generalList = [
      `Section 1: Academic Overview for ${title}`,
      `Topic Focus Area: ${subject} curriculum mapping guidelines`,
      `Verified Author Profile: ${author} on ${dateStr}`,
      `Student Learning Metric: Real-time classroom interactive evaluation modules`,
      "Conclusion: Verified study resources made available by Sristy Education Family"
    ];

    const curList = sections[subject.toLowerCase()] || generalList;
    return curList;
  };

  const pages = getSimulatedPages();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="document-preview-modal-frame"
        className={`bg-white dark:bg-slate-900 w-full rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 transition-all duration-300 ${
          isFullscreen ? 'h-full max-w-full sm:rounded-none' : 'h-[90vh] max-w-5xl'
        }`}
      >
        {/* Modal Top Header Bar */}
        <div className="bg-gray-50 dark:bg-slate-950 px-5 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${isImage ? 'bg-green-100 dark:bg-green-950/25 text-green-600' : 'bg-brand-100 dark:bg-brand-950/25 text-brand-600'} shrink-0`}>
              {isImage ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-gray-805 dark:text-gray-100 truncate pr-4" title={file.fileName}>
                {file.fileName}
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-tight">
                {t(file.branch)} • <span className="font-semibold uppercase text-brand-505 dark:text-brand-400">{t(file.subject)}</span> • {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Engine configuration panel - Hidden for raw images */}
            {!isImage && file.fileUrl && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 rounded-lg p-0.5 border border-gray-200 dark:border-slate-800 mr-2">
                <button
                  type="button"
                  onClick={() => setEngine('google-docs')}
                  className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                    engine === 'google-docs' 
                      ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-402 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                  title={t("Google Docs cloud renderer")}
                >
                  Google View
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('ms-office')}
                  className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                    engine === 'ms-office' 
                      ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-402 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                  title={t("Microsoft Office Live document viewer")}
                >
                  Office View
                </button>
                {isPdf && (
                  <button
                    type="button"
                    onClick={() => setEngine('native')}
                    className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                      engine === 'native' 
                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-402 shadow-xs' 
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                    title={t("Native direct browser iframe render")}
                  >
                    Direct Native
                  </button>
                )}
              </div>
            )}

            {/* Toggle Fullscreen button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 px-1.5 bg-gray-150 hover:bg-gray-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-gray-200/50 dark:border-slate-800 text-gray-600 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? t("Restore Size") : t("Fullscreen Mode")}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 px-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 border border-red-200/40 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer"
              title={t("Close Preview")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info alerts */}
        {!isImage && file.fileUrl && (
          <div className="bg-brand-50/70 dark:bg-brand-950/10 px-5 py-2 border-b border-gray-100 dark:border-slate-800/60 text-xxs text-gray-550 dark:text-gray-400 flex items-center gap-1.5 leading-normal select-none">
            <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span>
              {engine === 'google-docs' && t("Tip: Google cloud renderer converts PDF/Word vectors, providing quick navigation. Use controls at top if document fails to stream.")}
              {engine === 'ms-office' && t("Tip: Microsoft Office Live works best for Word/Powerpoint materials, allowing beautiful page layout previews.")}
              {engine === 'native' && t("Tip: Displaying using your local web browser engine. High performance & privacy.")}
            </span>
          </div>
        )}

        {/* Content Preview Frame Space */}
        <div className="flex-1 bg-gray-100/60 dark:bg-slate-950 relative overflow-hidden flex flex-col justify-center">
          {engine === 'simulated' ? (
            /* Immersive simulated reader for mock files or backup local file instances */
            <div className="w-full max-w-2xl mx-auto p-6 sm:p-10 flex flex-col h-full justify-between select-none">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-250/60 dark:border-slate-800 shadow-lg p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xxs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-slate-800/80 pb-3 font-mono font-bold uppercase tracking-widest">
                    <span>{file.fileName.split('.').pop()?.toUpperCase() || 'DOCUMENT'} PREVIEW READER</span>
                    <span>PAGE {simulatedPage} OF {pages.length}</span>
                  </div>

                  <div className="py-6 sm:py-8 space-y-4">
                    <h4 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 font-display leading-snug">
                      {t("Chapter Detail")} {simulatedPage}: {t(file.subject)} {t("Special Lecture Notes")}
                    </h4>
                    
                    <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-950 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                      <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed font-sans font-medium">
                        {pages[simulatedPage - 1]}
                      </p>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="h-2 bg-gray-100 dark:bg-slate-950 rounded" />
                      <div className="h-2 bg-gray-100 dark:bg-slate-950 rounded w-5/6" />
                      <div className="h-2 bg-gray-100 dark:bg-slate-950 rounded w-2/3" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800/80 pt-4 flex justify-between items-center">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {t("Sristy Academic Digitization Board • Signed by")} {file.uploaderName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={simulatedPage === 1}
                      onClick={() => setSimulatedPage(prev => Math.max(1, prev - 1))}
                      className="p-1 px-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:pointer-events-none dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>{t("Prev")}</span>
                    </button>
                    <button
                      disabled={simulatedPage === pages.length}
                      onClick={() => setSimulatedPage(prev => Math.min(pages.length, prev + 1))}
                      className="p-1 px-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:pointer-events-none dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{t("Next")}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center py-4 text-[10px] text-gray-400 dark:text-gray-500 leading-normal font-medium flex items-center justify-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t("Seeded mock records have fully calibrated interactive learning view pre-sets.")}</span>
              </div>
            </div>
          ) : isImage ? (
            /* Raw image viewer */
            <div className="w-full h-full max-h-[80vh] flex items-center justify-center p-4 overflow-auto">
              <img 
                src={file.fileUrl} 
                alt={file.fileName}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-gray-200/60 dark:border-slate-850"
              />
            </div>
          ) : (
            /* Cloud rendered cloud viewframes */
            <div className="w-full h-full p-0 sm:p-2.5 flex-1 relative bg-white dark:bg-slate-900">
              <iframe
                id="doc-viewer-iframe"
                key={engine} // force remount on engine swap
                src={engine === 'google-docs' ? googleViewerUrl : (engine === 'ms-office' ? msOfficeViewerUrl : rawUrl)}
                title={file.fileName}
                className="w-full h-full border-0 rounded-none sm:rounded-xl shadow-xs"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Footer actions toolbar */}
        <div className="bg-gray-50 dark:bg-slate-950 px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center">
          <div className="text-xxs text-gray-405 dark:text-gray-500 font-medium text-center sm:text-left leading-normal">
            <span className="font-bold text-gray-750 dark:text-gray-300">{t("Uploader Identity")}:</span> {file.uploaderName} • <span className="font-extrabold uppercase bg-gray-150 dark:bg-slate-900 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">.{file.fileType}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {file.fileUrl && (
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold text-brand-605 dark:text-brand-400 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 border border-brand-100 dark:border-brand-900/40 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t("Open External Link")}</span>
              </a>
            )}

            <button
              onClick={() => onDownload(file)}
              className="px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 border border-brand-500 dark:border-brand-600 rounded-lg flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <Download className="w-3.5 h-3.5 animate-bounce" />
              <span>{t("Download Material")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
