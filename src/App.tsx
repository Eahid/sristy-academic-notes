import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from './firebase';
import { safeLocalStorage, forceClearSystemCache } from './utils';
import { UserProfile, FileArchive } from './types';
import { BRANCHES, SUBJECTS } from './constants';
import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import NoticeBoard from './components/NoticeBoard';
import ProfileModal from './components/ProfileModal';
import DashboardMasterAdmin from './components/DashboardMasterAdmin';
import DashboardAdmin from './components/DashboardAdmin';
import DashboardTeacher from './components/DashboardTeacher';
import DashboardViewer from './components/DashboardViewer';
import DocPreviewModal from './components/DocPreviewModal';
import FileCard from './components/FileCard';
import BatchDownloadBar from './components/BatchDownloadBar';
import TeacherDetailsModal from './components/TeacherDetailsModal';
import SristyBoardDirectory from './components/SristyBoardDirectory';
import { useThemeLanguage } from './components/ThemeLanguageContext';
import { 
  FolderLock, 
  School, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Download, 
  AlertCircle,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Landmark,
  Loader2,
  ArrowUpDown,
  Users
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [files, setFiles] = useState<FileArchive[]>([]);
  const [deletedFiles, setDeletedFiles] = useState<FileArchive[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Overlays triggers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Locked item downloads warning overlay
  const [lockedFileAlert, setLockedFileAlert] = useState<FileArchive | null>(null);

  // Seed DB status and fetch trigger
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  const [previewFile, setPreviewFile] = useState<FileArchive | null>(null);
  const [viewingTeacherUid, setViewingTeacherUid] = useState<string | null>(null);

  const [isSystemShutDown, setIsSystemShutDown] = useState(false);
  const [shutdownCustomMessage, setShutdownCustomMessage] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestBranch, setGuestBranch] = useState('');
  const [guestSubject, setGuestSubject] = useState('');

  // 1. URL Query Cache-Reset Listener: Clears cache immediately if link contains "?clear-cache=true" or "?reset=true"
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('clear-cache') === 'true' || params.get('reset') === 'true' || params.get('clear') === 'true') {
        console.log("Auto cache reset query detected. Cleaning up system caches...");
        // Clear LocalStorage & SessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear Cookies
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
        }

        // Unregister Service Workers
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
        }

        // Redirect to a clean landing URL
        setTimeout(() => {
          window.location.href = window.location.origin + window.location.pathname + "?v=" + Date.now();
        }, 300);
      }
    } catch (err) {
      console.error("Error executing auto-cache clear handler:", err);
    }
  }, []);
  const [guestSortBy, setGuestSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'>('date_desc');
  const [guestActiveTab, setGuestActiveTab] = useState<'notes' | 'board'>('notes');

  const hasAutoOpened = useRef(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const { t } = useThemeLanguage();

  useEffect(() => {
    if (authModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [authModalOpen]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'status'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsSystemShutDown(!!data.isShutDown);
        setShutdownCustomMessage(data.customMessage || '');
      } else {
        setIsSystemShutDown(false);
        setShutdownCustomMessage('');
      }
    }, (err) => {
      console.warn("Could not fetch System Configuration state:", err);
    });
    return () => unsub();
  }, []);

  const handlePreviewAttempt = (file: FileArchive) => {
    // 1. Trigger the download automatically upon clicking preview
    handleDownloadAttempt(file);

    // 2. Open in a new tab with the native view mode if fileUrl is available
    if (file.fileUrl) {
      let previewUrl = file.fileUrl;
      
      // Wrap custom cloud storage urls in backend raw proxy streams to avoid frame blocks & credential sandbox leakage
      if (previewUrl && !previewUrl.startsWith('/') && !previewUrl.startsWith(window.location.origin)) {
        previewUrl = `/api/r2/file?url=${encodeURIComponent(previewUrl)}`;
      }
      
      window.open(previewUrl, '_blank');
    } else {
      // Fallback to simulated reader modal showing local view mode of the topic
      setPreviewFile(file);
    }
  };

  // 1. Boostrap & Seed Database if empty
  const bootstrapSystem = async () => {
    if (!auth.currentUser) {
      console.log('Skipping bootstrap: No authenticated administrator is active.');
      return;
    }
    const currentEmail = auth.currentUser.email || '';
    if (currentEmail !== 'eahidhasan@gmail.com' && currentEmail !== 'admin@sristyfamily.com') {
      console.log('Skipping bootstrap: Current active session belongs to a standard user.');
      return;
    }
    try {
      // Create Master Admin Account User record if not exists
      const targetMasterUid = 'master_admin_uid';
      const masterDocRef = doc(db, 'users', targetMasterUid);
      const docSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'master_admin')));
      
      if (docSnap.empty) {
        await setDoc(masterDocRef, {
          uid: targetMasterUid,
          username: 'masteradmin',
          password: 'sristy_master_2026', // Set initial bootstrap password
          fullName: 'Sristy Master Admin',
          email: 'admin@sristyfamily.com',
          role: 'master_admin',
          status: 'active',
          bio: 'Root supervisor of Sristy Education Family Storage.',
          createdAt: new Date(),
        });
        console.log('Seeded Master Admin profile successfully.');
      }

      // Educational mockup files seeding has been removed to keep the homepage completely clean of demo data.
    } catch (err) {
      console.warn('System bootstrap process log: ', err);
    }
  };

  useEffect(() => {
    // Read local bypass storage initially if any
    const localUserJSON = safeLocalStorage.getItem('sristy_local_user');
    if (localUserJSON) {
      try {
        const parsed = JSON.parse(localUserJSON);
        parsed.createdAt = parsed.createdAt ? new Date(parsed.createdAt) : new Date();
        setCurrentUser(parsed);
      } catch (e) {
        safeLocalStorage.removeItem('sristy_local_user');
      }
    }

    // Only attempt bootstrap if user is signed in.
    if (auth.currentUser) {
      bootstrapSystem().then(() => {
        setTriggerRefresh(t => t + 1);
      });
    } else {
      setTriggerRefresh(t => t + 1);
    }
  }, []);

  // Synchronize dynamic active user sessions from Firebase auth state directly
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Clear local bypass if dynamic Firebase connection succeeds
        safeLocalStorage.removeItem('sristy_local_user');
        try {
          const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          let currentRole: string | undefined;

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.status !== 'inactive') {
              const matched: UserProfile = {
                uid: firebaseUser.uid,
                username: data.username || firebaseUser.email?.split('@')[0] || 'user',
                fullName: data.fullName || 'Anonymous User',
                email: firebaseUser.email || data.email || '',
                role: data.role,
                branch: data.branch,
                subject: data.subject,
                status: data.status,
                profilePic: data.profilePic,
                bio: data.bio,
                createdAt: data.createdAt?.toDate() || new Date(),
              };
              setCurrentUser(matched);
              currentRole = data.role;
            }
          } else {
            // Automatic creation or update of Master Admin profile mapping if logged in via standard Admin email
            if (firebaseUser.email === 'eahidhasan@gmail.com' || firebaseUser.email === 'admin@sristyfamily.com') {
              const masterDocRef = doc(db, 'users', firebaseUser.uid);
              const isOwner = firebaseUser.email === 'eahidhasan@gmail.com';
              const matchedMaster: UserProfile = {
                uid: firebaseUser.uid,
                username: isOwner ? 'eahidhasan' : 'masteradmin',
                fullName: isOwner ? 'Eahid Hasan (Owner)' : 'Sristy Master Admin',
                email: firebaseUser.email,
                role: 'master_admin',
                status: 'active',
                bio: 'Root supervisor of Sristy Education Family Storage.',
                createdAt: new Date(),
              };
              await setDoc(masterDocRef, {
                uid: matchedMaster.uid,
                username: matchedMaster.username,
                fullName: matchedMaster.fullName,
                email: matchedMaster.email,
                role: matchedMaster.role,
                status: matchedMaster.status,
                bio: matchedMaster.bio,
                createdAt: serverTimestamp(),
              });
              setCurrentUser(matchedMaster);
              currentRole = 'master_admin';
            }
          }
          // After auth registers/resolves, attempt to seed resources securely ONLY if user is master admin
          if (currentRole === 'master_admin') {
            await bootstrapSystem();
          }
        } catch (e) {
          console.error("Auth state profile fetch error:", e);
        }
      } else {
        // If Firebase Auth logged out or cleared, check if we still have local bypass active
        const localUserJSON = safeLocalStorage.getItem('sristy_local_user');
        if (localUserJSON) {
          try {
            const parsed = JSON.parse(localUserJSON);
            parsed.createdAt = parsed.createdAt ? new Date(parsed.createdAt) : new Date();
            setCurrentUser(parsed);
            return;
          } catch (e) {
            safeLocalStorage.removeItem('sristy_local_user');
          }
        }
        setCurrentUser(null);
      }
    });

    return () => unsub();
  }, []);

  // Automatically trigger the login modal when loading completes if there is no active authenticated user
  useEffect(() => {
    if (!loading && !currentUser && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setAuthModalOpen(true);
    } else if (currentUser) {
      setAuthModalOpen(false);
    }
  }, [loading, currentUser]);

  // 2. Fetch all system files archives with multiple secure sub-queries depending on role
  useEffect(() => {
    setLoading(true);
    const unsubscribers: (() => void)[] = [];
    
    // Helper to process standard document into FileArchive structure
    const parseDoc = (doc: any): FileArchive => {
      const data = doc.data();
      return {
        id: doc.id,
        fileName: data.fileName || 'document.pdf',
        fileType: data.fileType || 'pdf',
        fileSize: data.fileSize || 0,
        fileUrl: data.fileUrl,
        storagePath: data.storagePath,
        description: data.description || '',
        uploadedBy: data.uploadedBy || '',
        uploaderName: data.uploaderName || 'Instructor',
        uploaderRole: data.uploaderRole || 'teacher',
        branch: data.branch || '',
        subject: data.subject || '',
        isApproved: data.isApproved || false,
        approvedBy: data.approvedBy || '',
        downloadCount: data.downloadCount || 0,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        isDeleted: data.isDeleted || false,
        deletedAt: data.deletedAt ? (data.deletedAt.toDate ? data.deletedAt.toDate() : new Date(data.deletedAt)) : null,
        deletedBy: data.deletedBy || '',
        deletedByName: data.deletedByName || ''
      };
    };

    // We maintain a map of lists from different queries to cleanly merge them
    const queryResultsMap: Record<string, FileArchive[]> = {};

    const updateMergedState = () => {
      // Merge all lists from map
      const allActive: FileArchive[] = [];
      const allDeleted: FileArchive[] = [];
      const seenIds = new Set<string>();
      
      // Order of sub-queries prioritizes actual active state
      Object.values(queryResultsMap).forEach((list) => {
        list.forEach((file) => {
          if (file.uploadedBy.startsWith('seed_uploader_')) {
            return; // completely filter out demo files from showing up on homepage/platform
          }
          if (!seenIds.has(file.id)) {
            seenIds.add(file.id);
            if (file.isDeleted) {
              allDeleted.push(file);
            } else {
              allActive.push(file);
            }
          }
        });
      });

      // Sort by createdAt desc
      allActive.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      allDeleted.sort((a, b) => {
        const da = a.deletedAt ? a.deletedAt.getTime() : a.createdAt.getTime();
        const dbTime = b.deletedAt ? b.deletedAt.getTime() : b.createdAt.getTime();
        return dbTime - da;
      });

      setFiles(allActive);
      setDeletedFiles(allDeleted);
      setLoading(false);
    };

    const registerQuery = (key: string, q: any) => {
      const unsub = onSnapshot(q, (snapshot) => {
        const list: FileArchive[] = [];
        snapshot.forEach((doc) => {
          try {
            list.push(parseDoc(doc));
          } catch (e) {
            console.error("Error parsing document in query list:", e);
          }
        });
        queryResultsMap[key] = list;
        updateMergedState();
      }, (err) => {
        console.warn(`Graceful query retrieval fallback for ${key}:`, err);
        queryResultsMap[key] = [];
        updateMergedState();
      });
      unsubscribers.push(unsub);
    };

    const targetRole = currentUser?.role;

    if (targetRole === 'super_admin' || targetRole === 'master_admin' || targetRole === 'file_approver') {
      // Super, Master, and File Approver get full unfiltered directory access
      const qMaster = query(collection(db, 'files'));
      registerQuery('master', qMaster);
    } else if (targetRole === 'admin') {
      // Branch administrators stream all approved assets + ALL files from their branch (including unapproved)
      const qApproved = query(collection(db, 'files'), where('isApproved', '==', true));
      const qBranch = query(collection(db, 'files'), where('branch', '==', currentUser?.branch || ''));
      registerQuery('approved', qApproved);
      registerQuery('branch', qBranch);
    } else if (targetRole === 'teacher') {
      // Teachers stream all approved files + their OWN uploads
      const qApproved = query(collection(db, 'files'), where('isApproved', '==', true));
      const qMyUploads = query(collection(db, 'files'), where('uploadedBy', '==', currentUser?.uid || ''));
      registerQuery('approved', qApproved);
      registerQuery('my_uploads', qMyUploads);
    } else {
      // Viewers, unauthenticated guests, and other sessions only stream APPROVED records
      const qApproved = query(collection(db, 'files'), where('isApproved', '==', true));
      registerQuery('approved', qApproved);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [currentUser, triggerRefresh]);

  const handleLogout = async () => {
    try {
      safeLocalStorage.removeItem('sristy_local_user');
      await signOut(auth);
      setCurrentUser(null);
      setAuthModalOpen(false);
    } catch (e) {
      console.error("Failed to complete auth signout: ", e);
    }
  };

  const handleDownloadAttempt = async (file: FileArchive) => {
    try {
      // Increment download counter securely in Firestore
      try {
        const fileRef = doc(db, 'files', file.id);
        await updateDoc(fileRef, {
          downloadCount: (file.downloadCount || 0) + 1
        });
      } catch (safeErr) {
        console.warn("Optional download log incremented offline:", safeErr);
      }

      // If the file includes a valid fileUrl, trigger high-integrity download
      if (file.fileUrl) {
        let downloadLink = file.fileUrl;
        
        // Wrap third-party URLs (like external Google Cloud/Firebase links) in same-origin proxy to circumvent cross-origin browser save blocks
        if (downloadLink && !downloadLink.startsWith('/') && !downloadLink.startsWith(window.location.origin)) {
          downloadLink = `/api/r2/file?url=${encodeURIComponent(downloadLink)}`;
        }

        // If it routes through our API, append forced download attachment marker
        if (downloadLink.startsWith('/api/')) {
          const separator = downloadLink.includes('?') ? '&' : '?';
          downloadLink = `${downloadLink}${separator}download=true`;
        }

        // Create virtual anchor to trigger authentic download save flow
        const link = document.createElement('a');
        link.href = downloadLink;
        link.setAttribute('download', file.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <div style="font-family:sans-serif; text-align:center; padding: 60px 20px; max-width:500px; margin: auto; border: 1px solid #eee; border-radius:15px; margin-top:100px; box-shadow:0 10px 25px rgba(0,0,0,0.05)">
              <div style="background:#ff6600; width:60px; height:60px; line-height:60px; border-radius:50%; color:white; font-size:24px; font-weight:bold; margin:0 auto-20px auto; display:inline-block">★</div>
              <h2 style="color:#222; font-family:'Space Grotesk',sans-serif; margin-bottom:10px;">${t("Download Succeeded!")}</h2>
              <p style="color:#555; font-size:14px; margin-bottom:24px;">Your secure educational connection is ready for file archive:</p>
              <div style="background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #f0f0f0; margin-bottom:24px; text-align:left">
                <p style="margin:4px 0; font-size:13px; color:#444"><strong>File Name:</strong> ${file.fileName}</p>
                <p style="margin:4px 0; font-size:13px; color:#444"><strong>Format:</strong> .${file.fileType.toUpperCase()}</p>
                <p style="margin:4px 0; font-size:13px; color:#444"><strong>Subject Dept:</strong> ${file.subject}</p>
                <p style="margin:4px 0; font-size:13px; color:#444"><strong>School Branch:</strong> ${file.branch}</p>
                <p style="margin:4px 0; font-size:13px; color:#444"><strong>Size Parameter:</strong> ${(file.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button onclick="window.close()" style="background:#ff6600; border:none; color:white; padding:12px 24px; font-size:13px; font-weight:bold; border-radius:8px; cursor:pointer; width:100%">${t("Return to Sristy Repository")}</button>
            </div>
          `);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveFile = async (fileId: string) => {
    // Optimistic update — prevent flicker
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isApproved: true, approvedBy: currentUser?.uid || '' } : f));

    try {
      const fileRef = doc(db, 'files', fileId);
      await updateDoc(fileRef, {
        isApproved: true,
        approvedBy: currentUser?.uid || 'anonymous_admin'
      });

      // audit log
      const targetFile = files.find(f => f.id === fileId);
      if (currentUser && targetFile) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_approved',
            actorId: currentUser.uid,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actorBranch: currentUser.branch || '',
            fileId: fileId,
            fileName: targetFile.fileName,
            fileSubject: targetFile.subject,
            fileBranch: targetFile.branch,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write approval log:", logErr);
        }
      }
    } catch (err) {
      // Revert optimistic update on failure
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isApproved: false } : f));
      console.error(err);
    }
  };

  // Approve All pending files at once
  const handleApproveAllFiles = async (fileIds: string[]) => {
    if (!fileIds.length) return;

    // Optimistic update all at once
    setFiles(prev => prev.map(f => fileIds.includes(f.id) ? { ...f, isApproved: true, approvedBy: currentUser?.uid || '' } : f));

    try {
      await Promise.all(fileIds.map(fileId =>
        updateDoc(doc(db, 'files', fileId), {
          isApproved: true,
          approvedBy: currentUser?.uid || 'anonymous_admin'
        })
      ));

      if (currentUser) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_approved',
            actorId: currentUser.uid,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actorBranch: currentUser.branch || '',
            fileId: fileIds.join(','),
            fileName: 'Bulk approval of ' + fileIds.length + ' files',
            fileSubject: 'multiple',
            fileBranch: currentUser.branch || 'all',
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write bulk approval log:", logErr);
        }
      }
    } catch (err) {
      // Revert all on failure
      setFiles(prev => prev.map(f => fileIds.includes(f.id) ? { ...f, isApproved: false } : f));
      console.error(err);
    }
  };

  const handleRejectFile = async (fileId: string, customReason?: string) => {
    const targetFile = files.find(f => f.id === fileId);
    if (!targetFile) return;

    let reason: string | null = null;
    if (customReason !== undefined) {
      reason = customReason;
    } else {
      reason = window.prompt(
        t("Are you sure you want to REJECT and permanently delete this file? This will clean physical binaries from storage immediately. Enter rejection reason (optional):")
      );
    }
    if (reason === null) return; // User cancelled

    try {
      // 1. Audit Log Rejection text archive (preserving the history of the rejected file as text)
      if (currentUser) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_rejected',
            actorId: currentUser.uid,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actorBranch: currentUser.branch || '',
            fileId: fileId,
            fileName: targetFile.fileName,
            fileSubject: targetFile.subject,
            fileBranch: targetFile.branch,
            rejectionReason: reason.trim() || t("No explanation specified"),
            uploaderName: targetFile.uploaderName || t("Unknown"),
            uploaderId: targetFile.uploadedBy || '',
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write rejection log:", logErr);
        }
      }

      // 2. Clean physical file binary from S3 / R2 and Firebase Storage fallback
      if (targetFile.storagePath) {
        try {
          const r2DelRes = await fetch('/api/r2/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath: targetFile.storagePath }),
          });
          if (r2DelRes.ok) {
            console.log('R2: Cleared physical storage binary on rejection.');
          }
        } catch (r2DelErr) {
          console.warn('R2 deletion failed on rejection, continuing fallback:', r2DelErr);
        }

        try {
          const fileStorageRef = ref(storage, targetFile.storagePath);
          await deleteObject(fileStorageRef);
          console.log('Firebase Storage: Cleared on rejection.');
        } catch (storageErr) {
          console.warn('Firebase Storage deletion ignored:', storageErr);
        }
      }

      // 3. Delete document from Firestore
      await deleteDoc(doc(db, 'files', fileId));
    } catch (err) {
      console.error("Failed to reject and delete file document:", err);
    }
  };

  const handleDeleteFile = async (fileId: string, bypassConfirm?: boolean) => {
    if (!bypassConfirm && !window.confirm(t("Are you sure you want to move this file to trash? This can be recovered within 30 days."))) return;
    try {
      // Find the file to see metadata
      const targetFile = files.find(f => f.id === fileId);
      if (!targetFile) return;

      await updateDoc(doc(db, 'files', fileId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser?.uid || '',
        deletedByName: currentUser?.fullName || '',
      });
      
      // audit log
      if (currentUser) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_deleted',
            actorId: currentUser.uid,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actorBranch: currentUser.branch || '',
            fileId: fileId,
            fileName: targetFile.fileName,
            fileSubject: targetFile.subject,
            fileBranch: targetFile.branch,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write deletion log:", logErr);
        }
      }
    } catch (err) {
      console.error("Failed to soft delete file: ", err);
    }
  };

  const handleEditFile = async (fileId: string, updates: { fileName?: string; description?: string; subject?: string; classLevel?: string }) => {
    try {
      await updateDoc(doc(db, 'files', fileId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      // Optimistic update
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    } catch (err) {
      console.error("Failed to edit file:", err);
      alert(t("Failed to update file. Please try again."));
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm(t("Are you sure you want to delete this user? This cannot be undone."))) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert(t("Failed to delete user."));
    }
  };

  const handleRestoreFile = async (fileId: string) => {
    try {
      const targetFile = deletedFiles.find(f => f.id === fileId);
      if (!targetFile) return;

      await updateDoc(doc(db, 'files', fileId), {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
      });
      
      // audit log
      if (currentUser) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_restored',
            actorId: currentUser.uid,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actorBranch: currentUser.branch || '',
            fileId: fileId,
            fileName: targetFile.fileName,
            fileSubject: targetFile.subject,
            fileBranch: targetFile.branch,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write restoration log:", logErr);
        }
      }
    } catch (err) {
      console.error("Failed to restore file: ", err);
    }
  };

  const handleHardDeleteFile = async (fileId: string) => {
    if (!window.confirm(t("Are you sure you want to PERMANENTLY and IRREVERSIBLY delete this file from Sristy servers? This cannot be undone!"))) return;
    try {
      const targetFile = deletedFiles.find(f => f.id === fileId) || files.find(f => f.id === fileId);
      if (!targetFile) return;

      if (targetFile.storagePath) {
        // Attempt clean up from Cloudflare R2
        try {
          const r2DelRes = await fetch('/api/r2/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath: targetFile.storagePath }),
          });
          if (r2DelRes.ok) {
            console.log('R2: Successfully cleared physical storage binary.');
          }
        } catch (r2DelErr) {
          console.warn('R2 deletion request failed, continuing fallback processes: ', r2DelErr);
        }

        // Keep standard Firebase Storage cleanup as a fallback
        try {
          const fileStorageRef = ref(storage, targetFile.storagePath);
          await deleteObject(fileStorageRef);
          console.log('Firebase Storage: Successfully deleted hosted binary.');
        } catch (storageErr) {
          console.warn('Firebase Storage deletion ignored (asset likely allocated in R2 storage):', storageErr);
        }
      }
      
      await deleteDoc(doc(db, 'files', fileId));

      // audit log
      if (currentUser) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'file_hard_deleted',
            actorId: currentUser.uid,
            actorName: currentUser.fullName,
            actorRole: currentUser.role,
            actorBranch: currentUser.branch || '',
            fileId: fileId,
            fileName: targetFile.fileName,
            fileSubject: targetFile.subject,
            fileBranch: targetFile.branch,
            createdAt: serverTimestamp()
          });
        } catch (logErr) {
          console.warn("Failed to write hard deletion log:", logErr);
        }
      }

      alert(t("File was permanently deleted from Sristy servers!"));
    } catch (err) {
      console.error("Failed to complete file hard delete: ", err);
    }
  };

  const handleEmptyTrash = async (fileIds?: string[]) => {
    // If specific fileIds are provided, we delete those. Otherwise we delete all files in deletedFiles.
    const targets = fileIds 
      ? deletedFiles.filter(f => fileIds.includes(f.id))
      : deletedFiles;

    if (targets.length === 0) {
      alert(t("Trash is already empty."));
      return;
    }

    if (!window.confirm(t("Are you sure you want to PERMANENTLY and IRREVERSIBLY empty the trash? This will delete all selected files from Sristy servers forever. This action cannot be undone!"))) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const targetFile of targets) {
      try {
        if (targetFile.storagePath) {
          // Attempt clean up from Cloudflare R2
          try {
            const r2DelRes = await fetch('/api/r2/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storagePath: targetFile.storagePath }),
            });
            if (r2DelRes.ok) {
              console.log('R2: Successfully cleared physical storage binary.');
            }
          } catch (r2DelErr) {
            console.warn('R2 deletion request failed, continuing fallback processes: ', r2DelErr);
          }

          // Keep standard Firebase Storage cleanup as a fallback
          try {
            const fileStorageRef = ref(storage, targetFile.storagePath);
            await deleteObject(fileStorageRef);
            console.log('Firebase Storage: Successfully deleted hosted binary.');
          } catch (storageErr) {
            console.warn('Firebase Storage deletion ignored:', storageErr);
          }
        }

        await deleteDoc(doc(db, 'files', targetFile.id));

        // audit log
        if (currentUser) {
          try {
            await addDoc(collection(db, 'activity_logs'), {
              action: 'file_hard_deleted',
              actorId: currentUser.uid,
              actorName: currentUser.fullName,
              actorRole: currentUser.role,
              actorBranch: currentUser.branch || '',
              fileId: targetFile.id,
              fileName: targetFile.fileName,
              fileSubject: targetFile.subject,
              fileBranch: targetFile.branch,
              createdAt: serverTimestamp()
            });
          } catch (logErr) {
            console.warn("Failed to write hard deletion log:", logErr);
          }
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to complete file hard delete for ${targetFile.fileName}: `, err);
        failCount++;
      }
    }

    alert(t("Successfully emptied trash! {successCount} files were permanently deleted.").replace("{successCount}", String(successCount)));
  };

  // Group approved files by subject for visual catalog on homepage
  const getSubjectCounts = () => {
    const counts: { [key: string]: number } = {};
    SUBJECTS.forEach(sub => counts[sub] = 0);
    files.forEach(file => {
      if (file.isApproved && counts[file.subject] !== undefined) {
        counts[file.subject]++;
      }
    });
    return counts;
  };

  const subjectCounts = getSubjectCounts();

  // Filtered approved files for public guest explorer
  const publicApprovedFiles = files.filter(f => f.isApproved);
  const filteredPublicArchives = (() => {
    const list = publicApprovedFiles.filter((file) => {
      const matchesSearch = guestSearch.trim() === '' || 
        file.fileName.toLowerCase().includes(guestSearch.toLowerCase()) || 
        (file.description && file.description.toLowerCase().includes(guestSearch.toLowerCase()));

      const matchesBranch = guestBranch === '' || file.branch === guestBranch;
      const matchesSubject = guestSubject === '' || file.subject === guestSubject;

      return matchesSearch && matchesBranch && matchesSubject;
    });

    // Apply guest sorting selection
    if (guestSortBy === 'date_desc') {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (guestSortBy === 'date_asc') {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else if (guestSortBy === 'name_asc') {
      list.sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''));
    } else if (guestSortBy === 'name_desc') {
      list.sort((a, b) => (b.fileName || '').localeCompare(a.fileName || ''));
    } else if (guestSortBy === 'size_desc') {
      list.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
    } else if (guestSortBy === 'size_asc') {
      list.sort((a, b) => (a.fileSize || 0) - (b.fileSize || 0));
    }

    return list;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] flex flex-col justify-center items-center p-6 relative overflow-hidden select-none" id="sristy-portal-initial-loader">
        {/* Glowing background circles for visual depth */}
        <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        
        <div className="max-w-md w-full text-center space-y-7 z-10">
          <motion.div 
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="w-24 h-24 bg-white/50 dark:bg-slate-800/40 backdrop-blur-xs rounded-[28px] flex items-center justify-center mx-auto shadow-xl border border-gray-100 dark:border-slate-800 p-4"
          >
            {logoFailed ? (
              <div className="w-16 h-16 rounded-xl bg-brand-100 dark:bg-slate-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <School className="w-10 h-10" />
              </div>
            ) : (
              <img 
                src="https://sristy.edu.bd/wp-content/uploads/2018/12/Sristy.png.webp" 
                alt="Sristy Logo" 
                className="w-full h-full object-contain filter drop-shadow-sm"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
              />
            )}
          </motion.div>
          
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#15803d] tracking-tight font-display uppercase">
              {t("Notes Sharing Platform")}
            </h1>
          </div>
          
          <div className="pt-1">
            {/* Smooth animated loading slide */}
            <div className="relative w-48 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
              <motion.div 
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-1/2 bg-[#15803d ] rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSystemShutDown && currentUser?.role !== 'super_admin' && currentUser?.role !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-center select-none" id="site-shut-down-mode">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/30 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-955/20 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              {t("Portal under Maintenance")}
            </h1>
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold tracking-wider uppercase">
              {t("Temporarily Off-line")}
            </p>
          </div>
          
          <div className="bg-red-55/40 dark:bg-red-955/5 border border-red-100/30 dark:border-red-900/20 p-4 rounded-xl text-left space-y-1">
            <span className="block text-[9px] font-bold text-red-500 uppercase tracking-widest">{t("Administrator Message")}:</span>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
              {shutdownCustomMessage || t("The Sristy Family academic portal has been temporarily shut down by the Super Administrator for system modifications or security updates. Please try again soon.")}
            </p>
          </div>

          {currentUser ? (
            <div className="border-t border-gray-100 dark:border-slate-800 pt-6 space-y-4">
              <p className="text-xs text-red-500 font-bold">
                {t("Your account is not authorized to bypass Emergency Maintenance Mode.")}
              </p>
              <button 
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                {t("Sign out / Exit User Session")}
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 dark:border-slate-800 pt-6 text-left">
              <h2 className="text-xs font-black text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider text-center">{t("System Administrator Sign In")}</h2>
              <AuthScreen 
                onAuthSuccess={(userProfile) => {
                  setCurrentUser(userProfile);
                }}
              />
            </div>
          )}

          <div className="pt-2 flex flex-col items-center gap-1">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              {t("Contract-Compliance ID: SEC-14-SHUTDOWN")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors duration-300" id="sristy-edu-app-root">
      
      {/* Navbar header */}
      <Navbar 
        user={currentUser} 
        onLogout={handleLogout} 
        onOpenProfile={() => setProfileModalOpen(true)}
        onTriggerAuth={() => {
          setLockedFileAlert(null);
          setAuthModalOpen(true);
        }}
      />

      {/* Primary Area Container spacing */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 flex-1 w-full bg-transparent gradient-bg">
        {isSystemShutDown && (
          <div className="mb-6 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold p-4 rounded-xl flex items-center gap-2.5 animate-pulse select-none">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t("Global Emergency Shut Down / Maintenance Mode is active. Normal visitors are barred from viewing catalog files or uploading documents.")}</span>
          </div>
        )}
        
        {/* If USER is logged in, replace anonymous views with role-specified interior dashboard panel! */}
        {currentUser ? (
          <div className="space-y-8">
            {/* Global Bulletins Notice board for all authenticated segments */}
            <NoticeBoard user={currentUser} />

            {/* Dashboards Routing Router */}
            {(currentUser.role === 'super_admin' || currentUser.role === 'master_admin') && (
              <DashboardMasterAdmin 
                user={currentUser} 
                files={files} 
                deletedFiles={deletedFiles}
                onFileApprove={handleApproveFile}
                onApproveAll={handleApproveAllFiles}
                onFileReject={handleRejectFile}
                onFileDelete={handleDeleteFile}
                onFileRestore={handleRestoreFile}
                onFileHardDelete={handleHardDeleteFile}
                onEmptyTrash={handleEmptyTrash}
                onDownload={handleDownloadAttempt}
                onPreview={handlePreviewAttempt}
                onViewTeacherDetails={setViewingTeacherUid}
                onFileEdit={handleEditFile}
                onDeleteUser={handleDeleteUser}
                onUploadSuccess={() => setTriggerRefresh(t => t + 1)}
              />
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'file_approver') && (
              <DashboardAdmin 
                user={currentUser} 
                files={files} 
                deletedFiles={deletedFiles}
                onFileApprove={handleApproveFile}
                onApproveAll={handleApproveAllFiles}
                onFileReject={handleRejectFile}
                onFileDelete={handleDeleteFile}
                onFileRestore={handleRestoreFile}
                onFileHardDelete={handleHardDeleteFile}
                onEmptyTrash={handleEmptyTrash}
                onDownload={handleDownloadAttempt}
                onPreview={handlePreviewAttempt}
                onViewTeacherDetails={setViewingTeacherUid}
              />
            )}

            {currentUser.role === 'teacher' && (
              <DashboardTeacher 
                user={currentUser} 
                files={files} 
                onUploadSuccess={() => setTriggerRefresh(t => t + 1)}
                onFileDelete={handleDeleteFile}
                onFileEdit={handleEditFile}
                onDownload={handleDownloadAttempt}
                onPreview={handlePreviewAttempt}
                onViewTeacherDetails={setViewingTeacherUid}
              />
            )}

            {currentUser.role === 'viewer' && (
              <DashboardViewer 
                user={currentUser} 
                files={files} 
                onDownload={handleDownloadAttempt}
                onPreview={handlePreviewAttempt}
                onViewTeacherDetails={setViewingTeacherUid}
              />
            )}
          </div>
        ) : (
          /* ANONYMOUS GUEST VISITOR LANDING FRONT PAGE */
          <div className="space-y-12 sm:space-y-16 animate-in fade-in duration-500">
            
            {/* Attractive Hero Section */}
            <div className="text-center py-6 sm:py-10 max-w-4xl mx-auto space-y-4 sm:space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-105 dark:border-brand-900/30 rounded-full uppercase tracking-wider dark:bg-brand-950/20">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key="sparkle-icon"
                    initial={{ scale: 0.8, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                  </motion.div>
                </AnimatePresence>
                <span>{t("Centralized Resource Network")}</span>
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display leading-[1.1]">
                {t("Sristy Education Family")} <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600">
                  {t("Notes Sharing Platform")}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                {t("Connect and streamline resources across Sristy Education Family colleges and school campuses. Explore department lecture materials, past questions, and board formulations in one central place.")}
              </p>
              
              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <button 
                  onClick={() => { setLockedFileAlert(null); setAuthModalOpen(true); }}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{t("Access Sristy Family Portal")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a 
                  href="#subject-catalog"
                  className="px-6 py-3 border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                >
                  {t("Browse Subject Note's")}
                </a>
              </div>
            </div>



            {/* Unified Academic Platform Key Pillars */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-y border-gray-150/50 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/10 p-6 rounded-3xl">
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-950 dark:text-white uppercase tracking-tight">
                  {t("Verified Material")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  {t("Every lecture sheet, study guide, and question is uploaded and audited by authorized branch educators.")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 w-fit">
                  <School className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-950 dark:text-white uppercase tracking-tight">
                  {t("Unified Directory")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  {t("Bridges multiple Sristy colleges and school campuses under a singular directory for seamless access.")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-950 dark:text-white uppercase tracking-tight">
                  {t("Structured Library")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  {t("Categorized intuitively by subjects, classes, semesters, and chapters to avoid digital clutter.")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit">
                  <FolderLock className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-950 dark:text-white uppercase tracking-tight">
                  {t("Secure Distribution")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  {t("Rigorous access regulations guarantee that files are safely stored, previewed, and fetched cryptographically.")}
                </p>
              </div>
            </div>
            <div className="space-y-6 scroll-mt-24" id="subject-catalog">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white leading-tight">{t("Subject-wise Catalogues")}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-550 mt-1">{t("Click folders below to explore resources inside each academic department.")}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {SUBJECTS.map((sub, idx) => {
                  const count = subjectCounts[sub] || 0;
                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setGuestSubject(sub);
                        const el = document.getElementById("public-explorer");
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-4 flex flex-col justify-between hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-xs transition-all duration-300 shadow-xs cursor-pointer group text-left"
                    >
                      <div className="flex gap-2 items-center mb-3">
                        <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-slate-800 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100 leading-snug group-hover:text-brand-505 transition-colors truncate">
                          {t(sub)}
                        </h4>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold tracking-wider uppercase mt-1">
                          {count} {t("Shared Files")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guest Tab Navigation */}
            <div className="flex justify-center border-b border-gray-100 dark:border-slate-800 mb-8 mt-12 gap-6 select-none">
              <button
                onClick={() => setGuestActiveTab('notes')}
                className={`pb-4 px-4 text-sm font-extrabold transition-all relative flex items-center gap-2 cursor-pointer ${
                  guestActiveTab === 'notes'
                    ? 'text-[#15803d] dark:text-brand-400'
                    : 'text-gray-400 hover:text-gray-650 dark:text-gray-500'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{t("Verified Notes Archive")}</span>
                {guestActiveTab === 'notes' && (
                  <motion.div 
                    layoutId="guestActiveTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#15803d] rounded-full" 
                  />
                )}
              </button>

              <button
                onClick={() => setGuestActiveTab('board')}
                className={`pb-4 px-4 text-sm font-extrabold transition-all relative flex items-center gap-2 cursor-pointer ${
                  guestActiveTab === 'board'
                    ? 'text-[#15803d] dark:text-brand-400'
                    : 'text-gray-400 hover:text-gray-650 dark:text-gray-500'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t("Sristy Board Directory")}</span>
                {guestActiveTab === 'board' && (
                  <motion.div 
                    layoutId="guestActiveTabUnderline" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#15803d] rounded-full" 
                  />
                )}
              </button>
            </div>

            {guestActiveTab === 'notes' ? (
              /* Interactive Search & Filters Portal (Public Resource Explorer) */
              <div className="space-y-6 scroll-mt-24" id="public-explorer">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors text-left">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display flex items-center gap-2">
                        <FolderLock className="w-5 h-5 text-brand-500 animate-pulse" />
                        <span>{t("Verified Public Sristy Repository")}</span>
                      </h3>
                      <p className="text-xs text-gray-400">{t("Explore real learning sheets uploaded across Sristy College of Tangail & school branches.")}</p>
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{filteredPublicArchives.length} {t("Available Note's")}</span>
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Text Search */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={guestSearch}
                        onChange={(e) => setGuestSearch(e.target.value)}
                        placeholder={t("Search file name, topic, notes...")}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    {/* Branch Filter */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                        <School className="w-4 h-4 text-brand-500" />
                      </span>
                      <select
                        value={guestBranch}
                        onChange={(e) => setGuestBranch(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-gray-750 dark:text-gray-100 appearance-none cursor-pointer transition-all"
                      >
                        <option value="">{t("-- Apply Branch Filter --")}</option>
                        {BRANCHES.map((bName, idx) => (
                          <option key={idx} value={bName}>{t(bName)}</option>
                        ))}
                      </select>
                      <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Subject Filter */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                        <BookOpen className="w-4 h-4 text-brand-500" />
                      </span>
                      <select
                        value={guestSubject}
                        onChange={(e) => setGuestSubject(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-gray-750 dark:text-gray-100 appearance-none cursor-pointer transition-all"
                      >
                        <option value="">{t("-- Apply Subject Filter --")}</option>
                        {SUBJECTS.map((sub, idx) => (
                          <option key={idx} value={sub}>{t(sub)}</option>
                        ))}
                      </select>
                      <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Sort Selection */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                        <ArrowUpDown className="w-4 h-4 text-brand-500" />
                      </span>
                      <select
                        value={guestSortBy}
                        onChange={(e) => setGuestSortBy(e.target.value as any)}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold text-gray-750 dark:text-gray-100 appearance-none cursor-pointer transition-all"
                      >
                        <option value="date_desc">{t("Newest First")}</option>
                        <option value="date_asc">{t("Oldest First")}</option>
                        <option value="name_asc">{t("Name: A to Z")}</option>
                        <option value="name_desc">{t("Name: Z to A")}</option>
                        <option value="size_desc">{t("Size: Largest First")}</option>
                        <option value="size_asc">{t("Size: Smallest First")}</option>
                      </select>
                      <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Reset Buttons */}
                  {(guestSearch || guestBranch || guestSubject || guestSortBy !== 'date_desc') && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setGuestSearch('');
                          setGuestBranch('');
                          setGuestSubject('');
                          setGuestSortBy('date_desc');
                        }}
                        className="text-[10px] font-bold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                      >
                        {t("Clear Search Parameters & Filters")}
                      </button>
                    </div>
                  )}
                </div>

                {filteredPublicArchives.length > 1 && (
                  <div className="flex sm:hidden items-center justify-center gap-1.5 text-[11px] text-brand-605 dark:text-brand-405 mb-3.5 animate-pulse bg-brand-500/5 py-1 px-3 rounded-full border border-brand-500/10">
                    <span className="font-semibold uppercase tracking-wider">Swipe horizontally</span>
                    <span className="text-sm font-bold">↔</span>
                    <span>to browse {filteredPublicArchives.length} files</span>
                  </div>
                )}

                {filteredPublicArchives.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 text-gray-400 dark:text-gray-555 text-xs shadow-xs">
                    <FolderLock className="w-12 h-12 mx-auto stroke-1 text-gray-300 dark:text-gray-650 mb-2" />
                    <p>{t("No matching verified documents found in Sristy Education database. Refine your indicators or clear filter.")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <BatchDownloadBar
                      selectedIds={selectedFileIds}
                      allFiles={files}
                      currentFilteredFiles={filteredPublicArchives}
                      onSelectToggle={(id) => {
                        setSelectedFileIds(prev =>
                          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                        );
                      }}
                      onClearSelection={() => setSelectedFileIds([])}
                      onSelectAll={(ids) => setSelectedFileIds(ids)}
                    />

                    <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:pb-0 sm:snap-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
                      {filteredPublicArchives.map((file) => (
                        <div key={file.id} className="min-w-[290px] w-[88vw] sm:w-auto sm:min-w-0 snap-center shrink-0">
                          <FileCard
                            file={file}
                            user={currentUser}
                            onDownload={handleDownloadAttempt}
                            onPreview={handlePreviewAttempt}
                            isSelected={selectedFileIds.includes(file.id)}
                            onSelectToggle={(id) => {
                              setSelectedFileIds(prev =>
                                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                              );
                            }}
                            onViewTeacherDetails={setViewingTeacherUid}
                            allFiles={files}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <SristyBoardDirectory 
                  currentUser={currentUser} 
                  onRefreshAdmins={() => {}}
                />
              </div>
            )}

            {/* Quick Sristy Branch Info Panel for Aesthetic Value */}
            <div className="p-8 rounded-2xl bg-brand-50/40 dark:bg-slate-900 border border-brand-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-left space-y-2 max-w-xl">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white font-display">{t("Campus Network Directories")}</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t("Our storage system maps verified note's across Sristy College of Tangail, Sristy Central Dhaka, Jamalpur, Rajshahi, Rangpur, Cadet schools, Juniors academies, and international affiliates instantly.")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 shrink-0 w-full sm:w-auto">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-gray-150 dark:border-slate-700 text-center transition-colors">
                  <p className="text-2xl font-extrabold text-brand-500 dark:text-brand-400 font-display">20</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-550 uppercase font-semibold">{t("Active Branches")}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-gray-150 dark:border-slate-700 text-center transition-colors">
                  <p className="text-2xl font-extrabold text-brand-500 dark:text-brand-400 font-display">17</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-550 uppercase font-semibold">{t("Course Subjects")}</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className={`hidden sm:block bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-900 pt-6 pb-6 text-center text-xs text-gray-400 dark:text-gray-500 transition-colors`} id="sristy-family-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Sristy Education Family. All rights reserved across board affiliates.</p>
          <div className="flex gap-4">
            <span className="hover:text-brand-500 cursor-pointer">{t("Security Protocol")}</span>
            <span className="hover:text-brand-500 cursor-pointer">{t("Storage Fairuse")}</span>
            <span 
              onClick={() => {
                const confirmed = window.confirm(t("If you cannot see the latest updates, please click below to force clear system cache and fetch the newest version."));
                if (confirmed) {
                  forceClearSystemCache();
                }
              }}
              className="hover:text-amber-600 dark:hover:text-amber-400 text-amber-700 dark:text-amber-500 font-semibold cursor-pointer"
            >
              {t("Force System Update")}
            </span>
            <span className="hover:text-brand-500 cursor-pointer text-brand-500 font-bold">{t("Tangail Central")}</span>
          </div>
        </div>
      </footer>

      {/* AUTH SCREEN DRAWER OVERLAY */}
      <AnimatePresence>
        {authModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative w-full max-w-md my-auto"
            >
              {/* Close Button on background */}
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <XButton />
              </button>

              {lockedFileAlert && (
                <div className="absolute top-0 left-0 right-0 -translate-y-12 z-50 bg-brand-100 text-brand-800 border border-brand-200 px-4 py-2.5 rounded-lg text-xxs font-semibold flex items-center gap-2 shadow-md">
                  <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>{t("Logging in is mandatory to view details/download")} "<strong>{lockedFileAlert.fileName}</strong>".</span>
                </div>
              )}

              <AuthScreen onAuthSuccess={(userProfile) => {
                setCurrentUser(userProfile);
                setAuthModalOpen(false);
                setLockedFileAlert(null);
              }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* USER PROFILE RE-SET MODAL */}
      <AnimatePresence>
        {profileModalOpen && currentUser && (
          <ProfileModal 
            user={currentUser} 
            onClose={() => setProfileModalOpen(false)}
            onSaveSuccess={(upUser) => {
              setCurrentUser(upUser);
            }} 
          />
        )}
      </AnimatePresence>

      {/* DOCUMENT PREVIEW MODAL */}
      <DocPreviewModal 
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadAttempt}
        user={currentUser}
        onApprove={handleApproveFile}
        onReject={handleRejectFile}
      />

      {/* TEACHER/INSTRUCTOR DETAILS MODAL */}
      <AnimatePresence>
        {viewingTeacherUid && (
          <TeacherDetailsModal 
            teacherUid={viewingTeacherUid}
            onClose={() => setViewingTeacherUid(null)}
            files={files}
            onDownload={handleDownloadAttempt}
            onPreview={handlePreviewAttempt}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Small inline Helper close icon to keep bundles fully self-contained
function XButton() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  );
}