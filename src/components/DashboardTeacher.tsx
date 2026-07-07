import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, FileArchive } from '../types';
import { Upload, CheckCircle2, AlertCircle, Sparkles, FolderLock, Globe, BookOpen, Layers, ChevronDown, Loader2, Bell, AlertTriangle, Calendar, X, List, Grid, Search, FileText, FileImage, Download, Eye, Trash2 } from 'lucide-react';
import FileCard from './FileCard';
import BatchDownloadBar from './BatchDownloadBar';
import { useThemeLanguage } from './ThemeLanguageContext';
import { useBranchSubject } from './BranchSubjectContext';

interface DashboardTeacherProps {
  user: UserProfile;
  files: FileArchive[];
  onUploadSuccess: () => void;
  onFileDelete: (fileId: string) => void;
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
  onViewTeacherDetails?: (teacherUid: string) => void;
}

export default function DashboardTeacher({
  user,
  files,
  onUploadSuccess,
  onFileDelete,
  onDownload,
  onPreview,
  onViewTeacherDetails
}: DashboardTeacherProps) {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [archiveTab, setArchiveTab] = useState<'my_submissions' | 'department_materials' | 'recent_activity'>('my_submissions');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileValidationErrors, setFileValidationErrors] = useState<{ [fileName: string]: string }>({});
  const [fileProgresses, setFileProgresses] = useState<{ [fileName: string]: number }>({});
  const [fileStatuses, setFileStatuses] = useState<{ [fileName: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
  const [description, setDescription] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { subjects, addSubject } = useBranchSubject();

  const [selectedSubject, setSelectedSubject] = useState((user.subjects && user.subjects[0]) || user.subject || '');
  const [isNewSubjectForm, setIsNewSubjectForm] = useState(false);
  const [newSubjectText, setNewSubjectText] = useState('');

  const [chapter, setChapter] = useState('');
  const [isNewChapterForm, setIsNewChapterForm] = useState(false);
  const [newChapterText, setNewChapterText] = useState('');

  const [topic, setTopic] = useState('');
  const [isNewTopicForm, setIsNewTopicForm] = useState(false);
  const [newTopicText, setNewTopicText] = useState('');

  const [itemType, setItemType] = useState('');
  const [isNewItemTypeForm, setIsNewItemTypeForm] = useState(false);
  const [newItemTypeText, setNewItemTypeText] = useState('');

  const PRESET_ITEM_TYPES = [
    "Word Meaning",
    "Short Question",
    "Long Question",
    "Creative Question",
    "Lecture Note",
    "Practice Sheet",
    "Syllabus & Suggestion"
  ];

  const finalSubject = isNewSubjectForm ? newSubjectText.trim() : selectedSubject;

  const teacherSubjects = (Array.isArray(user?.subjects)
    ? user.subjects
    : (user?.subject ? [user.subject] : [])
  ).filter((sub): sub is string => typeof sub === 'string');

  // Filter files
  // 1. My archive (all files uploaded by me)
  const myUploadedFiles = files.filter(f => f && f.uploadedBy === user.uid);

  // 2. Department Library (all approved files from my assigned department)
  const departmentFiles = files.filter(f => 
    f && 
    f.isApproved && 
    typeof f.subject === 'string' && 
    teacherSubjects.some(sub => typeof sub === 'string' && sub.toLowerCase() === f.subject.toLowerCase())
  );

  // Active files prior to search
  const activeTabFiles = archiveTab === 'my_submissions' 
    ? myUploadedFiles 
    : archiveTab === 'recent_activity'
    ? [...myUploadedFiles, ...departmentFiles].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
    : departmentFiles;

  // Filter with search query
  const currentFilteredFiles = activeTabFiles.filter(file => {
    if (!file) return false;
    if (!searchTerm.trim()) return true;
    const queryStr = searchTerm.toLowerCase();
    
    const nameStr = file.fileName || '';
    const descStr = file.description || '';
    const chapStr = file.chapter || '';
    const topicStr = file.topic || '';
    const itemStr = file.itemType || '';
    const uploaderStr = file.uploaderName || '';

    return (
      nameStr.toLowerCase().includes(queryStr) ||
      descStr.toLowerCase().includes(queryStr) ||
      chapStr.toLowerCase().includes(queryStr) ||
      topicStr.toLowerCase().includes(queryStr) ||
      itemStr.toLowerCase().includes(queryStr) ||
      uploaderStr.toLowerCase().includes(queryStr)
    );
  });

  const existingChapters = Array.from(new Set(
    myUploadedFiles
      .filter(f => f.subject && finalSubject && f.subject.toLowerCase() === finalSubject.toLowerCase() && f.chapter)
      .map(f => f.chapter as string)
  ));

  const finalChapter = isNewChapterForm ? newChapterText.trim() : chapter;

  const existingTopics = Array.from(new Set(
    myUploadedFiles
      .filter(f => f.subject && finalSubject && f.subject.toLowerCase() === finalSubject.toLowerCase() &&
                   f.chapter && finalChapter && f.chapter.toLowerCase() === finalChapter.toLowerCase() && f.topic)
      .map(f => f.topic as string)
  ));

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const { t } = useThemeLanguage();

  const [rejectionLogs, setRejectionLogs] = useState<any[]>([]);
  const [loadingRejections, setLoadingRejections] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingRecentLogs, setLoadingRecentLogs] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRecentLogs = async () => {
      setLoadingRecentLogs(true);
      try {
        const q = query(
          collection(db, 'activity_logs'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        if (active) {
          const logs: any[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            logs.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate() || null
            });
          });
          // Filter logs belonging to CSE/Physics/etc department subjects assigned to this teacher
          const filtered = logs.filter(log => {
            const isMine = log.uploaderId === user.uid || log.actorId === user.uid;
            const inDept = log.fileSubject && teacherSubjects.some(
              sub => typeof sub === 'string' && sub.toLowerCase() === log.fileSubject.toLowerCase()
            );
            return isMine || inDept;
          });
          setRecentLogs(filtered.slice(0, 30));
        }
      } catch (err) {
        console.warn("Failed to fetch department logs:", err);
      } finally {
        if (active) setLoadingRecentLogs(false);
      }
    };
    fetchRecentLogs();
    return () => {
      active = false;
    };
  }, [user.uid, teacherSubjects]);

  useEffect(() => {
    let active = true;
    const fetchRejectionLogs = async () => {
      setLoadingRejections(true);
      try {
        const q = query(
          collection(db, 'activity_logs'),
          where('action', '==', 'file_rejected'),
          where('uploaderId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        if (active) {
          const logs: any[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            logs.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate() || null
            });
          });
          setRejectionLogs(logs);
        }
      } catch (err) {
        console.warn("Failed to fetch rejection logs: ", err);
      } finally {
        if (active) setLoadingRejections(false);
      }
    };
    fetchRejectionLogs();
    return () => {
      active = false;
    };
  }, [user.uid]);

  // Allowed file extensions
  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB SLA Limit

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (loading) return;
    const filesList = e.dataTransfer.files;
    if (filesList && filesList.length > 0) {
      validateAndAddFiles(Array.from(filesList));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
    const filesList = e.target.files;
    if (filesList && filesList.length > 0) {
      validateAndAddFiles(Array.from(filesList));
    }
  };

  const validateAndAddFiles = (filesList: File[]) => {
    setUploadError('');
    setUploadSuccess('');
    
    const newValidFiles: File[] = [];
    const newErrors = { ...fileValidationErrors };

    filesList.forEach(file => {
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1].toLowerCase();
      
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        newErrors[file.name] = t("Invalid file extension. Only PDF, DOC/DOCX, PPT/PPTX and images are allowed.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        newErrors[file.name] = t("File exceeds SLA limit of 10MB (Contract Clause 11.2). Please compress your resource file.");
        return;
      }

      // Check for duplicates in current selection
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        return; // Skip duplicate
      }

      newValidFiles.push(file);
      // Clean up previous error if any
      delete newErrors[file.name];
    });

    if (newValidFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newValidFiles]);
      setFileStatuses(prev => {
        const next = { ...prev };
        newValidFiles.forEach(f => {
          next[f.name] = 'pending';
        });
        return next;
      });
    }
    setFileValidationErrors(newErrors);
  };

  const handleRemoveFile = (index: number) => {
    if (loading) return;
    const fileToRemove = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileToRemove) {
      setFileProgresses(prev => {
        const next = { ...prev };
        delete next[fileToRemove.name];
        return next;
      });
      setFileStatuses(prev => {
        const next = { ...prev };
        delete next[fileToRemove.name];
        return next;
      });
      setFileValidationErrors(prev => {
        const next = { ...prev };
        delete next[fileToRemove.name];
        return next;
      });
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError(t("Please choose or drag-and-drop educational files first."));
      return;
    }

    setLoading(true);
    setUploadError('');
    setUploadSuccess('');

    let finalSub = selectedSubject;
    if (isNewSubjectForm) {
      finalSub = newSubjectText.trim();
      if (!finalSub) {
        setUploadError(t("Custom subject name cannot be empty."));
        setLoading(false);
        return;
      }
      try {
        await addSubject(finalSub);
      } catch (addErr: any) {
        console.warn("Subject already exists or failed to save to metadata:", addErr);
      }
    }

    let finalCh = isNewChapterForm ? newChapterText.trim() : chapter;
    let finalTopic = isNewTopicForm ? newTopicText.trim() : topic;
    let finalItemType = isNewItemTypeForm ? newItemTypeText.trim() : itemType;

    if (!finalSub) {
      setUploadError(t("Subject is required. Select or type a custom subject."));
      setLoading(false);
      return;
    }
    if (!finalCh) {
      setUploadError(t("Chapter is required. Select or type a custom chapter."));
      setLoading(false);
      return;
    }
    if (!finalTopic) {
      setUploadError(t("Topic is required. Select or type a custom topic."));
      setLoading(false);
      return;
    }
    if (!finalItemType) {
      setUploadError(t("Item type is required. Choose preset or create custom."));
      setLoading(false);
      return;
    }

    let successCount = 0;
    const failedFiles: File[] = [];
    const newErrors = { ...fileValidationErrors };

    for (const file of selectedFiles) {
      setFileStatuses(prev => ({ ...prev, [file.name]: 'uploading' }));
      setFileProgresses(prev => ({ ...prev, [file.name]: 0 }));

      try {
        const parts = file.name.split('.');
        const fileType = parts[parts.length - 1].toLowerCase();

        let downloadUrl = '';
        let fileRefPath = '';

        try {
          const r2Response = await fetch('/api/r2/presigned-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileType: file.type }),
          });

          if (r2Response.ok) {
            const r2Data = await r2Response.json();
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('PUT', r2Data.uploadUrl);
              xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100);
                  setFileProgresses(prev => ({ ...prev, [file.name]: percentComplete }));
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                } else {
                  reject(new Error(`R2 direct PUT upload raw fetch failed: ${xhr.status}`));
                }
              };

              xhr.onerror = () => {
                reject(new Error('R2 direct PUT upload network error'));
              };

              xhr.send(file);
            });

            downloadUrl = r2Data.fileUrl;
            fileRefPath = r2Data.storagePath;
            console.log('Secure Direct R2 upload pipeline complete:', fileRefPath);
          } else {
            console.warn('S3 R2 Storage is unconfigured. Defaulting back to client-driven Firebase Storage routing.');
            const fileRefPathFallback = `files/${user.uid}_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileRefPathFallback);
            const uploadTask = uploadBytesResumable(storageRef, file);
            await new Promise<void>((resolve, reject) => {
              uploadTask.on('state_changed',
                (snapshot) => {
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setFileProgresses(prev => ({ ...prev, [file.name]: progress }));
                },
                (error) => {
                  reject(error);
                },
                () => {
                  resolve();
                }
              );
            });
            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            fileRefPath = fileRefPathFallback;
          }
        } catch (r2Err: any) {
          console.warn('Cloudflare R2 Direct Upload bypassed because of network/setup error, triggering Firebase Storage fallback: ', r2Err);
          const fileRefPathFallback = `files/${user.uid}_${Date.now()}_${file.name}`;
          const storageRef = ref(storage, fileRefPathFallback);
          const uploadTask = uploadBytesResumable(storageRef, file);
          await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setFileProgresses(prev => ({ ...prev, [file.name]: progress }));
              },
              (error) => {
                reject(error);
              },
              () => {
                resolve();
              }
            );
          });
          downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          fileRefPath = fileRefPathFallback;
        }

        const payload: any = {
          fileName: file.name,
          fileType,
          fileSize: file.size,
          fileUrl: downloadUrl,
          storagePath: fileRefPath,
          description: description.trim(),
          uploadedBy: user.uid,
          uploaderName: user.fullName,
          uploaderRole: 'teacher',
          branch: user.branch || 'Sristy Academic School, Tangail',
          subject: finalSub,
          chapter: finalCh,
          topic: finalTopic,
          itemType: finalItemType,
          isApproved: false,
          downloadCount: 0,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'files'), payload);

        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_uploaded',
            actorId: user.uid,
            actorName: user.fullName,
            actorRole: user.role,
            actorBranch: user.branch || '',
            fileId: docRef.id,
            fileName: payload.fileName,
            fileSubject: payload.subject,
            fileBranch: payload.branch,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write activity upload log:", logErr);
        }

        successCount++;
        setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
        setFileProgresses(prev => ({ ...prev, [file.name]: 100 }));
      } catch (err: any) {
        console.error(`Firebase Storage Upload Error for ${file.name}:`, err);
        const exactMsg = err?.message || String(err);
        newErrors[file.name] = exactMsg.includes("permissions") 
          ? t("Missing or insufficient Firestore database permissions. Try logging out and back in to refresh your teacher credentials.") 
          : t("Failed to upload file: ") + exactMsg;
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        failedFiles.push(file);
      }
    }

    setFileValidationErrors(newErrors);

    if (successCount > 0) {
      setUploadSuccess(
        t("Upload successful! {count} file(s) are awaiting admin approval.")
          .replace("{count}", String(successCount))
      );
      setSelectedFiles(failedFiles);
      setDescription('');
      
      setChapter('');
      setNewChapterText('');
      setTopic('');
      setNewTopicText('');
      setItemType('');
      setNewItemTypeText('');
      setIsNewChapterForm(false);
      setIsNewTopicForm(false);
      setIsNewItemTypeForm(false);
      
      onUploadSuccess();
    } else {
      setUploadError(t("All file uploads in the batch failed. Please inspect the errors below."));
    }

    setLoading(false);
  };

  return (
    <div className="space-y-8" id="teacher-dashboard">
      {/* Subject Header Banner */}
      <div className="relative overflow-hidden bg-[#15803d] p-6 sm:p-8 rounded-2xl text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <FolderLock className="w-3.5 h-3.5" />
              <span>{t("Sristy Academic Note's Portal")}</span>
            </span>
          </div>
          <h2 className="text-xl font-bold font-display leading-tight">{user.fullName}</h2>
          <p className="text-xs text-brand-100/90 font-medium tracking-wide mt-1">
            {t("Teaching Department")}: <span className="underline decoration-white/30 decoration-2 font-bold">{t(user.subject || 'General Science')}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/10 px-4 py-3 rounded-lg backdrop-blur-xs border border-white/10 text-left min-w-[150px]">
            <p className="text-[10px] text-brand-100 uppercase tracking-widest font-bold">{t("My Submissions")}</p>
            <p className="text-base font-bold font-display">{myUploadedFiles.length} {t("Note's uploaded")}</p>
          </div>

          <button 
            onClick={() => setShowRejectionModal(true)}
            className="group relative p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all cursor-pointer focus:outline-none flex items-center justify-center shadow-xs"
            title={t("My Rejected Submissions")}
          >
            <Bell className="w-5 h-5 group-hover:scale-110 duration-200" />
            {rejectionLogs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-pulse border-2 border-[#15803d]">
                {rejectionLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {rejectionLogs.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 rounded-r-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in slide-in-from-top duration-250">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-805 dark:text-amber-200">
                {t("Material Rejection Logs Available")}
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-1 leading-normal">
                {t("Some of your uploaded materials were rejected by managers. Click 'View Rejections' to read feedback so you can revise them.")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRejectionModal(true)}
            className="bg-amber-600 hover:bg-amber-705 active:bg-amber-850 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-xs shrink-0 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer mt-1 sm:mt-0"
          >
            <Bell className="w-3.5 h-3.5 animate-pulse" />
            <span>{t("View Rejections")}</span>
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs self-start transition-colors">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4 animate-pulse">
            <Upload className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">{t("Upload Resource File")}</h3>
          </div>

          {uploadError && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg text-xs leading-relaxed font-semibold border border-red-100 dark:border-red-900/40">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-lg text-xs leading-relaxed font-semibold border border-green-100 dark:border-green-905/40">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {loading && (
            <div className="mb-4 p-3.5 bg-blue-50 dark:bg-blue-950/25 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-105/30 space-y-2">
              <div className="flex items-center gap-2.5 animate-pulse">
                <Loader2 className="w-4 h-4 shrink-0 text-blue-500 animate-spin" />
                <span>
                  {uploadProgress !== null 
                    ? `${t("Uploading...")} ${uploadProgress}%` 
                    : t("Securely transferring file archive to Cloudflare R2 pipeline...")}
                </span>
              </div>
              {uploadProgress !== null && (
                <div className="w-full bg-blue-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-brand-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                    id="upload-progress-bar"
                  />
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* Drag & Drop Visual Zone */}
            <div
              onDragOver={loading ? undefined : handleDragOver}
              onDragLeave={loading ? undefined : handleDragLeave}
              onDrop={loading ? undefined : handleDrop}
              onClick={loading ? undefined : () => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                loading
                  ? 'border-gray-200 dark:border-slate-800 bg-gray-50/20 dark:bg-slate-900/20 cursor-not-allowed opacity-60'
                  : isDragActive 
                    ? 'border-brand-500 bg-brand-50 dark:bg-slate-800 cursor-pointer' 
                    : selectedFiles.length > 0 
                      ? 'border-emerald-400 bg-emerald-50/25 dark:bg-emerald-955/10 cursor-pointer' 
                      : 'border-gray-200 dark:border-slate-700 hover:border-brand-500/50 dark:hover:border-brand-500/50 bg-gray-50/50 dark:bg-slate-800/30 cursor-pointer'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                disabled={loading}
                multiple
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`p-3 rounded-full ${selectedFiles.length > 0 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-brand-50 dark:bg-slate-800 text-brand-500'}`}>
                  <Upload className="w-6 h-6" />
                </div>
                {selectedFiles.length > 0 ? (
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {selectedFiles.length} {selectedFiles.length === 1 ? t("file selected") : t("files selected")}
                    </p>
                    <p className="text-[10px] text-emerald-605 dark:text-emerald-400 font-medium tracking-wide mt-1">
                      {t("Total Size")}: {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t("Drag & Drop educational file")}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t("or click to browse local files")}</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-normal">
              {t("Supported file types: PDF, Word, PPT or Image (Max 10MB due to SLA limit)")}
            </p>

            {/* Interactive File Queue List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 mt-4 max-h-[250px] overflow-y-auto pr-1 border border-gray-100 dark:border-slate-800 rounded-xl p-3 bg-gray-50/30 dark:bg-slate-900/40">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("Upload Queue")} ({selectedFiles.length})
                  </span>
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles([]);
                        setFileValidationErrors({});
                        setFileProgresses({});
                        setFileStatuses({});
                      }}
                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      {t("Clear All")}
                    </button>
                  )}
                </div>
                {selectedFiles.map((file, idx) => {
                  const parts = file.name.split('.');
                  const ext = parts[parts.length - 1].toLowerCase();
                  const isImg = ['png', 'jpg', 'jpeg'].includes(ext);
                  const isPdf = ext === 'pdf';
                  const isWord = ['doc', 'docx'].includes(ext);
                  const isPpt = ['ppt', 'pptx'].includes(ext);

                  let themeClass = "text-gray-500 bg-gray-50 dark:bg-slate-800";
                  if (isPdf) themeClass = "text-red-600 bg-red-50 dark:bg-red-950/30";
                  else if (isWord) themeClass = "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
                  else if (isPpt) themeClass = "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
                  else if (isImg) themeClass = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";

                  const progress = fileProgresses[file.name] || 0;
                  const status = fileStatuses[file.name] || 'pending';
                  const fileErr = fileValidationErrors[file.name];

                  return (
                    <div key={idx} className="flex flex-col p-2.5 bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-900 rounded-lg shadow-xxs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${themeClass}`}>
                            {isImg ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xxs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px] sm:max-w-[200px]" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {status === 'uploading' && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {progress}%
                            </span>
                          )}
                          {status === 'success' && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-955/30 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              {t("Success")}
                            </span>
                          )}
                          {status === 'error' && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3" />
                              {t("Failed")}
                            </span>
                          )}
                          {status === 'pending' && !loading && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar for active upload */}
                      {status === 'uploading' && (
                        <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                          <div 
                            className="bg-brand-500 h-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      {/* Validation or upload error messages */}
                      {fileErr && (
                        <p className="text-[9px] text-red-600 dark:text-red-400 mt-1.5 font-medium leading-relaxed">
                          ⚠️ {fileErr}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hierarchical metadata steps */}
            <div className="space-y-3.5 border-t border-b border-gray-105/70 dark:border-slate-800 py-3.5">
              {/* 1. Subject */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                    {t("Subject")}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                    🔐 {t("Authorized Only")}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                    disabled={loading}
                  >
                    <option value="">{t("-- Select Subject --")}</option>
                    {(teacherSubjects.length > 0 ? teacherSubjects : subjects).map((sub, idx) => (
                      <option key={idx} value={sub}>{t(sub)}</option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>
                {teacherSubjects.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    {t("Security Alert: You do not have any subjects officially assigned to you yet. Please request your administrator to map your subjects.")}
                  </p>
                )}
              </div>

              {/* 2. Chapter */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-brand-500" />
                    {t("Chapter")}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsNewChapterForm(!isNewChapterForm);
                      setChapter('');
                      setNewChapterText('');
                    }}
                    className={`text-[10px] font-bold text-brand-500 hover:underline cursor-pointer ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {isNewChapterForm ? t("Choose Existing") : t("+ Create New Chapter")}
                  </button>
                </div>
                {isNewChapterForm ? (
                  <input
                    type="text"
                    value={newChapterText}
                    onChange={(e) => setNewChapterText(e.target.value)}
                    placeholder={t("e.g. Chapter 1: Introduction")}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className="relative">
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                      disabled={loading}
                    >
                      <option value="">{t("-- Select Chapter --")}</option>
                      {existingChapters.map((ch, idx) => (
                        <option key={idx} value={ch}>{ch}</option>
                      ))}
                      {existingChapters.length === 0 && (
                        <option disabled value="">{t("No chapters found in this Subject. Create one!")}</option>
                      )}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Topic */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    {t("Topic")}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsNewTopicForm(!isNewTopicForm);
                      setTopic('');
                      setNewTopicText('');
                    }}
                    className={`text-[10px] font-bold text-brand-500 hover:underline cursor-pointer ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {isNewTopicForm ? t("Choose Existing") : t("+ Create New Topic")}
                  </button>
                </div>
                {isNewTopicForm ? (
                  <input
                    type="text"
                    value={newTopicText}
                    onChange={(e) => setNewTopicText(e.target.value)}
                    placeholder={t("e.g. Kazi Nazrul Islam")}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className="relative">
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                      disabled={loading}
                    >
                      <option value="">{t("-- Select Topic--")}</option>
                      {existingTopics.map((tp, idx) => (
                        <option key={idx} value={tp}>{tp}</option>
                      ))}
                      {existingTopics.length === 0 && (
                        <option disabled value="">{t("No topics found in this Chapter. Create one!")}</option>
                      )}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Item Type */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <FolderLock className="w-3.5 h-3.5 text-brand-500" />
                    {t("Note/Resource Type")}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsNewItemTypeForm(!isNewItemTypeForm);
                      setItemType('');
                      setNewItemTypeText('');
                    }}
                    className={`text-[10px] font-bold text-brand-500 hover:underline cursor-pointer ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {isNewItemTypeForm ? t("Choose Preset") : t("+ Custom Item Type")}
                  </button>
                </div>
                {isNewItemTypeForm ? (
                  <input
                    type="text"
                    value={newItemTypeText}
                    onChange={(e) => setNewItemTypeText(e.target.value)}
                    placeholder={t("e.g. Word Meaning, Short Question...")}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                    disabled={loading}
                  />
                ) : (
                  <div className="relative">
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                      disabled={loading}
                    >
                      <option value="">{t("-- Select Note ItemType --")}</option>
                      {PRESET_ITEM_TYPES.map((it, idx) => (
                        <option key={idx} value={it}>{t(it)}</option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-1.5">{t("Description Notes") || "Notes"}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("Briefly state target topics, chapters, and summary of the note...")}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-805 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || selectedFiles.length === 0}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                (selectedFiles.length > 0 && !loading)
                  ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("Uploading...")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("Upload Resource File")}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Archives Display segment column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Controls for Archives Display */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            {/* Tabs & View Modes */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-3 border-b border-gray-50 dark:border-slate-800/55">
              {/* Tabs list */}
              <div className="flex bg-gray-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit border border-gray-150/40 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTab('my_submissions');
                    setSelectedFileIds([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    archiveTab === 'my_submissions'
                      ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t("My Submissions")} ({myUploadedFiles.length})
                </button>
                {teacherSubjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setArchiveTab('department_materials');
                      setSelectedFileIds([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      archiveTab === 'department_materials'
                        ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {t("Department Library")} ({departmentFiles.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTab('recent_activity');
                    setSelectedFileIds([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    archiveTab === 'recent_activity'
                      ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t("Recent Activity")}
                </button>
              </div>

              {/* View Switchers */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit border border-gray-150/40 dark:border-slate-800 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-[#15803d] dark:text-brand-400 shadow-xs'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-650 dark:hover:text-gray-300'
                  }`}
                  title={t("Grid View")}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-700 text-[#15803d] dark:text-brand-400 shadow-xs'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-650 dark:hover:text-gray-300'
                  }`}
                  title={t("List View")}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Search Field */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="relative w-full max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-450 dark:text-slate-500" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    archiveTab === 'my_submissions'
                      ? t("Search my submissions by name, topic...")
                      : archiveTab === 'recent_activity'
                      ? t("Search recently active files...")
                      : t("Search department files by name, author...")
                  }
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-lg focus:outline-none focus:border-[#15803d] dark:focus:border-brand-500 text-xs font-semibold text-gray-700 dark:text-gray-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-450 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold cursor-pointer"
                  >
                    {t("Clear")}
                  </button>
                )}
              </div>

              <div className="text-[10px] bg-brand-100 dark:bg-brand-950/40 text-[#15803d] dark:text-brand-400 px-3 py-1 rounded-full font-bold select-none capitalize border border-[#15803d]/10">
                {archiveTab === 'my_submissions'
                  ? `${t("My Submissions")}: ${user.subject || t("General")}`
                  : archiveTab === 'recent_activity'
                  ? t("Recent Department Activity Feed")
                  : `${t("Assigned")}: ${teacherSubjects.join(', ')}`}
              </div>
            </div>
          </div>

          {/* List/Grid Container Segment */}
          <div className="space-y-4">
            {archiveTab === 'recent_activity' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-150/65 dark:border-slate-800 shadow-xs transition-colors space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#15803d] animate-pulse"></div>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-100">
                      {t("Live Activity Feed")}
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {recentLogs.length} {t("Recent Events")}
                  </span>
                </div>

                {loadingRecentLogs ? (
                  <div className="text-center py-8 text-xs font-semibold text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                    <span>{t("Syncing activity logs...")}</span>
                  </div>
                ) : recentLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
                    {t("No recent activity found for your assigned department subjects.")}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100/60 dark:divide-slate-850/50 max-h-[280px] overflow-y-auto pr-1">
                    {recentLogs.map((log) => {
                      const matchingFile = files.find(f => f.id === log.fileId && !f.isDeleted);
                      let logIcon = <FileText className="w-4 h-4 text-gray-450" />;
                      let actionText = "";
                      
                      if (log.action === 'file_uploaded') {
                        logIcon = <Upload className="w-4 h-4 text-blue-500" />;
                        actionText = t("uploaded educational material");
                      } else if (log.action === 'file_approved') {
                        logIcon = <CheckCircle2 className="w-4 h-4 text-green-500" />;
                        actionText = t("approved study file");
                      } else if (log.action === 'file_rejected') {
                        logIcon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
                        actionText = t("rejected submission");
                      } else if (log.action === 'file_deleted') {
                        logIcon = <Trash2 className="w-4 h-4 text-red-500" />;
                        actionText = t("deleted study material");
                      }

                      return (
                        <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-750 shrink-0 mt-0.5">
                              {logIcon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-gray-800 dark:text-gray-200 leading-tight">
                                <strong className="font-bold">{log.actorName}</strong> <span className="text-gray-500">{actionText}</span>
                              </p>
                              <p className="font-bold text-[11px] text-brand-600 dark:text-brand-405 truncate max-w-[280px] sm:max-w-[450px] mt-0.5" title={log.fileName}>
                                {log.fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                <span className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">{log.fileSubject}</span>
                                <span>•</span>
                                <span className="font-mono">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "just now"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick download/preview button if file is active */}
                          {matchingFile && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onDownload(matchingFile)}
                                className="p-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg transition-colors cursor-pointer"
                                title={t("Download File")}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentFilteredFiles.length > 1 && (
              <div className="flex sm:hidden items-center justify-center gap-1.5 text-[11px] text-brand-605 dark:text-brand-405 mb-2 animate-pulse bg-brand-500/5 py-1 px-3 rounded-full border border-brand-500/10">
                <span className="font-semibold uppercase tracking-wider">Swipe horizontally</span>
                <span className="text-sm font-bold">↔</span>
                <span>to browse {currentFilteredFiles.length} files</span>
              </div>
            )}

            {currentFilteredFiles.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-gray-100 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-gray-500">
                {searchTerm ? t("No search results match your parameters.") : t("No files found in this category.")}
              </div>
            ) : (
              <div className="space-y-4">
                <BatchDownloadBar
                  selectedIds={selectedFileIds}
                  allFiles={files}
                  currentFilteredFiles={currentFilteredFiles}
                  onSelectToggle={(id) => {
                    setSelectedFileIds(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );
                  }}
                  onClearSelection={() => setSelectedFileIds([])}
                  onSelectAll={(ids) => setSelectedFileIds(ids)}
                />
                
                {viewMode === 'grid' ? (
                  /* GRID VIEW */
                  <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:pb-0 sm:snap-none sm:grid-cols-2 sm:gap-6">
                    {currentFilteredFiles.map((file) => (
                      <div key={file.id} className="min-w-[290px] w-[88vw] sm:w-auto sm:min-w-0 snap-center shrink-0">
                        <FileCard
                          file={file}
                          user={user}
                          onDownload={onDownload}
                          onPreview={onPreview}
                          onDelete={onFileDelete}
                          isSelected={selectedFileIds.includes(file.id)}
                          onSelectToggle={(id) => {
                            setSelectedFileIds(prev =>
                              prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                            );
                          }}
                          onViewTeacherDetails={onViewTeacherDetails}
                          allFiles={files}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* LIST VIEW (GORGEOUS TABULAR LIST LAYOUT) */
                  <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-800 shadow-xs transition-colors">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-slate-850/30 text-gray-400 uppercase font-extrabold text-[9px] tracking-wider border-b border-gray-100 dark:border-slate-800">
                          <th className="py-3 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={selectedFileIds.length > 0 && selectedFileIds.length === currentFilteredFiles.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFileIds(currentFilteredFiles.map(f => f.id));
                                } else {
                                  setSelectedFileIds([]);
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-[#15803d] dark:text-[#22c55e] focus:ring-[#15803d] cursor-pointer accent-[#15803d]"
                            />
                          </th>
                          <th className="py-3 px-4">{t("Document")}</th>
                          <th className="py-3 px-4">{t("Department/Subject")}</th>
                          <th className="py-3 px-4">{t("Chapter & Topic")}</th>
                          <th className="py-3 px-4 text-center">{t("Size")}</th>
                          <th className="py-3 px-4 text-center">{t("Status")}</th>
                          <th className="py-3 px-4 text-center">{t("Downloads")}</th>
                          <th className="py-3 px-4 text-right pr-6">{t("Actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-gray-300">
                        {currentFilteredFiles.map((file) => {
                          const isDocApproved = file.isApproved;
                          
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
                                  <div className="max-w-[200px] sm:max-w-[250px] truncate">
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
                                {isDocApproved ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-955/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                    {t("Approved")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/20">
                                    {t("Pending")}
                                  </span>
                                )}
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
                                  {file.uploadedBy === user.uid && (
                                    <button
                                      onClick={() => onFileDelete(file.id)}
                                      className="p-1.5 bg-red-50 dark:bg-red-955/20 hover:bg-red-100 dark:hover:bg-red-955/40 text-red-650 dark:text-red-400 rounded border border-red-105 dark:border-red-900/30 cursor-pointer"
                                      title={t("Delete")}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reasons Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" id="rejection-reasons-modal">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl px-6 py-6 border border-gray-150 dark:border-slate-800 shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-base text-gray-805 dark:text-gray-105 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-505" />
                <span>{t("File Rejection Audit Records")}</span>
              </h3>
              <button
                onClick={() => setShowRejectionModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none p-1 bg-gray-50 dark:bg-slate-850 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingRejections ? (
                <div className="text-center py-12 text-xs font-semibold text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                  <span>{t("Scanning server archives...")}</span>
                </div>
              ) : rejectionLogs.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-550 font-semibold space-y-2">
                  <div className="inline-flex p-3 bg-green-50 dark:bg-green-955/20 text-green-600 dark:text-green-400 rounded-full">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p>{t("Amazing! You do not have any rejected submissions.")}</p>
                </div>
              ) : (
                rejectionLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 bg-gray-50 dark:bg-slate-850 border border-gray-150 dark:border-slate-800 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                      <div>
                        <h4 className="font-bold text-xs text-gray-850 dark:text-gray-100 truncate max-w-[320px]">{log.fileName}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          <span>{t(log.fileSubject)}</span>
                          <span>•</span>
                          <span>{t(log.fileBranch)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-2.5 py-1 rounded-md max-w-fit shadow-2xs">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{log.createdAt ? log.createdAt.toLocaleDateString() : "Just now"}</span>
                      </div>
                    </div>

                    <div className="bg-red-50/50 dark:bg-red-955/10 border-l-4 border-red-500 p-3 rounded-r-lg space-y-1">
                      <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span>{t("Reason for Rejection")}</span>
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-305 font-semibold whitespace-pre-wrap leading-relaxed">
                        {log.rejectionReason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <span>{t("Rejected by:")} <strong className="text-gray-600 dark:text-gray-300">{log.actorName}</strong> ({t(log.actorRole)})</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider border border-transparent dark:border-slate-700"
              >
                {t("Dismiss")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}