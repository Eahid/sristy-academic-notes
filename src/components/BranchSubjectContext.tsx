import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BRANCHES as DEFAULT_BRANCHES, SUBJECTS as DEFAULT_SUBJECTS } from '../constants';

interface BranchSubjectContextType {
  branches: string[];
  subjects: string[];
  addBranch: (newBranch: string) => Promise<void>;
  addSubject: (newSubject: string) => Promise<void>;
  loading: boolean;
}

const BranchSubjectContext = createContext<BranchSubjectContextType | undefined>(undefined);

export function BranchSubjectProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read and listen to the 'system_config/metadata' document
    const unsub = onSnapshot(doc(db, 'system_config', 'metadata'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        let targetBranches = DEFAULT_BRANCHES;
        if (data.branches && Array.isArray(data.branches) && data.branches.length > 0) {
          // Merge defaults with dynamic custom elements, maintaining order and uniqueness
          targetBranches = Array.from(new Set([...DEFAULT_BRANCHES, ...data.branches]));
        }
        setBranches(targetBranches);

        let targetSubjects = DEFAULT_SUBJECTS;
        if (data.subjects && Array.isArray(data.subjects) && data.subjects.length > 0) {
          targetSubjects = Array.from(new Set([...DEFAULT_SUBJECTS, ...data.subjects]));
        }
        setSubjects(targetSubjects);
      } else {
        setBranches(DEFAULT_BRANCHES);
        setSubjects(DEFAULT_SUBJECTS);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Could not fetch branches/subjects from Firestore:", error);
      // Fallback to static lists
      setBranches(DEFAULT_BRANCHES);
      setSubjects(DEFAULT_SUBJECTS);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const addBranch = async (newBranch: string) => {
    const trimmed = newBranch.trim();
    if (!trimmed) {
      throw new Error("Branch name cannot be empty.");
    }
    
    // Check duplication (case-insensitive)
    if (branches.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("This branch already exists.");
    }

    const updatedBranches = [...branches, trimmed];
    // Keep custom ones from the default to keep Firestore doc lightweight, or store full list.
    // Storing full merged list in Firestore is safer and more direct.
    await setDoc(doc(db, 'system_config', 'metadata'), {
      branches: updatedBranches,
      subjects: subjects
    }, { merge: true });
  };

  const addSubject = async (newSubject: string) => {
    const trimmed = newSubject.trim();
    if (!trimmed) {
      throw new Error("Subject name cannot be empty.");
    }

    // Check duplication (case-insensitive)
    if (subjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("This subject already exists.");
    }

    const updatedSubjects = [...subjects, trimmed];
    await setDoc(doc(db, 'system_config', 'metadata'), {
      branches: branches,
      subjects: updatedSubjects
    }, { merge: true });
  };

  return (
    <BranchSubjectContext.Provider value={{ branches, subjects, addBranch, addSubject, loading }}>
      {children}
    </BranchSubjectContext.Provider>
  );
}

export function useBranchSubject() {
  const context = useContext(BranchSubjectContext);
  if (!context) {
    throw new Error('useBranchSubject must be used within a BranchSubjectProvider');
  }
  return context;
}
