import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  BookOpen,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2
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

  // Custom board members imported via CSV
  const [customMembers, setCustomMembers] = useState<BoardMember[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Check which members are already active in the system
  const checkProvisionedAccounts = async () => {
    // Handled automatically via real-time stream listener in useEffect
  };

  // Fetch custom board members from Firestore
  const fetchCustomMembers = async () => {
    try {
      setLoadingCustom(true);
      const snap = await getDocs(collection(db, 'custom_board_members'));
      const members: BoardMember[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        members.push({
          id: docSnap.id,
          nameBangla: data.nameBangla || '',
          nameEnglish: data.nameEnglish || '',
          designationBangla: data.designationBangla || '',
          designationEnglish: data.designationEnglish || '',
          branch: data.branch || 'Sristy Academic School, Tangail',
          phone: data.phone || '',
          email: data.email || '',
          username: data.username || '',
          defaultPassword: data.defaultPassword || '',
          category: (data.category === 'SEB' ? 'SEB' : 'EB') as 'SEB' | 'EB',
          isCustom: true
        } as BoardMember);
      });
      members.sort((a, b) => a.nameEnglish.localeCompare(b.nameEnglish));
      setCustomMembers(members);
    } catch (e) {
      console.error("Error fetching custom board members:", e);
    } finally {
      setLoadingCustom(false);
    }
  };

  useEffect(() => {
    setLoadingStatuses(true);
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
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
      setLoadingStatuses(false);
    }, (err) => {
      console.error("Error checking active board members:", err);
      setLoadingStatuses(false);
    });

    fetchCustomMembers();

    return () => unsub();
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

  // CSV Parser and Import Helpers
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField);
    return result;
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const results: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        const headerKey = headers[j].trim().toLowerCase().replace(/[\s\(\)_.-]+/g, '');
        const val = j < values.length ? values[j].trim() : '';
        row[headerKey] = val;
      }
      if (Object.values(row).some(v => v)) {
        results.push(row);
      }
    }
    return results;
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = 
      "Name English,Name Bangla,Designation English,Designation Bangla,Branch,Phone,Email,Username,Password,Category\n" +
      "Dr. Atiqur Rahman,ড. আতিকুর রহমান,Adviser,উপদেষ্টা,Sristy Academic School Tangail,01711-223344,atiq.adviser@sristyedu.com,atiq_adviser,Sristy@2026,SEB\n" +
      "Engr. Mahmudul Hasan,ইঞ্জিনিয়ার মাহমুদুল হাসান,Coordinator,সমন্বয়কারী,Sristy Central School Gazipur,01711-556677,mahmud.coord@sristyedu.com,mahmud_coord,Sristy@2026,EB";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sristy_board_members_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        setIsImporting(true);
        const rows = parseCSV(text);
        if (rows.length === 0) {
          alert(t("No valid data found in CSV. Please check the template."));
          return;
        }

        let importCount = 0;
        for (const row of rows) {
          const nameEnglish = row.nameenglish || row.name || row.fullname || row.englishname || '';
          if (!nameEnglish) continue;

          const nameBangla = row.namebangla || row.banglaname || nameEnglish;
          const designationEnglish = row.designationenglish || row.designation || 'Board Member';
          const designationBangla = row.designationbangla || row.bangladesignation || designationEnglish;
          const branch = row.branch || 'Sristy Academic School, Tangail';
          const phone = row.phone || row.mobile || row.phonenumber || row.contact || '';
          const email = row.email || row.emailaddress || `${nameEnglish.toLowerCase().replace(/[^a-z0-9]/g, '')}.board@sristyedu.com`;
          const username = row.username || nameEnglish.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const defaultPassword = row.defaultpassword || row.password || row.temppassword || 'Sristy@2026';
          const category = (row.category?.toUpperCase() === 'SEB' ? 'SEB' : 'EB') as 'SEB' | 'EB';

          const memberId = `custom_${username}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

          const payload = {
            id: memberId,
            nameEnglish,
            nameBangla,
            designationEnglish,
            designationBangla,
            branch,
            phone,
            email,
            username,
            defaultPassword,
            category,
            isCustom: true,
            createdAt: serverTimestamp()
          };

          await setDoc(doc(db, 'custom_board_members', memberId), payload);
          importCount++;
        }

        if (importCount > 0) {
          await fetchCustomMembers();
          if (onSuccessMessage) {
            onSuccessMessage(t("Successfully imported {{count}} board members from CSV!").replace("{{count}}", importCount.toString()));
          } else {
            alert(t("Successfully imported custom board members!"));
          }
        } else {
          alert(t("No board members were imported. Please check your CSV column names."));
        }
      } catch (err) {
        console.error("Error importing CSV:", err);
        if (onErrorMessage) {
          onErrorMessage(t("Error importing CSV file."));
        } else {
          alert(t("Error importing CSV file."));
        }
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDeleteCustomMember = async (memberId: string) => {
    if (window.confirm(t("Are you sure you want to delete this custom board member from the ledger?"))) {
      try {
        await deleteDoc(doc(db, 'custom_board_members', memberId));
        setCustomMembers(prev => prev.filter(m => m.id !== memberId));
        if (onSuccessMessage) {
          onSuccessMessage(t("Successfully removed board member from directory."));
        }
      } catch (err) {
        console.error("Error deleting board member:", err);
        alert(t("Failed to delete board member."));
      }
    }
  };

  const handleClearAllCustomMembers = async () => {
    if (window.confirm(t("Are you sure you want to delete ALL custom imported board members? This cannot be undone."))) {
      try {
        setLoadingCustom(true);
        const snap = await getDocs(collection(db, 'custom_board_members'));
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'custom_board_members', docSnap.id));
        }
        setCustomMembers([]);
        if (onSuccessMessage) {
          onSuccessMessage(t("Successfully cleared all custom board members."));
        }
      } catch (err) {
        console.error("Error clearing board members:", err);
        alert(t("Failed to clear board members."));
      } finally {
        setLoadingCustom(false);
      }
    }
  };

  const filteredMembers = [...SRISTY_BOARD_MEMBERS, ...customMembers].filter(member => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      (member.nameEnglish && member.nameEnglish.toLowerCase().includes(term)) ||
      (member.nameBangla && member.nameBangla.toLowerCase().includes(term)) ||
      (member.phone && member.phone.includes(term)) ||
      (member.email && member.email.toLowerCase().includes(term)) ||
      (member.designationEnglish && member.designationEnglish.toLowerCase().includes(term)) ||
      (member.designationBangla && member.designationBangla.toLowerCase().includes(term)) ||
      (member.branch && member.branch.toLowerCase().includes(term));

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
        
        <div className="flex flex-wrap gap-2 shrink-0">
          {currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'master_admin') && (
            <button 
              onClick={() => setShowCSVImport(!showCSVImport)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                showCSVImport 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-750'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t("CSV Load System")}</span>
            </button>
          )}
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

      {/* CSV Load Dashboard Panel */}
      {showCSVImport && currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'master_admin') && (
        <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 animate-in slide-in-from-top-3 duration-200 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{t("Bulk Import Board Members via CSV")}</span>
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t("Upload a CSV file containing your custom board members. They will appear immediately in the directory list below.")}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSampleCSV}
                className="bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-750 dark:text-gray-200 font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-gray-150 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("Download CSV Template")}</span>
              </button>

              {customMembers.length > 0 && (
                <button
                  onClick={handleClearAllCustomMembers}
                  disabled={loadingCustom}
                  className="bg-red-50 hover:bg-red-100 text-red-650 font-bold text-[11px] px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("Clear All Custom")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-6 hover:border-emerald-500/40 dark:hover:border-emerald-500/20 transition-all flex flex-col items-center justify-center text-center gap-2.5 relative group bg-gray-50/20 dark:bg-slate-950/25">
            <Upload className="w-8 h-8 text-gray-300 group-hover:text-emerald-500 transition-colors animate-bounce" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {isImporting ? t("Parsing and saving members...") : t("Drag & Drop CSV file here, or click to browse")}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {t("Accepts standard .csv format with headers: Name English, Name Bangla, Designation English, Phone, etc.")}
              </p>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={isImporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          {customMembers.length > 0 && (
            <div className="bg-emerald-50/20 dark:bg-slate-950/20 border border-emerald-50 dark:border-slate-850 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t("Total Custom Imported Board Members:")} <strong>{customMembers.length}</strong></span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {t("These persist in Firestore and can be provisioned immediately.")}
              </span>
            </div>
          )}
        </div>
      )}

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
                        <span>{t("Active Branch Admin")}</span>
                      </span>
                    ) : (
                      <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 select-none">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        <span>{t("Branch Admin Not Setup")}</span>
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

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-850 flex items-center justify-center font-extrabold text-lg text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700 uppercase select-none shadow-xs">
                    {member.nameEnglish ? member.nameEnglish.charAt(0) : '?'}
                  </div>
                  {member.isCustom && currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'master_admin') && (
                    <button
                      onClick={() => handleDeleteCustomMember(member.id)}
                      title={t("Delete custom member")}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                            <span>{t("Provision Branch Admin")}</span>
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
