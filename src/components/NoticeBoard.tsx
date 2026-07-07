import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { NoticeAnnouncement, UserProfile } from '../types';
import { Megaphone, Trash2, Calendar, FileText, Send, AlertCircle } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface NoticeBoardProps {
  user: UserProfile | null;
}

export default function NoticeBoard({ user }: NoticeBoardProps) {
  const [notices, setNotices] = useState<NoticeAnnouncement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useThemeLanguage();

  const canManageNotices = user?.role === 'master_admin' || user?.role === 'super_admin';

  useEffect(() => {
    // If there is no user, or if we are in local offline bypass mode (unauthenticated in Firebase Auth),
    // do not attempt to listen to Firestore notices.
    if (!user || user.uid.startsWith('local_') || !auth.currentUser) return;

    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: NoticeAnnouncement[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            title: data.title || '',
            content: data.content || '',
            uploadedBy: data.uploadedBy || '',
            uploaderName: data.uploaderName || 'Master Admin',
            uploaderRole: data.uploaderRole || '',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          });
        });
        setNotices(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'notices');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      await addDoc(collection(db, 'notices'), {
        title: title.trim(),
        content: content.trim(),
        uploadedBy: user?.uid || '',
        uploaderName: user?.fullName || 'Master Admin',
        uploaderRole: user?.role || 'master_admin',
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setContent('');
      setIsOpen(false);
    } catch (err) {
      setErrorMsg(t("Failed to post notice. Verify rules permissions."));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!window.confirm(t("Are you sure you want to delete this notice?"))) return;
    try {
      await deleteDoc(doc(db, 'notices', noticeId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden mb-8 transition-colors" id="sristy-notice-board">
      <div className="relative overflow-hidden bg-[#ca8a04] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5">
          <Megaphone className="w-5 h-5 shrink-0 animate-pulse" />
          <h2 className="font-semibold text-sm sm:text-lg tracking-tight font-display leading-tight">{t("Sristy Announcements & Bulletins")}</h2>
        </div>
        {canManageNotices && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-white/20 hover:bg-white/30 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all self-start sm:self-auto cursor-pointer"
          >
            {isOpen ? t("Close Composer") : (user?.role === 'super_admin' ? t("Write Super Admin Notice") : t("Write Notice"))}
          </button>
        )}
      </div>

      {isOpen && canManageNotices && (
        <form onSubmit={handleCreateNotice} className="p-6 border-b border-gray-100 dark:border-slate-800 bg-brand-5/50 dark:bg-brand-950/10">
          <h3 className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-4">{t("Post Notice Announcement")}</h3>
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-650 dark:text-gray-300 uppercase tracking-wider mb-2">{t("Title")}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("Notice title...")}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-650 dark:text-gray-300 uppercase tracking-wider mb-2">{t("Notice content (Markdown or Plain Text)...")}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("Notice content (Markdown or Plain Text)...")}
                rows={4}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? t("Posting...") : t("Post Bulletin")}
            </button>
          </div>
        </form>
      )}

      <div className="p-6 max-h-[380px] overflow-y-auto space-y-4">
        {notices.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">{t("No active notices published at this moment.")}</p>
          </div>
        ) : (
          notices.map((notice, index) => {
            const isSuperAdminNotice = notice.uploaderRole === 'super_admin' || notice.uploaderName.toLowerCase().includes('super');
            return (
              <motion.div 
                key={notice.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.3) }}
                className={isSuperAdminNotice
                  ? "p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-950/20 dark:to-orange-950/10 border-2 border-amber-500 shadow-md hover:shadow-lg dark:border-amber-500/80 transition-all flex justify-between items-start gap-4 relative overflow-hidden ring-4 ring-amber-500/5 text-left"
                  : "p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800 transition-colors flex justify-between items-start gap-4 text-left"
                }
              >
                <div className="min-w-0 flex-1">
                  {isSuperAdminNotice && (
                    <div className="mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black bg-amber-500 text-white rounded-md tracking-wider uppercase animate-pulse shadow-xs">
                        <Megaphone className="w-3 h-3 text-white shrink-0" />
                        <span>{t("⭐ CRITICAL SUPER ADMIN ANNOUNCEMENT")}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-500" />
                    <span className="font-semibold">{notice.createdAt.toLocaleString()}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-350 dark:bg-gray-650"></span>
                    <span className={`font-bold ${isSuperAdminNotice ? 'text-amber-700 dark:text-amber-400 font-extrabold' : 'text-gray-700 dark:text-gray-300'}`}>
                      {notice.uploaderName} {notice.uploaderRole === 'super_admin' && `(${t("Super Admin")})`}
                    </span>
                  </div>
                  <h4 className={isSuperAdminNotice
                    ? "font-black text-sm sm:text-base text-amber-900 dark:text-amber-300 mb-1.5 leading-snug"
                    : "font-semibold text-sm text-gray-800 dark:text-gray-105 mb-1.5"
                  }>
                    {notice.title}
                  </h4>
                  <p className={isSuperAdminNotice
                    ? "text-xs text-amber-950 dark:text-amber-100 font-extrabold leading-relaxed whitespace-pre-wrap"
                    : "text-xs text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                  }>
                    {notice.content}
                  </p>
                </div>

                {canManageNotices && (
                  <button
                    onClick={() => handleDeleteNotice(notice.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}