import React, { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, FileArchive } from '../types';
import { Upload, CheckCircle2, AlertCircle, Sparkles, FolderLock, Globe, BookOpen, Layers, ChevronDown, Loader2 } from 'lucide-react';
import FileCard from './FileCard';
import { useThemeLanguage } from './ThemeLanguageContext';
import { useBranchSubject } from './BranchSubjectContext';

interface DashboardTeacherProps {
  user: UserProfile;
  files: FileArchive[];
  onUploadSuccess: () => void;
  onFileDelete: (fileId: string) => void;
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
}

export default function DashboardTeacher({
  user,
  files,
  onUploadSuccess,
  onFileDelete,
  onDownload,
  onPreview
}: DashboardTeacherProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Filter files
  // 1. My archive (all files uploaded by me)
  const myUploadedFiles = files.filter(f => f.uploadedBy === user.uid);

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
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const { t } = useThemeLanguage();

  // Allowed file extensions
  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB SLA Limit

  const teacherSubjects = user.subjects || (user.subject ? [user.subject] : []);

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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError('');
    setUploadSuccess('');

    // Suffix check
    const parts = file.name.split('.');
    const ext = parts[parts.length - 1].toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(t("Invalid file extension. Only PDF, DOC/DOCX, PPT/PPTX and images are allowed."));
      setSelectedFile(null);
      return;
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(t("File exceeds SLA limit of 10MB (Contract Clause 11.2). Please compress your resource file."));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError(t("Please choose or drag-and-drop a file archive first."));
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

    try {
      const parts = selectedFile.name.split('.');
      const fileType = parts[parts.length - 1].toLowerCase();

      // Hybrid Upload: Attempt Cloudflare R2 Upload; Fallback to default Firebase Storage on credentials error
      let downloadUrl = '';
      let fileRefPath = '';

      try {
        const r2Response = await fetch('/api/r2/presigned-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, fileType: selectedFile.type }),
        });

        if (r2Response.ok) {
          const r2Data = await r2Response.json();
          // Upload direct byte content to Cloudflare R2 storage using presigned upload PUT URL
          const uploadRes = await fetch(r2Data.uploadUrl, {
            method: 'PUT',
            body: selectedFile,
            headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
          });

          if (!uploadRes.ok) {
            throw new Error(`R2 direct PUT upload raw fetch failed: ${uploadRes.status}`);
          }

          downloadUrl = r2Data.fileUrl;
          fileRefPath = r2Data.storagePath;
          console.log('Secure Direct R2 upload pipeline complete:', fileRefPath);
        } else {
          // If server reports unconfigured, fallback automatically
          console.warn('S3 R2 Storage is unconfigured. Defaulting back to client-driven Firebase Storage routing.');
          const fileRefPathFallback = `files/${user.uid}_${Date.now()}_${selectedFile.name}`;
          const storageRef = ref(storage, fileRefPathFallback);
          const uploadSnapshot = await uploadBytes(storageRef, selectedFile);
          downloadUrl = await getDownloadURL(uploadSnapshot.ref);
          fileRefPath = fileRefPathFallback;
        }
      } catch (r2Err: any) {
        console.warn('Cloudflare R2 Direct Upload bypassed because of network/setup error, triggering Firebase Storage fallback: ', r2Err);
        const fileRefPathFallback = `files/${user.uid}_${Date.now()}_${selectedFile.name}`;
        const storageRef = ref(storage, fileRefPathFallback);
        const uploadSnapshot = await uploadBytes(storageRef, selectedFile);
        downloadUrl = await getDownloadURL(uploadSnapshot.ref);
        fileRefPath = fileRefPathFallback;
      }

      // 2. Draft target database payload
      const payload: any = {
        fileName: selectedFile.name,
        fileType,
        fileSize: selectedFile.size,
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
        isApproved: false, // Must be approved by Branch Admin or Master Admin
        downloadCount: 0,
        createdAt: serverTimestamp(),
      };

      // Record file metadata document in Firestore files collection
      const docRef = await addDoc(collection(db, 'files'), payload);

      // Record activity log dynamically
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

      setUploadSuccess(t("Upload successful! Awaiting admin approval."));
      setSelectedFile(null);
      setDescription('');
      
      // Reset hierarchical options
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
    } catch (err: any) {
      console.error("Firebase Storage Upload Error Cascade: ", err);
      const exactMsg = err?.message || String(err);
      setUploadError(exactMsg.includes("permissions") 
        ? t("Missing or insufficient Firestore database permissions. Try logging out and back in to refresh your teacher credentials.") 
        : t("Failed to upload file: ") + exactMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" id="teacher-dashboard">
      {/* Subject Header Banner */}
      <div className="relative overflow-hidden bg-[#15803d] p-6 sm:p-8 rounded-2xl text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <FolderLock className="w-3.5 h-3.5" />
              <span>{t("Sristy Academic Archive Portal")}</span>
            </span>
          </div>
          <h2 className="text-xl font-bold font-display leading-tight">{user.fullName}</h2>
          <p className="text-xs text-brand-100/90 font-medium tracking-wide mt-1">
            {t("Teaching Department")}: <span className="underline decoration-white/30 decoration-2 font-bold">{t(user.subject || 'General Science')}</span>
          </p>
        </div>

        <div className="bg-white/10 px-4 py-3 rounded-lg backdrop-blur-xs border border-white/10 text-left min-w-[150px]">
          <p className="text-[10px] text-brand-100 uppercase tracking-widest font-bold">{t("My Submissions")}</p>
          <p className="text-base font-bold font-display">{myUploadedFiles.length} {t("Archives uploaded")}</p>
        </div>
      </div>

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
            <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-950/25 text-blue-700 dark:text-blue-400 rounded-lg text-xs leading-relaxed font-semibold border border-blue-105/30 animate-pulse">
              <Loader2 className="w-4 h-4 shrink-0 text-blue-500 animate-spin" />
              <span>{t("Securely transferring file archive to Cloudflare R2 pipeline...")}</span>
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
                    : selectedFile 
                      ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-955/10 cursor-pointer' 
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
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`p-3 rounded-full ${selectedFile ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-brand-50 dark:bg-slate-800 text-brand-500'}`}>
                  <Upload className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 break-all">{selectedFile.name}</p>
                    <p className="text-[10px] text-emerald-605 dark:text-emerald-400 font-medium tracking-wide mt-1">
                      {t("Ready to encode")}: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
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

            {/* Hierarchical metadata steps */}
            <div className="space-y-3.5 border-t border-b border-gray-105/70 dark:border-slate-800 py-3.5">
              {/* 1. Subject */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                    {t("Subject")}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setIsNewSubjectForm(!isNewSubjectForm);
                      setSelectedSubject('');
                      setNewSubjectText('');
                    }}
                    className={`text-[10px] font-bold text-brand-500 hover:underline cursor-pointer ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {isNewSubjectForm ? t("Choose Existing") : t("+ Create New Subject")}
                  </button>
                </div>
                {isNewSubjectForm ? (
                  <input
                    type="text"
                    value={newSubjectText}
                    onChange={(e) => setNewSubjectText(e.target.value)}
                    placeholder={t("e.g. Bangla 1st")}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                    disabled={loading}
                  />
                ) : (
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
                placeholder={t("Briefly state target topics, chapters, and summary of the archive...")}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-805 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFile}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                (selectedFile && !loading)
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
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1 font-mono">{t("My Submissions")}</span>
              <span className="text-[10px] bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 px-2.5 py-0.5 rounded-full font-bold select-none capitalize">
                {t(user.subject)} {t("Department")}
              </span>
            </div>

            {myUploadedFiles.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-gray-100 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-gray-500">
                {t("No files found. Clean start!")}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {myUploadedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    user={user}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onDelete={onFileDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
