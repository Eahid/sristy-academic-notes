import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { collection, getDocs, doc, setDoc, query, where, updateDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { db, createSecondaryUser } from '../firebase';
import { UserProfile, FileArchive } from '../types';
import { useBranchSubject } from './BranchSubjectContext';
import { 
  Building, 
  Users, 
  PlusCircle, 
  ToggleLeft, 
  ToggleRight, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  FileText,
  Trash2,
  RotateCcw,
  ShieldAlert,
  FolderTree,
  ChevronDown,
  ChevronRight,
  History,
  Search,
  Clock,
  X,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import FileCard from './FileCard';
import BatchDownloadBar from './BatchDownloadBar';
import { useThemeLanguage } from './ThemeLanguageContext';
import { CLASS_LEVELS } from '../constants';

interface DashboardAdminProps {
  user: UserProfile;
  files: FileArchive[];
  deletedFiles: FileArchive[];
  onFileApprove: (fileId: string) => void;
  onFileReject: (fileId: string) => void;
  onFileDelete: (fileId: string, bypassConfirm?: boolean) => void;
  onFileRestore: (fileId: string) => void;
  onFileHardDelete: (fileId: string) => void;
  onEmptyTrash?: (fileIds?: string[]) => void;
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
  onViewTeacherDetails?: (teacherUid: string) => void;
}

export default function DashboardAdmin({
  user,
  files,
  deletedFiles,
  onFileApprove,
  onFileReject,
  onFileDelete,
  onFileRestore,
  onFileHardDelete,
  onEmptyTrash,
  onDownload,
  onPreview,
  onViewTeacherDetails
}: DashboardAdminProps) {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [teachersList, setTeachersList] = useState<UserProfile[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // See everyone's file toggle state
  const [seeEveryoneFiles, setSeeEveryoneFiles] = useState(user.role === 'file_approver');

  // Form states to create branch members (teachers/viewers)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [memberRole, setNewMemberRole] = useState<'teacher' | 'viewer'>('teacher');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Dynamic Subject & Class assignments
  const [assignments, setAssignments] = useState<{ subject: string; classLevel: string }[]>([]);
  const [currentSelSubject, setCurrentSelSubject] = useState('');
  const [currentSelClass, setCurrentSelClass] = useState('');

  // Filters for teachers directory search
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherFilterSubject, setTeacherFilterSubject] = useState('');
  const [teacherFilterClass, setTeacherFilterClass] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Password resets
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'teachers' | 'files' | 'trash_bin' | 'curriculum' | 'activity_logs'>(
    user.role === 'file_approver' ? 'files' : 'teachers'
  );
  const { t } = useThemeLanguage();
  const { subjects } = useBranchSubject();

  // Load teachers of this branch
  const fetchBranchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('branch', '==', user.branch)
      );
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        // Since we query by branch, it includes admins and teachers. Filter master admins
        if (d.role !== 'master_admin' && d.uid !== user.uid) {
          list.push({
            uid: doc.id,
            username: d.username,
            fullName: d.fullName,
            email: d.email,
            role: d.role,
            branch: d.branch,
            subject: d.subject,
            subjects: d.subjects,
            status: d.status || 'active',
            profilePic: d.profilePic,
            bio: d.bio,
            createdAt: d.createdAt?.toDate(),
          });
        }
      });
      setTeachersList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    fetchBranchTeachers();
  }, [user.branch]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim() || !newEmail.trim()) {
      setFormError(t("Please fill in all mandatory field parameters."));
      return;
    }

    if (memberRole === 'teacher' && assignments.length === 0) {
      setFormError(t("Teachers must specify at least one Subject and Class mapping."));
      return;
    }

    setFormError('');
    setFormSuccess('');

    try {
      const lowerUsername = newUsername.trim().toLowerCase();
      // Username collision check
      const q = query(collection(db, 'users'), where('username', '==', lowerUsername));
      const testSnap = await getDocs(q);
      if (!testSnap.empty) {
        setFormError(t("Account registration error: Username is already reserved."));
        return;
      }

      // 1. Register user dynamically in standard Firebase Auth first
      const authUid = await createSecondaryUser(newEmail.trim(), newPassword.trim());

      // 2. Setup the profile mapping in Firestore under this UID
      const payload: any = {
        uid: authUid,
        username: lowerUsername,
        password: newPassword.trim(), // Stored for portal references
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        role: memberRole,
        branch: user.branch, // Hardcoded to this Admin's branch
        status: 'active',
        createdAt: serverTimestamp(),
      };

      if (memberRole === 'teacher') {
        payload.classAssignments = assignments;
        payload.subjects = Array.from(new Set(assignments.map(a => a.subject)));
        payload.classes = Array.from(new Set(assignments.map(a => a.classLevel)));
        payload.subject = assignments[0]?.subject || '';
      }

      await setDoc(doc(db, 'users', authUid), payload);

      setFormSuccess(t("Profile created beautifully! Logging you into the archive system..."));
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewEmail('');
      setSelectedSubjects([]);
      setAssignments([]);
      
      fetchBranchTeachers();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setFormError(t("Registration failed: Email address is already registered to another account."));
      } else if (err.code === 'auth/weak-password') {
        setFormError(t("Registration failed: Password should be at least 6 characters long."));
      } else {
        setFormError(t("Failed to register user. Ensure details are correct and try again."));
      }
    }
  };

  const handleResetPassword = async (targetUid: string) => {
    if (!newPasswordVal.trim()) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        password: newPasswordVal.trim()
      });
      alert(t("Password has been successfully updated."));
      setResettingUid(null);
      setNewPasswordVal('');
    } catch (err) {
      console.error(err);
      alert(t("Failed to reset account credentials."));
    }
  };

  const handleToggleStatus = async (targetUid: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        status: nextStatus
      });
      fetchBranchTeachers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFiles = seeEveryoneFiles
    ? files
    : files.filter(f => f.branch === user.branch);

  const pendingFiles = filteredFiles.filter(f => !f.isApproved && !f.isDeleted);

  const filteredDeletedFiles = seeEveryoneFiles
    ? deletedFiles
    : deletedFiles.filter(f => f.branch === user.branch);

  const [fileFilter, setFileFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  // Admin dedicated search/filter states for Storage archives
  const [adminSearch, setAdminSearch] = useState('');
  const [adminTeacher, setAdminTeacher] = useState('');
  const [adminFileType, setAdminFileType] = useState('');
  const [adminStartDate, setAdminStartDate] = useState('');
  const [adminEndDate, setAdminEndDate] = useState('');
  const [adminSortBy, setAdminSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'>('date_desc');

  useEffect(() => {
    if (pendingFiles.length > 0) {
      setFileFilter('pending');
    } else {
      setFileFilter('all');
    }
  }, [files, seeEveryoneFiles]);

  const displayFiles = (() => {
    // 1. Initial base filter by approval status and deletion status
    let list = fileFilter === 'pending'
      ? filteredFiles.filter(f => !f.isApproved && !f.isDeleted)
      : fileFilter === 'approved'
        ? filteredFiles.filter(f => f.isApproved && !f.isDeleted)
        : filteredFiles.filter(f => !f.isDeleted);

    // 2. Search query (file name, topic, description, chapter)
    if (adminSearch.trim() !== '') {
      const queryStr = adminSearch.toLowerCase();
      list = list.filter(f => 
        (f.fileName || '').toLowerCase().includes(queryStr) ||
        (f.topic || '').toLowerCase().includes(queryStr) ||
        (f.chapter || '').toLowerCase().includes(queryStr) ||
        (f.description || '').toLowerCase().includes(queryStr)
      );
    }

    // 3. Teacher name filter
    if (adminTeacher.trim() !== '') {
      const teacherStr = adminTeacher.toLowerCase();
      list = list.filter(f => 
        (f.uploaderName || '').toLowerCase().includes(teacherStr)
      );
    }

    // 4. File Type filter
    if (adminFileType !== '') {
      const type = adminFileType;
      list = list.filter(f => {
        const ext = (f.fileType || '').toLowerCase();
        if (type === 'pdf') return ext === 'pdf';
        if (type === 'doc') return ['doc', 'docx'].includes(ext);
        if (type === 'ppt') return ['ppt', 'pptx'].includes(ext);
        if (type === 'image') return ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
        return true;
      });
    }

    // 5. Date Range filter
    if (adminStartDate !== '') {
      const start = new Date(adminStartDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(f => {
        const fDate = f.createdAt?.toDate ? f.createdAt.toDate() : (f.createdAt ? new Date(f.createdAt) : null);
        return fDate && fDate >= start;
      });
    }

    if (adminEndDate !== '') {
      const end = new Date(adminEndDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(f => {
        const fDate = f.createdAt?.toDate ? f.createdAt.toDate() : (f.createdAt ? new Date(f.createdAt) : null);
        return fDate && fDate <= end;
      });
    }

    // Apply sorting selection
    if (adminSortBy === 'date_desc') {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (adminSortBy === 'date_asc') {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else if (adminSortBy === 'name_asc') {
      list.sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''));
    } else if (adminSortBy === 'name_desc') {
      list.sort((a, b) => (b.fileName || '').localeCompare(a.fileName || ''));
    } else if (adminSortBy === 'size_desc') {
      list.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
    } else if (adminSortBy === 'size_asc') {
      list.sort((a, b) => (a.fileSize || 0) - (b.fileSize || 0));
    }

    return list;
  })();

  // Activity logs state for Branch Admin
  const [logsList, setLogsList] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');

  useEffect(() => {
    setLoadingLogs(true);
    const qLogs = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qLogs, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          ...d,
          createdAt: d.createdAt ? d.createdAt.toDate() : new Date()
        });
      });
      setLogsList(list);
      setLoadingLogs(false);
    }, (err) => {
      console.warn("Failed to listen to Activity Logs stream in Admin:", err);
      setLoadingLogs(false);
    });

    return () => unsub();
  }, []);

  // Curriculum management states and helper handlers
  const [expandedSubjects, setExpandedSubjects] = useState<{ [sub: string]: boolean }>({});
  const [expandedChapters, setExpandedChapters] = useState<{ [key: string]: boolean }>({});

  const toggleSubject = (sub: string) => {
    setExpandedSubjects(prev => ({ ...prev, [sub]: !prev[sub] }));
  };

  const toggleChapter = (sub: string, ch: string) => {
    const key = `${sub}-${ch}`;
    setExpandedChapters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteTopic = async (subject: string, chapter: string, topic: string, notes: FileArchive[]) => {
    const count = notes.length;
    if (count === 0) {
      alert(t("This topic does not have any files."));
      return;
    }
    const confirmMsg = t("Are you sure you want to delete the topic '{{topic}}' under '{{chapter}}'? This will move all {{count}} notes/files in this topic to the Recycle Bin.")
      .replace('{{topic}}', topic)
      .replace('{{chapter}}', chapter)
      .replace('{{count}}', String(count));
    
    if (!window.confirm(confirmMsg)) return;

    // Loop and delete all associated notes without double confirmation
    for (const note of notes) {
      onFileDelete(note.id, true);
    }
    alert(t("Topic batch deletion initiated. Files moved to Recycle Bin."));
  };

  const handleDeleteChapter = async (subject: string, chapterName: string, chapterData: any) => {
    // Collect all notes in all topics under this chapter
    const notes: FileArchive[] = [];
    Object.values(chapterData.topics).forEach((top: any) => {
      notes.push(...top.notes);
    });

    const count = notes.length;
    if (count === 0) {
      alert(t("This chapter does not have any files."));
      return;
    }
    
    const confirmMsg = t("CRITICAL ACTION: Are you sure you want to delete the entire chapter '{{chapter}}' in subject '{{subject}}'? This will move all {{count}} notes & lectures inside all its topics to the Recycle Bin.")
      .replace('{{chapter}}', chapterName)
      .replace('{{subject}}', subject)
      .replace('{{count}}', String(count));

    if (!window.confirm(confirmMsg)) return;

    for (const note of notes) {
      onFileDelete(note.id, true);
    }
    alert(t("Chapter batch deletion initiated. Files moved to Recycle Bin."));
  };

  // Build curriculum tree from active branch files
  const activeCurriculumFiles = filteredFiles.filter(f => !f.isDeleted);

  interface SubjectNode {
    name: string;
    chapters: {
      [ch: string]: {
        name: string;
        topics: {
          [top: string]: {
            name: string;
            notes: FileArchive[];
          };
        };
      };
    };
  }

  const subjectsTree = subjects.reduce((acc, sub) => {
    acc[sub] = { name: sub, chapters: {} };
    return acc;
  }, {} as { [sub: string]: SubjectNode });

  activeCurriculumFiles.forEach(file => {
    const sub = file.subject || 'Other';
    const ch = file.chapter || 'Introduction';
    const top = file.topic || 'General Overview';

    if (!subjectsTree[sub]) {
      subjectsTree[sub] = { name: sub, chapters: {} };
    }
    if (!subjectsTree[sub].chapters[ch]) {
      subjectsTree[sub].chapters[ch] = { name: ch, topics: {} };
    }
    if (!subjectsTree[sub].chapters[ch].topics[top]) {
      subjectsTree[sub].chapters[ch].topics[top] = { name: top, notes: [] };
    }
    subjectsTree[sub].chapters[ch].topics[top].notes.push(file);
  });

  const filteredTeachers = teachersList.filter((tea) => {
    // Search query filter
    if (teacherSearchQuery) {
      const q = teacherSearchQuery.toLowerCase();
      const matchesName = tea.fullName.toLowerCase().includes(q);
      const matchesUser = tea.username.toLowerCase().includes(q);
      if (!matchesName && !matchesUser) return false;
    }

    // Subject specialty filter
    if (teacherFilterSubject) {
      const hasSubject = tea.subjects?.includes(teacherFilterSubject) || tea.subject === teacherFilterSubject || 
        (tea.classAssignments && tea.classAssignments.some(asg => asg.subject === teacherFilterSubject));
      if (!hasSubject) return false;
    }

    // Class levels filter
    if (teacherFilterClass) {
      const hasClass = tea.classes?.includes(teacherFilterClass) || 
        (tea.classAssignments && tea.classAssignments.some(asg => asg.classLevel === teacherFilterClass));
      if (!hasClass) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8" id="branch-admin-dashboard">
      {/* Brand Header */}
      <div className="relative overflow-hidden bg-[#15803d] p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              <span>{user.role === 'file_approver' ? t("File Approver Workspace") : t("Branch Administrator Panel")}</span>
            </span>
          </div>
          <h2 className="text-xl font-bold font-display leading-tight">{user.fullName}</h2>
          <p className="text-xs text-brand-100/90 font-medium tracking-wide mt-1">
            {t("Governing Body")}: <span className="underline decoration-white/30 decoration-2">{t(user.branch)}</span>
          </p>
        </div>

        {/* View Selection Toggle */}
        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-xs border border-white/10 flex items-center gap-4">
          <div className="text-left">
            <p className="text-[10px] text-brand-100 uppercase tracking-widest font-bold">{t("Global Archive Visibility")}</p>
            <p className="text-xs font-medium text-white/90">
              {seeEveryoneFiles ? t("Currently Browsing: EVERYONE") : t("Currently Browsing: BRANCH ARCHIVE")}
            </p>
          </div>
          <button 
            onClick={() => setSeeEveryoneFiles(!seeEveryoneFiles)}
            className="text-white hover:text-brand-100 transition-colors focus:outline-none cursor-pointer"
            title="Toggle directory files scope"
          >
            {seeEveryoneFiles ? (
              <ToggleRight className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-white/40" />
            )}
          </button>
        </div>
      </div>

      {pendingFiles.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-amber-500 p-5 rounded-r-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
          id="pending-notification-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {t("New Submissions Waiting for Verification")}
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-1 leading-normal">
                {t("There are currently {{count}} teacher study materials uploaded and waiting to be verified. Please review and approve or reject them to authorize public or student access.")
                  .replace('{{count}}', String(pendingFiles.length))}
              </p>
            </div>
          </div>
          {activeTab !== 'files' && (
            <button
              onClick={() => setActiveTab('files')}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-sm shrink-0 uppercase tracking-wider cursor-pointer mt-1 sm:mt-0"
            >
              {t("Review Now")}
            </button>
          )}
        </motion.div>
      )}

      {/* Bento Grid Section Navigation */}
      {user.role !== 'file_approver' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8" id="admin-bento-menu">
          {/* Section Teachers Option */}
          <button
            onClick={() => setActiveTab('teachers')}
            className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
              activeTab === 'teachers'
                ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all duration-300 ${
              activeTab === 'teachers'
                ? 'bg-[#15803d] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[10px] tracking-wider uppercase leading-tight ${
                activeTab === 'teachers' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
              }`}>{t("Directory")}</p>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-150 mt-1.5 leading-snug">{t("Teachers & Students")}</h4>
            </div>
          </button>

          {/* Verify Submissions Option */}
          <button
            onClick={() => setActiveTab('files')}
            className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
              activeTab === 'files'
                ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all duration-300 relative ${
              activeTab === 'files'
                ? 'bg-[#15803d]'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
            }`}>
              <FileText className="w-5 h-5 text-white" />
              {pendingFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white dark:border-slate-900 animate-pulse">
                  {pendingFiles.length}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[10px] tracking-wider uppercase leading-tight ${
                activeTab === 'files' ? 'text-[#15803d]' : 'text-gray-500'
              }`}>{t("Approval")}</p>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-150 mt-1.5 leading-snug">
                {t("Verify Submissions")} {pendingFiles.length > 0 && `(${pendingFiles.length})`}
              </h4>
            </div>
          </button>

          {/* Curriculum Manager Option */}
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
              activeTab === 'curriculum'
                ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all duration-300 relative ${
              activeTab === 'curriculum'
                ? 'bg-[#15803d] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
            }`}>
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[10px] tracking-wider uppercase leading-tight ${
                activeTab === 'curriculum' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
              }`}>{t("Curriculum")}</p>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-150 mt-1.5 leading-snug">
                {t("Subject Curriculum")}
              </h4>
            </div>
          </button>

          {/* Recycle Bin Option */}
          <button
            onClick={() => setActiveTab('trash_bin')}
            className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
              activeTab === 'trash_bin'
                ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all duration-300 relative ${
              activeTab === 'trash_bin'
                ? 'bg-[#15803d] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
            }`}>
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[10px] tracking-wider uppercase leading-tight ${
                activeTab === 'trash_bin' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
              }`}>{t("Recycle")}</p>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-150 mt-1.5 leading-snug">
                {t("Recycle Bin")}
              </h4>
            </div>
          </button>

          {/* System Activity Logs Option */}
          <button
            onClick={() => setActiveTab('activity_logs')}
            className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4 ${
              activeTab === 'activity_logs'
                ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
            }`}
          >
            <div className={`p-3 rounded-xl transition-all duration-300 relative ${
              activeTab === 'activity_logs'
                ? 'bg-[#15803d] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
            }`}>
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[10px] tracking-wider uppercase leading-tight ${
                activeTab === 'activity_logs' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
              }`}>{t("Audit")}</p>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-150 mt-1.5 leading-snug">
                {t("Activity Logs")}
              </h4>
            </div>
          </button>
        </div>
      )}

      {/* bKash/Pathao Style Ultra-Elegant Bottom Tab Navigator for Mobile View */}
      {user.role !== 'file_approver' && ReactDOM.createPortal(
        <div className="sm:hidden fixed bottom-0 left-0 right-0 w-full z-[9999] bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 transition-colors" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-around items-center h-12">
            <button
              onClick={() => setActiveTab('teachers')}
              className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
            >
              <div className={`transition-all duration-300 ${
                activeTab === 'teachers' 
                  ? 'text-[#15803d]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${
                activeTab === 'teachers' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
              }`}>
                {t("Members")}
              </span>
              {activeTab === 'teachers' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
            >
              <div className={`transition-all duration-300 relative ${
                activeTab === 'files' 
                  ? 'text-[#15803d]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
              }`}>
                <FileText className="w-5 h-5" />
                {filteredFiles.length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#15803d] text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white dark:border-slate-900 animate-pulse">
                    {filteredFiles.length}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${
                activeTab === 'files' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
              }`}>
                {t("Verify")}
              </span>
              {activeTab === 'files' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('curriculum')}
              className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
            >
              <div className={`transition-all duration-300 ${
                activeTab === 'curriculum' 
                  ? 'text-[#15803d]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
              }`}>
                <FolderTree className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${
                activeTab === 'curriculum' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
              }`}>
                {t("Curriculum")}
              </span>
              {activeTab === 'curriculum' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('trash_bin')}
              className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
            >
              <div className={`transition-all duration-300 relative ${
                activeTab === 'trash_bin' 
                  ? 'text-[#15803d]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
              }`}>
                <Trash2 className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${
                activeTab === 'trash_bin' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
              }`}>
                {t("Trash")}
              </span>
              {activeTab === 'trash_bin' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('activity_logs')}
              className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
            >
              <div className={`transition-all duration-300 relative ${
                activeTab === 'activity_logs' 
                  ? 'text-[#15803d]' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
              }`}>
                <History className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${
                activeTab === 'activity_logs' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
              }`}>
                {t("Logs")}
              </span>
              {activeTab === 'activity_logs' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full" />
              )}
            </button>
          </div>
        </div>,
        document.body
      )}

      {activeTab === 'teachers' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Teacher/Viewer Comp */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-gray-100 dark:border-slate-800 self-start shadow-xs transition-colors">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4 uppercase">
              <PlusCircle className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-sm tracking-tight font-display">{t("Add Branch Member")}</h3>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setNewMemberRole('teacher')}
                  className={`py-1.5 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                    memberRole === 'teacher' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {t("TeacherGroup") || t("Teacher / Instructor")}
                </button>
                <button
                  type="button"
                  onClick={() => setNewMemberRole('viewer')}
                  className={`py-1.5 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                    memberRole === 'viewer' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {t("Viewer / Student")}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 font-sans">{t("Username / Identifier")}</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g., adil_physics"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5 font-sans">{t("Portal Key / Password")}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("Enter password...")}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5 font-sans">{t("Full Name")}</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g., Prof. Adil Hasan"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-1.5 font-sans">{t("Email Address") || "Email"}</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g., adil@sristyedu.com"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-medium"
                  required
                />
              </div>

              {memberRole === 'teacher' && (
                <div className="space-y-4 bg-indigo-50/20 dark:bg-indigo-950/5 p-3 sm:p-4 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10">
                  <span className="block text-[10px] font-extrabold text-[#15803d] dark:text-emerald-405 uppercase tracking-widest font-display mb-1">
                    {t("Branch > Teacher > Subject > Class Mapping")}
                  </span>
                  
                  {/* Quick Add Form */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t("Select Subject")}</label>
                      <select
                        value={currentSelSubject}
                        onChange={(e) => setCurrentSelSubject(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-750 text-[10px] font-bold rounded-lg focus:outline-none focus:border-brand-500 cursor-pointer text-gray-800 dark:text-gray-100"
                      >
                        <option value="">{t("-- Select Subject --")}</option>
                        {subjects.map((sub, idx) => (
                          <option key={idx} value={sub}>{t(sub)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t("Select Class")}</label>
                      <select
                        value={currentSelClass}
                        onChange={(e) => setCurrentSelClass(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-750 text-[10px] font-bold rounded-lg focus:outline-none focus:border-brand-500 cursor-pointer text-gray-800 dark:text-gray-100"
                      >
                        <option value="">{t("-- Select Class --")}</option>
                        {CLASS_LEVELS.map((cls, idx) => (
                          <option key={idx} value={cls}>{t(cls)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentSelSubject || !currentSelClass) {
                        alert(t("Please select both a Subject and Class to map."));
                        return;
                      }
                      const alreadyExists = assignments.some(
                        a => a.subject === currentSelSubject && a.classLevel === currentSelClass
                      );
                      if (alreadyExists) {
                        alert(t("This Subject and Class combination is already assigned."));
                        return;
                      }
                      setAssignments([...assignments, { subject: currentSelSubject, classLevel: currentSelClass }]);
                      // Reset dropdowns for better usability
                      setCurrentSelSubject('');
                      setCurrentSelClass('');
                    }}
                    className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-xxs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>+ {t("Add Subject-Class Mapping")}</span>
                  </button>

                  {/* Added mappings list */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {assignments.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-2 italic">
                        {t("No mappings added yet. Add at least one above.")}
                      </p>
                    ) : (
                      assignments.map((asg, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold">
                          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <span className="text-brand-600 dark:text-brand-400">{t(asg.subject)}</span>
                            <span className="text-gray-400">➔</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono">{t(asg.classLevel)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssignments(assignments.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-955/20 text-red-500 rounded-md transition-colors cursor-pointer"
                            title={t("Remove mapping")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs py-2.5 rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t("Create Account")}</span>
              </button>
            </form>
          </div>

          {/* Members Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col justify-between shadow-xs transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/10">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Active Branch Registrations")}</h3>
              <span className="bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-405 border border-brand-100 dark:border-brand-900/30 text-xs font-bold px-3 py-1 rounded-full select-none">
                {filteredTeachers.length} / {teachersList.length} {t("Users")}
              </span>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-4 bg-gray-50/30 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="relative">
                <input
                  type="text"
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  placeholder={t("Search by name...")}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>

              <div>
                <select
                  value={teacherFilterSubject}
                  onChange={(e) => setTeacherFilterSubject(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-805 dark:text-gray-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="">{t("All Subjects")}</option>
                  {subjects.map((sub, idx) => (
                    <option key={idx} value={sub}>{t(sub)}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={teacherFilterClass}
                  onChange={(e) => setTeacherFilterClass(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-805 dark:text-gray-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="">{t("All Classes")}</option>
                  {CLASS_LEVELS.map((cls, idx) => (
                    <option key={idx} value={cls}>{t(cls)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {loadingTeachers ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">{t("Loading...")}</div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">{t("No users found matching filter guidelines.")}</div>
              ) : (
                <div className="bg-white dark:bg-slate-900 transition-colors">
                  {/* Desktop view (Table layout) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse text-left">
                      <thead>
                         <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/20">
                          <th className="py-4 px-6">{t("Institutional Branch Member")}</th>
                          <th className="py-4 px-6">{t("Assigned Subject Specialty")}</th>
                          <th className="py-4 px-6">{t("Portal Key / Passwords")}</th>
                          <th className="py-4 px-6 text-right">{t("Status & Suspend Actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-105 dark:divide-slate-850 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {filteredTeachers.map((tea) => {
                          const isExpanded = expandedTeacherId === tea.uid;
                          const teacherFiles = files.filter(f => f.uploadedBy === tea.uid);
                          const teacherRejections = logsList.filter(log => log.action === 'file_rejected' && log.uploaderId === tea.uid);

                          return (
                            <React.Fragment key={tea.uid}>
                              <tr 
                                onClick={() => setExpandedTeacherId(isExpanded ? null : tea.uid)}
                                className="hover:bg-gray-50/40 dark:hover:bg-slate-800/10 transition-colors cursor-pointer select-none"
                              >
                                <td className="py-4.5 px-6">
                                  <div className="flex items-center gap-3">
                                    <ChevronRight className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500 font-bold' : ''}`} />
                                    <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 flex items-center justify-center text-brand-500 dark:text-brand-400 font-bold text-xs uppercase shrink-0" onClick={(e) => e.stopPropagation()}>
                                      {tea.profilePic ? (
                                        <img src={tea.profilePic} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                      ) : (
                                        tea.fullName.charAt(0)
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{tea.fullName}</p>
                                      <p className="text-[10px] text-gray-400 font-mono tracking-wide flex items-center gap-1.5 uppercase font-semibold">
                                        <span className={`w-1.5 h-1.5 rounded-full ${tea.role === 'teacher' ? 'bg-indigo-500 font-bold' : 'bg-gray-400'}`}></span>
                                        <span>{t(tea.role)}</span>
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4.5 px-6">
                                  {tea.role === 'teacher' ? (
                                    <div className="flex flex-col gap-1 max-w-[240px]">
                                      {tea.classAssignments && tea.classAssignments.length > 0 ? (
                                        tea.classAssignments.map((asg, aIdx) => (
                                          <div key={aIdx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 font-bold">
                                            <span>{t(asg.subject)}</span>
                                            <span className="text-gray-400 font-normal">➔</span>
                                            <span className="text-brand-600 dark:text-brand-400">{t(asg.classLevel)}</span>
                                          </div>
                                        ))
                                      ) : tea.subjects && tea.subjects.length > 0 ? (
                                        tea.subjects.map((s, sIdx) => (
                                          <span key={sIdx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                            <BookOpen className="w-2.5 h-2.5" />
                                            <span>{t(s)}</span>
                                          </span>
                                        ))
                                      ) : (
                                        <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                          <BookOpen className="w-3 h-3" />
                                          <span>{t(tea.subject || '')}</span>
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 dark:text-gray-550 font-semibold tracking-wider uppercase bg-gray-50 dark:bg-slate-800/10 border border-gray-100 dark:border-slate-800 px-2 py-0.5 rounded-full">
                                      {t("Student")}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4.5 px-6" onClick={(e) => e.stopPropagation()}>
                                  {resettingUid === tea.uid ? (
                                    <div className="flex items-center gap-1 max-w-[180px]">
                                      <input
                                        type="text"
                                        value={newPasswordVal}
                                        onChange={(e) => setNewPasswordVal(e.target.value)}
                                        placeholder={t("New password")}
                                        className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-808 default:text-gray-100 rounded-md focus:outline-none focus:border-brand-500 text-xxs w-full"
                                      />
                                      <button
                                        onClick={() => handleResetPassword(tea.uid)}
                                        className="bg-emerald-500 text-white rounded-md p-1.5 hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setResettingUid(tea.uid)}
                                      className="text-[10px] font-bold text-indigo-505 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Key className="w-3 h-3" />
                                      <span>{t("Change password")}</span>
                                    </button>
                                  )}
                                </td>
                                <td className="py-4.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleToggleStatus(tea.uid, tea.status)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                      tea.status === 'active'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100'
                                        : 'bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400 border-red-100 dark:border-red-900/30 hover:bg-red-100'
                                    }`}
                                  >
                                    {tea.status === 'active' ? t("Active") : t("Suspended")}
                                  </button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="bg-gray-50/45 dark:bg-slate-950/25 border-l-2 border-indigo-500">
                                  <td colSpan={4} className="p-5 sm:p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-gray-700 dark:text-gray-300">
                                      {/* Column 1: Account Information & Biography */}
                                      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-3xs space-y-3.5">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-2">
                                          <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-505" />
                                            <span className="font-extrabold text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">{t("Account Overview")}</span>
                                          </div>
                                          {onViewTeacherDetails && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onViewTeacherDetails(tea.uid);
                                              }}
                                              className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                            >
                                              <span>{t("Full Modal")}</span>
                                              <span>↗</span>
                                            </button>
                                          )}
                                        </div>
                                        
                                        <div className="space-y-2 text-[11px]">
                                          <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                            <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Portal Username")}</span>
                                            <span className="font-mono text-gray-800 dark:text-gray-200 font-bold">@{tea.username}</span>
                                          </div>
                                          <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                            <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Email Address")}</span>
                                            <span className="text-gray-800 dark:text-gray-200 font-bold truncate max-w-[160px]" title={tea.email}>{tea.email}</span>
                                          </div>
                                          <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                            <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Role Level")}</span>
                                            <span className="capitalize bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                              {t(tea.role)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                            <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Member Since")}</span>
                                            <span className="text-gray-800 dark:text-gray-200 font-mono font-bold">
                                              {tea.createdAt ? tea.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : t("N/A")}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Account Status")}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              tea.status === 'active' 
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                                                : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                                            }`}>
                                              {tea.status === 'active' ? t("Active") : t("Suspended")}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 dark:border-slate-800/40">
                                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Professional Bio")}</span>
                                          <p className="bg-gray-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg text-xxs text-gray-650 dark:text-gray-450 leading-relaxed italic border border-gray-100/40 dark:border-slate-800/20 whitespace-pre-wrap">
                                            {tea.bio || t("No professional bio written yet.")}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Column 2: Teacher Uploads & Stats */}
                                      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-3xs space-y-3.5">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-2">
                                          <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-emerald-500" />
                                            <span className="font-extrabold text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">{t("Study Material Uploads")}</span>
                                          </div>
                                          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400 text-xxs px-2 py-0.5 rounded-full font-bold">
                                            {teacherFiles.length} {t("Total")}
                                          </span>
                                        </div>

                                        {/* Counts metrics */}
                                        <div className="grid grid-cols-2 gap-2 text-center text-xxs font-bold">
                                          <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/35 p-2 rounded-lg">
                                            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-black">{teacherFiles.filter(f => f.isApproved).length}</p>
                                            <p className="text-gray-405 font-bold uppercase text-[9px] mt-0.5">{t("Approved")}</p>
                                          </div>
                                          <div className="bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/35 p-2 rounded-lg">
                                            <p className="text-amber-600 dark:text-amber-400 text-sm font-black">{teacherFiles.filter(f => !f.isApproved).length}</p>
                                            <p className="text-gray-405 font-bold uppercase text-[9px] mt-0.5">{t("Pending")}</p>
                                          </div>
                                        </div>

                                        <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                                          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Recent Activity")}</span>
                                          {teacherFiles.length === 0 ? (
                                            <p className="text-xxs text-gray-400 dark:text-gray-550 text-center py-6">{t("No upload archives recorded yet.")}</p>
                                          ) : (
                                            teacherFiles.slice(0, 3).map((f) => (
                                              <div key={f.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100/30 dark:border-slate-800/20 rounded-lg">
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-extrabold text-[11px] text-gray-800 dark:text-gray-100 truncate" title={f.fileName}>{f.fileName}</p>
                                                  <p className="text-[9px] text-gray-400 font-mono font-bold uppercase">{t(f.subject)} • {(f.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                                                </div>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 uppercase tracking-wider ${
                                                  f.isApproved 
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400' 
                                                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-605 dark:text-amber-400'
                                                }`}>
                                                  {f.isApproved ? t("Approved") : t("Pending")}
                                                </span>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>

                                      {/* Column 3: Document Rejection Audits */}
                                      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-3xs space-y-3.5">
                                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-2">
                                          <div className="flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-red-500" />
                                            <span className="font-extrabold text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">{t("Rejection Logs")}</span>
                                          </div>
                                          <span className="bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400 text-xxs px-2 py-0.5 rounded-full font-bold">
                                            {teacherRejections.length} {t("Total")}
                                          </span>
                                        </div>

                                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                          {teacherRejections.length === 0 ? (
                                            <div className="text-center py-10 text-xxs text-gray-400 dark:text-gray-550">
                                              <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mb-1">✓ {t("Excellent Standing")}</p>
                                              <p className="text-[10px] text-gray-450 font-medium">{t("No document rejections recorded for this account.")}</p>
                                            </div>
                                          ) : (
                                            teacherRejections.slice(0, 3).map((rej) => (
                                              <div key={rej.id} className="p-2.5 bg-red-50/10 dark:bg-red-955/5 border border-red-100/20 dark:border-red-900/10 rounded-lg space-y-1.5">
                                                <div className="flex items-start justify-between gap-1.5">
                                                  <p className="font-extrabold text-[10.5px] text-gray-800 dark:text-gray-100 truncate max-w-[130px]" title={rej.fileName}>{rej.fileName}</p>
                                                  <span className="text-[8px] text-gray-400 font-mono shrink-0 uppercase tracking-wide font-bold">
                                                    {rej.createdAt ? rej.createdAt.toLocaleDateString() : t("Just now")}
                                                  </span>
                                                </div>
                                                
                                                <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded border border-red-50/30 dark:border-red-955/15 text-[10px] text-red-700 dark:text-red-300 leading-normal font-medium whitespace-pre-wrap">
                                                  <span className="block text-[8px] font-extrabold uppercase text-red-500 tracking-wider mb-0.5">{t("Reason Specified")}:</span>
                                                  {rej.rejectionReason}
                                                </div>
                                                
                                                <p className="text-[8.5px] text-gray-400 text-right uppercase tracking-wider font-bold">
                                                  {t("Rejected By")}: <span className="text-gray-500 dark:text-gray-300 font-mono font-bold">{rej.actorName}</span>
                                                </p>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card stack layout */}
                  <div className="md:hidden divide-y divide-gray-105 dark:divide-slate-805/40">
                    {filteredTeachers.map((tea) => {
                      const isExpanded = expandedTeacherId === tea.uid;
                      const teacherFiles = files.filter(f => f.uploadedBy === tea.uid);
                      const teacherRejections = logsList.filter(log => log.action === 'file_rejected' && log.uploaderId === tea.uid);

                      return (
                        <div key={tea.uid} className="p-4 space-y-3.5">
                          <div 
                            onClick={() => setExpandedTeacherId(isExpanded ? null : tea.uid)}
                            className="flex items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 flex items-center justify-center text-brand-500 dark:text-brand-400 font-bold text-xs uppercase shrink-0" onClick={(e) => e.stopPropagation()}>
                                {tea.profilePic ? (
                                  <img src={tea.profilePic} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  tea.fullName.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 dark:text-gray-100 truncate text-xs">{tea.fullName}</p>
                                <p className="text-[10px] text-gray-400 font-mono tracking-wide flex items-center gap-1.5 uppercase font-semibold">
                                  <span className={`w-1.5 h-1.5 rounded-full ${tea.role === 'teacher' ? 'bg-indigo-500 font-bold' : 'bg-gray-400'}`}></span>
                                  <span>{t(tea.role)}</span>
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-550 shrink-0 transition-transform ${isExpanded ? 'rotate-180 text-indigo-500 font-bold' : ''}`} />
                          </div>

                          {/* Subject specialty info */}
                          <div className="text-xs">
                            <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t("Assigned Subject Specialty")}</span>
                            {tea.role === 'teacher' ? (
                              <div className="flex flex-col gap-1">
                                {tea.classAssignments && tea.classAssignments.length > 0 ? (
                                  tea.classAssignments.map((asg, aIdx) => (
                                    <div key={aIdx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 font-bold max-w-max">
                                      <span>{t(asg.subject)}</span>
                                      <span className="text-gray-400 font-normal">➔</span>
                                      <span className="text-brand-605 dark:text-brand-400">{t(asg.classLevel)}</span>
                                    </div>
                                  ))
                                ) : tea.subjects && tea.subjects.length > 0 ? (
                                  tea.subjects.map((s, sIdx) => (
                                    <span key={sIdx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 font-bold max-w-max">
                                      <BookOpen className="w-2.5 h-2.5" />
                                      <span>{t(s)}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 font-bold max-w-max">
                                    <BookOpen className="w-3 h-3" />
                                    <span>{t(tea.subject || '')}</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 dark:text-gray-550 font-bold tracking-wider uppercase bg-gray-50 dark:bg-slate-800/10 border border-gray-100 dark:border-slate-800 px-2 py-0.5 rounded-full">
                                {t("Student")}
                              </span>
                            )}
                          </div>

                          {/* Expanded detail section for Mobile */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-gray-100 dark:border-slate-800/60 space-y-4 text-xs animate-in fade-in duration-150">
                              {/* Account Info */}
                              <div className="bg-gray-50/50 dark:bg-slate-950/25 p-3.5 rounded-lg border border-gray-100/50 dark:border-slate-800/30 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-100/50 dark:border-slate-800/30 pb-1.5 mb-1.5">
                                  <p className="font-extrabold text-[10px] uppercase text-indigo-505 tracking-wider flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{t("Account Overview")}</span>
                                  </p>
                                  {onViewTeacherDetails && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onViewTeacherDetails(tea.uid);
                                      }}
                                      className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                    >
                                      <span>{t("Full Modal")}</span>
                                      <span>↗</span>
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-1.5 text-xxs">
                                  <p className="flex justify-between"><span className="text-gray-400">{t("Username")}:</span> <span className="font-bold font-mono">@{tea.username}</span></p>
                                  <p className="flex justify-between"><span className="text-gray-400">{t("Email Address")}:</span> <span className="font-bold truncate max-w-[150px]">{tea.email}</span></p>
                                  <p className="flex justify-between"><span className="text-gray-400">{t("Role Level")}:</span> <span className="font-bold capitalize">{t(tea.role)}</span></p>
                                  <p className="flex justify-between"><span className="text-gray-400">{t("Joined Since")}:</span> <span className="font-bold">{tea.createdAt ? tea.createdAt.toLocaleDateString() : t("N/A")}</span></p>
                                </div>
                                <div className="pt-2 border-t border-gray-100/50 dark:border-slate-800/40">
                                  <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Professional Bio")}</span>
                                  <p className="text-[10px] leading-relaxed italic text-gray-600 dark:text-gray-450 bg-white/80 dark:bg-slate-900/60 p-2 rounded whitespace-pre-wrap">
                                    {tea.bio || t("No professional bio written yet.")}
                                  </p>
                                </div>
                              </div>

                              {/* Uploads */}
                              <div className="bg-gray-50/50 dark:bg-slate-950/25 p-3.5 rounded-lg border border-gray-100/50 dark:border-slate-800/30 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <p className="font-extrabold text-[10px] uppercase text-emerald-505 tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{t("Study Material Uploads")}</span>
                                  </p>
                                  <span className="bg-emerald-50 dark:bg-emerald-955/25 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">
                                    {teacherFiles.length}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                                  <div className="bg-white/80 dark:bg-slate-900/60 p-1.5 rounded border border-emerald-100/20">
                                    <span className="block font-black text-emerald-600">{teacherFiles.filter(f => f.isApproved).length}</span>
                                    <span className="text-[8px] text-gray-405 uppercase tracking-wide font-bold">{t("Approved")}</span>
                                  </div>
                                  <div className="bg-white/80 dark:bg-slate-900/60 p-1.5 rounded border border-amber-100/20">
                                    <span className="block font-black text-amber-600">{teacherFiles.filter(f => !f.isApproved).length}</span>
                                    <span className="text-[8px] text-gray-405 uppercase tracking-wide font-bold">{t("Pending")}</span>
                                  </div>
                                </div>
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                                  {teacherFiles.length === 0 ? (
                                    <p className="text-xxs text-gray-400 text-center py-2">{t("No files uploaded yet.")}</p>
                                  ) : (
                                    teacherFiles.slice(0, 3).map(f => (
                                      <div key={f.id} className="flex justify-between items-center bg-white/80 dark:bg-slate-900/60 p-1.5 rounded text-[10px] border border-gray-100/30">
                                        <span className="truncate font-bold max-w-[140px]">{f.fileName}</span>
                                        <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                                          f.isApproved ? 'text-emerald-600 bg-emerald-50/50' : 'text-amber-600 bg-amber-50/50'
                                        }`}>{f.isApproved ? t("Approved") : t("Pending")}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Rejections */}
                              <div className="bg-gray-50/50 dark:bg-slate-950/25 p-3.5 rounded-lg border border-gray-100/50 dark:border-slate-800/30 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <p className="font-extrabold text-[10px] uppercase text-red-500 tracking-wider flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>{t("Rejection History")}</span>
                                  </p>
                                  <span className="bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400 text-[10px] px-2 py-0.5 rounded font-bold">
                                    {teacherRejections.length}
                                  </span>
                                </div>
                                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                                  {teacherRejections.length === 0 ? (
                                    <p className="text-xxs text-emerald-600 font-bold text-center py-2">✓ {t("Excellent Standing (No Rejections)")}</p>
                                  ) : (
                                    teacherRejections.slice(0, 3).map(rej => (
                                      <div key={rej.id} className="p-2 bg-white/80 dark:bg-slate-900/60 rounded border border-red-50 dark:border-slate-800 space-y-1">
                                        <div className="flex justify-between text-[9px] font-bold">
                                          <span className="truncate max-w-[130px]">{rej.fileName}</span>
                                          <span className="text-gray-400 font-mono font-medium">{rej.createdAt ? rej.createdAt.toLocaleDateString() : ''}</span>
                                        </div>
                                        <p className="text-[9px] text-red-700 dark:text-red-300 font-medium whitespace-pre-wrap"><span className="font-black text-red-500 text-[8px] uppercase">{t("Reason")}:</span> {rej.rejectionReason}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Password reset & Toggle status block */}
                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100/40 dark:border-slate-800/40">
                            {/* Portal Key */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {resettingUid === tea.uid ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={newPasswordVal}
                                    onChange={(e) => setNewPasswordVal(e.target.value)}
                                    placeholder={t("New password")}
                                    className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-808 default:text-gray-100 rounded-md focus:outline-none focus:border-brand-500 text-xxs w-24"
                                  />
                                  <button
                                    onClick={() => handleResetPassword(tea.uid)}
                                    className="bg-emerald-500 text-white rounded-md p-1.5 hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setResettingUid(tea.uid)}
                                  className="text-[10px] font-bold text-indigo-505 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Key className="w-3 h-3" />
                                  <span>{t("Change password")}</span>
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleStatus(tea.uid, tea.status)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  tea.status === 'active'
                                    ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-650 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100'
                                    : 'bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400 border-red-100 dark:border-red-900/30 hover:bg-red-100'
                                }`}
                              >
                                {tea.status === 'active' ? t("Active") : t("Suspended")}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        /* File oversight display */
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Oversight Admin Terminal")}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-505 mt-1">
                {t("Currently compiling note's of")}: <span className="underline decoration-brand-500 decoration-2 font-semibold text-gray-700 dark:text-gray-300">{seeEveryoneFiles ? t("Currently Browsing: EVERYONE") : t(user.branch)}</span>.
              </p>
            </div>

            {/* Verification Filters */}
            <div className="flex gap-1 bg-gray-50 dark:bg-slate-950 p-1 rounded-lg border border-gray-200/50 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setFileFilter('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  fileFilter === 'pending'
                    ? 'bg-[#15803d] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                }`}
              >
                {t("Pending")} ({filteredFiles.filter(f => !f.isApproved && !f.isDeleted).length})
              </button>
              <button
                onClick={() => setFileFilter('approved')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  fileFilter === 'approved'
                    ? 'bg-[#15803d] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                }`}
              >
                {t("Approved")} ({filteredFiles.filter(f => f.isApproved && !f.isDeleted).length})
              </button>
              <button
                onClick={() => setFileFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  fileFilter === 'all'
                    ? 'bg-[#15803d] text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                }`}
              >
                {t("All")}
              </button>
            </div>
          </div>

          {/* Dedicated Search and Filter Panel (Similar to Public Explorer) */}
          <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-150 dark:border-slate-800/80 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Search input (File Name, Topic, Chapter, etc.) */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-505">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder={t("Search name, topic, chapter...")}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-750 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                />
              </div>

              {/* Teacher Name filter */}
              <div className="relative">
                <input
                  type="text"
                  value={adminTeacher}
                  onChange={(e) => setAdminTeacher(e.target.value)}
                  placeholder={t("Filter by teacher name...")}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-750 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                />
              </div>

              {/* File Type filter */}
              <div className="relative">
                <select
                  value={adminFileType}
                  onChange={(e) => setAdminFileType(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-750 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#15803d] appearance-none cursor-pointer"
                >
                  <option value="">{t("All File Types")}</option>
                  <option value="pdf">PDF</option>
                  <option value="doc">DOC / DOCX</option>
                  <option value="ppt">PPT / PPTX</option>
                  <option value="image">{t("Images (PNG/JPG)")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-505">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-gray-400 font-bold shrink-0">{t("From")}:</span>
                <input
                  type="date"
                  value={adminStartDate}
                  onChange={(e) => setAdminStartDate(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-semibold text-gray-750 dark:text-gray-100 focus:outline-none focus:ring-0 cursor-pointer"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-gray-400 font-bold shrink-0">{t("To")}:</span>
                <input
                  type="date"
                  value={adminEndDate}
                  onChange={(e) => setAdminEndDate(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-semibold text-gray-750 dark:text-gray-100 focus:outline-none focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Sort Selection */}
              <div className="relative">
                <select
                  value={adminSortBy}
                  onChange={(e) => setAdminSortBy(e.target.value as any)}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[#15803d] dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-[#15803d] appearance-none cursor-pointer"
                >
                  <option value="date_desc">{t("Newest First")}</option>
                  <option value="date_asc">{t("Oldest First")}</option>
                  <option value="name_asc">{t("Name: A to Z")}</option>
                  <option value="name_desc">{t("Name: Z to A")}</option>
                  <option value="size_desc">{t("Size: Largest First")}</option>
                  <option value="size_asc">{t("Size: Smallest First")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-505">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Active Filters Summary & Reset */}
            {(adminSearch || adminTeacher || adminFileType || adminStartDate || adminEndDate || adminSortBy !== 'date_desc') && (
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800/60 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xxs font-bold text-gray-400 uppercase tracking-wider">{t("Active Filters")}:</span>
                  {adminSearch && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#15803d]/10 text-[#15803d] dark:text-emerald-400 text-xxs font-bold rounded-full animate-fade-in">
                      Query: {adminSearch}
                      <button onClick={() => setAdminSearch('')} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {adminTeacher && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#15803d]/10 text-[#15803d] dark:text-emerald-400 text-xxs font-bold rounded-full animate-fade-in">
                      Teacher: {adminTeacher}
                      <button onClick={() => setAdminTeacher('')} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {adminFileType && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#15803d]/10 text-[#15803d] dark:text-emerald-400 text-xxs font-bold rounded-full animate-fade-in">
                      Type: {adminFileType.toUpperCase()}
                      <button onClick={() => setAdminFileType('')} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {(adminStartDate || adminEndDate) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#15803d]/10 text-[#15803d] dark:text-emerald-400 text-xxs font-bold rounded-full animate-fade-in">
                      Date Range
                      <button onClick={() => { setAdminStartDate(''); setAdminEndDate(''); }} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {adminSortBy !== 'date_desc' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#15803d]/10 text-[#15803d] dark:text-emerald-400 text-xxs font-bold rounded-full animate-fade-in">
                      {t("Sorted")}
                      <button onClick={() => setAdminSortBy('date_desc')} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setAdminSearch('');
                    setAdminTeacher('');
                    setAdminFileType('');
                    setAdminStartDate('');
                    setAdminEndDate('');
                    setAdminSortBy('date_desc');
                  }}
                  className="inline-flex items-center gap-1 text-xxs font-bold text-red-500 hover:text-red-650 cursor-pointer dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                  {t("Clear All Filters")}
                </button>
              </div>
            )}
          </div>

          {displayFiles.length > 1 && (
            <div className="flex sm:hidden items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-450 mb-3.5 animate-pulse bg-amber-500/5 py-1 px-3 rounded-full border border-amber-500/10">
              <span className="font-semibold uppercase tracking-wider">Swipe horizontally</span>
              <span className="text-sm font-bold">↔</span>
              <span>to browse {displayFiles.length} submissions</span>
            </div>
          )}

          {displayFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-450 dark:text-gray-500 text-xs">
              {fileFilter === 'pending' ? t("Hurrah! No pending approvals found in Sristy vault.") : t("No files found. Clean start!")}
            </div>
          ) : (
            <div className="space-y-4">
              <BatchDownloadBar
                selectedIds={selectedFileIds}
                allFiles={files}
                currentFilteredFiles={displayFiles}
                onSelectToggle={(id) => {
                  setSelectedFileIds(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  );
                }}
                onClearSelection={() => setSelectedFileIds([])}
                onSelectAll={(ids) => setSelectedFileIds(ids)}
              />

              <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:pb-0 sm:snap-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
                {displayFiles.map((file) => (
                  <div key={file.id} className="min-w-[290px] w-[88vw] sm:w-auto sm:min-w-0 snap-center shrink-0">
                    <FileCard
                      file={file}
                      user={user}
                      onDownload={onDownload}
                      onPreview={onPreview}
                      onApprove={onFileApprove}
                      onReject={onFileReject}
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
            </div>
          )}
        </div>
      )}

      {activeTab === 'trash_bin' && (
        /* Recycle Bin display */
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-50 dark:bg-red-950/30 text-red-750 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t("Secure Trash Bin Module")}</span>
                </span>
              </div>
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Recycle Bin / 30-Day Recovery Slot")}</h3>
              <p className="text-xs text-gray-455 dark:text-gray-500 mt-1 leading-normal">
                {t("Branch Admin recover rules: You can restore any deleted file from your branch space within 30 days. Hard delete actions are managed by Super Admin.")}
              </p>
            </div>

            {filteredDeletedFiles.length > 0 && onEmptyTrash && (
              <button
                type="button"
                onClick={() => onEmptyTrash(filteredDeletedFiles.map(f => f.id))}
                className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer self-start md:self-center"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t("Empty Trash")}</span>
              </button>
            )}
          </div>          {filteredDeletedFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              {t("The branch recycling storage is empty. No files require attention!")}
            </div>
          ) : (
            <div className="border border-gray-105 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
              {/* Desktop view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/20">
                      <th className="py-4 px-6">{t("Deleted Resource Name")}</th>
                      <th className="py-4 px-6">{t("Assigned Subject Specialty")}</th>
                      <th className="py-4 px-6">{t("Deleter Information")}</th>
                      <th className="py-4 px-6 text-right">{t("Restore action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-105 dark:divide-slate-805 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {filteredDeletedFiles
                      .map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50/20 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-100">{file.fileName}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType.toUpperCase()}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="bg-gray-100 dark:bg-slate-805 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-md text-xxs font-semibold uppercase">{t(file.subject)}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-semibold text-gray-805 dark:text-gray-200">{file.deletedByName || t("Unknown Actor")}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                {file.deletedAt ? file.deletedAt.toLocaleString() : (file.createdAt ? file.createdAt.toLocaleString() : '')}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onFileRestore(file.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer animate-pulse"
                              >
                                <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                                <span>{t("Restore")}</span>
                              </button>
                              
                              <button
                                onClick={() => onFileHardDelete(file.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title={t("Permanently delete file and physical storage contents permanently.")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t("Delete Permanently")}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack layout */}
              <div className="md:hidden divide-y divide-gray-105 dark:divide-slate-805/40">
                {filteredDeletedFiles.map((file) => (
                  <div key={file.id} className="p-4 space-y-3 text-xs">
                    <div>
                      <h4 className="font-bold text-gray-808 dark:text-white break-all leading-tight text-xs">{file.fileName}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] font-extrabold uppercase tracking-wider">
                        <span className="bg-gray-105 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-xs">
                          {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType.toUpperCase()}
                        </span>
                        <span className="bg-brand-50/80 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded-xs">
                          {t(file.subject)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 bg-gray-50/50 dark:bg-slate-800/15 p-2.5 rounded-lg border border-gray-100/50 dark:border-slate-800/50 text-[10px]">
                      <div>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Deleted By")}</span>
                        <p className="font-bold text-gray-750 dark:text-gray-200">{file.deletedByName || t("Unknown Actor")}</p>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Deleted At")}</span>
                        <p className="font-mono text-gray-550 dark:text-gray-400">
                          {file.deletedAt ? file.deletedAt.toLocaleString() : (file.createdAt ? file.createdAt.toLocaleString() : '')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1.5 flex justify-end gap-2">
                      <button
                        onClick={() => onFileRestore(file.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer animate-pulse flex-1 justify-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t("Restore")}</span>
                      </button>

                      <button
                        onClick={() => onFileHardDelete(file.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("Delete")}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#15803d]/10 text-[#15803d] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 dark:bg-[#15803d]/20 dark:text-brand-400">
                <FolderTree className="w-3.5 h-3.5" />
                <span>{t("Curriculum Orchestrator")}</span>
              </span>
            </div>
            <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Academic Syllabus Directory Tree")}</h3>
            <p className="text-xs text-gray-455 dark:text-gray-500 mt-1 leading-normal">
              {t("Organize your branch specialty syllabus. Click on subjects and chapters to expand, delete chapters or specific lecture topics, or remove single notes entirely.")}
            </p>
          </div>          <div className="space-y-4">
            {Object.keys(subjectsTree).map((subName) => {
              const subNode = subjectsTree[subName];
              const chaptersList = Object.keys(subNode.chapters).map(chName => subNode.chapters[chName]);
              const isExpanded = !!expandedSubjects[subName];
              const totalFilesCount = chaptersList.reduce((acc, ch) => {
                const topicsList = Object.keys(ch.topics).map(topName => ch.topics[topName]);
                return acc + topicsList.reduce((sum, t) => sum + t.notes.length, 0);
              }, 0);

              return (
                <div key={subName} className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50/25 dark:bg-slate-900/50">
                  {/* Subject Header */}
                  <div 
                    onClick={() => toggleSubject(subName)}
                    className="flex justify-between items-center p-4 bg-gray-100/40 dark:bg-slate-805/50 hover:bg-gray-100/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400 dark:text-gray-500">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-650 dark:text-gray-300" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-850 dark:text-gray-150 uppercase tracking-wide">{subName}</h4>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                          {chaptersList.length} {t("Chapters")} • {totalFilesCount} {t("Notes / Lectures")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chapters Container */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      {chaptersList.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2 pl-4">
                          {t("No educational materials or chapters added yet for this subject.")}
                        </p>
                      ) : (
                        chaptersList.map((chNode) => {
                          const topicsList = Object.keys(chNode.topics).map(topName => chNode.topics[topName]);
                          const chKey = `${subName}-${chNode.name}`;
                          const isChExpanded = !!expandedChapters[chKey];
                          const chFilesCount = topicsList.reduce((acc, t) => acc + t.notes.length, 0);

                          return (
                            <div key={chNode.name} className="border border-gray-100/70 dark:border-slate-800/60 rounded-lg overflow-hidden">
                              {/* Chapter Header */}
                              <div className="flex justify-between items-center p-3 bg-gray-100/50 dark:bg-slate-805/35">
                                <div 
                                  onClick={() => toggleChapter(subName, chNode.name)}
                                  className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                                >
                                  <div className="text-gray-450 dark:text-gray-500">
                                    {isChExpanded ? <ChevronDown className="w-4 h-4 text-gray-650 dark:text-gray-300" /> : <ChevronRight className="w-4 h-4" />}
                                  </div>
                                  <div className="font-semibold text-xs text-gray-805 dark:text-gray-200">
                                    {t("Chapter")}: <span className="font-bold text-gray-900 dark:text-white">{chNode.name}</span>
                                    <span className="ml-2 py-0.5 px-1.5 bg-[#15803d]/10 dark:bg-[#15803d]/20 text-[#15803d] dark:text-brand-400 text-xxs font-bold rounded-full">
                                      {chFilesCount} {t("materials")}
                                    </span>
                                  </div>
                                </div>

                                {/* Delete Chapter Button */}
                                <button
                                  onClick={() => handleDeleteChapter(subName, chNode.name, chNode)}
                                  className="px-2.5 py-1 text-red-655 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900/30 hover:border-red-600 rounded-md text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 uppercase"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{t("Delete Chapter")}</span>
                                </button>
                              </div>

                              {/* Topics Container */}
                              {isChExpanded && (
                                <div className="p-3 bg-gray-50/15 dark:bg-slate-900/40 space-y-3.5 border-t border-gray-100/50 dark:border-slate-800/40">
                                  {topicsList.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1 pl-4">
                                      {t("No lecture topics uploaded in this chapter.")}
                                    </p>
                                  ) : (
                                    topicsList.map((topNode) => (
                                      <div key={topNode.name} className="pl-4 border-l-2 border-[#15803d]/30 dark:border-[#15803d]/20 space-y-2">
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-100/60 dark:border-slate-800/80">
                                          <div className="font-medium text-xs text-gray-750 dark:text-gray-300">
                                            {t("Topic")}: <span className="font-bold text-[#15803d] dark:text-brand-400">{topNode.name}</span>
                                            <span className="ml-1.5 text-xxs text-gray-400 font-mono">({topNode.notes.length} {t("files")})</span>
                                          </div>

                                          {/* Delete Topic Button */}
                                          <button
                                            onClick={() => handleDeleteTopic(subName, chNode.name, topNode.name, topNode.notes)}
                                            className="px-2 py-0.5 text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1 uppercase"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            <span>{t("Delete Topic")}</span>
                                          </button>
                                        </div>

                                        {/* Notes List under Topic */}
                                        <div className="space-y-1.5 pl-3">
                                          {topNode.notes.map((note) => (
                                            <div key={note.id} className="flex justify-between items-center text-xxs bg-gray-50/30 dark:bg-slate-850/20 p-2 rounded-md hover:bg-gray-50/70 dark:hover:bg-slate-800/20 transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-805">
                                              <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                                                <span className="bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 font-bold px-1.5 py-0.5 rounded uppercase text-[8px]">
                                                  {note.fileType}
                                                </span>
                                                <span className="font-semibold text-gray-750 dark:text-gray-300 truncate" title={note.fileName}>{note.fileName}</span>
                                                <span className="text-gray-400 font-mono">by {note.uploaderName} ({t(note.uploaderRole)})</span>
                                                {note.isApproved ? (
                                                  <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-bold uppercase">{t("Approved")}</span>
                                                ) : (
                                                  <span className="text-[8px] bg-amber-50 dark:bg-amber-950/20 text-amber-655 dark:text-amber-400 px-1 py-0.2 rounded font-bold uppercase">{t("Pending")}</span>
                                                )}
                                              </div>

                                              {/* Action controls */}
                                              <div className="flex items-center gap-2">
                                                {["pdf", "png", "jpg", "jpeg", "webp"].includes((note.fileType || "").toLowerCase()) && (
        <button
                                                  onClick={() => onPreview && onPreview(note)}
                                                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded cursor-pointer transition-all uppercase text-[9px] font-bold"
                                                >
                                                  {t("Preview")}
                                                </button>
      )}
                                                <button
                                                  onClick={() => {
                                                    const confirmNote = t("Are you sure you want to move the note '{{name}}' to the Recycle Bin?").replace('{{name}}', note.fileName);
                                                    if (window.confirm(confirmNote)) {
                                                      onFileDelete(note.id);
                                                    }
                                                  }}
                                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded cursor-pointer transition-all"
                                                  title={t("Delete Note")}
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'activity_logs' && (
        <div className="space-y-6" id="branch-audit-logs">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-3xs">
            <div>
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100 uppercase tracking-widest flex items-center gap-2">
                <History className="w-5 h-5 text-brand-500" />
                <span>{t("Branch Activity Audit Logs")}</span>
              </h3>
              <p className="text-xs text-gray-450 dark:text-gray-500 mt-1">
                {seeEveryoneFiles 
                  ? t("Displaying system-wide operational notes and actions.") 
                  : t("Displaying operations specifically within the {{branch}} premises.").replace('{{branch}}', user.branch || 'current')}
              </p>
            </div>

            {/* In-app Search & Filters bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t("Search files or actors...")}
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-755 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-gray-700 dark:text-gray-200"
                />
              </div>

              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-755 rounded-lg focus:outline-none text-gray-700 dark:text-gray-200 font-bold"
              >
                <option value="">{t("All Action Types")}</option>
                <option value="file_uploaded">{t("File Uploads")}</option>
                <option value="file_approved">{t("File Approvals")}</option>
                <option value="file_rejected">{t("File Rejections")}</option>
                <option value="file_deleted">{t("File Deletions")}</option>
                <option value="file_restored">{t("File Restorations")}</option>
              </select>
            </div>
          </div>

          {loadingLogs ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-16 text-center border border-gray-100 dark:border-slate-800">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
                <svg className="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t("Scanning activity streams...")}</span>
              </div>
            </div>
          ) : (() => {
            const finalFiltered = logsList
              .filter(log => {
                if (!seeEveryoneFiles) {
                  return log.fileBranch === user.branch || log.actorBranch === user.branch || log.actorId === user.uid;
                }
                return true;
              })
              .filter(log => {
                if (logActionFilter && log.action !== logActionFilter) return false;
                if (logSearchQuery) {
                  const queryLower = logSearchQuery.toLowerCase();
                  const filenameMatch = log.fileName?.toLowerCase().includes(queryLower);
                  const actorMatch = log.actorName?.toLowerCase().includes(queryLower);
                  const reasonMatch = log.rejectionReason?.toLowerCase().includes(queryLower);
                  return filenameMatch || actorMatch || reasonMatch;
                }
                return true;
              });

            if (finalFiltered.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-gray-100 dark:border-slate-800 text-xs text-gray-450 dark:text-gray-500 font-semibold">
                  {t("No operational audit logs match the selected search criteria.")}
                </div>
              );
            }

            return (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800/80 overflow-hidden shadow-2xs divide-y divide-gray-100 dark:divide-slate-800">
                {finalFiltered.map((log) => {
                  let alertBadge = "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300";
                  let actionTitle = t("Action Logged");

                  if (log.action === "file_uploaded") {
                    alertBadge = "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30";
                    actionTitle = t("File Uploaded");
                  } else if (log.action === "file_approved") {
                    alertBadge = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30";
                    actionTitle = t("Approved Submission");
                  } else if (log.action === "file_rejected") {
                    alertBadge = "bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30";
                    actionTitle = t("Rejected Submission");
                  } else if (log.action === "file_deleted") {
                    alertBadge = "bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30";
                    actionTitle = t("Deleted Material");
                  } else if (log.action === "file_restored") {
                    alertBadge = "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30";
                    actionTitle = t("Restored Material");
                  }

                  const isLogExpanded = !!expandedLogs[log.id];

                  return (
                    <div key={log.id} className="divide-y divide-gray-100/50 dark:divide-slate-800/40 bg-white dark:bg-slate-900 transition-colors">
                      {/* Compact Header */}
                      <div 
                        onClick={() => setExpandedLogs(prev => ({ ...prev, [log.id]: !isLogExpanded }))}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/20 select-none"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${alertBadge}`}>
                            {actionTitle}
                          </span>
                          <span className="text-gray-300 dark:text-gray-700 font-bold hidden sm:inline">•</span>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{log.createdAt ? log.createdAt.toLocaleString() : "Just now"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                          <div className="text-left sm:text-right min-w-0 max-w-[280px] sm:max-w-[220px]">
                            <p className="font-bold text-xs text-gray-805 dark:text-white truncate" title={log.fileName}>
                              {log.fileName || t("System Log")}
                            </p>
                          </div>
                          
                          <span className="text-[10px] text-brand-505 font-bold hover:underline shrink-0 flex items-center gap-1">
                            <span>{isLogExpanded ? t("Hide") : t("View")}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isLogExpanded ? 'rotate-180' : ''}`} />
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isLogExpanded && (
                        <div className="p-4 sm:p-5 bg-gray-50/40 dark:bg-slate-950/20 space-y-4 animate-in fade-in duration-150">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-gray-405 tracking-wider">{t("Affected Study Material")}</p>
                              <h4 className="font-extrabold text-xs text-gray-855 dark:text-white break-all">
                                {log.fileName || t("Unknown Note")}
                              </h4>
                              {log.fileSubject && (
                                <div className="flex items-center gap-2 text-[10.5px] font-bold text-gray-450 uppercase tracking-wide">
                                  <span>{t(log.fileSubject)}</span>
                                  {log.fileChapter && (
                                    <>
                                      <span>/</span>
                                      <span>{t("Chapter")} {log.fileChapter}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {log.fileBranch && (
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {t("Branch Origin")}: <span className="font-bold text-brand-505 dark:text-brand-400">{t(log.fileBranch)}</span>
                                </p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-gray-405 tracking-wider">{t("Authorized Action Performer")}</p>
                              <p className="text-xs font-bold text-gray-750 dark:text-gray-250">
                                {log.actorName} <span className="text-gray-450 font-mono text-[10px]">({t(log.actorRole)})</span>
                              </p>
                              {log.actorBranch && (
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                  {t("Affiliation")}: {t(log.actorBranch)}
                                </p>
                              )}
                            </div>
                          </div>

                          {log.action === "file_rejected" && log.rejectionReason && (
                            <div className="bg-red-50/50 dark:bg-red-955/10 border-l-4 border-red-500 p-3 rounded-r-lg space-y-1.5 shadow-3xs">
                              <p className="text-[10px] uppercase font-extrabold text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-red-550" />
                                <span>{t("Reason for document rejection")}</span>
                              </p>
                              <p className="text-xs text-red-705 dark:text-red-305 font-medium whitespace-pre-wrap leading-relaxed">
                                {log.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}