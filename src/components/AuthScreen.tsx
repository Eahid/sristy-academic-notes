import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { BRANCHES, SUBJECTS } from '../constants';
import { Lock, User, Mail, School, BookOpen, AlertCircle, Sparkles, CheckCircle2, ChevronDown } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  // Registration extras
  const [registerRole, setRegisterRole] = useState<'viewer' | 'teacher'>('viewer');
  const [branch, setBranch] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { t } = useThemeLanguage();

  const handleBypassLogin = async (role: UserRole) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    // Hardcoded corresponding real demo account parameters
    let demoEmail = '';
    let demoPassword = '';
    let demoUsername = '';
    let demoFullName = '';
    let demoBranch = '';
    let demoSubject = '';
    let demoSubjects: string[] = [];

    if (role === 'super_admin') {
      demoEmail = 'admin@sristyfamily.com';
      demoPassword = 'sristy_master_2026';
      demoUsername = 'superadmin';
      demoFullName = 'Sristy Super Admin';
    } else if (role === 'master_admin') {
      demoEmail = 'admin@sristyfamily.com';
      demoPassword = 'sristy_master_2026';
      demoUsername = 'masteradmin';
      demoFullName = 'Sristy Master Admin';
    } else if (role === 'admin') {
      demoEmail = 'branchadmin@sristyfamily.com';
      demoPassword = 'sristy_admin_2026';
      demoUsername = 'demo_branch_admin';
      demoFullName = 'Sristy Branch Administrator';
      demoBranch = 'Sristy Academic School, Tangail';
    } else if (role === 'file_approver') {
      demoEmail = 'approver@sristyfamily.com';
      demoPassword = 'sristy_approver_2026';
      demoUsername = 'demo_approver';
      demoFullName = 'Sristy File Approver';
      demoBranch = 'Sristy College of Tangail';
    } else if (role === 'teacher') {
      demoEmail = 'teacher@sristyfamily.com';
      demoPassword = 'sristy_teacher_2026';
      demoUsername = 'demo_teacher';
      demoFullName = 'Sristy Demo Teacher';
      demoBranch = 'Sristy Academic School, Tangail';
      demoSubject = 'Bangla 1st Paper';
      demoSubjects = ['Bangla 1st Paper', 'Bangla 2nd Paper', 'History'];
    } else {
      demoEmail = 'student@sristyfamily.com';
      demoPassword = 'sristy_student_2026';
      demoUsername = 'demo_student';
      demoFullName = 'Sristy Demo Student';
      demoBranch = 'Sristy College of Tangail';
    }

    try {
      // 1. Create Firebase Auth credential on-the-fly if not initialized yet
      try {
        await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/email-already-in-use') {
          console.warn("Preseeded demo auto-registration bypassed:", authErr);
        }
      }

      // 2. Unlink any previous offline cache to prevent login conflicts
      localStorage.removeItem('sristy_local_user');

      // 3. Initiate real Firebase Auth sign-in
      const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      const userObj = userCredential.user;

      // 4. Align or create target dynamic document mapping under /users/{uid}
      const userDocRef = doc(db, 'users', userObj.uid);
      const userDocSnap = await getDoc(userDocRef);

      let targetUser: UserProfile;

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        targetUser = {
          uid: userObj.uid,
          username: data.username || demoUsername,
          fullName: data.fullName || demoFullName,
          email: userObj.email || demoEmail,
          role: data.role as UserRole,
          branch: data.branch || demoBranch,
          subject: data.subject || demoSubject,
          subjects: data.subjects || demoSubjects,
          status: data.status,
          profilePic: data.profilePic,
          bio: data.bio,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      } else {
        targetUser = {
          uid: userObj.uid,
          username: demoUsername,
          fullName: demoFullName,
          email: demoEmail,
          role: role,
          branch: demoBranch,
          subject: demoSubject,
          subjects: demoSubjects,
          status: 'active',
          bio: role === 'super_admin' ? 'Ultimate Owner and Portal Overseer.' : 'Preseeded Sristy staff credentials on-the-fly.',
          createdAt: new Date(),
        };

        const payload: any = {
          uid: targetUser.uid,
          username: targetUser.username,
          fullName: targetUser.fullName,
          email: targetUser.email,
          role: targetUser.role,
          status: targetUser.status,
          bio: targetUser.bio,
          createdAt: serverTimestamp(),
        };
        if (targetUser.branch) payload.branch = targetUser.branch;
        if (targetUser.subject) payload.subject = targetUser.subject;
        if (targetUser.subjects) payload.subjects = targetUser.subjects;

        await setDoc(userDocRef, payload);
      }

      setLoading(false);
      setSuccessMsg(t("Welcome back") + ` (Authenticated Gateway), ${targetUser.fullName}!`);
      setTimeout(() => {
        onAuthSuccess(targetUser);
      }, 800);

    } catch (e: any) {
      console.warn("Direct Firebase authentication failed. Falling back to Local Sandbox Bypass:", e);

      // Graceful offline fallback if Firebase connection fails or is blocked
      let fallbackUser: UserProfile = {
        uid: `local_${role}_uid`,
        username: demoUsername,
        fullName: `${demoFullName} (Local Sandbox)`,
        email: demoEmail,
        role: role,
        status: 'active',
        bio: 'Local Sandbox Session (Firebase Connection Offline).',
        createdAt: new Date(),
      };
      if (demoBranch) fallbackUser.branch = demoBranch;
      if (demoSubject) fallbackUser.subject = demoSubject;
      if (demoSubjects.length > 0) fallbackUser.subjects = demoSubjects;

      localStorage.setItem('sristy_local_user', JSON.stringify(fallbackUser));
      setLoading(false);
      setSuccessMsg(t("Welcome back") + ` (Local Sandbox Bypass), ${fallbackUser.fullName}!`);
      setTimeout(() => {
        onAuthSuccess(fallbackUser);
      }, 800);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg(t("Please specify both username/email and password."));
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let targetEmail = username.trim().toLowerCase();
      let lookedUpUsername = '';

      // Handlers for instant pre-seeded demo accounts
      const lowerInput = username.trim().toLowerCase();
      if (lowerInput === 'masteradmin' || lowerInput === 'admin@sristyfamily.com') {
        targetEmail = 'admin@sristyfamily.com';
        lookedUpUsername = 'masteradmin';
      } else if (lowerInput === 'demo_branch_admin' || lowerInput === 'branchadmin@sristyfamily.com') {
        targetEmail = 'branchadmin@sristyfamily.com';
        lookedUpUsername = 'demo_branch_admin';
      } else if (lowerInput === 'demo_approver' || lowerInput === 'approver@sristyfamily.com') {
        targetEmail = 'approver@sristyfamily.com';
        lookedUpUsername = 'demo_approver';
      } else if (lowerInput === 'demo_teacher' || lowerInput === 'teacher@sristyfamily.com') {
        targetEmail = 'teacher@sristyfamily.com';
        lookedUpUsername = 'demo_teacher';
      } else if (lowerInput === 'demo_student' || lowerInput === 'student@sristyfamily.com') {
        targetEmail = 'student@sristyfamily.com';
        lookedUpUsername = 'demo_student';
      }

      // If it doesn't look like an email pattern, resolve it from the users collection
      if (!targetEmail.includes('@')) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', targetEmail), limit(1));
        const snap = await getDocs(q);

        if (snap.empty) {
          setErrorMsg(t("Authentication failed: Invalid username or incorrect credentials."));
          setLoading(false);
          return;
        }

        let foundEmail = '';
        snap.forEach((doc) => {
          const data = doc.data();
          foundEmail = data.email;
          lookedUpUsername = data.username;
        });

        if (foundEmail) {
          targetEmail = foundEmail;
        } else {
          setErrorMsg(t("Account configuration error: No corporate email mapped to this username."));
          setLoading(false);
          return;
        }
      }

      // Automated on-the-fly registration fallback for the Master Admin and Demo credentials if they aren't initialized under standard Auth yet
      if (targetEmail === 'admin@sristyfamily.com' && password === 'sristy_master_2026') {
        try {
          await createUserWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') {
            console.warn("Bootstrap Master Admin register bypass:", authErr);
          }
        }
      } else if (targetEmail === 'branchadmin@sristyfamily.com' && password === 'sristy_admin_2026') {
        try {
          await createUserWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') {
            console.warn("Bootstrap Branch Admin register bypass:", authErr);
          }
        }
      } else if (targetEmail === 'approver@sristyfamily.com' && password === 'sristy_approver_2026') {
        try {
          await createUserWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') {
            console.warn("Bootstrap Approver register bypass:", authErr);
          }
        }
      } else if (targetEmail === 'teacher@sristyfamily.com' && password === 'sristy_teacher_2026') {
        try {
          await createUserWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') {
            console.warn("Bootstrap Demo Teacher register bypass:", authErr);
          }
        }
      } else if (targetEmail === 'student@sristyfamily.com' && password === 'sristy_student_2026') {
        try {
          await createUserWithEmailAndPassword(auth, targetEmail, password);
        } catch (authErr: any) {
          if (authErr.code !== 'auth/email-already-in-use') {
            console.warn("Bootstrap Demo Student register bypass:", authErr);
          }
        }
      }

      // Try actual official Firebase Auth validation
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      const userObj = userCredential.user;

      // Fetch official fields from user document profile
      const userDocRef = doc(db, 'users', userObj.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let matchedUser: UserProfile | null = null;
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.status === 'inactive') {
          setErrorMsg(t("This account has been deactivated by the branch admin."));
          setLoading(false);
          return;
        }
        matchedUser = {
          uid: userObj.uid,
          username: data.username || lookedUpUsername || userObj.email?.split('@')[0] || 'user',
          fullName: data.fullName || userObj.displayName || 'Unnamed User',
          email: userObj.email || data.email,
          role: data.role as UserRole,
          branch: data.branch,
          subject: data.subject,
          subjects: data.subjects,
          status: data.status,
          profilePic: data.profilePic,
          bio: data.bio,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }

      if (!matchedUser && (userObj.email === 'eahidhasan@gmail.com' || userObj.email === 'admin@sristyfamily.com')) {
        // Fallback or automatic creation of Master Admin profile
        const isOwner = userObj.email === 'eahidhasan@gmail.com';
        matchedUser = {
          uid: userObj.uid,
          username: isOwner ? 'eahidhasan' : 'masteradmin',
          fullName: isOwner ? 'Eahid Hasan (Owner)' : 'Sristy Master Admin',
          email: userObj.email,
          role: 'master_admin',
          status: 'active',
          bio: 'Root supervisor of Sristy Education Family Storage.',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, {
          uid: matchedUser.uid,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          email: matchedUser.email,
          role: matchedUser.role,
          status: matchedUser.status,
          bio: matchedUser.bio,
          createdAt: serverTimestamp(),
        });
      } else if (!matchedUser && userObj.email === 'branchadmin@sristyfamily.com') {
        // Fallback or automatic creation of Branch Admin profile
        matchedUser = {
          uid: userObj.uid,
          username: 'demo_branch_admin',
          fullName: 'Sristy Branch Administrator',
          email: 'branchadmin@sristyfamily.com',
          role: 'admin',
          branch: 'Sristy Academic School, Tangail',
          status: 'active',
          bio: 'Branch Administrator for Sristy Academic School.',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, {
          uid: matchedUser.uid,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          email: matchedUser.email,
          role: matchedUser.role,
          branch: matchedUser.branch,
          status: matchedUser.status,
          bio: matchedUser.bio,
          createdAt: serverTimestamp(),
        });
      } else if (!matchedUser && userObj.email === 'approver@sristyfamily.com') {
        // Fallback or automatic creation of File Approver profile
        matchedUser = {
          uid: userObj.uid,
          username: 'demo_approver',
          fullName: 'Sristy File Approver',
          email: 'approver@sristyfamily.com',
          role: 'file_approver',
          branch: 'Sristy College of Tangail',
          status: 'active',
          bio: 'Official Resource Verifier for Sristy Education Family.',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, {
          uid: matchedUser.uid,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          email: matchedUser.email,
          role: matchedUser.role,
          branch: matchedUser.branch,
          status: matchedUser.status,
          bio: matchedUser.bio,
          createdAt: serverTimestamp(),
        });
      } else if (!matchedUser && userObj.email === 'teacher@sristyfamily.com') {
        // Fallback or automatic creation of Teacher profile
        matchedUser = {
          uid: userObj.uid,
          username: 'demo_teacher',
          fullName: 'Sristy Demo Teacher',
          email: 'teacher@sristyfamily.com',
          role: 'teacher',
          branch: 'Sristy Academic School, Tangail',
          subject: 'Bangla 1st Paper',
          subjects: ['Bangla 1st Paper', 'Bangla 2nd Paper', 'History'],
          status: 'active',
          bio: 'Verified Professional Educator at Sristy Education Family.',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, {
          uid: matchedUser.uid,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          email: matchedUser.email,
          role: matchedUser.role,
          branch: matchedUser.branch,
          subject: matchedUser.subject,
          subjects: matchedUser.subjects,
          status: matchedUser.status,
          bio: matchedUser.bio,
          createdAt: serverTimestamp(),
        });
      } else if (!matchedUser && userObj.email === 'student@sristyfamily.com') {
        // Fallback or automatic creation of Student profile
        matchedUser = {
          uid: userObj.uid,
          username: 'demo_student',
          fullName: 'Sristy Demo Student',
          email: 'student@sristyfamily.com',
          role: 'viewer',
          branch: 'Sristy College of Tangail',
          status: 'active',
          bio: 'Enthusiastic Student representative of Sristy Education Family.',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, {
          uid: matchedUser.uid,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          email: matchedUser.email,
          role: matchedUser.role,
          branch: matchedUser.branch,
          status: matchedUser.status,
          bio: matchedUser.bio,
          createdAt: serverTimestamp(),
        });
      }

      if (errorMsg) {
        setLoading(false);
        return;
      }

      if (!matchedUser) {
        setErrorMsg(t("Authentication succeeded in Auth, but your user profile does not exist in Firestore users collection."));
      } else {
        setSuccessMsg(t("Welcome back") + `, ${matchedUser.fullName}!`);
        setTimeout(() => {
          onAuthSuccess(matchedUser!);
        }, 800);
      }
    } catch (err: any) {
      console.error("Firebase Login Error Cascade: ", err);

      const lowerInput = username.trim().toLowerCase();
      const isDemoMaster = (lowerInput === 'masteradmin' || lowerInput === 'admin@sristyfamily.com') && password === 'sristy_master_2026';
      const isDemoBranchAdmin = (lowerInput === 'demo_branch_admin' || lowerInput === 'branchadmin@sristyfamily.com') && password === 'sristy_admin_2026';
      const isDemoTeacher = (lowerInput === 'demo_teacher' || lowerInput === 'teacher@sristyfamily.com') && password === 'sristy_teacher_2026';
      const isDemoStudent = (lowerInput === 'demo_student' || lowerInput === 'student@sristyfamily.com') && password === 'sristy_student_2026';

      if (isDemoMaster || isDemoBranchAdmin || isDemoTeacher || isDemoStudent) {
        let fallbackUser: UserProfile;
        if (isDemoMaster) {
          fallbackUser = {
            uid: 'local_master_admin_uid',
            username: 'masteradmin',
            fullName: 'Sristy Master Admin (Demo Bypass)',
            email: 'admin@sristyfamily.com',
            role: 'master_admin',
            status: 'active',
            bio: 'Root supervisor of Sristy Education Family Storage (Demo Local Session).',
            createdAt: new Date(),
          };
        } else if (isDemoBranchAdmin) {
          fallbackUser = {
            uid: 'local_branch_admin_uid',
            username: 'demo_branch_admin',
            fullName: 'Sristy Branch Administrator (Demo Bypass)',
            email: 'branchadmin@sristyfamily.com',
            role: 'admin',
            branch: 'Sristy Academic School, Tangail',
            status: 'active',
            bio: 'Branch Administrator for Sristy Academic School (Demo Local Session).',
            createdAt: new Date(),
          };
        } else if (isDemoTeacher) {
          fallbackUser = {
            uid: 'local_demo_teacher_uid',
            username: 'demo_teacher',
            fullName: 'Sristy Demo Teacher (Demo Bypass)',
            email: 'teacher@sristyfamily.com',
            role: 'teacher',
            branch: 'Sristy Academic School, Tangail',
            subject: 'ICT',
            status: 'active',
            bio: 'Verified Professional Educator at Sristy Education Family (Demo Local Session).',
            createdAt: new Date(),
          };
        } else {
          fallbackUser = {
            uid: 'local_demo_student_uid',
            username: 'demo_student',
            fullName: 'Sristy Demo Student (Demo Bypass)',
            email: 'student@sristyfamily.com',
            role: 'viewer',
            branch: 'Sristy College of Tangail',
            status: 'active',
            bio: 'Enthusiastic Student representative of Sristy Education Family (Demo Local Session).',
            createdAt: new Date(),
          };
        }

        localStorage.setItem('sristy_local_user', JSON.stringify(fallbackUser));
        setSuccessMsg(t("Welcome back") + ` (Local Bypass), ${fallbackUser.fullName}!`);
        setTimeout(() => {
          onAuthSuccess(fallbackUser);
        }, 800);
        return;
      }

      const rawErrStr = String(err.message || err.code || err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg(t("Authentication failed: Invalid credentials / incorrect key parameters."));
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(`${t("Email/Password credential registry is disabled in your Firebase console. Please go to your Firebase Console > Authentication > Sign-in method and enable the Email/Password provider. Alternatively, use our dynamic Local Bypass buttons below!")}`);
      } else if (rawErrStr.toLowerCase().includes('network') || rawErrStr.toLowerCase().includes('failed-to-get-redirect') || rawErrStr.toLowerCase().includes('network-request-failed')) {
        setErrorMsg(`${t("Failed to complete sign in due to network blockages. Please verify your internet/proxy settings, or alternatively click any 'Quick Sandbox / Demo Bypass Login' button below to explore the file portal layout offline instantly!")}`);
      } else {
        setErrorMsg(`${t("Failed to complete sign in. Please verify network settings or try again. Or click any 'Quick Sandbox / Demo Bypass Login' button below to log in offline instantly! Error detail:")} ${rawErrStr}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim() || !email.trim()) {
      setErrorMsg(t("Please fill in all mandatory field parameters."));
      return;
    }

    if (registerRole === 'teacher' && (!branch || selectedSubjects.length === 0)) {
      setErrorMsg(t("Teachers must specify an active branch and at least one teaching subject."));
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const lowerUsername = username.trim().toLowerCase();
      // Step 1: Check in Firestore first for name collision
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', lowerUsername));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setErrorMsg(t("Account registration error: Username is already reserved."));
        setLoading(false);
        return;
      }

      // Step 2: Register user dynamically inside standard Firebase Authentication credentials registry
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const customUid = credential.user.uid;

      // Step 3: Write profile payload to Firestore users document mapping
      const userRef = doc(db, 'users', customUid);
      const profilePayload: any = {
        uid: customUid,
        username: lowerUsername,
        password: password, // For administrative visual reset reference
        fullName: fullName.trim(),
        email: email.trim(),
        role: registerRole,
        status: 'active',
        createdAt: serverTimestamp(),
      };

      if (registerRole === 'teacher') {
        profilePayload.branch = branch;
        profilePayload.subjects = selectedSubjects;
        profilePayload.subject = selectedSubjects[0] || '';
      } else {
        if (branch) {
          profilePayload.branch = branch;
        }
      }

      await setDoc(userRef, profilePayload);

      setSuccessMsg(t("Profile created beautifully! Logging you into the archive system..."));
      setTimeout(() => {
        onAuthSuccess({
          uid: customUid,
          username: lowerUsername,
          fullName: fullName.trim(),
          email: email.trim(),
          role: registerRole,
          branch: profilePayload.branch,
          subjects: profilePayload.subjects,
          subject: profilePayload.subject,
          status: 'active',
          createdAt: new Date(),
        });
      }, 1000);

    } catch (err: any) {
      console.error("Firebase Registration Error Cascade: ", err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg(t("Registration failed: Email address is already registered to another account."));
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg(t("Registration failed: Password should be at least 6 characters long."));
      } else {
        setErrorMsg(t("Failed to register user. Ensure details are correct and try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6" id="sristy-auth-screen">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Sristy Logo Professional Solid Brand Color Bar */}
        <div className="w-full h-1 bg-[#15803d] select-none" />
        {/* Header Branding */}
        <div className="bg-[#15803d] p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>{t("Authorized Access Control Gateway")}</span>
          </div>
          <div className="flex justify-center mb-3">
            <img 
              src="https://sristy.edu.bd/wp-content/uploads/2018/12/Sristy.png.webp" 
              alt="Sristy Logo" 
              className="w-16 h-16 object-contain filter drop-shadow-md brightness-110 animate-duration-1000"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight mb-2 uppercase">{t("Sristy Education Family")}</h1>
          <p className="text-xs text-brand-50/80 max-w-xs mx-auto">
            {t("Note's Sector")}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 dark:border-slate-805 bg-gray-50/50 dark:bg-slate-950/20">
          <button
            onClick={() => { setTab('login'); setErrorMsg(''); }}
            className={`flex-1 py-4 text-center text-sm font-bold transition-all border-b-2 cursor-pointer ${
              tab === 'login' ? 'border-[#15803d] text-[#15803d] dark:text-[#4ade80] bg-white/20 dark:bg-slate-805/40' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {t("Sign In / Log In")}
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(''); }}
            className={`flex-1 py-4 text-center text-sm font-bold transition-all border-b-2 cursor-pointer ${
              tab === 'register' ? 'border-[#0ea5e9] text-[#0ea5e9] dark:text-[#38bdf8] bg-white/20 dark:bg-slate-805/40' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {t("Create Account")}
          </button>
        </div>

        {/* Auth Body Forms */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold leading-relaxed border border-red-100 dark:border-red-900/40">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold leading-relaxed border border-green-100 dark:border-green-900/40 animate-bounce">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t("Username / Identifier")}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 dark:text-gray-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("Enter registered username...")}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t("Password / Safe Key")}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 dark:text-gray-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("Enter password...")}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {loading ? t("Signing In...") : t("Sign In Gateway")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-slate-950/30 rounded-lg border border-gray-100 dark:border-slate-800 mb-2">
                <button
                  type="button"
                  onClick={() => setRegisterRole('viewer')}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                    registerRole === 'viewer' ? 'bg-white dark:bg-slate-750 text-brand-600 dark:text-brand-400 border border-gray-150 dark:border-slate-700 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                  }`}
                >
                  {t("Institutional Viewer (Student/Guest)")}
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('teacher')}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                    registerRole === 'teacher' ? 'bg-white dark:bg-slate-750 text-brand-600 dark:text-brand-400 border border-gray-150 dark:border-slate-700 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                  }`}
                >
                  {t("TeacherGroup") || t("Teacher / Instructor")}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("Username / Identifier")}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 dark:text-gray-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. adil_99"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("Full Name")}</label>
                <input
                   type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Md. Adil Hasan"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("Email Address") || "Email"}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 dark:text-gray-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., adil@sristyedu.com"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("Branch Assignment")}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 dark:text-gray-500 pointer-events-none">
                    <School className="w-4 h-4" />
                  </span>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-bold appearance-none cursor-pointer"
                    required={registerRole === 'teacher'}
                  >
                    <option value="">{t("Select Assigned Branch")}</option>
                    {BRANCHES.map((bName, idx) => (
                      <option key={idx} value={bName}>{t(bName)}</option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 dark:text-gray-500 pointer-events-none">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {registerRole === 'teacher' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                    {t("Assigned Teaching Subjects")} ({t("e.g. Bangla 1st, 2nd, History")})
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto space-y-2.5">
                    {SUBJECTS.map((sub, idx) => {
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
                    {t("Select one or multiple subjects you teach. At least one selection is required.")}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t("Portal Key / Password")}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 dark:text-gray-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("Enter password...")}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold text-sm py-3 rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {loading ? t("Creating Profile...") : t("Create Account")}
              </button>
            </form>
          )}

          {/* Quick Sandbox / Demo Bypass Options */}
          <div className="mt-6 pt-5 border-t border-gray-150 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-500 animate-pulse" />
              <span>{t("Quick Sandbox / Demo Bypass Login")}</span>
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 text-center leading-normal">
              {t("Having trouble with network configuration or Firebase Auth? Access test profiles instantly:")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleBypassLogin('super_admin')}
                className="px-1 py-1.5 bg-[#ca8a04]/10 hover:bg-[#ca8a04]/20 border border-[#ca8a04]/20 text-[#ca8a04] dark:text-[#fde047] rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
                title="Super Admin"
              >
                {t("Super Admin")}
              </button>
              <button
                type="button"
                onClick={() => handleBypassLogin('master_admin')}
                className="px-1 py-1.5 bg-[#eab308]/10 hover:bg-[#eab308]/20 border border-[#eab308]/20 text-[#a16207] dark:text-[#fef08a] rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
                title="Master Admin"
              >
                {t("Master Admin")}
              </button>
              <button
                type="button"
                onClick={() => handleBypassLogin('admin')}
                className="px-1 py-1.5 bg-[#15803d]/10 hover:bg-[#15803d]/20 border border-[#15803d]/20 text-[#15803d] dark:text-[#4ade80] rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
                title="Branch Admin"
              >
                {t("Branch Admin")}
              </button>
              <button
                type="button"
                onClick={() => handleBypassLogin('file_approver')}
                className="px-1 py-1.5 bg-[#15803d]/10 hover:bg-[#15803d]/20 border border-[#15803d]/20 text-[#15803d] dark:text-[#4ade80] rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
                title="File Approver"
              >
                {t("File Approver")}
              </button>
              <button
                type="button"
                onClick={() => handleBypassLogin('teacher')}
                className="px-1 py-1.5 bg-[#15803d]/10 hover:bg-[#15803d]/20 border border-[#15803d]/20 text-[#15803d] dark:text-[#4ade80] rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
                title="Teacher / Educator"
              >
                {t("Teacher")}
              </button>
              <button
                type="button"
                onClick={() => handleBypassLogin('viewer')}
                className="px-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer truncate"
                title="Student / Viewer"
              >
                {t("Student")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
