import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeLanguage } from './ThemeLanguageContext';
import { 
  Shield, 
  Database, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Sliders, 
  HardDrive,
  Users,
  Eye,
  BookOpen,
  Building,
  CheckCircle,
  Cpu,
  Lock,
  Unlock,
  Info
} from 'lucide-react';

interface RoleOption {
  id: string;
  labelEn: string;
  labelBn: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
}

interface ActionOption {
  id: string;
  titleEn: string;
  titleBn: string;
  icon: React.ComponentType<any>;
}

export default function UserSystemDiagram() {
  const { language, t } = useThemeLanguage();

  // State for simulator
  const [selectedRole, setSelectedRole] = useState<string>('teacher');
  const [selectedAction, setSelectedAction] = useState<string>('upload_notes');

  // State for Storage Planner
  const [pdfCount, setPdfCount] = useState<number>(30);
  const [pptCount, setPptCount] = useState<number>(8);
  const [docCount, setDocCount] = useState<number>(20);
  const [imgCount, setImgCount] = useState<number>(12);

  const roles: RoleOption[] = [
    { id: 'viewer', labelEn: 'Student / Viewer', labelBn: 'শিক্ষার্থী / ভিজিটর', icon: Eye, color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10' },
    { id: 'teacher', labelEn: 'Teacher / Instructor', labelBn: 'শিক্ষক / প্রশিক্ষক', icon: BookOpen, color: 'text-indigo-505', bg: 'bg-indigo-500/10' },
    { id: 'file_approver', labelEn: 'File Approver', labelBn: 'মডারেটর / সমন্বয়কারী', icon: CheckCircle, color: 'text-teal-605', bg: 'bg-teal-500/10' },
    { id: 'admin', labelEn: 'Branch Admin', labelBn: 'শাখা অ্যাডমিনিস্ট্রেটর', icon: Building, color: 'text-[#15803d]', bg: 'bg-[#15803d]/10' },
    { id: 'master_admin', labelEn: 'Master Admin', labelBn: 'মাস্টার অ্যাডমিন', icon: Shield, color: 'text-amber-605', bg: 'bg-amber-500/10' },
    { id: 'super_admin', labelEn: 'Super Admin', labelBn: 'সুপার এডমিন (মালিক)', icon: Cpu, color: 'text-purple-605', bg: 'bg-purple-500/10' },
  ];

  const actions: ActionOption[] = [
    { id: 'view_download', titleEn: 'View & Download Lecture Sheets', titleBn: 'লেকচার শিট ডাউনলোড ও অধ্যয়ন', icon: FileText },
    { id: 'upload_notes', titleEn: 'Upload New Resource Files (Max 2MB)', titleBn: 'নতুন ফাইল আপলোড (সর্বোচ্চ ২ মেগাবাইট)', icon: Database },
    { id: 'approve_branch', titleEn: 'Verify & Approve Uploaded Notes', titleBn: 'আপলোডকৃত নোট অনুমোদন ও যাচাই', icon: CheckCircle2 },
    { id: 'manage_teachers', titleEn: 'Manage Faculty Teacher Accounts', titleBn: 'শিক্ষক অ্যাকাউন্ট নিবন্ধন ও পরিচালনা', icon: Users },
    { id: 'trash_restore', titleEn: 'Recover Trash Files (30-Day Window)', titleBn: 'মুছে ফেলা ফাইল ট্র্যাশ থেকে উদ্ধার', icon: Sliders },
    { id: 'hard_delete', titleEn: 'Permanently Erase Server Storage Files', titleBn: 'চিরতরে ফাইল ধ্বংসকরণ (হার্ড ডিলিট)', icon: XCircle },
  ];

  const permissionMatrix: Record<string, Record<string, { allowed: boolean; descEn: string; descBn: string }>> = {
    viewer: {
      view_download: {
        allowed: true,
        descEn: "Student accounts possess standard read-only clearance. They can search, view, preview and download all verified materials of all branches seamlessly.",
        descBn: "শিক্ষার্থী এবং অতিথিরা কোনো প্রকার বাধ্যবাধকতা ছাড়াই যেকোনো অনুমোদিত ফাইল দেখতে এবং সফলভাবে ডাউনলোড করতে পারবেন।"
      },
      upload_notes: {
        allowed: false,
        descEn: "Denied. Student viewers are not authorized to upload documents, add folders, or consume server-side workspace storage. Upgrade to teacher profile is required.",
        descBn: "প্রত্যাখ্যাত। সাধারণ শিক্ষার্থীদের সিস্টেমে কোনো নতুন পরীক্ষা ফাইল আপলোড করার বা ডিরেক্টরি ডেটা পরিবর্তনের ক্ষমতা নেই।"
      },
      approve_branch: {
        allowed: false,
        descEn: "Access Restricted. Toggling the approval status of files requires official File Approver or Branch Admin credentials.",
        descBn: "অনুমতি নেই। আপলোডকৃত লেকচার শিট অনুমোদন বা ডিনাই করার ক্ষমতা শুধুমাত্র দায়িত্বপ্রাপ্ত কর্মকর্তা বা এডমিনদের রয়েছে।"
      },
      manage_teachers: {
        allowed: false,
        descEn: "Access Denied. Registering, configuring, suspending, or managing teacher credentials is restricted strictly to Branch Admins.",
        descBn: "অনুরোধ নাকচ। সৃষ্টি পোর্টালে শিক্ষকদের অ্যাকাউন্ট তৈরি বা অ্যাক্টিভেশন কার্ড বাতিল করার সুযোগ সাধারণ শিক্ষার্থীদের দেওয়া হয়নি।"
      },
      trash_restore: {
        allowed: false,
        descEn: "Access Restricted. Recycle bin database entries and temporary trash records are private to administrative management.",
        descBn: "প্রবেশাধিকার নেই। মুছে ফেলা ফাইল ট্র্যাশ বা রিসাইকেল বিন থেকে পুনরায় উদ্ধার করতে শাখা অ্যাডমিনিস্ট্রেটরদের সাহায্য প্রয়োজন।"
      },
      hard_delete: {
        allowed: false,
        descEn: "Permanently deleting files from cloud server arrays requires root Super-Administrator credentials with private governance keys.",
        descBn: "চিরতরে ফাইল মুছে ফেলার কাজ শুধুমাত্র কেন্দ্রীয় পরিচালনা পর্ষদের সুপার এডমিনের জন্য সংরক্ষিত রয়েছে।"
      }
    },
    teacher: {
      view_download: {
        allowed: true,
        descEn: "Teachers can fully browse, preview, and extract learning files from any subject division or parent campus.",
        descBn: "শিক্ষকগণ সফলভাবে যেকোনো বিষয়ের লেকচার শিট এবং অন্যান্য টিচারদের শেয়ার করা কন্টেন্ট ব্রাউজ ও ডাউনলোড করতে পারবেন।"
      },
      upload_notes: {
        allowed: true,
        descEn: "Allowed inside SLA Clause 11.2. Teachers can upload lesson plans, question sheets, and classroom presentations up to 2MB in file size.",
        descBn: "অনুমোদিত। চুক্তির ধারা ১১.২ অনুযায়ী শিক্ষকরা অনূর্ধ্ব ২এমবি আকারের যেকোনো স্টাডি শিট ও লেকচার স্লাইড পোস্ট করতে পারবেন।"
      },
      approve_branch: {
        allowed: false,
        descEn: "Denied. Teachers can upload, but they cannot self-approve their own files or verify peer files. Admins or Approvers must review.",
        descBn: "অনুমতি নেই। শিক্ষকবৃন্দ নিজের আপলোড করা ফাইল সরাসরি অনুমোদন দিতে পারবেন না, এটি শাখা পরিচালক বা অনুমোদকের রিভিউ সাপেক্ষে প্রকাশিত হবে।"
      },
      manage_teachers: {
        allowed: false,
        descEn: "Access Denied. Class faculty members can configure their personal bio and avatars, but cannot register, alter, or delete other users.",
        descBn: "প্রত্যাখ্যাত। শিক্ষকরা নিজস্ব প্রোফাইল ব্যতীত সিস্টেমের অন্যান্য সহকর্মী শিক্ষকদের অ্যাকাউন্টে হস্তক্ষেপ করতে পারবেন না।"
      },
      trash_restore: {
        allowed: false,
        descEn: "Restricted. If a teacher deletes a file, it enters the branch 30-day recycling storage. It can only be recovered by the Branch Admin.",
        descBn: "অনুমতি সংরক্ষিত। শিক্ষক ফাইল মুছে ফেললে তা ট্র্যাশ বিনে জমা থাকে এবং ফাইলটি পুনরায় উদ্ধার করতে শাখা অ্যাডমিনকে অনুরোধ করতে হবে।"
      },
      hard_delete: {
        allowed: false,
        descEn: "Teachers have zero clearance to execute manual permanent hard delete operations, preventing accidental physical storage loss.",
        descBn: "অ্যাক্সেস ব্লকড। সৃষ্টি সার্ভার থেকে ফাইল চিরতরে মুছে ফেলার কোনো ক্ষমতাই শিক্ষকদের সাধারণ ড্যাশবোর্ডে অর্পণ করা হয়নি।"
      }
    },
    file_approver: {
      view_download: {
        allowed: true,
        descEn: "Approvers can verify, preview, and download any uploaded files to assure educational content accuracy and format integrity.",
        descBn: "অনুমোদিত। ফাইল অনুমোদনকারীগণ যেকোনো স্টাডি শিট ডাউনলোড করে এর বিষয়বস্তুর সঠিকতা এবং মান যাচাই করতে পারবেন।"
      },
      upload_notes: {
        allowed: true,
        descEn: "Approvers inherit teacher privileges and can also compose, upload, and update lesson files.",
        descBn: "অনুমোদিত। দায়িত্বপ্রাপ্ত অনুমোদকগণ ফাইল আপলোডারের মাধ্যমে শিক্ষক হিসেবে পোর্টালে লেকচার কন্টেন্ট সরাসরি আপলোড করতে পারেন।"
      },
      approve_branch: {
        allowed: true,
        descEn: "Granted! File Approvers possess full clearance to toggle the approval states of materials within their specified branch of Sristy Family.",
        descBn: "অনুমোদিত। ফাইল অনুমোদনকারীদের নিজ শাখার সকল আপলোডকৃত ফাইল তাৎক্ষণিক অনুমোদন ও বাতিল করার প্রত্যক্ষ ক্ষমতা রয়েছে।"
      },
      manage_teachers: {
        allowed: false,
        descEn: "Access Restricted. Registering teacher accounts or altering campus roster profiles is restricted to administrative branch heads.",
        descBn: "সীমাবদ্ধ। মডারেটর বা অনুমোদকদের সিস্টেমে শিক্ষকদের আইডি বা রেজিস্ট্রেশন ফাইল এডিট করার ক্ষমতা প্রদান করা হয়নি।"
      },
      trash_restore: {
        allowed: false,
        descEn: "While Approvers can suggest or deny files, indexing or restoring from the Recycle bin is handled exclusively by Branch Admins.",
        descBn: "অ্যাক্সেস নেই। রিসাইকেল বিন বা মুছে ফেলা ফাইল ট্র্যাশ ক্যাশে থেকে উদ্ধার করার প্রশাসনিক সুবিধা অনুমোদকের আওতাভুক্ত নয়।"
      },
      hard_delete: {
        allowed: false,
        descEn: "Toggling file destruction is strictly blocked to prevent uncoordinated database gaps across different campuses.",
        descBn: "অনুমতি নেই। সৃষ্টি পরিবারের ডিজিটাল কন্টেন্ট বা ডাটা সার্ভার থেকে পুরোপুরি ধ্বংস করার অ্যাক্সেস ব্লক রয়েছে।"
      }
    },
    admin: {
      view_download: {
        allowed: true,
        descEn: "Branch Admins maintain full transparency over all branch resources (and can browse verified files of other branches too).",
        descBn: "অনুমোদিত। শাখা অ্যাডমিনিস্ট্রেটর হিসেবে আপনি যেকোনো শিক্ষকের ফাইল ব্রাউজ করতে, পড়তে এবং নিজের ক্যাম্পাসে ব্যবহার করতে পারেন।"
      },
      upload_notes: {
        allowed: true,
        descEn: "Branch Admins can upload resources directly, bypassing approval states and publishing directly into Sristy local search index.",
        descBn: "অনুমোদিত। শাখা এডমিন হিসেবে আপনি সরাসরি ফাইল আপলোড করতে পারেন, যা কোনো প্রকার রিভিউর মুখোমুখি না হয়ে সরাসরি প্রকাশিত হয়।"
      },
      approve_branch: {
        allowed: true,
        descEn: "Granted. Fully authorized to supervise branch queues, verify uploads, and approve pending study files.",
        descBn: "অনুমোদিত। নিজের শাখার যেকোনো পেন্ডিং স্লাইড বা শিট পর্যালোচনা করে লাইভে অনুমোদন সাপেক্ষে প্রকাশ করার ক্ষমতা আছে।"
      },
      manage_teachers: {
        allowed: true,
        descEn: "Authorized. Branch Admins can register local teachers, map their teaching subjects, and toggle active/suspend status.",
        descBn: "অনুমোদিত। শাখা এডমিন তার নিজস্ব ক্যাম্পাসের শিক্ষকদের নিবন্ধন, বিষয়ের অর্পণ এবং পোর্টাল অ্যাক্সেস সফলভাবে নিয়ন্ত্রণ করতে পারবেন।"
      },
      trash_restore: {
        allowed: true,
        descEn: "SLA Clause 14 Compliant. Full 30-day restore clearance for any academic resources deleted within their campus portal.",
        descBn: "অনুমোদিত। অডিট ধারা ১৪ অনুযায়ী শাখা এডমিন তার ক্যাম্পাসের মুছে যাওয়া ফাইল ৩০ দিনের মধ্যে সফলভাবে ট্র্যাশ থেকে পুনরুদ্ধার করতে পারবেন।"
      },
      hard_delete: {
        allowed: false,
        descEn: "Restricted. Branch Admins can only soft-delete files into the Recycle Bin. Permanent hard deletion is restricted to Super Admin.",
        descBn: "নিষেধাজ্ঞা রয়েছে। আপনি কন্টেন্ট কেবল ট্র্যাশ বিনে সরাতে পারেন। চিরতরে ফাইল মোছার চূড়ান্ত অধিকারের চাবিটি সুপার এডমিন স্তরে নিহিত।"
      }
    },
    master_admin: {
      view_download: {
        allowed: true,
        descEn: "Master governance clearance allows limitless browse and validation access across all database indexes globally.",
        descBn: "অনুমোদিত। মাষ্টার অ্যাডমিন হিসেবে সাধারণ কোনো ক্যাম্পাসের সীমানা নেই, দেশের সকল ব্রাঞ্চের যেকোনো ফাইল ডেটা সফলভাবে ডাউনলোড করতে পারবেন।"
      },
      upload_notes: {
        allowed: true,
        descEn: "Can upload central guidelines, notices, exam announcements, and global policy documents anytime.",
        descBn: "অনুমোদিত। কেন্দ্রীয় সমন্বয়কারী বা মাষ্টার এডমিন যেকোনো গ্লোবাল শিক্ষানীতি ফাইল পোর্টালে সরাসরি আপলোড করতে পারবেন।"
      },
      approve_branch: {
        allowed: true,
        descEn: "Granted! Possesses cross-branch administrative approvals to clear any pending files across all system branches.",
        descBn: "অনুমোদিত। যেকোনো শাখার পেন্ডিং ফাইলসমূহ সরাসরি ভেরিফাই করার এবং চূড়ান্ত অনুমোদনের বৈশ্বিক বিশেষাধিকার রয়েছে।"
      },
      manage_teachers: {
        allowed: true,
        descEn: "Can register, review, and supervise branch leads, mod creators, and general faculty profiles globally.",
        descBn: "অনুমোদিত। যেকোনো শাখার শিক্ষক বা পরিচালকদের তালিকা পর্যবেক্ষণ করার এবং সক্রিয় অ্যাকশনসমূহ নিয়ন্ত্রণ করার সুবিধা রয়েছে।"
      },
      trash_restore: {
        allowed: true,
        descEn: "SLA Clause 14 Compliant. Master Admins can access and restore deleted files across all branches.",
        descBn: "অনুমোদিত। সব ক্যাম্পাসের মুছে ফেলা পড়াশোনার মেটেরিয়াল ৩০ দিনের পুনরুদ্ধার সীমা পেরিয়ে যাওয়ার পূর্বে রিস্টোর করতে সক্ষম।"
      },
      hard_delete: {
        allowed: false,
        descEn: "Restricted. Hard delete triggers are isolated to Super Admin credentials to assure global database snapshot safety.",
        descBn: "সীমাবদ্ধ। সার্ভার বা ডেটাবেজ ক্ল্যাশ এড়াতে গ্লোবাল মাষ্টার অ্যাডমিনকেও চিরতরে ডাটা হার্ড ডিলিট করার অ্যাক্সেস দেওয়া হয়নি।"
      }
    },
    super_admin: {
      view_download: {
        allowed: true,
        descEn: "Root Supervisor has absolute reading clearance across the entire system infrastructure. Maximum privilege.",
        descBn: "অনুমোদিত। রুট প্রধান হিসেবে সিস্টেমের সকল কন্টেন্ট, ডেটা এবং প্রাইভেট মেটাডাটাতে শতভাগ পড়ার সুযোগ রয়েছে।"
      },
      upload_notes: {
        allowed: true,
        descEn: "Root Supervisor possesses absolute upload and update permissions over files, templates, and archives.",
        descBn: "অনুমোদিত। যেকোনো আকারের ফাইল এবং কেন্দ্রীয় নির্দেশনাবলী সরাসরি সিস্টেমে এম্বেড ও রেকর্ড করার অনুমোদন আছে।"
      },
      approve_branch: {
        allowed: true,
        descEn: "Root Supervisor has absolute approval privileges over all academic resources across Sristy Family.",
        descBn: "অনুমোদিত। যেকোনো শাখায় পেন্ডিং থাকা ফাইল বা বিজ্ঞপ্তি এক ক্লিকেই লাইভ ডাটাবেজে কনফার্ম করতে সক্ষম।"
      },
      manage_teachers: {
        allowed: true,
        descEn: "Root Supervisor holds central control over all master, admin, teacher, and viewer profiles in Firestore.",
        descBn: "অনুমোদিত। সিস্টেমের সকল অ্যাডমিনিস্ট্রেটরদের নিবন্ধন, সাসপেন্ড এবং মুছে ফেলার রুট ও চূড়ান্ত ক্ষমতা রয়েছে।"
      },
      trash_restore: {
        allowed: true,
        descEn: "Root Supervisor has absolute retrieval authorization across all branch recycling bins without restriction.",
        descBn: "অনুমোদিত। যেকোনো শাখার ট্র্যাশ বিন থেকে মুছে যাওয়া রিসোর্স ও অডিট ইনফরমেশন পুনরুদ্ধার করতে পারেন।"
      },
      hard_delete: {
        allowed: true,
        descEn: "Granted! Super Admins possess the exclusive keys to permanently hard-delete files from Sristy server arrays, clearing physical size.",
        descBn: "অনুমোদিত! সুপার এডমিন একচেটিয়া ক্রিপ্টোগ্রাফিক চাবি দিয়ে রুল ফিল খতম করে ক্লাউড থেকে চিরতরে ফাইল ডিলিট করতে পারবেন।"
      }
    }
  };

  // Calculate projected sizes for storage planner
  const avgPDF = 1.5; // MB
  const avgPPT = 5.0; // MB
  const avgDOC = 0.8; // MB
  const avgIMG = 1.2; // MB

  const totalEstimatedStorage = (
    (pdfCount * avgPDF) + 
    (pptCount * avgPPT) + 
    (docCount * avgDOC) + 
    (imgCount * avgIMG)
  ).toFixed(1);

  const quotaLimit = 150; // MB quota per branch free tier
  const storagePercentage = Math.min((parseFloat(totalEstimatedStorage) / quotaLimit) * 100, 100);

  // Status message for quota
  const getStorageStatus = () => {
    const val = parseFloat(totalEstimatedStorage);
    if (val < 60) {
      return {
        textEn: "🍀 Sristy Cloud Optimal. Plenty of storage overhead remaining under Sristy SLA Contract.",
        textBn: "🍀 সৃষ্টি ক্লাউড চমৎকার। সৃষ্টি এসএলএ নীতি অনুযায়ী আপনার শাখায় পর্যাপ্ত স্টোর খালি রয়েছে।",
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
        barColor: "bg-[#15803d]"
      };
    } else if (val < 120) {
      return {
        textEn: "⚠️ Storage Warning. Nearing peak branch quota allocated under contract Clause 11.2.",
        textBn: "⚠️ স্টোরেজ সতর্কতা। সৃষ্টি চুক্তি অনুচ্ছেদ ১১.২ এর সর্বোচ্চ শাখা সীমার কাছাকাছি পৌঁছেছেন।",
        color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
        barColor: "bg-amber-500"
      };
    } else {
      return {
        textEn: "🚨 Over Quota. Exceeds recommended single-branch index cap. Compress files or coordinate archive transfer.",
        textBn: "🚨 ব্যবহারের সীমা অতিক্রম! নিজ শাখার জন্য নির্ধারিত কন্টেন্ট স্টোরেজ ছাড়িয়ে গেছে। অতিসত্বর ফাইল কম্প্রেস করুন।",
        color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
        barColor: "bg-red-600"
      };
    }
  };

  const storageStatus = getStorageStatus();
  const currentPermission = permissionMatrix[selectedRole]?.[selectedAction] || { allowed: false, descEn: '', descBn: '' };
  const currentRoleObj = roles.find(r => r.id === selectedRole) || roles[0];
  const currentActionObj = actions.find(a => a.id === selectedAction) || actions[0];

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-xs transition-colors" id="sristy-governance-planner">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#15803d]/10 text-[#15803d] uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            {t("Sristy Gatekeeper Portal")}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-gray-950 dark:text-white uppercase tracking-tight">
            {t("Sristy Policy Gateway & Storage Planner")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            {t("Interactive simulator engine and workspace resource estimator to verify user role system permissions and plan campuse-wise cloud limits.")}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Pane - Interactive Role Permission Checker */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6 bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-gray-100 dark:border-slate-850">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 text-xs font-bold leading-none rounded-md bg-[#15803d] text-white">1</span>
              <h3 className="font-bold text-sm tracking-wide text-gray-800 dark:text-gray-200 uppercase">
                {language === 'bn' ? 'ইউজার সিকিউরিটি রোল সিমুলেটর' : 'User Security & Permission Simulator'}
              </h3>
            </div>

            {/* Select Role Dropdown */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {language === 'bn' ? '১. প্রাতিষ্ঠানিক ভূমিকা (Select Role)' : '1. Institutional Role (Select Role)'}
                </label>
                <div className="relative">
                  <select 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 pr-8 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15803d] transition-colors appearance-none cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id} className="text-xs">
                        {language === 'bn' ? r.labelBn : r.labelEn} (ROLE: {r.id.replace('_', ' ').toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute top-1/2 -translate-y-1/2 right-2.5 pointer-events-none text-gray-400">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Select Action Dropdown */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {language === 'bn' ? '২. অ্যাকশন নির্বাচন (Select Operation)' : '2. Action / Operation (Select Action)'}
                </label>
                <div className="relative">
                  <select 
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 pr-8 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#15803d] transition-colors appearance-none cursor-pointer"
                  >
                    {actions.map(a => (
                      <option key={a.id} value={a.id} className="text-xs">
                        {language === 'bn' ? a.titleBn : a.titleEn}
                      </option>
                    ))}
                  </select>
                  <div className="absolute top-1/2 -translate-y-1/2 right-2.5 pointer-events-none text-gray-400">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Output Gate */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={`${selectedRole}_${selectedAction}`}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -7 }}
                transition={{ duration: 0.2 }}
                className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-start ${
                  currentPermission.allowed 
                    ? 'bg-emerald-50/70 border-emerald-200/50 dark:bg-emerald-950/15 dark:border-emerald-900/30' 
                    : 'bg-red-50/70 border-red-200/50 dark:bg-red-950/15 dark:border-red-900/25'
                }`}
              >
                {/* Result Indicator Badge/Icon */}
                <div className="shrink-0 flex items-center justify-center">
                  {currentPermission.allowed ? (
                    <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50 dark:ring-emerald-950/50 animate-bounce">
                      <Unlock className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 ring-4 ring-red-50 dark:ring-red-950/50">
                      <Lock className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold font-sans capitalize tracking-wider text-gray-900 dark:text-white">
                      {language === 'bn' ? currentRoleObj.labelBn : currentRoleObj.labelEn}
                    </span>
                    <span className="text-gray-300 dark:text-slate-800">•</span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
                      currentPermission.allowed 
                        ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-905 dark:text-emerald-200' 
                        : 'bg-red-200 text-red-800 dark:bg-red-905 dark:text-red-200'
                    }`}>
                      {currentPermission.allowed 
                        ? (language === 'bn' ? 'অনুমোদিত / PERMITTED' : 'PERMITTED ✅') 
                        : (language === 'bn' ? 'অনুমতি নেই / RESTRICTED' : 'RESTRICTED ❌')}
                    </span>
                  </div>

                  <p className="text-[12px] text-gray-700 dark:text-gray-250 leading-relaxed font-semibold">
                    {language === 'bn' ? currentPermission.descBn : currentPermission.descEn}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1 leading-snug pt-2 border-t border-gray-150/50 dark:border-slate-800/40">
            <Info className="w-3 h-3 shrink-0 text-brand-500" />
            <span>
              {language === 'bn' 
                ? 'সৃষ্টি রুলস ভল্ট: প্রতিটি বিষয়ের শিক্ষক ও এডমিনদের জন্য বিশেষ ফায়ারবেস অ্যাকশন গেটরুল এম্বেড করা আছে।' 
                : 'Sristy Security: Database access policies are enforced cryptographically via server-side Firestore Rules.'}
            </span>
          </div>
        </div>

        {/* Right Pane - Sristy Storage Estimator */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-gray-100 dark:border-slate-850">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 text-xs font-bold leading-none rounded-md bg-[#15803d]">2</span>
              <h3 className="font-bold text-sm tracking-wide text-gray-800 dark:text-gray-200 uppercase">
                {language === 'bn' ? 'ক্যাম্পাস ফাইল স্টোরেজ প্রক্ষেপণ' : 'Campus Storage Quota Planner'}
              </h3>
            </div>

            {/* Sliders Area */}
            <div className="space-y-4">
              {/* PDF Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    {language === 'bn' ? 'লেকচার শিট (PDF/DOC)' : 'Lecture Sheets (PDF/DOC)'}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                    {pdfCount} files (~{(pdfCount * avgPDF).toFixed(1)} MB)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={pdfCount}
                  onChange={(e) => setPdfCount(parseInt(e.target.value))}
                  className="w-full accent-[#15803d] cursor-ew-resize h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* PPT Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-[#e15a1d]" />
                    {language === 'bn' ? 'শিক্ষক স্লাইড (PPTX)' : 'Lecture Slides (PPT/PPTX)'}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                    {pptCount} files (~{(pptCount * avgPPT).toFixed(1)} MB)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  value={pptCount}
                  onChange={(e) => setPptCount(parseInt(e.target.value))}
                  className="w-full accent-[#15803d] cursor-ew-resize h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Weekly Tests Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    {language === 'bn' ? 'সাপ্তাহিক পরীক্ষার প্রশ্ন' : 'Question Papers / Exam Docs'}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                    {docCount} files (~{(docCount * avgDOC).toFixed(1)} MB)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="150" 
                  value={docCount}
                  onChange={(e) => setDocCount(parseInt(e.target.value))}
                  className="w-full accent-[#15803d] cursor-ew-resize h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Image Sliders */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-purple-500" />
                    {language === 'bn' ? 'ছবি ও গাইড ম্যাটারিয়াল' : 'Handouts / Graphic Notes'}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                    {imgCount} files (~{(imgCount * avgIMG).toFixed(1)} MB)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="80" 
                  value={imgCount}
                  onChange={(e) => setImgCount(parseInt(e.target.value))}
                  className="w-full accent-[#15803d] cursor-ew-resize h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            </div>

            {/* Calculations & Progress Indicator Container */}
            <div className="border-t border-gray-200/50 dark:border-slate-800/40 pt-4 space-y-3 text-left">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">
                    {language === 'bn' ? 'মোট অনুমিত ক্লাউড সাইজ' : 'PROJECTED STORAGE USE'}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white font-mono leading-none mt-1">
                    {totalEstimatedStorage} <span className="text-xs font-bold text-gray-400">MB</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">
                    {language === 'bn' ? 'বাৎসরিক ফ্রি কোটা' : 'BRANCH SLA QUOTA'}
                  </p>
                  <p className="text-xs font-bold text-gray-650 dark:text-gray-300 font-mono leading-none mt-1">
                    {quotaLimit} MB Limit
                  </p>
                </div>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${storageStatus.barColor}`}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>

              {/* Dynamic Status Display Box */}
              <div className={`p-3 rounded-lg border text-[11px] leading-relaxed transition-colors font-medium select-none ${storageStatus.color}`}>
                {language === 'bn' ? storageStatus.textBn : storageStatus.textEn}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center justify-between border-t border-gray-150/50 dark:border-slate-800/40 pt-2 shrink-0">
            <span>SLA Clause 11.2 (Active Caps)</span>
            <span className="font-mono text-[#15803d] font-bold">Sristy Edu Archive v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
