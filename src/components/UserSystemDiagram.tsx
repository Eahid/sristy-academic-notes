import React from 'react';
import { motion } from 'motion/react';
import { useThemeLanguage } from './ThemeLanguageContext';
import { 
  ShieldCheck, 
  Users, 
  Building, 
  CheckCircle2, 
  BookOpen, 
  Eye, 
  ArrowRight,
  Cpu
} from 'lucide-react';

export default function UserSystemDiagram() {
  const { t } = useThemeLanguage();

  const SYSTEM_TIERS = [
    {
      role: 'super_admin',
      title: 'Super Admin',
      icon: Cpu,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
      borderColor: 'border-purple-100 dark:border-purple-900/30',
      textColor: 'text-purple-705 dark:text-purple-400',
      actions: [
        'Hard Delete (Permanent Physical Removal)',
        'Manage Central Backups & Activity Logs',
        'Recover Deleted Files within 30-Days Limit'
      ]
    },
    {
      role: 'master_admin',
      title: 'Master Admin',
      icon: ShieldCheck,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
      borderColor: 'border-amber-100 dark:border-amber-900/30',
      textColor: 'text-amber-707 dark:text-amber-400',
      actions: [
        'Supervise Branch Administrators',
        'Verify Global Archive Submissions',
        'Recover Deleted Files within 30-Days Limit'
      ]
    },
    {
      role: 'admin',
      title: 'Branch Admin',
      icon: Building,
      color: 'from-brand-500 to-brand-600',
      bgColor: 'bg-brand-50/50 dark:bg-brand-950/20',
      borderColor: 'border-brand-105 dark:border-brand-900/30',
      textColor: 'text-brand-707 dark:text-brand-400',
      actions: [
        'Register Branch Faculty Teachers',
        'Approve / Deny Lecture Materials',
        'Move Files to Recycling Trash Bin'
      ]
    },
    {
      role: 'file_approver',
      title: 'File Approver',
      icon: CheckCircle2,
      color: 'from-teal-500 to-emerald-600',
      bgColor: 'bg-teal-50/50 dark:bg-teal-950/20',
      borderColor: 'border-teal-100 dark:border-teal-900/30',
      textColor: 'text-teal-707 dark:text-teal-400',
      actions: [
        'Verify Uploaded Teacher Slides',
        'Inspect Lesson Material Integrity',
        'Toggle Asset Approval Status'
      ]
    },
    {
      role: 'teacher',
      title: 'Teacher / Instructor',
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
      borderColor: 'border-blue-100 dark:border-blue-900/30',
      textColor: 'text-blue-707 dark:text-blue-400',
      actions: [
        'Upload Lectures & Sheets (Max 10MB)',
        'Organize Material by Subject Specialty',
        'Acquire Peer Shared Worksheets'
      ]
    },
    {
      role: 'viewer',
      title: 'Student / Viewer',
      icon: Eye,
      color: 'from-gray-500 to-slate-600',
      bgColor: 'bg-gray-50/50 dark:bg-slate-900/40',
      borderColor: 'border-gray-150 dark:border-slate-800',
      textColor: 'text-gray-707 dark:text-gray-300',
      actions: [
        'Search Subject-wise Catalogues',
        'Verify Document Preview Material',
        'Extract Verified Learning Assets'
      ]
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 transition-all" id="user-system-tier-hierarchy">
      <div className="text-center sm:text-left space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold font-display text-gray-900 dark:text-white tracking-tight uppercase">
          {t("Sristy Family Digital User System Hierarchy")}
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {t("Interactive logical authorization blueprint highlighting the 6 distinct system roles, permissions routing, and operational flow.")}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 relative">
        {SYSTEM_TIERS.map((tier, idx) => {
          const IconComponent = tier.icon;
          return (
            <motion.div 
              key={tier.role}
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              whileHover={{ y: -5, scale: 1.01, transition: { duration: 0.2 } }}
              className={`rounded-xl border ${tier.borderColor} ${tier.bgColor} p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative`}
            >
              <div>
                <div className={`p-2 w-10 h-10 rounded-lg bg-gradient-to-br ${tier.color} text-white flex items-center justify-center shadow-sm mb-4`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-150 uppercase tracking-wide">
                  {t(tier.title)}
                </h4>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize font-bold tracking-widest">
                  ROLE: {tier.role.replace('_', ' ')}
                </p>

                <div className="border-t border-gray-200/50 dark:border-slate-800/40 my-3" />

                <ul className="space-y-1.5 text-left">
                  {tier.actions.map((act, aIdx) => (
                    <li key={aIdx} className="text-[10px] text-gray-650 dark:text-gray-300 flex items-start gap-1 font-medium leading-normal">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      <span>{t(act)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {idx < 5 && (
                <div className="hidden xl:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-gray-300 dark:text-slate-800 pointer-events-none">
                  <ArrowRight className="w-4 h-4 animate-pulse" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
