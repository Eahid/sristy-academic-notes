const inMemoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("Storage access blocked by browser environment safety restrictions, falling back to in-memory store for key:", key, e);
    }
    return inMemoryStorage[key] || null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn("Storage write blocked by browser environment safety restrictions, falling back to in-memory store for key:", key, e);
    }
    inMemoryStorage[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn("Storage remove blocked by browser environment safety restrictions, falling back to in-memory store for key:", key, e);
    }
    delete inMemoryStorage[key];
  }
};

export function forceClearSystemCache(): void {
  try {
    // 1. Clear LocalStorage
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  } catch (e) {
    console.error("Failed to clear localStorage:", e);
  }

  try {
    // 2. Clear SessionStorage
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  } catch (e) {
    console.error("Failed to clear sessionStorage:", e);
  }

  try {
    // 3. Clear Cookies
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      }
    }
  } catch (e) {
    console.error("Failed to clear cookies:", e);
  }

  try {
    // 4. Clear service worker registrations to prevent offline-first stale load caches
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  } catch (e) {
    console.error("Failed to unregister service workers:", e);
  }

  // 5. Force clean reload bypassing caches with a dynamic salt parameter
  setTimeout(() => {
    window.location.href = window.location.origin + window.location.pathname + "?update=" + Date.now();
  }, 300);
}

// Subject categorization lists
const HSC_ONLY_SUBJECTS = [
  "Physics 1st Paper",
  "Physics 2nd Paper",
  "Chemistry 1st Paper",
  "Chemistry 2nd Paper",
  "Biology 1st Paper",
  "Biology 2nd Paper",
  "Math 1st Paper",
  "Math 2nd Paper",
  "Higher Math 1st Paper",
  "Higher Math 2nd Paper"
];

// SSC-only specific subjects
const SSC_ONLY_SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "General Math",
  "Higher Math",
  "Accounting",
  "Finance",
  "Business Entrepreneurship"
];

/**
 * Normalizes any class string (Bangla or English) to a canonical key.
 */
export function normalizeClass(c: string | undefined | null): string {
  if (!c) return '';
  const s = c.trim().toLowerCase();
  if (s === 'play' || s === 'প্লে') return 'play';
  if (s === 'nursery' || s === 'নার্সারি') return 'nursery';
  if (s === 'class 1' || s === '1' || s === '১' || s === '১ম' || s === '১ম শ্রেণি' || s === 'class 1st' || s === '1st') return 'class 1';
  if (s === 'class 2' || s === '2' || s === '২' || s === '২য়' || s === '২য় শ্রেণি' || s === 'class 2nd' || s === '2nd') return 'class 2';
  if (s === 'class 3' || s === '3' || s === '৩' || s === '৩য়' || s === '৩য়' || s === '৩য় শ্রেণি' || s === '৩য় শ্রেণি') return 'class 3';
  if (s === 'class 4' || s === '4' || s === '৪' || s === '৪র্থ' || s === '৪র্থ শ্রেণি') return 'class 4';
  if (s === 'class 5' || s === '5' || s === '৫' || s === '৫ম' || s === '৫ম শ্রেণি') return 'class 5';
  if (s === 'class 6' || s === '6' || s === '৬' || s === '৬ষ্ঠ' || s === '৬ষ্ঠ শ্রেণি') return 'class 6';
  if (s === 'class 7' || s === '7' || s === '৭' || s === '৭ম' || s === '৭ম শ্রেণি') return 'class 7';
  if (s === 'class 8' || s === '8' || s === '৮' || s === '৮ম' || s === '৮ম শ্রেণি') return 'class 8';
  if (s === 'class 9' || s === '9' || s === '৯' || s === '৯ম' || s === '৯ম শ্রেণি') return 'class 9';
  if (s === 'class 10' || s === '10' || s === '১০' || s === '১০ম' || s === '১০ম শ্রেণি') return 'class 10';
  if (s === 'hsc 1st year' || s === 'hsc 1st' || s === 'একাদশ' || s === 'এইচএসসি ১ম বর্ষ' || s === 'এইচএসসি ১ম') return 'hsc 1st year';
  if (s === 'hsc 2nd year' || s === 'hsc 2nd' || s === 'দ্বাদশ' || s === 'এইচএসসি ২য় বর্ষ' || s === 'এইচএসসি ২য় বর্ষ' || s === 'এইচএসসি ২য়') return 'hsc 2nd year';
  return s;
}

/**
 * Normalizes any subject string (Bangla or English) to a canonical key.
 */
