import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { useBranchSubject } from './BranchSubjectContext';
import { X, Camera, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useThemeLanguage } from './ThemeLanguageContext';

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSaveSuccess: (updatedUser: UserProfile) => void;
}

export default function ProfileModal({ user, onClose, onSaveSuccess }: ProfileModalProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [bio, setBio] = useState(user.bio || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(user.subjects || (user.subject ? [user.subject] : []));
  const [profilePic, setProfilePic] = useState(user.profilePic || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const { t } = useThemeLanguage();
  const { subjects } = useBranchSubject();

  // Handle local file selection to encode to Base64 image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (limit to 400KB base64 for safe firestore doc packing limit)
    if (file.size > 500 * 1024) {
      setErrorMsg(t("Image is too large. Please select a dynamic avatar under 500KB."));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg(t("Display Full Name is required."));
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        fullName: fullName.trim(),
        bio: bio.trim(),
        profilePic,
      };

      if (user.role === 'teacher') {
        updateData.subjects = selectedSubjects;
        updateData.subject = selectedSubjects[0] || '';
      }

      await updateDoc(userRef, updateData);

      const updatedProfile: UserProfile = {
        ...user,
        fullName: fullName.trim(),
        bio: bio.trim(),
        profilePic,
        subjects: user.role === 'teacher' ? selectedSubjects : user.subjects,
        subject: user.role === 'teacher' ? (selectedSubjects[0] || '') : user.subject,
      };

      setSuccess(true);
      onSaveSuccess(updatedProfile);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg(t("Failed to update profile settings. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" id="sristy-profile-modal">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="bg-[#15803d] px-6 py-4 flex justify-between items-center text-white">
          <h2 className="font-semibold text-base tracking-tight">{t("Edit Profile & Credentials")}</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 max-h-[85vh]">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{t("Profile saved successfully.")}</span>
            </div>
          )}

          {/* Picture Upload Circle */}
          <div className="flex flex-col items-center justify-center pb-2">
            <div className="relative group w-24 h-24 rounded-full border-2 border-brand-500 overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              {profilePic ? (
                <img 
                  src={profilePic} 
                  alt="Avatar details" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-gray-400 font-semibold text-2xl uppercase">
                  {fullName.charAt(0) || '?'}
                </span>
              )}

              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[10px] text-white font-medium mt-1">{t("Upload Image")}</span>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleImageUpload} 
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">{t("Maximum image size: 500KB")}</p>

          </div>

          {/* Form Rows */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Full Name")}</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium"
              required 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Email Address") || "Email"}</label>
            <input 
              type="text" 
              value={user.email}
              disabled
              className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-250 dark:border-slate-800 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Institutional Role") || "Institutional Role"}</label>
            <span className="inline-block px-3 py-1 font-semibold text-xs rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 capitalize">
              {t(user.role.replace('_', ' '))}
            </span>
          </div>

          {user.branch && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Branch Assignment") || "Branch"}</label>
              <input 
                type="text" 
                value={t(user.branch)}
                disabled
                className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-150 dark:border-slate-850 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          {user.role === 'teacher' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t("Assigned Specialty Subjects")}</label>
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 max-h-48 overflow-y-auto space-y-2">
                {subjects.map((sub, idx) => {
                  const isChecked = selectedSubjects.includes(sub);
                  return (
                    <label key={idx} className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-brand-500 transition-colors">
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
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                {t("Select one or more subjects assigned to you. The first chosen subject acts as your default specialisation.")}
              </p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Short Bio / Credentials")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("e.g. Master Instructor of Physics at Tangail Branch")}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-sm leading-relaxed"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? t("Saving...") : t("Save Profile")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
