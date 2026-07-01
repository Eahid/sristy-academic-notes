import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, createSecondaryUser } from '../firebase';
import { SRISTY_BOARD_MEMBERS, BoardMember } from '../data/boardMembers';
import { useThemeLanguage } from './ThemeLanguageContext';
import { 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Phone, 
  Mail, 
  Building2, 
  Search, 
  Key, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  Sparkles,
  Users,
  Copy,
  Printer,
  BookOpen
} from 'lucide-react';
import { UserProfile } from '../types';

interface SristyBoardDirectoryProps {
  currentUser: UserProfile | null;
  onRefreshAdmins?: () => void;
  onSuccessMessage?: (msg: string) => void;
  onErrorMessage?: (msg: string) => void;
}

export default function SristyBoardDirectory({ 
  currentUser,
  onRefreshAdmins,
  onSuccessMessage,
  onErrorMessage
}: SristyBoardDirectoryProps) {
  const { t, language } = useThemeLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'SEB' | 'EB'>('all');
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [provisionedUsernames, setProvisionedUsernames] = useState<Record<string, { uid: string, status: string }>>({});
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check which members are already active in the system
  const checkProvisionedAccounts = async () => {
    try {
      setLoadingStatuses(true);
      const snap = await getDocs(collection(db, 'users'));
      const activeMap: Record<string, { uid: string, status: string }> = {};
      
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.username) {
          activeMap[data.username.toLowerCase()] = {
            uid: docSnap.id,
            status: data.status || 'active'
          };
        }
      });
      setProvisionedUsernames(activeMap);
    } catch (e) {
      console.error("Error checking active board members:", e);
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    checkProvisionedAccounts();
  }, []);

  const handleCopyCredentials = (member: BoardMember) => {
    const credText = `Sristy Portal Access:\nUsername: ${member.username}\nTemporary Password: ${member.defaultPassword}\nBranch: ${member.branch}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleProvisionMember = async (member: BoardMember) => {
    const isMasterOrSuper = currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'master_admin');
    if (!isMasterOrSuper) {
      alert(t("Permission denied. Only Master or Super Administrators can register Branch Admins."));
      return;
    }

    if (window.confirm(t("Are you sure you want to provision a central Branch Admin account for {{name}}?").replace("{{name}}", member.nameEnglish))) {
      try {
        setProvisioningId(member.id);
        const authUid = await createSecondaryUser(member.email, member.defaultPassword);
        
        const payload = {
          uid: authUid,
          username: member.username,
          password: member.defaultPassword, // For portal references/password help
          fullName: member.nameEnglish,
          email: member.email,
          role: member.category === 'SEB' && member.id === 'ripon_seb' ? 'super_admin' : 'admin',
          branch: member.branch,
          status: 'active',
          phone: member.phone,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', authUid), payload);
        
        await checkProvisionedAccounts();
        if (onRefreshAdmins) onRefreshAdmins();
        if (onSuccessMessage) {
          onSuccessMessage(t("Successfully provisioned admin account for {{name}}!").replace("{{name}}", member.nameEnglish));
        } else {
          alert(t("Successfully provisioned account!"));
        }
      } catch (err: any) {
        console.error(err);
        let msg = t("Failed to provision account. Email/username might be occupied.");
        if (err.code === 'auth/email-already-in-use') {
          msg = t("Email address is already in use by another active account.");
        }
        if (onErrorMessage) onErrorMessage(msg);
        else alert(msg);
      } finally {
        setProvisioningId(null);
      }
    }
  };

  const filteredMembers = SRISTY_BOARD_MEMBERS.filter(member => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      member.nameEnglish.toLowerCase().includes(term) ||
      member.nameBangla.includes(term) ||
      member.phone.includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.designationEnglish.toLowerCase().includes(term) ||
      member.designationBangla.includes(term) ||
      member.branch.toLowerCase().includes(term);

    const matchesCategory = categoryFilter === 'all' || member.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="board-directory-container">
      {/* Header Info Panel */}
      <div className="bg-gradient-to-r from-emerald-800 to-green-700 dark:from-emerald-950 dark:to-green-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("Supreme Governing Body")}</span>
            </span>
            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t("Verified Branch Admins")}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display leading-tight">
            {language === 'bn' ? "সৃষ্টি গভর্নিং বডি ও শাখা এডমিন ডিরেক্টরি" : "Sristy Governing Body & Branch Admins Directory"}
          </h2>
          <p className="text-xs text-green-100/80 max-w-xl mt-1 leading-relaxed">
            {language === 'bn' 
              ? "সৃষ্টি শিক্ষা পরিবারের কেন্দ্রীয় সুপ্রিম ও এক্সিকিউটিভ বোর্ডের সম্মানিত সদস্যবৃন্দের তালিকা। মাস্টার বা সুপার এডমিন সরাসরি এই তালিকা থেকে তাদেরকে শাখা এডমিন হিসেবে সিস্টেমে তালিকাভুক্ত করতে পারবেন।"
              : "Official directory of the Sristy Education Family's Supreme Executive Body and Executive Body. Master/Super Admins can directly provision branch admin accounts from this verified ledger."}
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={checkProvisionedAccounts}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <span>{t("Refresh Status")}</span>
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-white text-emerald-850 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t("Print Directory")}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'bn' ? "নাম, পদবী বা শাখা খুঁজুন..." : "Search by name, designation, branch..."}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold text-gray-700 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hidden sm:inline">{t("Filter Body")}:</span>
          <div className="grid grid-cols-3 gap-1 bg-gray-50 dark:bg-slate-850 p-1 rounded-lg border border-gray-100 dark:border-slate-800 w-full md:w-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                categoryFilter === 'all' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t("All Members")}
            </button>
            <button
              onClick={() => setCategoryFilter('SEB')}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                categoryFilter === 'SEB' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              SEB ({t("Supreme")})
            </button>
            <button
              onClick={() => setCategoryFilter('EB')}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                categoryFilter === 'EB' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              EB ({t("Executive")})
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid md:grid-cols-2 gap-6" id="board-directory-grid">
        {filteredMembers.map((member) => {
          const isProvisioned = !!provisionedUsernames[member.username.toLowerCase()];
          const statusInfo = provisionedUsernames[member.username.toLowerCase()];
          const isCurrentProvisioning = provisioningId === member.id;
          const isCopied = copiedId === member.id;

          return (
            <div 
              key={member.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
                isProvisioned 
                  ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/5' 
                  : 'border-gray-150 dark:border-slate-800'
              } hover:shadow-md hover:border-emerald-500/30 dark:hover:border-emerald-500/20`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide border ${
                      member.category === 'SEB'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30'
                    }`}>
                      {member.category === 'SEB' ? "সুপ্রিম এক্সিকিউটিভ (SEB)" : "এক্সিকিউটিভ বডি (EB)"}
                    </span>

                    {loadingStatuses ? (
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                    ) : isProvisioned ? (
                      <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 select-none">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{t("Active Admin")}</span>
                      </span>
                    ) : (
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 select-none">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        <span>{t("Not Setup")}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                    {language === 'bn' ? member.nameBangla : member.nameEnglish}
                    {language === 'bn' && member.nameEnglish !== member.nameBangla && (
                      <span className="block text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">{member.nameEnglish}</span>
                    )}
                  </h3>

                  <p className="text-xs font-bold text-brand-600 dark:text-brand-400 leading-normal flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                    <span>{language === 'bn' ? member.designationBangla : member.designationEnglish}</span>
                  </p>
                </div>

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-850 flex items-center justify-center font-extrabold text-lg text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700 uppercase select-none shadow-xs shrink-0">
                  {member.nameEnglish.charAt(0)}
                </div>
              </div>

              {/* Contacts Block */}
              <div className="bg-gray-50/70 dark:bg-slate-950/40 p-3 rounded-xl border border-gray-100/60 dark:border-slate-850/80 text-[11px] space-y-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono font-semibold">{member.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate" title={member.email}>{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 pt-1.5 border-t border-gray-100 dark:border-slate-850">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate font-semibold text-gray-700 dark:text-gray-200">{t(member.branch)}</span>
                </div>
              </div>

              {/* Actions Box */}
              {currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'master_admin') ? (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-50 dark:border-slate-800">
                  <div className="text-[10px] text-gray-400">
                    <span className="font-semibold block">{t("Access Username")}:</span>
                    <span className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{member.username}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isProvisioned ? (
                      <>
                        <button
                          onClick={() => handleCopyCredentials(member)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                            isCopied 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20' 
                              : 'bg-white hover:bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                          <span>{isCopied ? t("Copied!") : t("Copy Auth")}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleProvisionMember(member)}
                        disabled={isCurrentProvisioning}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isCurrentProvisioning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{t("Setting Up...")}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{t("Provision Admin")}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Standard Viewer Access - copy contacts button */
                <div className="flex justify-end pt-1.5 border-t border-gray-50 dark:border-slate-850">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${member.nameEnglish} - ${member.phone}`);
                      setCopiedId(member.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="text-brand-500 hover:text-brand-605 text-[10px] font-bold uppercase flex items-center gap-1 focus:outline-none cursor-pointer"
                  >
                    <span>{copiedId === member.id ? t("Copied Contact!") : t("Copy Contact")}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400 dark:text-gray-550 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
            <Users className="w-10 h-10 mx-auto text-gray-305 stroke-1 mb-2" />
            <p className="text-xs font-semibold">{t("No matching members found.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
