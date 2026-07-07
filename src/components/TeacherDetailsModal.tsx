import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, FileArchive } from '../types';
import { useThemeLanguage } from './ThemeLanguageContext';
import { motion } from 'motion/react';
import { 
  X, 
  User, 
  BookOpen, 
  School, 
  Mail, 
  Calendar, 
  FileText, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Eye, 
  Download 
} from 'lucide-react';

interface TeacherDetailsModalProps {
  teacherUid: string;
  onClose: () => void;
  files: FileArchive[];
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
}

export default function TeacherDetailsModal({ 
  teacherUid, 
  onClose, 
  files, 
  onDownload, 
  onPreview 
}: TeacherDetailsModalProps) {
  const { t } = useThemeLanguage();
  const [teacher, setTeacher] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejections, setRejections] = useState<any[]>([]);
  const [loadingRejections, setLoadingRejections] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'uploads' | 'rejections'>('overview');

  // Filter study materials uploaded by this teacher from real-time files prop
  const teacherFiles = files.filter(f => f.uploadedBy === teacherUid && !f.isDeleted);
  const approvedFiles = teacherFiles.filter(f => f.isApproved);
  const pendingFiles = teacherFiles.filter(f => !f.isApproved);

  useEffect(() => {
    async function fetchTeacherData() {
      setLoading(true);
      try {
        // 1. Fetch user document
        const docRef = doc(db, 'users', teacherUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Convert Firestore Timestamp to Date if present
          let createdAtDate = null;
          if (data.createdAt) {
            createdAtDate = typeof data.createdAt.toDate === 'function' 
              ? data.createdAt.toDate() 
              : new Date(data.createdAt);
          }
          setTeacher({
            uid: docSnap.id,
            username: data.username || '',
            fullName: data.fullName || '',
            email: data.email || '',
            role: data.role || 'teacher',
            branch: data.branch || '',
            subject: data.subject || '',
            subjects: data.subjects || [],
            status: data.status || 'active',
            profilePic: data.profilePic || '',
            bio: data.bio || '',
            createdAt: createdAtDate
          });
        }
      } catch (err) {
        console.error("Error fetching teacher details:", err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchRejectionLogs() {
      setLoadingRejections(true);
      try {
        const q = query(
          collection(db, 'activity_logs'),
          where('action', '==', 'file_rejected'),
          where('uploaderId', '==', teacherUid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const logs: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          let dateVal = null;
          if (data.createdAt) {
            dateVal = typeof data.createdAt.toDate === 'function' 
              ? data.createdAt.toDate() 
              : new Date(data.createdAt);
          }
          logs.push({
            id: d.id,
            ...data,
            createdAt: dateVal
          });
        });
        setRejections(logs);
      } catch (err) {
        console.error("Error fetching rejection logs:", err);
      } finally {
        setLoadingRejections(false);
      }
    }

    if (teacherUid) {
      fetchTeacherData();
      fetchRejectionLogs();
    }
  }, [teacherUid]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden select-none" id="teacher-details-modal">
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col text-gray-900 dark:text-gray-100 max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-[#15803d] px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-100" />
            <h2 className="font-semibold text-base tracking-tight">{t("Instructor Profile Details")}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-emerald-600 rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
            aria-label="Close details dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t("Loading instructor database records...")}</p>
          </div>
        ) : !teacher ? (
          <div className="p-12 text-center text-xs text-gray-400 dark:text-gray-500">
            {t("Instructor details could not be found inside the Sristy Family directory.")}
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Quick Hero Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left shrink-0">
              <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-slate-800 border-2 border-[#15803d] flex items-center justify-center text-[#15803d] dark:text-brand-400 font-black text-xl uppercase shrink-0">
                {teacher.profilePic ? (
                  <img src={teacher.profilePic} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  teacher.fullName.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 justify-center sm:justify-start">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate leading-snug">{teacher.fullName}</h3>
                  <span className={`self-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    teacher.status === 'active' 
                      ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400'
                  }`}>
                    {teacher.status === 'active' ? t("Active") : t("Suspended")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-505 font-mono tracking-wide mt-0.5">@{teacher.username}</p>
                
                {/* Branch assignment info */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xxs text-gray-505 dark:text-gray-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <School className="w-3.5 h-3.5 text-brand-500" />
                    <span>{teacher.branch ? t(teacher.branch) : t("Global Overlord")}</span>
                  </span>
                  <span className="text-gray-300 dark:text-slate-800">•</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                    <span>{teacher.role === 'teacher' ? t("Faculty Teacher") : t(teacher.role)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Segment Tabs Selector */}
            <div className="px-6 border-b border-gray-100 dark:border-slate-800 flex gap-4 text-xs font-bold shrink-0">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'overview' 
                    ? 'border-[#15803d] text-[#15803d] dark:text-brand-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {t("Account Overview")}
              </button>
              <button 
                onClick={() => setActiveTab('uploads')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'uploads' 
                    ? 'border-[#15803d] text-[#15803d] dark:text-brand-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <span>{t("Study Materials")}</span>
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[10px]">{teacherFiles.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('rejections')}
                className={`py-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'rejections' 
                    ? 'border-[#15803d] text-[#15803d] dark:text-brand-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <span>{t("Rejection Logs")}</span>
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[10px]">{rejections.length}</span>
              </button>
            </div>

            {/* Scrollable Tab Views Content */}
            <div className="p-6 overflow-y-auto flex-1 max-h-[50vh] scrollbar-none text-left">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-50/50 dark:bg-slate-950/10 border border-gray-100 dark:border-slate-850 p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t("Email Address")}</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#15803d]" />
                        <span>{teacher.email || t("N/A")}</span>
                      </p>
                    </div>

                    <div className="bg-gray-50/50 dark:bg-slate-950/10 border border-gray-100 dark:border-slate-850 p-3.5 rounded-xl space-y-1">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{t("Member Since")}</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#15803d]" />
                        <span>
                          {teacher.createdAt 
                            ? teacher.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) 
                            : t("N/A")}
                        </span>
                      </p>
                    </div>

                    <div className="bg-gray-50/50 dark:bg-slate-950/10 border border-gray-100 dark:border-slate-850 p-3.5 rounded-xl space-y-1 md:col-span-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">{t("Subjects Assigned Specialty")}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {teacher.subjects && teacher.subjects.length > 0 ? (
                          teacher.subjects.map((s, idx) => (
                            <span key={idx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{t(s)}</span>
                            </span>
                          ))
                        ) : teacher.subject ? (
                          <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{t(teacher.subject)}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">{t("No specific subject assigned officially.")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Biography */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">{t("Professional Bio")}</p>
                    <p className="bg-gray-50/30 dark:bg-slate-950/20 p-3.5 rounded-xl text-xs text-gray-650 dark:text-gray-400 leading-relaxed border border-gray-100 dark:border-slate-850 italic whitespace-pre-wrap">
                      {teacher.bio || t("No professional bio written yet inside the Sristy notes directory.")}
                    </p>
                  </div>

                  {/* Quick stats panel */}
                  <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs font-bold">
                    <div className="bg-[#15803d]/5 border border-[#15803d]/15 p-2.5 rounded-xl">
                      <p className="text-[#15803d] dark:text-brand-400 text-lg font-black">{teacherFiles.length}</p>
                      <p className="text-gray-400 font-bold uppercase text-[9px] mt-0.5">{t("Uploaded")}</p>
                    </div>
                    <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/35 p-2.5 rounded-xl">
                      <p className="text-emerald-600 dark:text-emerald-400 text-lg font-black">{approvedFiles.length}</p>
                      <p className="text-gray-400 font-bold uppercase text-[9px] mt-0.5">{t("Approved")}</p>
                    </div>
                    <div className="bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/35 p-2.5 rounded-xl">
                      <p className="text-amber-600 dark:text-amber-400 text-lg font-black">{pendingFiles.length}</p>
                      <p className="text-gray-400 font-bold uppercase text-[9px] mt-0.5">{t("Pending")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: UPLOADS LIST */}
              {activeTab === 'uploads' && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {teacherFiles.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-505">
                      <FileText className="w-10 h-10 mx-auto stroke-1 text-gray-300 dark:text-gray-700 mb-2" />
                      <p className="text-xs font-semibold">{t("No uploaded study materials archives found in this library.")}</p>
                    </div>
                  ) : (
                    teacherFiles.map((f) => (
                      <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100/50 dark:border-slate-850 rounded-xl hover:border-brand-100 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-xs text-gray-800 dark:text-gray-100 truncate" title={f.fileName}>{f.fileName}</p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-gray-400 dark:text-gray-505 font-medium mt-1">
                            <span className="bg-brand-50 dark:bg-brand-950/15 text-[#15803d] dark:text-brand-400 px-1.5 py-0.2 rounded font-extrabold font-mono text-[9px]">.{f.fileType.toUpperCase()}</span>
                            <span>{t(f.subject)}</span>
                            {f.chapter && (
                              <>
                                <span>•</span>
                                <span>{t("Ch")} {f.chapter}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatSize(f.fileSize)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                            f.isApproved 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400' 
                              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-605 dark:text-amber-400'
                          }`}>
                            {f.isApproved ? t("Approved") : t("Pending")}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((f.fileType || '').toLowerCase()) && onPreview && (
                              <button
                                onClick={() => onPreview(f)}
                                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-gray-100 text-brand-500 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                                title={t("Preview file")}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onDownload(f)}
                              className="p-1.5 bg-[#15803d] hover:bg-[#166534] text-white rounded-lg transition-colors cursor-pointer"
                              title={t("Download file")}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: REJECTION LOGS */}
              {activeTab === 'rejections' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {loadingRejections ? (
                    <div className="text-center py-8 text-xxs text-gray-400 dark:text-gray-505">{t("Loading rejection history logs...")}</div>
                  ) : rejections.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-505">
                      <CheckCircle2 className="w-10 h-10 mx-auto stroke-1 text-emerald-500 mb-2" />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t("Perfect Standing")}</p>
                      <p className="text-[10px] text-gray-450 font-medium mt-1">{t("This instructor currently has zero rejected notes or materials.")}</p>
                    </div>
                  ) : (
                    rejections.map((rej) => (
                      <div key={rej.id} className="p-3.5 bg-red-50/15 dark:bg-red-955/5 border border-red-100/30 dark:border-red-900/10 rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-extrabold text-xs text-gray-800 dark:text-gray-100 break-words flex-1" title={rej.fileName}>{rej.fileName}</p>
                          <span className="text-[9px] text-gray-400 font-mono shrink-0 uppercase tracking-wide font-bold">
                            {rej.createdAt ? rej.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : t("N/A")}
                          </span>
                        </div>
                        
                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded border border-red-50/40 dark:border-red-955/20 text-xs text-red-700 dark:text-red-300 leading-normal font-medium whitespace-pre-wrap">
                          <span className="block text-[8px] font-extrabold uppercase text-red-500 tracking-wider mb-1">{t("Reason Specified")}:</span>
                          {rej.rejectionReason}
                        </div>
                        
                        <p className="text-[9px] text-gray-400 text-right uppercase tracking-wider font-extrabold">
                          {t("Rejected By")}: <span className="text-gray-500 dark:text-gray-300 font-mono font-bold">{rej.actorName}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-slate-950/40 border-t border-gray-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs select-none shadow-xs transition-colors cursor-pointer"
          >
            {t("Close Window")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}