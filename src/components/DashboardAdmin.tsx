import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  ShieldAlert
} from 'lucide-react';
import FileCard from './FileCard';
import { useThemeLanguage } from './ThemeLanguageContext';

interface DashboardAdminProps {
  user: UserProfile;
  files: FileArchive[];
  deletedFiles: FileArchive[];
  onFileApprove: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileRestore: (fileId: string) => void;
  onDownload: (file: FileArchive) => void;
  onPreview?: (file: FileArchive) => void;
}

export default function DashboardAdmin({
  user,
  files,
  deletedFiles,
  onFileApprove,
  onFileDelete,
  onFileRestore,
  onDownload,
  onPreview
}: DashboardAdminProps) {
  const [teachersList, setTeachersList] = useState<UserProfile[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // See everyone's file toggle state
  const [seeEveryoneFiles, setSeeEveryoneFiles] = useState(false);

  // Form states to create branch members (teachers/viewers)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [memberRole, setNewMemberRole] = useState<'teacher' | 'viewer'>('teacher');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Password resets
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const [activeTab, setActiveTab] = useState<'teachers' | 'files' | 'trash_bin'>(
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

    if (memberRole === 'teacher' && selectedSubjects.length === 0) {
      setFormError(t("Teachers must specify at least one teaching subject specialty."));
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
        payload.subjects = selectedSubjects;
        payload.subject = selectedSubjects[0] || '';
      }

      await setDoc(doc(db, 'users', authUid), payload);

      setFormSuccess(t("Profile created beautifully! Logging you into the archive system..."));
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewEmail('');
      setSelectedSubjects([]);
      
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

      {/* Bento Grid Section Navigation */}
      {user.role !== 'file_approver' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8" id="admin-bento-menu">
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
                ? 'bg-[#15803d] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
            }`}>
              <FileText className="w-5 h-5" />
              {filteredFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white dark:border-slate-900 animate-pulse">
                  {filteredFiles.length}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-[10px] tracking-wider uppercase leading-tight ${
                activeTab === 'files' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
              }`}>{t("Approval")}</p>
              <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-150 mt-1.5 leading-snug">
                {t("Verify Submissions")} {filteredFiles.length > 0 && `(${filteredFiles.length})`}
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
        </div>
      )}

      {/* bKash/Pathao Style Ultra-Elegant Bottom Tab Navigator for Mobile View */}
      {user.role !== 'file_approver' && (
        <>
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-150 dark:border-slate-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-safe transition-colors">
            <div className="flex justify-around items-center h-14">
              <button
                onClick={() => setActiveTab('teachers')}
                className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none relative cursor-pointer"
              >
                <div className={`p-1 transition-all duration-300 ${
                  activeTab === 'teachers' 
                    ? 'text-[#15803d] scale-110' 
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
                  <span className="w-1 h-1 bg-[#15803d] rounded-full mt-0.5 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('files')}
                className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none relative cursor-pointer"
              >
                <div className={`p-1 transition-all duration-300 relative ${
                  activeTab === 'files' 
                    ? 'text-[#15803d] scale-110' 
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
                  <span className="w-1 h-1 bg-[#15803d] rounded-full mt-0.5 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('trash_bin')}
                className="flex flex-col items-center justify-center flex-1 py-1 focus:outline-none relative cursor-pointer"
              >
                <div className={`p-1 transition-all duration-300 relative ${
                  activeTab === 'trash_bin' 
                    ? 'text-[#15803d] scale-110' 
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
                  <span className="w-1 h-1 bg-[#15803d] rounded-full mt-0.5" />
                )}
              </button>
            </div>
          </div>
          <div className="sm:hidden h-14" /> {/* Prevents main layout overlap */}
        </>
      )}

      {activeTab === 'teachers' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Teacher/Viewer Comp */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 self-start shadow-xs transition-colors">
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
              <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border border-gray-100 dark:border-slate-700">
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
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    {t("Assigned Teaching Subjects")}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto space-y-2.5">
                    {subjects.map((sub, idx) => {
                      const isChecked = selectedSubjects.includes(sub);
                      return (
                        <label key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:text-brand-500 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubjects([...selectedSubjects, sub]);
                              } else {
                                setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
                              }
                            }}
                            className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4"
                          />
                          <span>{t(sub)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 leading-normal">
                    {t("Select one or multiple subjects. At least one selection is required.")}
                  </p>
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
                {teachersList.length} {t("Users")}
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loadingTeachers ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">{t("Loading...")}</div>
              ) : teachersList.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">{t("No files found. Clean start!")}</div>
              ) : (
                <table className="w-full min-w-[600px] border-collapse text-left">
                  <thead>
                     <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/20">
                      <th className="py-4 px-6">{t("Institutional Branch Member")}</th>
                      <th className="py-4 px-6">{t("Assigned Subject Specialty")}</th>
                      <th className="py-4 px-6">{t("Portal Key / Passwords")}</th>
                      <th className="py-4 px-6 text-right">{t("Status & Suspend Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-105 dark:divide-slate-805 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {teachersList.map((tea) => (
                      <tr key={tea.uid} className="hover:bg-gray-50/30 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 flex items-center justify-center text-brand-500 dark:text-brand-400 font-bold text-xs uppercase shrink-0">
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
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {tea.subjects && tea.subjects.length > 0 ? (
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
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold tracking-wider uppercase bg-gray-50 dark:bg-slate-800/10 border border-gray-100 dark:border-slate-800 px-2 py-0.5 rounded-full">
                              {t("Student")}
                            </span>
                          )}
                        </td>
                        <td className="py-4.5 px-6">
                          {resettingUid === tea.uid ? (
                            <div className="flex items-center gap-1 max-w-[180px]">
                              <input
                                type="text"
                                value={newPasswordVal}
                                onChange={(e) => setNewPasswordVal(e.target.value)}
                                placeholder={t("New password")}
                                className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:border-brand-500 text-xxs w-full"
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
                              className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Key className="w-3 h-3" />
                              <span>{t("Change password")}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-4.5 px-6 text-right">
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        /* File oversight display */
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
          <div className="mb-6">
            <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Oversight Admin Terminal")}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-505 mt-1">
              {t("Currently compiling archives of")}: <span className="underline decoration-brand-500 decoration-2 font-semibold text-gray-700 dark:text-gray-300">{seeEveryoneFiles ? t("Currently Browsing: EVERYONE") : t(user.branch)}</span>.
            </p>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-450 dark:text-gray-500 text-xs">{t("No files found. Clean start!")}</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  user={user}
                  onDownload={onDownload}
                  onPreview={onPreview}
                  onApprove={onFileApprove}
                  onDelete={onFileDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'trash_bin' && (
        /* Recycle Bin display */
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
          <div className="mb-6">
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

          {deletedFiles.filter(f => f.branch === user.branch).length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              {t("The branch recycling storage is empty. No files require attention!")}
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-105 dark:border-slate-800 rounded-xl">
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
                  {deletedFiles
                    .filter(f => f.branch === user.branch)
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
                          <button
                            onClick={() => onFileRestore(file.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer animate-pulse"
                          >
                            <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                            <span>{t("Restore")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
