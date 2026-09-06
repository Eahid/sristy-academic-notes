import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc,
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import { FileArchive, FileComment, UserProfile } from '../types';
import { useThemeLanguage } from './ThemeLanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  History, 
  CornerDownRight, 
  Crown, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Clock, 
  School, 
  BookOpen, 
  ExternalLink, 
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  UserCheck
} from 'lucide-react';

interface FileCommentsModalProps {
  file: FileArchive | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onViewTeacherDetails?: (teacherUid: string) => void;
  onReactionToggle?: (fileId: string, type: 'like' | 'dislike') => Promise<void>;
  onReplaceFileRequested?: (file: FileArchive) => void;
}

export default function FileCommentsModal({
  file,
  isOpen,
  onClose,
  currentUser,
  onViewTeacherDetails,
  onReactionToggle,
  onReplaceFileRequested
}: FileCommentsModalProps) {
  const { t } = useThemeLanguage();
  const [comments, setComments] = useState<FileComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [currentFile, setCurrentFile] = useState<FileArchive | null>(file);

  // Sync currentFile with file prop
  useEffect(() => {
    setCurrentFile(file);
  }, [file]);

  // Real-time document listener for the file so like/dislike & status updates reflect instantly
  useEffect(() => {
    if (!isOpen || !file?.id) return;
    const fileRef = doc(db, 'files', file.id);
    const unsub = onSnapshot(fileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentFile(prev => prev ? ({
          ...prev,
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          dislikedBy: Array.isArray(data.dislikedBy) ? data.dislikedBy : [],
          commentCount: typeof data.commentCount === 'number' ? data.commentCount : prev.commentCount,
          needsReplacement: data.needsReplacement || false,
          rejectionReason: data.rejectionReason || ''
        }) : null);
      }
    }, (err) => {
      console.warn("Failed to listen to file doc in modal:", err);
    });
    return () => unsub();
  }, [isOpen, file?.id]);

  // Real-time comments listener for the current file
  useEffect(() => {
    if (!isOpen || !file?.id) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const commentsRef = collection(db, 'files', file.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: FileComment[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setComments(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Failed to load file comments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, file?.id]);

  if (!isOpen || !file || !currentFile) return null;

  const likesCount = currentFile.likes || 0;
  const dislikesCount = currentFile.dislikes || 0;
  const userHasLiked = currentUser ? (currentFile.likedBy || []).includes(currentUser.uid) : false;
  const userHasDisliked = currentUser ? (currentFile.dislikedBy || []).includes(currentUser.uid) : false;

  // Auto-rejection condition: 20+ dislikes AND under 3 likes
  const isAutoRejected = (currentFile.needsReplacement === true) || (dislikesCount >= 20 && likesCount < 3);
  const isFileOwner = currentUser?.uid === currentFile.uploadedBy;
  const isMasterOrAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const canComment = !!currentUser && (currentUser.role === 'teacher' || isMasterOrAdmin);
  const canOwnerReply = isFileOwner || isMasterOrAdmin;

  // Reaction handler with double-click / toggle reset (Facebook-style)
  const handleModalReaction = async (type: 'like' | 'dislike') => {
    if (onReactionToggle) {
      await onReactionToggle(currentFile.id, type);
      return;
    }
    if (!currentUser) {
      alert(t("Please sign in to rate study materials."));
      return;
    }

    const currentLikedBy = currentFile.likedBy || [];
    const currentDislikedBy = currentFile.dislikedBy || [];
    const hasLiked = currentLikedBy.includes(currentUser.uid);
    const hasDisliked = currentDislikedBy.includes(currentUser.uid);

    let newLikes = currentFile.likes || 0;
    let newDislikes = currentFile.dislikes || 0;
    let newLikedBy = [...currentLikedBy];
    let newDislikedBy = [...currentDislikedBy];

    if (type === 'like') {
      if (hasLiked) {
        // Double-click / click again to RESET like
        newLikes = Math.max(0, newLikes - 1);
        newLikedBy = newLikedBy.filter(uid => uid !== currentUser.uid);
      } else {
        newLikes += 1;
        newLikedBy.push(currentUser.uid);
        if (hasDisliked) {
          newDislikes = Math.max(0, newDislikes - 1);
          newDislikedBy = newDislikedBy.filter(uid => uid !== currentUser.uid);
        }
      }
    } else if (type === 'dislike') {
      if (hasDisliked) {
        // Double-click / click again to RESET dislike
        newDislikes = Math.max(0, newDislikes - 1);
        newDislikedBy = newDislikedBy.filter(uid => uid !== currentUser.uid);
      } else {
        newDislikes += 1;
        newDislikedBy.push(currentUser.uid);
        if (hasLiked) {
          newLikes = Math.max(0, newLikes - 1);
          newLikedBy = newLikedBy.filter(uid => uid !== currentUser.uid);
        }
      }
    }

    // Apply optimistic updates immediately
    setCurrentFile(prev => prev ? ({
      ...prev,
      likes: newLikes,
      dislikes: newDislikes,
      likedBy: newLikedBy,
      dislikedBy: newDislikedBy
    }) : null);

    try {
      const fileRef = doc(db, 'files', currentFile.id);
      const updates: any = {
        likes: newLikes,
        dislikes: newDislikes,
        likedBy: newLikedBy,
        dislikedBy: newDislikedBy
      };

      if (newDislikes >= 20 && newLikes < 3) {
        updates.needsReplacement = true;
        updates.isApproved = false;
        updates.rejectionReason = "Auto-rejected: 20+ dislikes reached with fewer than 3 likes. File replacement required.";
      } else if (currentFile.needsReplacement && !(newDislikes >= 20 && newLikes < 3)) {
        updates.needsReplacement = false;
      }

      await updateDoc(fileRef, updates);
    } catch (err) {
      console.error("Failed to update reaction:", err);
    }
  };

  // Check if current user already has a comment on this file
  const existingUserComment = currentUser ? comments.find(c => c.authorId === currentUser.uid) : null;

  const toggleHistory = (commentId: string) => {
    setExpandedHistoryIds(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser || !canComment) return;

    setSubmitting(true);
    setActionMessage(null);

    try {
      if (existingUserComment) {
        // "If one teacher comment multiple time it will show as edited and comment history will show."
        const historyItem = {
          content: existingUserComment.content,
          editedAt: existingUserComment.updatedAt 
            ? (existingUserComment.updatedAt.toDate ? existingUserComment.updatedAt.toDate().toISOString() : new Date(existingUserComment.updatedAt).toISOString())
            : (existingUserComment.createdAt?.toDate ? existingUserComment.createdAt.toDate().toISOString() : new Date().toISOString())
        };

        const updatedHistory = [...(existingUserComment.editHistory || []), historyItem];
        const commentRef = doc(db, 'files', file.id, 'comments', existingUserComment.id);

        await updateDoc(commentRef, {
          content: newCommentText.trim(),
          isEdited: true,
          updatedAt: serverTimestamp(),
          editHistory: updatedHistory,
          // Update profile info in case teacher updated profile
          authorName: currentUser.fullName,
          authorRole: currentUser.role,
          authorBranch: currentUser.branch || '',
          authorSubject: currentUser.subject || '',
          authorProfilePic: currentUser.profilePic || currentUser.profilePictureUrl || ''
        });

        setActionMessage(t("Your comment was updated and previous version archived to history!"));
      } else {
        // First comment by this teacher on this note
        const commentsRef = collection(db, 'files', file.id, 'comments');
        await addDoc(commentsRef, {
          fileId: file.id,
          fileOwnerId: file.uploadedBy,
          authorId: currentUser.uid,
          authorName: currentUser.fullName,
          authorRole: currentUser.role,
          authorBranch: currentUser.branch || '',
          authorSubject: currentUser.subject || '',
          authorProfilePic: currentUser.profilePic || currentUser.profilePictureUrl || '',
          content: newCommentText.trim(),
          createdAt: serverTimestamp(),
          isEdited: false,
          editHistory: [],
          replies: []
        });

        // Update comment count on file document
        try {
          await updateDoc(doc(db, 'files', file.id), {
            commentCount: increment(1)
          });
        } catch (cntErr) {
          console.warn("Failed to increment commentCount on file doc:", cntErr);
        }

        setActionMessage(t("Comment posted successfully!"));
      }

      setNewCommentText('');
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      console.error("Failed to save comment:", err);
      alert(t("Failed to save comment. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (comment: FileComment) => {
    if (!editingText.trim() || !currentUser) return;
    setSubmitting(true);

    try {
      const historyItem = {
        content: comment.content,
        editedAt: comment.updatedAt 
          ? (comment.updatedAt.toDate ? comment.updatedAt.toDate().toISOString() : new Date(comment.updatedAt).toISOString())
          : (comment.createdAt?.toDate ? comment.createdAt.toDate().toISOString() : new Date().toISOString())
      };

      const updatedHistory = [...(comment.editHistory || []), historyItem];
      const commentRef = doc(db, 'files', file.id, 'comments', comment.id);

      await updateDoc(commentRef, {
        content: editingText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp(),
        editHistory: updatedHistory
      });

      setEditingCommentId(null);
      setEditingText('');
      setActionMessage(t("Comment updated with history preserved."));
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error("Failed to edit comment:", err);
      alert(t("Failed to update comment."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t("Are you sure you want to delete this comment?"))) return;
    try {
      await deleteDoc(doc(db, 'files', file.id, 'comments', commentId));
      try {
        await updateDoc(doc(db, 'files', file.id), {
          commentCount: increment(-1)
        });
      } catch (cntErr) {
        console.warn("Failed to decrement commentCount on file doc:", cntErr);
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handlePostReply = async (comment: FileComment) => {
    if (!replyText.trim() || !currentUser || !canOwnerReply) return;
    setSubmittingReply(true);

    try {
      const newReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        authorId: currentUser.uid,
        authorName: currentUser.fullName,
        authorRole: currentUser.role,
        authorBranch: currentUser.branch || '',
        authorSubject: currentUser.subject || '',
        authorProfilePic: currentUser.profilePic || currentUser.profilePictureUrl || '',
        isOwnerReply: currentUser.uid === file.uploadedBy,
        content: replyText.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedReplies = [...(comment.replies || []), newReply];
      const commentRef = doc(db, 'files', file.id, 'comments', comment.id);

      await updateDoc(commentRef, {
        replies: updatedReplies
      });

      setReplyingCommentId(null);
      setReplyText('');
      setActionMessage(t("Reply posted successfully!"));
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error("Failed to post reply:", err);
      alert(t("Failed to post reply."));
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return t("Recently");
    let d: Date;
    if (ts.toDate && typeof ts.toDate === 'function') {
      d = ts.toDate();
    } else if (typeof ts === 'string' || typeof ts === 'number') {
      d = new Date(ts);
    } else {
      d = new Date();
    }
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Prevent body scroll while modal is open to eliminate background layout shifts/splashes
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // Keyboard shortcut: close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm overflow-hidden"
        id="file-comments-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-auto sm:max-h-[88vh] text-gray-900 dark:text-gray-100"
          id="file-comments-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile swipe/sheet drag pill */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-gray-50/90 dark:bg-slate-950/60">
            <div className="w-10 h-1 bg-gray-300 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Top Header */}
          <div className="px-4 py-3 sm:p-5 border-b border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/50 flex items-start justify-between gap-3 shrink-0">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1 sm:p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  {t("Teacher Comments & Discussion")}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {comments.length} {comments.length === 1 ? t("comment") : t("comments")}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate" title={file.fileName}>
                {file.fileName}
              </h2>
              <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewTeacherDetails && onViewTeacherDetails(file.uploadedBy)}
                  className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer group"
                >
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
                  <span>{t("Author")}: <span className="underline decoration-dotted group-hover:decoration-solid font-bold">{file.uploaderName}</span></span>
                </button>
                <span>•</span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{t(file.subject)}</span>
                {file.branch && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <School className="w-3 h-3 text-gray-400" />
                      <span>{t(file.branch)}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer shrink-0"
              id="close-comments-modal-btn"
              title={t("Close comments (Esc)")}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Reaction and Ranking Bar */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {t("Ranking:")}
              </span>
              <button
                type="button"
                onClick={() => handleModalReaction('like')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  userHasLiked
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700'
                }`}
                id="comment-modal-like-btn"
                title={userHasLiked ? t("Click again to remove like") : t("Helpful / High Quality Note")}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{likesCount}</span>
              </button>

              <button
                type="button"
                onClick={() => handleModalReaction('dislike')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  userHasDisliked
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700'
                }`}
                id="comment-modal-dislike-btn"
                title={userHasDisliked ? t("Click again to remove dislike") : t("Needs Improvement / Outdated")}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>{dislikesCount}</span>
              </button>

              <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 ml-1">
                ({t("Score")}: <span className={likesCount - dislikesCount >= 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>{likesCount - dislikesCount > 0 ? `+${likesCount - dislikesCount}` : likesCount - dislikesCount}</span>)
              </span>
            </div>

            {/* If auto-rejected due to 20 dislikes and < 3 likes */}
            {isAutoRejected && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("20+ Dislikes: Replacement Required")}</span>
                </span>
                {(isFileOwner || isMasterOrAdmin) && onReplaceFileRequested && (
                  <button
                    onClick={() => {
                      onClose();
                      onReplaceFileRequested(file);
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t("Replace Now")}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action toast feedback */}
          {actionMessage && (
            <div className="mx-4 sm:mx-5 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Comments List Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium">{t("Loading comments...")}</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-700 stroke-1" />
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                  {t("No comments yet on this note")}
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {t("Teachers can share feedback, point out corrections, or suggest improvements. Note owner can reply directly.")}
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isAuthorOfComment = currentUser?.uid === comment.authorId;
                const hasEditHistory = !!comment.isEdited && (comment.editHistory?.length || 0) > 0;
                const isHistoryOpen = !!expandedHistoryIds[comment.id];
                const isReplying = replyingCommentId === comment.id;
                const isEditing = editingCommentId === comment.id;
                const isCommenterOwner = comment.authorId === file.uploadedBy;

                return (
                  <div 
                    key={comment.id}
                    className="p-4 rounded-xl border border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 space-y-3 transition-all hover:border-gray-300 dark:hover:border-slate-700"
                    id={`comment-${comment.id}`}
                  >
                    {/* Comment Header: Teacher Profile details */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Teacher Avatar */}
                        <div 
                          onClick={() => onViewTeacherDetails && onViewTeacherDetails(comment.authorId)}
                          className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-xs uppercase cursor-pointer shrink-0 overflow-hidden border border-brand-200 dark:border-brand-800 hover:scale-105 transition-transform"
                          title={t("Click to view teacher profile")}
                        >
                          {comment.authorProfilePic ? (
                            <img src={comment.authorProfilePic} alt={comment.authorName} className="w-full h-full object-cover" />
                          ) : (
                            comment.authorName.charAt(0)
                          )}
                        </div>

                        {/* Teacher Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onViewTeacherDetails && onViewTeacherDetails(comment.authorId)}
                              className="font-bold text-xs text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 truncate cursor-pointer text-left"
                            >
                              {comment.authorName}
                            </button>

                            {isCommenterOwner ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                                <Crown className="w-2.5 h-2.5" />
                                {t("Note Author")}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                {t(comment.authorRole || "Teacher")}
                              </span>
                            )}

                            {comment.authorSubject && (
                              <span className="text-[10px] font-medium text-gray-400 hidden sm:inline">
                                • {comment.authorSubject}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>{formatTimestamp(comment.updatedAt || comment.createdAt)}</span>
                            {comment.authorBranch && (
                              <>
                                <span>•</span>
                                <span>{comment.authorBranch}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comment Actions: Edit / Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Profile button */}
                        <button
                          type="button"
                          onClick={() => onViewTeacherDetails && onViewTeacherDetails(comment.authorId)}
                          className="p-1 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-md transition-colors"
                          title={t("View Teacher Profile")}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>

                        {isAuthorOfComment && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingText(comment.content);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
                            title={t("Edit Comment")}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(isAuthorOfComment || isMasterOrAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                            title={t("Delete Comment")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Comment Content (Latest version) */}
                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={2}
                          className="w-full bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-600 rounded-xl p-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none font-medium"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            {t("Cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(comment)}
                            disabled={submitting || !editingText.trim()}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            {t("Save with History")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                          {comment.content}
                        </p>

                        {/* Edited badge & Comment History toggle */}
                        {hasEditHistory && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleHistory(comment.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                              id={`toggle-history-${comment.id}`}
                            >
                              <History className="w-3 h-3" />
                              <span>
                                {t("Edited")} ({comment.editHistory?.length} {t("older version(s)")}) • {isHistoryOpen ? t("Hide History") : t("View History")}
                              </span>
                              {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {/* "lastest comment will show old one will show when click." */}
                            {isHistoryOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 pl-3 border-l-2 border-blue-200 dark:border-blue-900/60 space-y-2 py-1"
                              >
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                  {t("Previous Comment History")}
                                </p>
                                {comment.editHistory?.map((hist, idx) => (
                                  <div key={idx} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-gray-150 dark:border-slate-800 text-[11px] space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                                      <span className="font-bold">{t("Version")} #{idx + 1}</span>
                                      <span>{formatTimestamp(hist.editedAt)}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic font-mono">
                                      "{hist.content}"
                                    </p>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Owner Reply Button (Teachers can Comment in the Uploaded notes and the owner can reply that) */}
                    {canOwnerReply && !isReplying && (
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingCommentId(comment.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 cursor-pointer"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>{isFileOwner ? t("Reply as Note Owner") : t("Reply as Admin")}</span>
                        </button>
                      </div>
                    )}

                    {/* Inline Reply Box for Owner */}
                    {isReplying && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pl-3 sm:pl-5 border-l-2 border-brand-500 pt-2 space-y-2"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase">
                          <Crown className="w-3 h-3" />
                          <span>{t("Replying as Note Author / Owner")}</span>
                        </div>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={t("Write a reply to this teacher...")}
                          rows={2}
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 font-medium"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingCommentId(null)}
                            className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            {t("Cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePostReply(comment)}
                            disabled={submittingReply || !replyText.trim()}
                            className="px-3.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>{t("Post Reply")}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Nested Replies Display */}
                    {(comment.replies || []).length > 0 && (
                      <div className="pl-3 sm:pl-6 border-l-2 border-emerald-400 dark:border-emerald-600/50 space-y-2 pt-2">
                        {comment.replies?.map((reply) => (
                          <div 
                            key={reply.id}
                            className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 p-3 rounded-xl space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  onClick={() => onViewTeacherDetails && onViewTeacherDetails(reply.authorId)}
                                  className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center justify-center font-bold text-[10px] uppercase cursor-pointer shrink-0"
                                >
                                  {reply.authorName.charAt(0)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onViewTeacherDetails && onViewTeacherDetails(reply.authorId)}
                                  className="font-bold text-xs text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
                                >
                                  {reply.authorName}
                                </button>
                                {reply.isOwnerReply && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <Crown className="w-2.5 h-2.5" />
                                    {t("Note Owner")}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {formatTimestamp(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-800 dark:text-gray-200 pl-8 leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* New Comment Posting Box (For Teachers and Admins) */}
          <div className="p-3 sm:p-4 border-t border-gray-150 dark:border-slate-800 bg-gray-50/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0">
            {canComment ? (
              <form onSubmit={handlePostComment} className="space-y-2">
                <div className="flex items-center justify-between text-[11px] gap-2">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 truncate">
                    <span>{t("Add Feedback or Comment")}</span>
                    {existingUserComment && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full truncate">
                        {t("Will update & preserve history")}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {t("As")} <span className="font-bold text-gray-600 dark:text-gray-300">{currentUser.fullName}</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={existingUserComment 
                      ? t("Update your comment on this study material (history will be preserved)...")
                      : t("Share observations, corrections, or praise for this educational material...")}
                    rows={2}
                    className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium resize-none"
                    id="new-comment-textarea"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newCommentText.trim()}
                    className="px-3.5 sm:px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs shrink-0 select-none active:scale-95 min-w-[64px]"
                    id="submit-comment-btn"
                  >
                    <Send className="w-4 h-4" />
                    <span>{existingUserComment ? t("Update") : t("Post")}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
                {currentUser ? (
                  <span>{t("Only teachers and administrators can post comments on study materials.")}</span>
                ) : (
                  <span>{t("Please sign in with a teacher account to participate in discussions and post comments.")}</span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