export function normalizeSubject(s: string | undefined | null): string {
  if (!s) return '';
  const str = s.trim().toLowerCase();
  if (str === 'bangla' || str === 'বাংলা') return 'bangla';
  if (str === 'bangla 1st paper' || str === 'বাংলা ১ম পত্র' || str === 'বাংলা ১ম') return 'bangla 1st paper';
  if (str === 'bangla 2nd paper' || str === 'বাংলা ২য় পত্র' || str === 'বাংলা ২য় পত্র' || str === 'বাংলা ২য়' || str === 'বাংলা ২য়') return 'bangla 2nd paper';
  if (str === 'english' || str === 'ইংরেজি') return 'english';
  if (str === 'english 1st paper' || str === 'ইংরেজি ১ম পত্র' || str === 'ইংরেজি ১ম') return 'english 1st paper';
  if (str === 'english 2nd paper' || str === 'ইংরেজি ২য় পত্র' || str === 'ইংরেজি ২য় পত্র' || str === 'ইংরেজি ২য়' || str === 'ইংরেজি ২য়') return 'english 2nd paper';
  if (str === 'math' || str === 'গণিত' || str === 'অংক') return 'math';
  if (str === 'general math' || str === 'সাধারণ গণিত') return 'general math';
  if (str === 'math 1st paper' || str === 'উচ্চতর গণিত ১ম পত্র' || str === 'গণিত ১ম পত্র') return 'math 1st paper';
  if (str === 'math 2nd paper' || str === 'উচ্চতর গণিত ২য় পত্র' || str === 'উচ্চতর গণিত ২য় পত্র' || str === 'গণিত ২য় পত্র') return 'math 2nd paper';
  if (str === 'islam religion' || str === 'ইসলাম ধর্ম' || str === 'ইসলাম') return 'islam religion';
  if (str === 'hindu religion' || str === 'হিন্দু ধর্ম' || str === 'হিন্দু') return 'hindu religion';
  if (str === 'religion' || str === 'ধর্ম' || str === 'ধর্ম ও নৈতিক শিক্ষা') return 'religion';
  if (str === 'environmental science' || str === 'পরিবেশ বিজ্ঞান' || str === 'পরিবেশ') return 'environmental science';
  if (str === 'ict' || str === 'আইসিটি' || str === 'তথ্য ও যোগাযোগ প্রযুক্তি') return 'ict';
  if (str === 'physics' || str === 'পদার্থবিজ্ঞান' || str === 'পদার্থ') return 'physics';
  if (str === 'physics 1st paper' || str === 'পদার্থবিজ্ঞান ১ম পত্র') return 'physics 1st paper';
  if (str === 'physics 2nd paper' || str === 'পদার্থবিজ্ঞান ২য় পত্র') return 'physics 2nd paper';
  if (str === 'chemistry' || str === 'রসায়ন') return 'chemistry';
  if (str === 'chemistry 1st paper' || str === 'রসায়ন ১ম পত্র') return 'chemistry 1st paper';
  if (str === 'chemistry 2nd paper' || str === 'রসায়ন ২য় পত্র') return 'chemistry 2nd paper';
  if (str === 'biology' || str === 'জীববিজ্ঞান') return 'biology';
  if (str === 'biology 1st paper' || str === 'জীববিজ্ঞান ১ম পত্র') return 'biology 1st paper';
  if (str === 'biology 2nd paper' || str === 'জীববিজ্ঞান ২য় পত্র') return 'biology 2nd paper';
  if (str === 'higher math' || str === 'উচ্চতর গণিত') return 'higher math';
  if (str === 'science' || str === 'বিজ্ঞান') return 'science';
  if (str === 'general science' || str === 'সাধারণ বিজ্ঞান') return 'general science';
  if (str === 'accounting' || str === 'হিসাববিজ্ঞান') return 'accounting';
  if (str === 'finance' || str === 'ফিন্যান্স ও ব্যাংকিং' || str === 'ফিন্যান্স') return 'finance';
  if (str === 'business entrepreneurship' || str === 'ব্যবসায় উদ্যোগ') return 'business entrepreneurship';
  if (str === 'geography' || str === 'ভূগোল') return 'geography';
  if (str === 'bangladesh and global studies' || str === 'বাংলাদেশ ও বিশ্বপরিচয়') return 'bangladesh and global studies';
  if (str === 'history' || str === 'ইতিহাস') return 'history';
  return str;
}

/**
 * Checks if two class strings refer to the same class level.
 */
export function isClassMatching(classA: string | undefined | null, classB: string | undefined | null): boolean {
  if (!classA || !classB) return false;
  if (classA === classB) return true;
  return normalizeClass(classA) === normalizeClass(classB);
}

/**
 * Checks if two subject strings refer to the same subject.
 */
