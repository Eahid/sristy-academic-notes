import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, createSecondaryUser } from '../firebase';
import { safeLocalStorage, forceClearSystemCache } from '../utils';
import { UserProfile, UserRole } from '../types';
import { BRANCHES, SUBJECTS } from '../constants';
import { Lock, User, Mail, School, BookOpen, AlertCircle, Sparkles, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
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
  const [logoFailed, setLogoFailed] = useState(false);
  const { t } = useThemeLanguage();

  React.useEffect(() => {
    const seedSuperAdmin = async () => {
      try {
        const superAdminEmail = 'superadmin@sristynotes.com';
        const superAdminPass = 'Hello@2026';
        
        const q = query(collection(db, 'users'), where('email', '==', superAdminEmail), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          console.log("Seeding super admin account...");
          const uid = await createSecondaryUser(superAdminEmail, superAdminPass);
          
          await setDoc(doc(db, 'users', uid), {
            uid,
            username: 'superadmin',
            fullName: 'Sristy Super Admin',
            email: superAdminEmail,
            role: 'super_admin',
            status: 'active',
            password: superAdminPass,
            bio: 'Global Root Supervisor of Sristy Education Family Storage.',
            createdAt: serverTimestamp(),
          });
          console.log("Super admin seeded successfully.");
        }
      } catch (e) {
        console.warn("Seeding super admin check/create finished or caught expected error:", e);
      }
    };
    seedSuperAdmin();
  }, []);

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

      // Direct mapping for superadmin to bypass Firestore lookup on seed/first-run
      if (targetEmail === 'superadmin' || targetEmail === 'superadmin@sristynotes.com') {
        targetEmail = 'superadmin@sristynotes.com';
        lookedUpUsername = 'superadmin';
      }

      // If it doesn't look like an email pattern, resolve it from the users collection
      if (targetEmail.indexOf('@') === -1) {
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

      // Try actual official Firebase Auth validation with dynamic registration fallback
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      } catch (signInErr: any) {
        // If it is the designated superadmin credentials, register on-the-fly if not found
        if (targetEmail === 'superadmin@sristynotes.com' && password === 'Hello@2026') {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password);
          } catch (createErr) {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      }
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

      if (!matchedUser && userObj.email === 'superadmin@sristynotes.com') {
        // Fallback or automatic creation of Super Admin profile
        matchedUser = {
          uid: userObj.uid,
          username: 'superadmin',
          fullName: 'Sristy Super Admin',
          email: 'superadmin@sristynotes.com',
          role: 'super_admin',
          status: 'active',
          bio: 'Global Root Supervisor of Sristy Education Family Storage.',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, {
          uid: matchedUser.uid,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          email: matchedUser.email,
          role: matchedUser.role,
          status: matchedUser.status,
          password: 'Hello@2026',
          bio: matchedUser.bio,
          createdAt: serverTimestamp(),
        });
      } else if (!matchedUser && (userObj.email === 'eahidhasan@gmail.com' || userObj.email === 'admin@sristyfamily.com')) {
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

      const rawErrStr = String(err.message || err.code || err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg(t("Authentication failed: Invalid credentials / incorrect key parameters."));
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(`${t("Email/Password credential registry is disabled in your Firebase console. Please go to your Firebase Console > Authentication > Sign-in method and enable the Email/Password provider.")}`);
      } else if (rawErrStr.toLowerCase().includes('network') || rawErrStr.toLowerCase().includes('failed-to-get-redirect') || rawErrStr.toLowerCase().includes('network-request-failed')) {
        setErrorMsg(`${t("Failed to complete sign in due to network blockages. Please verify your internet/proxy settings.")}`);
      } else {
        setErrorMsg(`${t("Failed to complete sign in. Please verify network settings or try again. Error detail:")} ${rawErrStr}`);
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

      setSuccessMsg(t("Profile created beautifully! Logging you into the note's system..."));
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
    <div className="w-full" id="sristy-auth-screen">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors mx-auto">
        {/* Sristy Logo Professional Solid Brand Color Bar */}
        <div className="w-full h-1 bg-[#15803d] select-none" />
        {/* Header Branding */}
        <div className="bg-[#15803d] p-4 sm:p-8 text-center text-white relative">
          <div className="flex justify-center mb-3">
            {logoFailed ? (
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
                <School className="w-10 h-10" />
              </div>
            ) : (
              <img 
                src="https://sristy.edu.bd/wp-content/uploads/2018/12/Sristy.png.webp" 
                alt="Sristy Logo" 
                className="w-16 h-16 object-contain filter drop-shadow-md brightness-110"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight mb-2 uppercase">{t("Sristy Education Family")}</h1>
          <p className="text-xs text-brand-50/80 max-w-xs mx-auto">
            {t("Note's Sector")}
          </p>
        </div>

        {/* Auth Body Forms */}
        <div className="p-4 sm:p-8">
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

          {/* Stale Cache Help Center section */}
          <div className="mt-6 pt-5 border-t border-gray-150 dark:border-slate-800 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">
              {t("Updates not showing up or having trouble signing in?")}
            </p>
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm(t("If you cannot see the latest updates, please click below to force clear system cache and fetch the newest version."));
                if (confirmed) {
                  forceClearSystemCache();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin-slow" style={{ animationDuration: '6s' }} />
              <span>{t("Clear App Cache")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
