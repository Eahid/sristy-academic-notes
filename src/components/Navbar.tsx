import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogOut, User, Sparkles, BookOpen, School, Menu, X, Landmark, ChevronDown, Languages, Sun, Moon } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenProfile: () => void;
  onTriggerAuth: () => void;
}

export default function Navbar({ user, onLogout, onOpenProfile, onTriggerAuth }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const { language, setLanguage, theme, toggleTheme, t } = useThemeLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-xs transition-colors" id="sristy-navigation-bar">
      {/* Sristy Logo Professional Solid Brand Color Bar */}
      <div className="w-full h-1 bg-[#15803d] select-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 sm:h-20">
          {/* Sristy Logo Branding */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center shrink-0">
              {logoFailed ? (
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-brand-100 dark:bg-slate-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <School className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              ) : (
                <img 
                  src="https://sristy.edu.bd/wp-content/uploads/2018/12/Sristy.png.webp" 
                  alt="Sristy Logo" 
                  className="w-8 h-8 sm:w-12 sm:h-12 object-contain filter drop-shadow-xs"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[10px] min-[375px]:text-xs sm:text-sm text-brand-500 block uppercase tracking-wider font-display leading-tight truncate">
                {t("Sristy Education Family")}
              </span>
              <span className="font-bold text-[8px] min-[375px]:text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 tracking-tight block uppercase leading-none mt-0.5 truncate">
                {t("Note's Sector")}
              </span>
            </div>
          </div>

          {/* Desktop Right Settings Menu */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher pill */}
            <button 
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 transition-colors select-none cursor-pointer"
              title="Toggle Priority Language / ভাষা নির্বাচন পরিবর্তন করুন"
            >
              <Languages className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span>{language === 'en' ? 'English' : 'বাংলা'}</span>
            </button>



            {user ? (
              <div className="flex items-center gap-4">
                {/* Branch Badge info */}
                {user.branch && (
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <School className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-[180px]" title={t(user.branch)}>
                      {t(user.branch).replace(', Tangail', '').replace(', টাঙ্গাইল', '')}
                    </span>
                  </div>
                )}

                {/* Profile Pic Dropdown Selector */}
                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 focus:outline-none hover:opacity-90 select-none group cursor-pointer"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-brand-500 overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs">
                      {user.profilePic ? (
                        <img 
                          src={user.profilePic} 
                          alt="avatar" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase">
                          {user.fullName.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="text-left leading-tight hidden lg:block">
                      <p className="font-bold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        <span>{user.fullName}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400 group-hover:translate-y-0.5 transition-transform" />
                      </p>
                      <p className="text-[9px] font-bold text-brand-600 dark:text-brand-500 tracking-wider uppercase">{t(user.role.replace('_', ' '))}</p>
                    </div>
                  </button>

                  {/* Dropdown Card */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 border-b border-gray-50 dark:border-slate-800 mb-1 lg:hidden">
                        <p className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">{user.fullName}</p>
                        <p className="text-[9px] font-bold text-brand-600 tracking-wider uppercase mt-1">{t(user.role)}</p>
                      </div>
                      
                      <button 
                        onClick={() => { setDropdownOpen(false); onOpenProfile(); }}
                        className="w-full px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-600 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <User className="w-4 h-4 text-brand-500" />
                        <span>{t("Edit Profile Details")}</span>
                      </button>
                      <div className="border-t border-gray-50 dark:border-slate-800 my-1"></div>
                      <button 
                        onClick={() => { setDropdownOpen(false); onLogout(); }}
                        className="w-full px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 font-semibold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t("Sign Out of System")}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={onTriggerAuth}
                className="bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>{t("Sign In / Log In")}</span>
              </button>
            )}
          </div>

          {/* Handheld Mobile Hamburger Trigger */}
          <div className="md:hidden flex items-center gap-1 min-[375px]:gap-2">
            {!user && (
              <button 
                onClick={onTriggerAuth}
                className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-[10px] min-[375px]:text-xs px-2 py-1 min-[375px]:px-3 min-[375px]:py-1.5 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer mr-0.5 select-none shrink-0"
              >
                <Sparkles className="w-3 h-3 animate-pulse shrink-0 hidden min-[400px]:inline-block" />
                <span>{t("Sign In")}</span>
              </button>
            )}

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white p-1 min-[375px]:p-2 focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 min-[375px]:w-6 min-[375px]:h-6" /> : <Menu className="w-5 h-5 min-[375px]:w-6 min-[375px]:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-4 px-4 space-y-4 animate-in slide-in-from-top duration-200 transition-colors">
          {/* Quick controls for language switching in mobile */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-50 dark:border-slate-800">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t("Language & Style")}</span>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200"
            >
              <Languages className="w-3.5 h-3.5 text-brand-500" />
              <span>{language === 'en' ? 'English' : 'বাংলা'}</span>
            </button>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full border-2 border-brand-500 overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {user.profilePic ? (
                    <img src={user.profilePic} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase">{user.fullName.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-tight">{user.fullName}</h4>
                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mt-0.5">{t(user.role.replace('_', ' '))}</p>
                </div>
              </div>

              {user.branch && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                  <School className="w-4 h-4 text-brand-500" />
                  <span className="truncate">{t(user.branch)}</span>
                </div>
              )}

              <div className="grid gap-2 pt-2">
                <button 
                  onClick={() => { setMobileMenuOpen(false); onOpenProfile(); }}
                  className="w-full py-2.5 text-xs font-semibold text-center border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("Edit Profile")}
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="w-full py-2.5 text-xs font-bold text-center bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  {t("Sign Out")}
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => { setMobileMenuOpen(false); onTriggerAuth(); }}
              className="w-full bg-brand-500 text-white py-3 font-semibold text-xs rounded-lg text-center cursor-pointer"
            >
              {t("Sign In to System")}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