export function isSubjectMatching(subA: string | undefined | null, subB: string | undefined | null): boolean {
  if (!subA || !subB) return false;
  if (subA === subB) return true;
  return normalizeSubject(subA) === normalizeSubject(subB);
}

export function isEarlyChildhoodClass(classLevel: string): boolean {
  const norm = normalizeClass(classLevel);
  return norm === 'play' || norm === 'nursery' || norm === 'class 1' || norm === 'class 2';
}

export function isHscClass(classLevel: string): boolean {
  const norm = normalizeClass(classLevel);
  return norm === 'hsc 1st year' || norm === 'hsc 2nd year';
}

export function isSscClass(classLevel: string): boolean {
  const norm = normalizeClass(classLevel);
  return norm === 'class 9' || norm === 'class 10';
}

/**
 * Filters the list of subjects appropriate for a given class level.
 */
export function getFilteredSubjectsForClass(classLevel: string, allSubjects: string[]): string[] {
  if (!classLevel) return allSubjects;
  
  if (isHscClass(classLevel)) {
    // For HSC: 1st/2nd Paper sciences, Bangla, English, ICT, etc. No single-paper sciences, Environmental Science, or Math
    return allSubjects.filter(sub => {
      const norm = normalizeSubject(sub);
      return !SSC_ONLY_SUBJECTS.map(normalizeSubject).includes(norm) && norm !== 'environmental science' && norm !== 'math' && norm !== 'science';
    });
  } else if (isSscClass(classLevel)) {
    // For SSC (Class 9-10): General Math, Higher Math, Physics, Chemistry, Biology, Science, Bangla, English, etc.
    return allSubjects.filter(sub => {
      const norm = normalizeSubject(sub);
      const isHscPaper = HSC_ONLY_SUBJECTS.map(normalizeSubject).includes(norm);
      return !isHscPaper && norm !== 'math' && norm !== 'environmental science';
    });
  } else if (isEarlyChildhoodClass(classLevel)) {
    // For Play, Nursery, Class 1, Class 2 (প্লে, নার্সারি, ১ম, ২য়):
    // Foundational subjects: Bangla, English, Math, Islam Religion, Hindu Religion, Religion, Environmental Science, Science
    const allowedEarly = [
      'bangla',
      'english',
      'math',
      'islam religion',
      'hindu religion',
      'religion',
      'environmental science',
      'science',
      'general science'
    ];
    return allSubjects.filter(sub => {
      const norm = normalizeSubject(sub);
      return allowedEarly.includes(norm);
    });
  } else {
    // For Class 3 to 8: general Math, Science, Bangla, English, Islam/Hindu Religion, Environmental Science, BGS, ICT, etc.
    return allSubjects.filter(sub => {
      const norm = normalizeSubject(sub);
      const isHscPaper = HSC_ONLY_SUBJECTS.map(normalizeSubject).includes(norm);
      const isSscOnly = ['physics', 'chemistry', 'biology', 'higher math', 'general math', 'accounting', 'finance', 'business entrepreneurship'].includes(norm);
      return !isHscPaper && !isSscOnly;
    });
  }
}

/**
 * Filters the list of classes appropriate for a given subject.
 */
export function getFilteredClassesForSubject(subjectName: string, allClasses: string[]): string[] {
  if (!subjectName) return allClasses;
  const normSub = normalizeSubject(subjectName);

  if (HSC_ONLY_SUBJECTS.map(normalizeSubject).includes(normSub)) {
    // Only HSC classes
    return allClasses.filter(cls => isHscClass(cls));
  }

  const sscSpecific = ["physics", "chemistry", "biology", "general math", "higher math", "accounting", "finance", "business entrepreneurship"];
  if (sscSpecific.includes(normSub)) {
    return allClasses.filter(cls => isSscClass(cls));
  }

  if (normSub === "environmental science") {
    // Environmental Science is taught in Play, Nursery, Class 1, Class 2, Class 3, Class 4, Class 5
    return allClasses.filter(cls => {
      const normCls = normalizeClass(cls);
      return ['play', 'nursery', 'class 1', 'class 2', 'class 3', 'class 4', 'class 5'].includes(normCls);
    });
  }

  if (normSub === "math") {
    // General "Math" is taught from Play to Class 8 (Play, Nursery, 1 to 8)
    return allClasses.filter(cls => !isHscClass(cls) && !isSscClass(cls));
  }

  if (normSub === "bangla" || normSub === "english" || normSub === "islam religion" || normSub === "hindu religion" || normSub === "religion") {
    // Foundational subjects across all levels
    return allClasses;
  }

  return allClasses;
}


