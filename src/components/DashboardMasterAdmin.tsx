import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import JSZip from 'jszip';
import { collection, getDocs, doc, setDoc, query, where, updateDoc, deleteDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db, createSecondaryUser } from '../firebase';
import { UserProfile, FileArchive } from '../types';
import { useBranchSubject } from './BranchSubjectContext';
import { 
  Building,
  School,
  BookOpen,
  PlusCircle, 
  Shield, 
  Trash2, 
  Key, 
  Users, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Award,
  History,
  DownloadCloud,
  Search,
  Database,
  Clock,
  RotateCcw,
  RefreshCw,
  Download,
  Server,
  Terminal,
  ArrowRight,
  AlertCircle,
  FileX,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import FileCard from './FileCard';
import BatchDownloadBar from './BatchDownloadBar';
import { useThemeLanguage } from './ThemeLanguageContext';

interface DashboardMasterAdminProps {
  user: UserProfile;
  files: FileArchive[];
  deletedFiles: FileArchive[];
  onFileApprove: (fileId: string) => void;
  onFileReject: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileRestore: (fileId: string) => void;
  onFileHardDelete: (fileId: string) => void;
  onDownload: (file: FileArchive) => void;
  onRefreshData?: () => void;
  onPreview?: (file: FileArchive) => void;
  onViewTeacherDetails?: (teacherUid: string) => void;
}

export default function DashboardMasterAdmin({ 
  user, 
  files, 
  deletedFiles,
  onFileApprove,
  onFileReject,
  onFileDelete,
  onFileRestore,
  onFileHardDelete,
  onDownload,
  onPreview,
  onViewTeacherDetails,
}: DashboardMasterAdminProps) {
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [adminsList, setAdminsList] = useState<UserProfile[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const pendingFiles = files.filter(f => !f.isApproved && !f.isDeleted);

  // Form states to create accounts
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [adminErrMsg, setAdminErrMsg] = useState('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState('');

  // Super-Admin additional states
  const [isShutDownActive, setIsShutDownActive] = useState(false);
  const [selectedRoleToCreate, setSelectedRoleToCreate] = useState<any>('admin');
  const [selectedSubjectToCreate, setSelectedSubjectToCreate] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  // Password reset states for Admins
  const [resettingUid, setResettingUid] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'admins' | 'all_files' | 'trash_bin' | 'activity_logs' | 'database_backups' | 'rejection_history'>('admins');
  const { t } = useThemeLanguage();

  const { branches, subjects, addBranch, addSubject, removeBranch, removeSubject } = useBranchSubject();
  const [newBranchName, setNewBranchName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaSuccessMsg, setMetaSuccessMsg] = useState('');
  const [metaErrMsg, setMetaErrMsg] = useState('');

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setMetaLoading(true);
    setMetaSuccessMsg('');
    setMetaErrMsg('');
    try {
      await addBranch(newBranchName.trim());
      setMetaSuccessMsg(t("Branch successfully created in global metadata!"));
      setNewBranchName('');
    } catch (err: any) {
      setMetaErrMsg(err?.message || t("Failed to register branch"));
    } finally {
      setMetaLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setMetaLoading(true);
    setMetaSuccessMsg('');
    setMetaErrMsg('');
    try {
      await addSubject(newSubjectName.trim());
      setMetaSuccessMsg(t("Subject specialty registered successfully!"));
      setNewSubjectName('');
    } catch (err: any) {
      setMetaErrMsg(err?.message || t("Failed to register subject"));
    } finally {
      setMetaLoading(false);
    }
  };

  const handleRemoveBranchName = async (branchName: string) => {
    if (!window.confirm(t("Are you sure you want to remove this academic branch? This could isolate existing assignments."))) return;
    setMetaLoading(true);
    setMetaSuccessMsg('');
    setMetaErrMsg('');
    try {
      await removeBranch(branchName);
      setMetaSuccessMsg(t("Branch removed successfully."));
    } catch (err: any) {
      setMetaErrMsg(err?.message || t("Failed to remove branch"));
    } finally {
      setMetaLoading(false);
    }
  };

  const handleRemoveSubjectName = async (subjectName: string) => {
    if (!window.confirm(t("Are you sure you want to remove this academic subject?"))) return;
    setMetaLoading(true);
    setMetaSuccessMsg('');
    setMetaErrMsg('');
    try {
      await removeSubject(subjectName);
      setMetaSuccessMsg(t("Subject removed successfully."));
    } catch (err: any) {
      setMetaErrMsg(err?.message || t("Failed to remove subject"));
    } finally {
      setMetaLoading(false);
    }
  };

  // Activity logs state
  const [logsList, setLogsList] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Rejection history state
  const [rejectionSearchQuery, setRejectionSearchQuery] = useState('');
  const [rejectionBranchFilter, setRejectionBranchFilter] = useState('');
  const [rejectionSubjectFilter, setRejectionSubjectFilter] = useState('');

  const rejectionLogs = logsList.filter(log => log.action === 'file_rejected');

  // Subscribe to activity logs collection live stream
  useEffect(() => {
    setLoadingLogs(true);
    const qLogs = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qLogs, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          ...d,
          createdAt: d.createdAt ? d.createdAt.toDate() : new Date()
        });
      });
      setLogsList(list);
      setLoadingLogs(false);
    }, (err) => {
      console.warn("Failed to listen to Activity Logs stream:", err);
      setLoadingLogs(false);
    });

    return () => unsub();
  }, []);

  // Cloud storage portability states
  const [r2ConfigStatus, setR2ConfigStatus] = useState<{ configured: boolean; bucketName: string; message: string }>({
    configured: false,
    bucketName: '',
    message: ''
  });
  const [isLoadingR2Status, setIsLoadingR2Status] = useState(false);

  // Migration form states
  const [targetEndpoint, setTargetEndpoint] = useState('');
  const [targetAccessKeyId, setTargetAccessKeyId] = useState('');
  const [targetSecretAccessKey, setTargetSecretAccessKey] = useState('');
  const [targetBucketName, setTargetBucketName] = useState('');
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationSummary, setMigrationSummary] = useState('');
  const [migrationError, setMigrationError] = useState('');

  // Fetch R2 Cloud Storage connection status
  const fetchR2Status = async () => {
    setIsLoadingR2Status(true);
    try {
      const res = await fetch('/api/r2/status');
      if (res.ok) {
        const data = await res.json();
        setR2ConfigStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch R2 status:", err);
    } finally {
      setIsLoadingR2Status(false);
    }
  };

  useEffect(() => {
    fetchR2Status();
  }, []);

  const addMigrationLog = (msg: string) => {
    setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  // One-Click Python CLI Vault Exporter (Automated offline folder backup & mapping)
  const handleGeneratePythonDownloader = () => {
    const escapePythonStr = (str: string) => {
      if (!str) return '';
      return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    };

    const pythonScriptLines: string[] = [
      `# -*- coding: utf-8 -*-`,
      `import os`,
      `import sys`,
      `import urllib.request`,
      `import json`,
      `from concurrent.futures import ThreadPoolExecutor`,
      ``,
      `print("=========================================================")`,
      `print("  SRISTY EDUCATION ARCHIVE BULK DOWNLOAD & PORTABILITY ")`,
      `print("=========================================================")`,
      `print("[*] Preparing directories and compiling secure assets...")`,
      ``,
      `# Catalog containing files metadata and download URLs`,
      `FILES_CATALOG = [`
    ];

    files.forEach((f) => {
      let url = f.fileUrl;
      if (url && url.startsWith("/")) {
        const appUrl = window.location.origin;
        url = `${appUrl}${url}`;
      }

      pythonScriptLines.push(
        `    {`,
        `        'name': '${escapePythonStr(f.fileName)}',`,
        `        'url': '${escapePythonStr(url)}',`,
        `        'subject': '${escapePythonStr(f.subject)}',`,
        `        'chapter': '${escapePythonStr(f.chapter)}',`,
        `        'topic': '${escapePythonStr(f.topic)}',`,
        `        'type': '${escapePythonStr(f.fileType)}',`,
        `        'uploader': '${escapePythonStr(f.uploaderName)}'`,
        `    },`
      );
    });

    pythonScriptLines.push(
      `]`,
      ``,
      `def download_file(item):`,
      `    subject = item['subject'].strip().replace('/', '_').replace('\\\\', '_')`,
      `    chapter = item['chapter'].strip().replace('/', '_').replace('\\\\', '_')`,
      `    topic = item['topic'].strip().replace('/', '_').replace('\\\\', '_')`,
      `    name = item['name'].strip()`,
      `    `,
      `    # Construct folder hierarchy based on subject and chapter`,
      `    dir_path = os.path.join("Sristy_Education_Vault", subject, chapter)`,
      `    os.makedirs(dir_path, exist_ok=True)`,
      `    `,
      `    file_path = os.path.join(dir_path, name)`,
      `    url = item['url']`,
      `    `,
      `    print(f"[*] Downloading: {subject} -> {chapter} -> {name}")`,
      `    try:`,
      `        opener = urllib.request.build_opener()`,
      `        opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]`,
      `        urllib.request.install_opener(opener)`,
      `        urllib.request.urlretrieve(url, file_path)`,
      `        print(f"[SUCCESS] Saved to {file_path}")`,
      `        return True`,
      `    except Exception as e:`,
      `        print(f"[ERROR] Failed to download {name}: {str(e)}")`,
      `        return False`,
      ``,
      `def main():`,
      `    print(f"[*] Found {len(FILES_CATALOG)} resources in active cache. Beginning batch transfer...")`,
      `    if len(FILES_CATALOG) == 0:`,
      `        print("[!] No files catalogued to transfer. Exiting.")`,
      `        return`,
      `    `,
      `    with ThreadPoolExecutor(max_workers=4) as executor:`,
      `        results = list(executor.map(download_file, FILES_CATALOG))`,
      `    `,
      `    success_count = sum(1 for r in results if r)`,
      `    print("=========================================================")`,
      `    print(f"[COMPLETE] Portability script executed. {success_count}/{len(FILES_CATALOG)} files transferred successfully!")`,
      `    print("Check 'Sristy_Education_Vault/' folder in this directory.")`,
      `    print("=========================================================")`,
      ``,
      `if __name__ == '__main__':`,
      `    main()`
    );

    const scriptText = pythonScriptLines.join("\n");
    const blob = new Blob([scriptText], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = "sristy_vault_cli_downloader.py";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);

    alert(t("Python Portability Script successfully generated and downloaded! Open CMD/Terminal, navigate to the folder, and run 'python sristy_vault_cli_downloader.py' to transfer all files locally anytime."));
  };

  // Initiating Cloud-to-Cloud target replication via backend proxy
  const handleInitiateS3Migration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEndpoint || !targetAccessKeyId || !targetSecretAccessKey || !targetBucketName) {
      setMigrationError(t("All S3 bucket target fields are required to establish high-integrity secure file replication."));
      return;
    }
    
    setMigrationError('');
    setMigrationSummary('');
    setIsMigrating(true);
    setMigrationLogs([`${new Date().toLocaleTimeString()} - [System] Initializing bulk Cloud migration context...`]);

    try {
      const migrationFiles = files.map(f => ({
        storagePath: f.storagePath,
        fileName: f.fileName,
        fileUrl: f.fileUrl
      }));

      setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - [System] Detected ${migrationFiles.length} file records in database for migration.`]);
      setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - [System] Establishing parallel streaming link to target S3 Endpoint: ${targetEndpoint}...`]);

      const response = await fetch('/api/r2/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetConfig: {
            endpoint: targetEndpoint.trim(),
            accessKeyId: targetAccessKeyId.trim(),
            secretAccessKey: targetSecretAccessKey.trim(),
            bucketName: targetBucketName.trim()
          },
          files: migrationFiles
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - [Server] Summary: ${result.summary}`]);
        
        if (result.processed && result.processed.length > 0) {
          result.processed.forEach((p: any) => {
            setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - [SUCCESS] File '${p.fileName}' migrated to new S3.`]);
          });
        }
        
        if (result.failed && result.failed.length > 0) {
          result.failed.forEach((f: any) => {
            setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - [FAILED] Copy file '${f.fileName}': ${f.error}`]);
          });
        }

        setMigrationSummary(result.summary);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || t("Network transport refused copy."));
      }

    } catch (err: any) {
      console.error("Migration fatal error: ", err);
      const errMsg = err?.message || String(err);
      setMigrationError(errMsg);
      setMigrationLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - [FATAL ERROR] Replicas processes terminated unexpectedly: ${errMsg}`]);
    } finally {
      setIsMigrating(false);
    }
  };

  // SLA Section 7.1 Dynamic Master Backup Handler
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch Users List
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersPayload: any[] = [];
      usersSnap.forEach(d => {
        const raw = d.data();
        usersPayload.push({
          uid: d.id,
          username: raw.username,
          fullName: raw.fullName,
          email: raw.email,
          role: raw.role,
          branch: raw.branch,
          subject: raw.subject,
          status: raw.status,
          bio: raw.bio,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 2. Fetch Files List
      const filesSnap = await getDocs(collection(db, 'files'));
      const filesPayload: any[] = [];
      filesSnap.forEach(d => {
        const raw = d.data();
        filesPayload.push({
          id: d.id,
          fileName: raw.fileName,
          fileType: raw.fileType,
          fileSize: raw.fileSize,
          fileUrl: raw.fileUrl,
          storagePath: raw.storagePath,
          description: raw.description,
          uploadedBy: raw.uploadedBy,
          uploaderName: raw.uploaderName,
          uploaderRole: raw.uploaderRole,
          branch: raw.branch,
          subject: raw.subject,
          isApproved: raw.isApproved,
          approvedBy: raw.approvedBy,
          downloadCount: raw.downloadCount,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 3. Fetch Activity Logs
      const logsSnap = await getDocs(collection(db, 'activity_logs'));
      const logsPayload: any[] = [];
      logsSnap.forEach(d => {
        const raw = d.data();
        logsPayload.push({
          id: d.id,
          action: raw.action,
          actorId: raw.actorId,
          actorName: raw.actorName,
          actorRole: raw.actorRole,
          actorBranch: raw.actorBranch,
          fileId: raw.fileId,
          fileName: raw.fileName,
          fileSubject: raw.fileSubject,
          fileBranch: raw.fileBranch,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 4. Fetch Global Bulletins Notices
      const noticesSnap = await getDocs(collection(db, 'notices'));
      const noticesPayload: any[] = [];
      noticesSnap.forEach(d => {
        const raw = d.data();
        noticesPayload.push({
          id: d.id,
          title: raw.title,
          content: raw.content,
          uploadedBy: raw.uploadedBy,
          uploaderName: raw.uploaderName,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 5. Structure Backup File
      const backupStructure = {
        meta: {
          organization: "Sristy Education Family",
          generatedAt: new Date().toISOString(),
          generatedBy: {
            uid: user.uid,
            name: user.fullName,
            role: user.role
          },
          contractCompliance: "SLA Clause 7.1 Auto Backup Compliant File"
        },
        collections: {
          users: usersPayload,
          files: filesPayload,
          activity_logs: logsPayload,
          notices: noticesPayload
        }
      };

      const jsonStr = JSON.stringify(backupStructure, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(jsonStr);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataUri);
      downloadAnchor.setAttribute("download", `sristy_family_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Backup system error:", e);
      alert(t("System Backup Generation Failed. Please examine cloud console."));
    } finally {
      setIsExporting(false);
    }
  };

  // Download Full ZIP Archive Backup (Active Files + backup_info.json)
  const handleDownloadFullBackupZip = async () => {
    setIsZipping(true);
    setZipProgress(t("Querying database collections..."));
    try {
      // 1. Fetch Users List
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersPayload: any[] = [];
      usersSnap.forEach(d => {
        const raw = d.data();
        usersPayload.push({
          uid: d.id,
          username: raw.username,
          fullName: raw.fullName,
          email: raw.email,
          role: raw.role,
          branch: raw.branch,
          subject: raw.subject,
          status: raw.status,
          bio: raw.bio,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 2. Fetch Files List
      const filesSnap = await getDocs(collection(db, 'files'));
      const filesPayload: any[] = [];
      filesSnap.forEach(d => {
        const raw = d.data();
        filesPayload.push({
          id: d.id,
          fileName: raw.fileName,
          fileType: raw.fileType,
          fileSize: raw.fileSize,
          fileUrl: raw.fileUrl,
          storagePath: raw.storagePath,
          description: raw.description,
          uploadedBy: raw.uploadedBy,
          uploaderName: raw.uploaderName,
          uploaderRole: raw.uploaderRole,
          branch: raw.branch,
          subject: raw.subject,
          isApproved: raw.isApproved,
          approvedBy: raw.approvedBy,
          downloadCount: raw.downloadCount,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 3. Fetch Activity Logs
      const logsSnap = await getDocs(collection(db, 'activity_logs'));
      const logsPayload: any[] = [];
      logsSnap.forEach(d => {
        const raw = d.data();
        logsPayload.push({
          id: d.id,
          action: raw.action,
          actorId: raw.actorId,
          actorName: raw.actorName,
          actorRole: raw.actorRole,
          actorBranch: raw.actorBranch,
          fileId: raw.fileId,
          fileName: raw.fileName,
          fileSubject: raw.fileSubject,
          fileBranch: raw.fileBranch,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 4. Fetch Global Bulletins Notices
      const noticesSnap = await getDocs(collection(db, 'notices'));
      const noticesPayload: any[] = [];
      noticesSnap.forEach(d => {
        const raw = d.data();
        noticesPayload.push({
          id: d.id,
          title: raw.title,
          content: raw.content,
          uploadedBy: raw.uploadedBy,
          uploaderName: raw.uploaderName,
          createdAt: raw.createdAt?.toDate?.()?.toISOString() || raw.createdAt
        });
      });

      // 5. Structure Backup File
      const backupStructure = {
        meta: {
          organization: "Sristy Education Family",
          generatedAt: new Date().toISOString(),
          generatedBy: {
            uid: user.uid,
            name: user.fullName,
            role: user.role
          },
          contractCompliance: "SLA Clause 7.1 Auto Backup Compliant File"
        },
        collections: {
          users: usersPayload,
          files: filesPayload,
          activity_logs: logsPayload,
          notices: noticesPayload
        }
      };

      // 6. Initialize JSZip
      const zip = new JSZip();
      
      // Add backup_info.json
      zip.file("backup_info.json", JSON.stringify(backupStructure, null, 2));

      // 7. Download all files and add to JSZip
      const totalFiles = files.length;
      setZipProgress(t("Compiling files list..."));

      for (let i = 0; i < totalFiles; i++) {
        const fileItem = files[i];
        if (!fileItem.fileUrl) continue;

        const currentNum = i + 1;
        setZipProgress(
          t("Downloading file {{current}}/{{total}}: {{name}}")
            .replace('{{current}}', String(currentNum))
            .replace('{{total}}', String(totalFiles))
            .replace('{{name}}', fileItem.fileName)
        );

        try {
          let downloadUrl = fileItem.fileUrl;
          if (downloadUrl && !downloadUrl.startsWith('/') && !downloadUrl.startsWith(window.location.origin)) {
            downloadUrl = `/api/r2/file?url=${encodeURIComponent(downloadUrl)}`;
          }

          const res = await fetch(downloadUrl);
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
          }
          const blob = await res.blob();
          
          // Organize folders: branch/subject/filename
          const branchDir = (fileItem.branch || "General").trim().replace(/[/\\?%*:|"<>\s]+/g, '_');
          const subjectDir = (fileItem.subject || "General").trim().replace(/[/\\?%*:|"<>\s]+/g, '_');
          const sanitizedFileName = (fileItem.fileName || "unnamed_file").trim().replace(/[/\\?%*:|"<>]+/g, '_');

          zip.file(`Sristy_Education_Vault/Files/${branchDir}/${subjectDir}/${sanitizedFileName}`, blob);
        } catch (fileErr) {
          console.error(`Failed to pack file: ${fileItem.fileName}`, fileErr);
          // Write an error marker in the folder instead of crashing the whole export!
          const branchDir = (fileItem.branch || "General").trim().replace(/[/\\?%*:|"<>\s]+/g, '_');
          const subjectDir = (fileItem.subject || "General").trim().replace(/[/\\?%*:|"<>\s]+/g, '_');
          const sanitizedFileName = (fileItem.fileName || "unnamed_file").trim().replace(/[/\\?%*:|"<>]+/g, '_');
          zip.file(
            `Sristy_Education_Vault/Files/${branchDir}/${subjectDir}/${sanitizedFileName}_error.txt`,
            `Failed to download file from original url: ${fileItem.fileUrl}. Error detail: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`
          );
        }
      }

      setZipProgress(t("Generating ZIP archive..."));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = URL.createObjectURL(zipBlob);
      downloadAnchor.download = `sristy_vault_full_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setZipProgress('');
    } catch (e: any) {
      console.error("ZIP backup generation failed:", e);
      alert(t("Failed to generate complete ZIP backup: ") + (e?.message || String(e)));
    } finally {
      setIsZipping(false);
    }
  };

  // Load all admins or all users for Super Admin / Master Admin
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      let q;
      // If super_admin or master_admin, load users collection dynamically
      if (user.role === 'super_admin' || user.role === 'master_admin') {
        q = query(collection(db, 'users'));
      } else {
        q = query(collection(db, 'users'), where('role', '==', 'admin'));
      }
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const uRole = d.role || 'admin';

        // Master admin can only see/manage user accounts under them (not other master_admins or super_admins)
        if (user.role === 'master_admin' && (uRole === 'super_admin' || uRole === 'master_admin')) {
          return;
        }

        list.push({
          uid: doc.id,
          username: d.username,
          fullName: d.fullName,
          email: d.email,
          role: uRole,
          branch: d.branch,
          subject: d.subject,
          subjects: d.subjects,
          status: d.status || 'active',
          bio: d.bio,
          profilePic: d.profilePic,
          createdAt: d.createdAt?.toDate(),
        });
      });
      setAdminsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    const unsub = onSnapshot(doc(db, 'system_config', 'status'), (docSnap) => {
      if (docSnap.exists()) {
        setIsShutDownActive(!!docSnap.data().isShutDown);
      } else {
        setIsShutDownActive(false);
      }
    }, (err) => {
      console.warn("Could not retrieve system configuration snapshot: ", err);
    });
    return () => unsub();
  }, []);

  const handleToggleShutDownMode = async () => {
    try {
      const nextState = !isShutDownActive;
      await setDoc(doc(db, 'system_config', 'status'), {
        id: 'status',
        isShutDown: nextState,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserRole = async (targetUid: string, targetRole: any) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: targetRole
      });
      await fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserSubject = async (targetUid: string, targetSubject: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        subject: targetSubject
      });
      await fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserStatus = async (targetUid: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        status: nextStatus
      });
      await fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminPass.trim() || !newAdminName.trim() || !newAdminEmail.trim() || !selectedBranch) {
      setAdminErrMsg(t("Please fill in all mandatory field parameters."));
      return;
    }

    setAdminErrMsg('');
    setAdminSuccessMsg('');
    try {
      const targetUser = newAdminUser.trim().toLowerCase();
      // Verify username uniqueness
      const q = query(collection(db, 'users'), where('username', '==', targetUser));
      const testSnap = await getDocs(q);
      if (!testSnap.empty) {
        setAdminErrMsg(t("Account registration error: Username is already reserved."));
        return;
      }

      // 1. Create User in Firebase Auth dynamically
      const authUid = await createSecondaryUser(newAdminEmail.trim(), newAdminPass.trim());

      const targetRole = (user.role === 'super_admin' || user.role === 'master_admin') ? selectedRoleToCreate : 'admin';
      const profilePayload: any = {
        uid: authUid,
        username: targetUser,
        password: newAdminPass.trim(), // Stored for portal references
        fullName: newAdminName.trim(),
        email: newAdminEmail.trim(),
        role: targetRole,
        branch: selectedBranch,
        status: 'active',
        createdAt: serverTimestamp(),
      };

      if (targetRole === 'teacher' && selectedSubjectToCreate) {
        profilePayload.subject = selectedSubjectToCreate;
      }

      // 2. Write profile document in Firestore using the real Auth UID
      await setDoc(doc(db, 'users', authUid), profilePayload);

      setAdminSuccessMsg(t("Profile created beautifully! Logging you into the note's system..."));
      setNewAdminUser('');
      setNewAdminPass('');
      setNewAdminName('');
      setNewAdminEmail('');
      setSelectedBranch('');
      setSelectedSubjectToCreate('');
      fetchAdmins();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setAdminErrMsg(t("Registration failed: Email address is already registered to another account."));
      } else if (err.code === 'auth/weak-password') {
        setAdminErrMsg(t("Registration failed: Password should be at least 6 characters long."));
      } else {
        setAdminErrMsg(t("Failed to register user. Ensure details are correct and try again."));
      }
    }
  };

  const handleResetPassword = async (adminUid: string) => {
    if (!newPasswordVal.trim()) return;
    try {
      await updateDoc(doc(db, 'users', adminUid), {
        password: newPasswordVal.trim(),
      });
      alert(t("Password has been successfully updated."));
      setResettingUid(null);
      setNewPasswordVal('');
    } catch (err) {
      console.error(err);
      alert(t("Failed to reset account credentials."));
    }
  };

  const handleDeleteUser = async (adminUid: string, adminName: string) => {
    if (!window.confirm(t("Are you sure you want to delete this user?"))) return;
    try {
      await deleteDoc(doc(db, 'users', adminUid));
      fetchAdmins();
    } catch (err) {
      console.error(err);
      alert(t("Failed to delete user."));
    }
  };

  return (
    <div className="space-y-8" id="master-admin-dashboard">
      {/* Banner */}
      <div className="relative overflow-hidden bg-[#15803d] rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>{user.role === 'super_admin' ? t("Super Administrator Oversight Console") : t("Master Administrator Control Panel")}</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold font-display leading-tight">{user.fullName}</h2>
          <p className="text-sm text-brand-50/80 mt-1">
            {t("Email Address") || "Email"}: {user.email}
          </p>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-lg backdrop-blur-xs border border-white/10 text-right">
          <p className="text-[10px] text-brand-100 uppercase tracking-widest font-bold">{t("Global Note's")}</p>
          <p className="text-lg font-bold font-display">{files.length} {t("Total Note's")}</p>
        </div>
      </div>

      {/* SHUTDOWN EMERGENCY CONTROL SYSTEM (RESTRICTED TO SUPER ADMINS) */}
      {user.role === 'super_admin' && (
        <div className="bg-red-50 dark:bg-red-950/15 border border-red-150 dark:border-red-900/35 rounded-2xl p-6 transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-800 dark:text-red-400 font-display flex items-center gap-2 select-none">
                <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                <span>GLOBAL SYSTEM EMERGENCY SHUT DOWN PANEL</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                Activating Shut Down Mode locks the entire academic platform instantly. All students, teachers, and school branch admins will be barred from viewing archives or uploading documents. Only Super Administrators can access.
              </p>
            </div>
            <button
              onClick={handleToggleShutDownMode}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md uppercase tracking-wider transition-all transform hover:scale-105 cursor-pointer shrink-0 ${
                isShutDownActive 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-red-650 hover:bg-red-750 text-white animate-pulse'
              }`}
            >
              {isShutDownActive ? t("Restore Portal Online") : t("Initiate Full Shut Down")}
            </button>
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div 
          className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-amber-500 p-5 rounded-r-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs animate-in fade-in duration-300"
          id="master-pending-notification-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {t("New Submissions Waiting for Verification")}
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/85 mt-1 leading-normal font-semibold">
                {t("There are currently {{count}} teacher study materials uploaded and waiting to be verified. Please review and approve or reject them to authorize public or student access.")
                  .replace('{{count}}', String(pendingFiles.length))}
              </p>
            </div>
          </div>
          {activeTab !== 'all_files' && (
            <button
              onClick={() => setActiveTab('all_files')}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-sm shrink-0 uppercase tracking-wider cursor-pointer mt-1 sm:mt-0"
            >
              {t("Review Now")}
            </button>
          )}
        </div>
      )}

      {/* Bento Grid Section Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8" id="master-bento-menu">
        {/* Admins / Members option */}
        <button
          onClick={() => setActiveTab('admins')}
          className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
            activeTab === 'admins'
              ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
          }`}
        >
          <div className={`p-2.5 rounded-lg transition-all duration-300 ${
            activeTab === 'admins'
              ? 'bg-[#15803d] text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
          }`}>
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[9px] tracking-wider uppercase leading-tight ${
              activeTab === 'admins' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{t("System")}</p>
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 mt-1 leading-snug">
              {(user.role === 'super_admin' || user.role === 'master_admin') ? t("Members") : t("Admins")}
            </h4>
          </div>
        </button>

        {/* Storage Assets option */}
        <button
          onClick={() => setActiveTab('all_files')}
          className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
            activeTab === 'all_files'
              ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
          }`}
        >
          <div className={`p-2.5 rounded-lg transition-all duration-300 relative ${
            activeTab === 'all_files'
              ? 'bg-[#15803d] text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
          }`}>
            <FileText className="w-4.5 h-4.5" />
            {pendingFiles.length > 0 ? (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white dark:border-slate-900 animate-pulse">
                {pendingFiles.length}
              </span>
            ) : (
              files.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                  {files.length}
                </span>
              )
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[9px] tracking-wider uppercase leading-tight ${
              activeTab === 'all_files' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{t("Assets")}</p>
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 mt-1 leading-snug">
              {t("Storage")} {pendingFiles.length > 0 ? `(${pendingFiles.length} ${t("Pending")})` : `(${files.length})`}
            </h4>
          </div>
        </button>

        {/* Trash Recycle option */}
        <button
          onClick={() => setActiveTab('trash_bin')}
          className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
            activeTab === 'trash_bin'
              ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
          }`}
        >
          <div className={`p-2.5 rounded-lg transition-all duration-300 relative ${
            activeTab === 'trash_bin'
              ? 'bg-[#15803d] text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
          }`}>
            <Trash2 className="w-4.5 h-4.5" />
            {deletedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                {deletedFiles.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[9px] tracking-wider uppercase leading-tight ${
              activeTab === 'trash_bin' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{t("Recycled")}</p>
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 mt-1 leading-snug">
              {t("Trash Bin")}
            </h4>
          </div>
        </button>

        {/* System Logs option */}
        <button
          onClick={() => setActiveTab('activity_logs')}
          className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
            activeTab === 'activity_logs'
              ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
          }`}
        >
          <div className={`p-2.5 rounded-lg transition-all duration-300 relative ${
            activeTab === 'activity_logs'
              ? 'bg-[#15803d] text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
          }`}>
            <History className="w-4.5 h-4.5" />
            {logsList.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                {logsList.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[9px] tracking-wider uppercase leading-tight ${
              activeTab === 'activity_logs' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{t("Telemetry")}</p>
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 mt-1 leading-snug">
              {t("System Logs")}
            </h4>
          </div>
        </button>

        {/* Database Backups option */}
        <button
          onClick={() => setActiveTab('database_backups')}
          className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
            activeTab === 'database_backups'
              ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
          }`}
        >
          <div className={`p-2.5 rounded-lg transition-all duration-300 ${
            activeTab === 'database_backups'
              ? 'bg-[#15803d] text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
          }`}>
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[9px] tracking-wider uppercase leading-tight ${
              activeTab === 'database_backups' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{t("Recovery")}</p>
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 mt-1 leading-snug">
              {t("Backups")}
            </h4>
          </div>
        </button>

        {/* Rejection History option */}
        <button
          onClick={() => setActiveTab('rejection_history')}
          className={`group text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-3.5 ${
            activeTab === 'rejection_history'
              ? 'bg-[#15803d]/5 dark:bg-[#15803d]/10 border-[#15803d] shadow-md ring-1 ring-[#15803d]/20 scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800/80 hover:border-[#15803d]/40 hover:shadow-xs'
          }`}
        >
          <div className={`p-2.5 rounded-lg transition-all duration-300 relative ${
            activeTab === 'rejection_history'
              ? 'bg-[#15803d] text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-gray-400 group-hover:bg-[#15803d]/10 group-hover:text-[#15803d]'
          }`}>
            <FileX className="w-4.5 h-4.5" />
            {rejectionLogs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white dark:border-slate-900 animate-pulse">
                {rejectionLogs.length}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[9px] tracking-wider uppercase leading-tight ${
              activeTab === 'rejection_history' ? 'text-[#15803d] dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
            }`}>{t("Oversight")}</p>
            <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 mt-1 leading-snug">
              {t("Rejections")}
            </h4>
          </div>
        </button>
      </div>

      {/* bKash/Pathao Style Ultra-Elegant Bottom Tab Navigator for Mobile View */}
      {ReactDOM.createPortal(
        <div className="sm:hidden fixed bottom-0 left-0 right-0 w-full z-[9999] bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 transition-colors" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-12 px-1">
          <button
            onClick={() => setActiveTab('admins')}
            className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
          >
            <div className={`transition-all duration-300 ${
              activeTab === 'admins' 
                ? 'text-[#15803d]' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
            }`}>
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className={`text-[8px] font-bold tracking-tight transition-all duration-300 ${
              activeTab === 'admins' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
            }`}>
              {t("Members")}
            </span>
            {activeTab === 'admins' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('all_files')}
            className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
          >
            <div className={`transition-all duration-300 relative ${
              activeTab === 'all_files' 
                ? 'text-[#15803d]' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
            }`}>
              <FileText className="w-4.5 h-4.5" />
              {pendingFiles.length > 0 ? (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-bold h-3 w-3 flex items-center justify-center rounded-full border border-white dark:border-slate-900 animate-pulse">
                  {pendingFiles.length}
                </span>
              ) : (
                files.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[8px] font-bold h-3 w-3 flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                    {files.length}
                  </span>
                )
              )}
            </div>
            <span className={`text-[8px] font-bold tracking-tight transition-all duration-300 ${
              activeTab === 'all_files' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
            }`}>
              {t("Storage")}
            </span>
            {activeTab === 'all_files' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('trash_bin')}
            className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
          >
            <div className={`transition-all duration-300 relative ${
              activeTab === 'trash_bin' 
                ? 'text-[#15803d]' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
            }`}>
              <Trash2 className="w-4.5 h-4.5" />
              {deletedFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#15803d] text-white text-[8px] font-bold h-3 w-3 flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                  {deletedFiles.length}
                </span>
              )}
            </div>
            <span className={`text-[8px] font-bold tracking-tight transition-all duration-300 ${
              activeTab === 'trash_bin' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
            }`}>
              {t("Trash")}
            </span>
            {activeTab === 'trash_bin' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('activity_logs')}
            className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
          >
            <div className={`transition-all duration-300 relative ${
              activeTab === 'activity_logs' 
                ? 'text-[#15803d]' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
            }`}>
              <History className="w-4.5 h-4.5" />
            </div>
            <span className={`text-[8px] font-bold tracking-tight transition-all duration-300 ${
              activeTab === 'activity_logs' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
            }`}>
              {t("Logs")}
            </span>
            {activeTab === 'activity_logs' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('rejection_history')}
            className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
          >
            <div className={`transition-all duration-300 relative ${
              activeTab === 'rejection_history' 
                ? 'text-[#15803d]' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
            }`}>
              <FileX className="w-4.5 h-4.5" />
              {rejectionLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold h-3 w-3 flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                  {rejectionLogs.length}
                </span>
              )}
            </div>
            <span className={`text-[8px] font-bold tracking-tight transition-all duration-300 ${
              activeTab === 'rejection_history' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
            }`}>
              {t("Rejections")}
            </span>
            {activeTab === 'rejection_history' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('database_backups')}
            className="flex flex-col items-center justify-center flex-1 py-0.5 focus:outline-none relative cursor-pointer"
          >
            <div className={`transition-all duration-300 relative ${
              activeTab === 'database_backups' 
                ? 'text-[#15803d]' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-650'
            }`}>
              <Database className="w-4.5 h-4.5" />
            </div>
            <span className={`text-[8px] font-bold tracking-tight transition-all duration-300 ${
              activeTab === 'database_backups' ? 'text-[#15803d]' : 'text-gray-550 dark:text-gray-400'
            }`}>
              {t("Backups")}
            </span>
            {activeTab === 'database_backups' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#15803d] rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>,
        document.body
      )}

      {activeTab === 'admins' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
          {/* Column 1 Container */}
          <div className="lg:col-span-1 space-y-6 self-start w-full">
            {/* Create Admin Form */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4 font-display">
              <PlusCircle className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-base">{(user.role === 'super_admin' || user.role === 'master_admin') ? t("Create System Member") : t("Create Branch Admin")}</h3>
            </div>

            {adminErrMsg && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{adminErrMsg}</span>
              </div>
            )}

            {adminSuccessMsg && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
                <span>{adminSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {(user.role === 'super_admin' || user.role === 'master_admin') && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Account Role / Profile Level")}</label>
                  <select
                    value={selectedRoleToCreate}
                    onChange={(e) => {
                      setSelectedRoleToCreate(e.target.value);
                      if (e.target.value !== 'teacher') setSelectedSubjectToCreate('');
                    }}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold"
                    required
                  >
                    <option value="admin">{t("Branch Admin")}</option>
                    {user.role === 'super_admin' && <option value="super_admin">{t("Super Admin")}</option>}
                    {user.role === 'super_admin' && <option value="master_admin">{t("Master Admin")}</option>}
                    <option value="file_approver">{t("File Approver")}</option>
                    <option value="teacher">{t("Teacher")}</option>
                    <option value="viewer">{t("Viewer / Student")}</option>
                  </select>
                </div>
              )}

              {((user.role === 'super_admin' || user.role === 'master_admin') && selectedRoleToCreate === 'teacher') && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-1.5 uppercase">{t("Academic Subject Assignment")}</label>
                  <select
                    value={selectedSubjectToCreate}
                    onChange={(e) => setSelectedSubjectToCreate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold"
                    required
                  >
                    <option value="">{t("Select Teaching Subject Option")}</option>
                    {subjects.map((subName, sIdx) => (
                      <option key={sIdx} value={subName}>{t(subName)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Username / Identifier")}</label>
                <input
                  type="text"
                  value={newAdminUser}
                  onChange={(e) => setNewAdminUser(e.target.value)}
                  placeholder="e.g., admin_dhaka"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Portal Key / Password")}</label>
                <input
                  type="password"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder={t("Enter password...")}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Full Name")}</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g., Mohammad Rashed"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t("Email Address") || "Email"}</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="e.g., rashed@sristyedu.com"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-1.5 uppercase">{t("Branch Assignment")}</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs font-semibold"
                  required
                >
                  <option value="">{t("Select Assigned Branch")}</option>
                  {branches.map((bName, idx) => (
                    <option key={idx} value={bName}>{t(bName)}</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">{t("This Admin will exclusively verify uploads from this branch only.")}</p>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs py-2.5 rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t("Create Account")}</span>
              </button>
            </form>
          </div>

          {/* Academic Config Manager (Super Admin Only) */}
          {user.role === 'super_admin' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 transition-colors space-y-6 animate-in slide-in-from-bottom duration-250">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-display">
                <School className="w-5 h-5 text-indigo-505" />
                <h3 className="font-semibold text-xs uppercase tracking-wider">{t("Academic Config Manager")}</h3>
              </div>

              {metaSuccessMsg && (
                <div className="p-3 bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 rounded-lg text-[10.5px] leading-relaxed font-semibold border border-green-150 dark:border-green-905/35 animate-in fade-in">
                  {metaSuccessMsg}
                </div>
              )}

              {metaErrMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 rounded-lg text-[10.5px] leading-relaxed font-semibold border border-red-150 dark:border-red-900/35 animate-in fade-in">
                  {metaErrMsg}
                </div>
              )}

              {/* Create Branch segment */}
              <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-slate-850/80">
                <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t("Create New Branch")}</h4>
                <form onSubmit={handleCreateBranch} className="space-y-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder={t("e.g. Sristy Cadet Branch, Tangail")}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                    required
                  />
                  <button
                    type="submit"
                    disabled={metaLoading}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{metaLoading ? t("Saving...") : t("Add Branch")}</span>
                  </button>
                </form>
                {/* List of custom branches with deletion capability */}
                <div className="max-h-[140px] overflow-y-auto pt-2 space-y-1.5 scrollbar-thin">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block uppercase">{t("Registered Active Branches")}</span>
                  {branches.map((b, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 truncate max-w-[170px]" title={t(b)}>{t(b)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBranchName(b)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors cursor-pointer"
                        title={t("Delete Branch")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Subject segment */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-gray-550 dark:text-gray-400 uppercase tracking-widest">{t("Create New Subject")}</h4>
                <form onSubmit={handleCreateSubject} className="space-y-2">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder={t("e.g. Higher Mathematics")}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 dark:text-gray-100 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                    required
                  />
                  <button
                    type="submit"
                    disabled={metaLoading}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{metaLoading ? t("Saving...") : t("Add Subject")}</span>
                  </button>
                </form>
                {/* List of custom subjects with deletion capability */}
                <div className="max-h-[140px] overflow-y-auto pt-2 space-y-1.5 scrollbar-thin">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 block uppercase">{t("Registered Course Offerings")}</span>
                  {subjects.map((sub, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 truncate max-w-[170px]" title={t(sub)}>{t(sub)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectName(sub)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors cursor-pointer"
                        title={t("Delete Subject")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admins Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col justify-between transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-slate-800/10 font-display">
              <div>
                <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 uppercase">
                  {(user.role === 'super_admin' || user.role === 'master_admin') ? t("Global Portal Accounts Directory") : t("Active Branch Registrations")}
                </h3>
                {(user.role === 'super_admin' || user.role === 'master_admin') && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t("Manage roles, promote users, assign subjects and clean up accounts.")}</p>
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-end">
                {(user.role === 'super_admin' || user.role === 'master_admin') && (
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold focus:outline-none"
                  >
                    <option value="all">{t("All Account Roles")}</option>
                    {user.role === 'super_admin' && <option value="super_admin">{t("Super Admins")}</option>}
                    {user.role === 'super_admin' && <option value="master_admin">{t("Master Admins")}</option>}
                    <option value="admin">{t("Branch Admins")}</option>
                    <option value="file_approver">{t("File Approvers")}</option>
                    <option value="teacher">{t("Teachers")}</option>
                    <option value="viewer">{t("Viewers / Students")}</option>
                  </select>
                )}
                <span className="bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold px-2.5 py-0.5 rounded-full select-none shrink-0 whitespace-nowrap">
                  {adminsList.filter(u => roleFilter === 'all' || u.role === roleFilter).length} {t("Members Listed")}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              {loadingAdmins ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">{t("Loading...")}</div>
              ) : adminsList.filter(u => roleFilter === 'all' || u.role === roleFilter).length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-550">{t("No matched profiles found.")}</div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full min-w-[600px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-803 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/20">
                          <th className="py-4 px-6">{t("Institutional Branch Member")}</th>
                          <th className="py-4 px-6">{t("Profile Role Level")}</th>
                          <th className="py-4 px-6">{t("Branch / Subject Assigned")}</th>
                          <th className="py-4 px-6">{t("Portal Key / Passwords")}</th>
                          <th className="py-4 px-6 text-right">{t("Suspend / Kill")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-105 dark:divide-slate-850 text-xs font-medium text-gray-750 dark:text-gray-300">
                        {adminsList
                          .filter((adm) => roleFilter === 'all' || adm.role === roleFilter)
                          .map((adm) => {
                            const isExpanded = expandedMemberId === adm.uid;
                            const teacherFiles = files.filter(f => f.uploadedBy === adm.uid);
                            const teacherRejections = logsList.filter(log => log.action === 'file_rejected' && log.uploaderId === adm.uid);

                            return (
                              <React.Fragment key={adm.uid}>
                                <tr 
                                  onClick={() => setExpandedMemberId(isExpanded ? null : adm.uid)}
                                  className="hover:bg-gray-50/40 dark:hover:bg-slate-800/10 transition-colors cursor-pointer select-none"
                                >
                                  <td className="py-4.5 px-6">
                                    <div className="flex items-center gap-3">
                                      <ChevronRight className={`w-4 h-4 text-gray-400 dark:text-gray-550 shrink-0 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500 font-bold' : ''}`} />
                                      <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 flex items-center justify-center text-brand-505 dark:text-brand-409 font-bold text-xs uppercase shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {adm.profilePic ? (
                                          <img src={adm.profilePic} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                          adm.fullName.charAt(0)
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-xs text-gray-800 dark:text-gray-100 truncate">{adm.fullName}</p>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                          <span className="text-[10px] text-gray-400 font-mono">@{adm.username}</span>
                                          {adm.status === 'inactive' && (
                                            <span className="text-[8px] bg-red-100 dark:bg-red-955/20 text-red-650 dark:text-red-400 px-1 rounded font-bold uppercase tracking-wider font-sans">SUSPENDED</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4.5 px-6" onClick={(e) => e.stopPropagation()}>
                                    {(user.role === 'super_admin' || user.role === 'master_admin') ? (
                                      <select
                                        value={adm.role}
                                        onChange={(e) => handleUpdateUserRole(adm.uid, e.target.value)}
                                        className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-705 text-gray-808 default:text-gray-150 rounded-lg text-xxs font-bold focus:outline-none focus:border-brand-500 cursor-pointer"
                                      >
                                        <option value="viewer">{t("Viewer / Student")}</option>
                                        <option value="teacher">{t("Teacher")}</option>
                                        <option value="file_approver">{t("File Approver")}</option>
                                        <option value="admin">{t("Branch Admin")}</option>
                                        {user.role === 'super_admin' && <option value="master_admin">{t("Master Admin")}</option>}
                                        {user.role === 'super_admin' && <option value="super_admin">{t("Super Admin")}</option>}
                                      </select>
                                    ) : (
                                      <span className="inline-block bg-brand-50 dark:bg-brand-950/20 font-medium text-[10px] text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                                        {adm.role === 'super_admin' ? t("Super Admin") : adm.role === 'master_admin' ? t("Master Admin") : adm.role === 'admin' ? t("Branch Admin") : adm.role === 'file_approver' ? t("Approver") : adm.role === 'teacher' ? t("Teacher") : t("Viewer")}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4.5 px-6">
                                    <div className="space-y-1">
                                      <span className="inline-block bg-gray-50 dark:bg-slate-800 text-gray-550 dark:text-gray-400 border border-gray-100 dark:border-slate-750 text-[10px] px-2 py-0.5 rounded-full select-none">
                                        {adm.branch ? t(adm.branch) : t("Global Overlord")}
                                      </span>
                                      {adm.role === 'teacher' && (
                                        <div className="flex flex-col gap-1 mt-1">
                                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t("Assigned Subjects")}:</div>
                                          {adm.subjects && adm.subjects.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                              {adm.subjects.map((s, sIdx) => (
                                                <span key={sIdx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1">
                                                  <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                                  <span>{t(s)}</span>
                                                </span>
                                              ))}
                                            </div>
                                          ) : adm.subject ? (
                                            <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-705 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                              <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                              <span>{t(adm.subject)}</span>
                                            </span>
                                          ) : (
                                            <span className="text-[9px] text-gray-455 italic">{t("None Assigned")}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4.5 px-6" onClick={(e) => e.stopPropagation()}>
                                    {resettingUid === adm.uid ? (
                                      <div className="flex items-center gap-1 max-w-[200px]">
                                        <input
                                          type="text"
                                          value={newPasswordVal}
                                          onChange={(e) => setNewPasswordVal(e.target.value)}
                                          placeholder={t("New password")}
                                          className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-703 text-gray-808 dark:text-gray-100 rounded-md focus:outline-none focus:border-brand-500 text-xxs w-full"
                                        />
                                        <button
                                          onClick={() => handleResetPassword(adm.uid)}
                                          className="bg-emerald-500 text-white rounded-md p-1.5 hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                                          title="Confirm password reset"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setResettingUid(null)}
                                          className="text-gray-400 dark:text-gray-505 hover:text-gray-650 dark:hover:text-gray-300 text-xxs px-1"
                                        >
                                          {t("Cancel")}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setResettingUid(adm.uid)}
                                        className="text-[10px] font-bold text-indigo-505 hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Key className="w-3 h-3" />
                                        <span>{t("Change password")}</span>
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-4.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleToggleUserStatus(adm.uid, adm.status || 'active')}
                                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                          adm.status === 'inactive' 
                                            ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-955/20' 
                                            : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955/20'
                                        }`}
                                        title={adm.status === 'inactive' ? t("Activate Account") : t("Suspend Account")}
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(adm.uid, adm.fullName)}
                                        className="p-1.5 text-gray-450 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-405 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Admin Permanently"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-gray-50/45 dark:bg-slate-950/25 border-l-2 border-indigo-500 animate-in fade-in duration-150">
                                    <td colSpan={5} className="p-5 sm:p-6">
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-gray-700 dark:text-gray-300">
                                        {/* Column 1: Account Information & Biography */}
                                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-3xs space-y-3.5 text-left">
                                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-2">
                                            <div className="flex items-center gap-2">
                                              <Users className="w-4 h-4 text-indigo-505" />
                                              <span className="font-extrabold text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">{t("Account Overview")}</span>
                                            </div>
                                            {onViewTeacherDetails && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onViewTeacherDetails(adm.uid);
                                                }}
                                                className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                              >
                                                <span>{t("Full Modal")}</span>
                                                <span>↗</span>
                                              </button>
                                            )}
                                          </div>
                                          
                                          <div className="space-y-2 text-[11px]">
                                            <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Portal Username")}</span>
                                              <span className="font-mono text-gray-800 dark:text-gray-200 font-bold">@{adm.username}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Email Address")}</span>
                                              <span className="text-gray-800 dark:text-gray-200 font-bold truncate max-w-[160px]" title={adm.email}>{adm.email}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Branch Assigned")}</span>
                                              <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{adm.branch ? t(adm.branch) : t("Global Overlord")}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Role Level")}</span>
                                              <span className="capitalize bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                                {t(adm.role)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-slate-800/40">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Member Since")}</span>
                                              <span className="text-gray-800 dark:text-gray-200 font-mono font-bold">
                                                {adm.createdAt ? adm.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : t("N/A")}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center py-1">
                                              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wide">{t("Account Status")}</span>
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                adm.status === 'inactive' 
                                                  ? 'bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400'
                                                  : 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-650 dark:text-emerald-400'
                                              }`}>
                                                {adm.status === 'inactive' ? t("Suspended") : t("Active")}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="pt-2 border-t border-gray-100 dark:border-slate-800/40">
                                            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Professional Bio")}</span>
                                            <p className="bg-gray-50/50 dark:bg-slate-950/20 p-2.5 rounded-lg text-xxs text-gray-650 dark:text-gray-450 leading-relaxed italic border border-gray-100/40 dark:border-slate-800/20 whitespace-pre-wrap">
                                              {adm.bio || t("No professional bio written yet.")}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Column 2: Teacher Uploads & Stats */}
                                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-3xs space-y-3.5 text-left">
                                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-2">
                                            <div className="flex items-center gap-2">
                                              <FileText className="w-4 h-4 text-emerald-500" />
                                              <span className="font-extrabold text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">{t("Study Material Uploads")}</span>
                                            </div>
                                            <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400 text-xxs px-2 py-0.5 rounded-full font-bold">
                                              {teacherFiles.length} {t("Total")}
                                            </span>
                                          </div>

                                          {/* Counts metrics */}
                                          <div className="grid grid-cols-2 gap-2 text-center text-xxs font-bold">
                                            <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/35 p-2 rounded-lg">
                                              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-black">{teacherFiles.filter(f => f.isApproved).length}</p>
                                              <p className="text-gray-405 font-bold uppercase text-[9px] mt-0.5">{t("Approved")}</p>
                                            </div>
                                            <div className="bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/35 p-2 rounded-lg">
                                              <p className="text-amber-600 dark:text-amber-400 text-sm font-black">{teacherFiles.filter(f => !f.isApproved).length}</p>
                                              <p className="text-gray-405 font-bold uppercase text-[9px] mt-0.5">{t("Pending")}</p>
                                            </div>
                                          </div>

                                          <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                                            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Recent Activity")}</span>
                                            {teacherFiles.length === 0 ? (
                                              <p className="text-xxs text-gray-400 dark:text-gray-550 text-center py-6">{t("No upload archives recorded yet.")}</p>
                                            ) : (
                                              teacherFiles.slice(0, 3).map((f) => (
                                                <div key={f.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100/30 dark:border-slate-800/20 rounded-lg">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="font-extrabold text-[11px] text-gray-800 dark:text-gray-100 truncate" title={f.fileName}>{f.fileName}</p>
                                                    <p className="text-[9px] text-gray-400 font-mono font-bold uppercase">{t(f.subject)} • {(f.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                                                  </div>
                                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 uppercase tracking-wider ${
                                                    f.isApproved 
                                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400' 
                                                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-605 dark:text-amber-400'
                                                  }`}>
                                                    {f.isApproved ? t("Approved") : t("Pending")}
                                                  </span>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>

                                        {/* Column 3: Document Rejection Audits */}
                                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-3xs space-y-3.5 text-left">
                                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-2">
                                            <div className="flex items-center gap-2">
                                              <ShieldAlert className="w-4 h-4 text-red-500" />
                                              <span className="font-extrabold text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">{t("Rejection Logs")}</span>
                                            </div>
                                            <span className="bg-red-50 dark:bg-red-955/20 text-red-650 dark:text-red-400 text-xxs px-2 py-0.5 rounded-full font-bold">
                                              {teacherRejections.length} {t("Total")}
                                            </span>
                                          </div>

                                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                            {teacherRejections.length === 0 ? (
                                              <div className="text-center py-10 text-xxs text-gray-400 dark:text-gray-550">
                                                <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mb-1">✓ {t("Excellent Standing")}</p>
                                                <p className="text-[10px] text-gray-450 font-medium">{t("No document rejections recorded for this account.")}</p>
                                              </div>
                                            ) : (
                                              teacherRejections.slice(0, 3).map((rej) => (
                                                <div key={rej.id} className="p-2.5 bg-red-50/10 dark:bg-red-955/5 border border-red-100/20 dark:border-red-900/10 rounded-lg space-y-1.5">
                                                  <div className="flex items-start justify-between gap-1.5">
                                                    <p className="font-extrabold text-[10.5px] text-gray-800 dark:text-gray-100 truncate max-w-[130px]" title={rej.fileName}>{rej.fileName}</p>
                                                    <span className="text-[8px] text-gray-400 font-mono shrink-0 uppercase tracking-wide font-bold">
                                                      {rej.createdAt ? rej.createdAt.toLocaleDateString() : t("Just now")}
                                                    </span>
                                                  </div>
                                                  
                                                  <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded border border-red-50/30 dark:border-red-955/15 text-[10px] text-red-700 dark:text-red-300 leading-normal font-medium whitespace-pre-wrap">
                                                    <span className="block text-[8px] font-extrabold uppercase text-red-500 tracking-wider mb-0.5">{t("Reason Specified")}:</span>
                                                    {rej.rejectionReason}
                                                  </div>
                                                  
                                                  <p className="text-[8.5px] text-gray-400 text-right uppercase tracking-wider font-bold">
                                                    {t("Rejected By")}: <span className="text-gray-500 dark:text-gray-300 font-mono font-bold">{rej.actorName}</span>
                                                  </p>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Stack View */}
                  <div className="md:hidden divide-y divide-gray-105 dark:divide-slate-805/40 bg-white dark:bg-slate-900 transition-colors">
                    {adminsList
                      .filter((adm) => roleFilter === 'all' || adm.role === roleFilter)
                      .map((adm) => {
                        const isExpanded = expandedMemberId === adm.uid;
                        const teacherFiles = files.filter(f => f.uploadedBy === adm.uid);
                        const teacherRejections = logsList.filter(log => log.action === 'file_rejected' && log.uploaderId === adm.uid);

                        return (
                          <div key={adm.uid} className="transition-colors">
                            {/* Card Header Trigger */}
                            <div 
                              onClick={() => setExpandedMemberId(isExpanded ? null : adm.uid)}
                              className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-850/10 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <ChevronRight className={`w-4 h-4 text-gray-400 dark:text-gray-550 shrink-0 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500 font-bold' : ''}`} />
                                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 flex items-center justify-center text-brand-505 dark:text-brand-409 font-bold text-xs uppercase shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {adm.profilePic ? (
                                    <img src={adm.profilePic} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    adm.fullName.charAt(0)
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-xs text-gray-850 dark:text-white truncate">{adm.fullName}</h4>
                                    {adm.status === 'inactive' && (
                                      <span className="text-[8px] bg-red-105 dark:bg-red-955/30 text-red-650 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">SUSPENDED</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-400 font-mono">@{adm.username}</p>
                                </div>
                              </div>
                              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/35 text-indigo-650 dark:text-indigo-400 border border-indigo-100/30 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                                {t(adm.role)}
                              </span>
                            </div>

                            {/* Collapsible Details */}
                            {isExpanded && (
                              <div className="p-4 pt-0 bg-gray-50/45 dark:bg-slate-950/20 border-l-2 border-indigo-500 space-y-4 text-xs text-gray-700 dark:text-gray-300">
                                {/* Account Information / Overview */}
                                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-3.5 rounded-xl space-y-3 shadow-3xs text-left">
                                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-3.5 h-3.5 text-indigo-505" />
                                      <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-gray-800 dark:text-white">{t("Account Overview")}</span>
                                    </div>
                                    {onViewTeacherDetails && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onViewTeacherDetails(adm.uid);
                                        }}
                                        className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                      >
                                        <span>{t("Full Modal")}</span>
                                        <span>↗</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-2 text-[10.5px]">
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100/55 dark:border-slate-800/40">
                                      <span className="text-gray-400 font-bold uppercase text-[8.5px] tracking-wide">{t("Portal Username")}</span>
                                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">@{adm.username}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100/55 dark:border-slate-800/40">
                                      <span className="text-gray-400 font-bold uppercase text-[8.5px] tracking-wide">{t("Email Address")}</span>
                                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[170px]" title={adm.email}>{adm.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100/55 dark:border-slate-800/40">
                                      <span className="text-gray-400 font-bold uppercase text-[8.5px] tracking-wide">{t("Branch")}</span>
                                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{adm.branch ? t(adm.branch) : t("Global Overlord")}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100/55 dark:border-slate-800/40">
                                      <span className="text-gray-400 font-bold uppercase text-[8.5px] tracking-wide">{t("Role")}</span>
                                      <span className="capitalize bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                        {t(adm.role)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100/55 dark:border-slate-800/40">
                                      <span className="text-gray-400 font-bold uppercase text-[8.5px] tracking-wide">{t("Member Since")}</span>
                                      <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                                        {adm.createdAt ? adm.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : t("N/A")}
                                      </span>
                                    </div>
                                    {adm.role === 'teacher' && (
                                      <div className="py-1 border-b border-gray-100/55 dark:border-slate-800/40 space-y-1">
                                        <span className="text-gray-400 font-bold uppercase text-[8.5px] tracking-wide">{t("Assigned Subjects")}</span>
                                        {adm.subjects && adm.subjects.length > 0 ? (
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                            {adm.subjects.map((s, sIdx) => (
                                              <span key={sIdx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/35 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                                                <BookOpen className="w-2.5 h-2.5" />
                                                <span>{t(s)}</span>
                                              </span>
                                            ))}
                                          </div>
                                        ) : adm.subject ? (
                                          <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/35 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold w-fit mt-0.5">
                                            <BookOpen className="w-2.5 h-2.5" />
                                            <span>{t(adm.subject)}</span>
                                          </span>
                                        ) : (
                                          <span className="block text-[9px] text-gray-450 italic">{t("None Assigned")}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800/40 text-left">
                                    <span className="block text-[8.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Professional Bio")}</span>
                                    <p className="bg-gray-50/50 dark:bg-slate-950/25 p-2.5 rounded-lg text-xxs text-gray-650 dark:text-gray-455 leading-relaxed italic border border-gray-100/40 dark:border-slate-800/20 whitespace-pre-wrap">
                                      {adm.bio || t("No professional bio written yet.")}
                                    </p>
                                  </div>
                                </div>

                                {/* Study Material Uploads Stack */}
                                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-3.5 rounded-xl space-y-3 shadow-3xs text-left">
                                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-gray-800 dark:text-white">{t("Study Material Uploads")}</span>
                                    </div>
                                    <span className="bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-450 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                      {teacherFiles.length} {t("Total")}
                                    </span>
                                  </div>

                                  {/* Stats metrics */}
                                  <div className="grid grid-cols-2 gap-2 text-center text-xxs font-bold">
                                    <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/35 p-1.5 rounded-lg">
                                      <p className="text-emerald-600 dark:text-emerald-400 text-xs font-black">{teacherFiles.filter(f => f.isApproved).length}</p>
                                      <p className="text-gray-405 font-bold uppercase text-[8px] mt-0.5">{t("Approved")}</p>
                                    </div>
                                    <div className="bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/35 p-1.5 rounded-lg">
                                      <p className="text-amber-600 dark:text-amber-400 text-xs font-black">{teacherFiles.filter(f => !f.isApproved).length}</p>
                                      <p className="text-gray-405 font-bold uppercase text-[8px] mt-0.5">{t("Pending")}</p>
                                    </div>
                                  </div>

                                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                    {teacherFiles.length === 0 ? (
                                      <p className="text-xxs text-gray-400 dark:text-gray-550 text-center py-6">{t("No upload archives recorded yet.")}</p>
                                    ) : (
                                      teacherFiles.slice(0, 3).map((f) => (
                                        <div key={f.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50/50 dark:bg-slate-950/20 border border-gray-100/30 dark:border-slate-800/20 rounded-lg">
                                          <div className="min-w-0 flex-1">
                                            <p className="font-extrabold text-[10px] text-gray-800 dark:text-gray-100 truncate" title={f.fileName}>{f.fileName}</p>
                                            <p className="text-[8px] text-gray-400 font-mono font-bold uppercase">{t(f.subject)} • {(f.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                                          </div>
                                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold shrink-0 uppercase tracking-wide ${
                                            f.isApproved 
                                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400' 
                                              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-605 dark:text-amber-400'
                                          }`}>
                                            {f.isApproved ? t("Approved") : t("Pending")}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Rejections Audit Log Stack */}
                                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-3.5 rounded-xl space-y-3 shadow-3xs text-left">
                                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                                      <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-gray-800 dark:text-white">{t("Rejection Logs")}</span>
                                    </div>
                                    <span className="bg-red-50 dark:bg-red-955/25 text-red-600 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                      {teacherRejections.length} {t("Total")}
                                    </span>
                                  </div>

                                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                    {teacherRejections.length === 0 ? (
                                      <div className="text-center py-6 text-xxs text-gray-400 dark:text-gray-550">
                                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px] mb-0.5">✓ {t("Excellent Standing")}</p>
                                        <p className="text-[9.5px] text-gray-450">{t("No rejections recorded.")}</p>
                                      </div>
                                    ) : (
                                      teacherRejections.slice(0, 3).map((rej) => (
                                        <div key={rej.id} className="p-2 bg-red-50/10 dark:bg-red-955/5 border border-red-100/20 dark:border-red-900/10 rounded-lg space-y-1.5">
                                          <div className="flex items-start justify-between gap-1.5">
                                            <p className="font-extrabold text-[10px] text-gray-800 dark:text-gray-100 truncate max-w-[150px]" title={rej.fileName}>{rej.fileName}</p>
                                            <span className="text-[8px] text-gray-400 font-mono shrink-0 font-bold uppercase">
                                              {rej.createdAt ? rej.createdAt.toLocaleDateString() : t("Just now")}
                                            </span>
                                          </div>
                                          
                                          <div className="bg-white/90 dark:bg-slate-900/60 p-2 rounded border border-red-50/30 dark:border-red-955/15 text-[9.5px] text-red-750 dark:text-red-350 leading-relaxed font-medium whitespace-pre-wrap">
                                            <span className="block text-[8px] font-extrabold uppercase text-red-500 tracking-wider mb-0.5">{t("Reason Specified")}:</span>
                                            {rej.rejectionReason}
                                          </div>
                                          
                                          <p className="text-[8px] text-gray-400 text-right font-bold uppercase tracking-wide">
                                            {t("Rejected By")}: <span className="text-gray-500 dark:text-gray-300 font-mono">{rej.actorName}</span>
                                          </p>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Quick Settings Area */}
                                <div className="bg-white dark:bg-slate-900 border border-gray-105 dark:border-slate-800 p-3.5 rounded-xl space-y-3.5 shadow-3xs text-left" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800/60 pb-1.5">
                                    <Key className="w-3.5 h-3.5 text-indigo-505" />
                                    <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-gray-800 dark:text-white">{t("Administrative Settings")}</span>
                                  </div>

                                  <div className="space-y-3">
                                    {/* Update Role Select in mobile settings */}
                                    <div className="space-y-1">
                                      <label className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wider">{t("Update Role Level")}</label>
                                      {(user.role === 'super_admin' || user.role === 'master_admin') ? (
                                        <select
                                          value={adm.role}
                                          onChange={(e) => handleUpdateUserRole(adm.uid, e.target.value)}
                                          className="px-2 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-205 dark:border-slate-700 text-gray-808 dark:text-gray-150 rounded-lg text-xxs font-bold focus:outline-none focus:border-brand-500 w-full cursor-pointer"
                                        >
                                          <option value="viewer">{t("Viewer / Student")}</option>
                                          <option value="teacher">{t("Teacher")}</option>
                                          <option value="file_approver">{t("File Approver")}</option>
                                          <option value="admin">{t("Branch Admin")}</option>
                                          {user.role === 'super_admin' && <option value="master_admin">{t("Master Admin")}</option>}
                                          {user.role === 'super_admin' && <option value="super_admin">{t("Super Admin")}</option>}
                                        </select>
                                      ) : (
                                        <p className="font-bold text-xxs text-gray-800 dark:text-gray-200 capitalize">{t(adm.role)}</p>
                                      )}
                                    </div>

                                    {/* Password Reset Section */}
                                    <div className="space-y-1">
                                      <label className="text-[8.5px] font-bold text-gray-400 uppercase tracking-wider">{t("Portal Keys & Passwords")}</label>
                                      {resettingUid === adm.uid ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={newPasswordVal}
                                            onChange={(e) => setNewPasswordVal(e.target.value)}
                                            placeholder={t("New password")}
                                            className="px-2 py-1 bg-gray-55 dark:bg-slate-800 border border-gray-205 dark:border-slate-703 text-gray-808 dark:text-gray-100 rounded-md focus:outline-none focus:border-brand-500 text-xxs w-full"
                                          />
                                          <button
                                            onClick={() => handleResetPassword(adm.uid)}
                                            className="bg-emerald-500 text-white rounded-md p-1.5 hover:bg-emerald-600 transition-colors cursor-pointer shrink-0"
                                            title="Confirm password reset"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setResettingUid(null)}
                                            className="text-gray-400 dark:text-gray-505 hover:text-gray-650 dark:hover:text-gray-300 text-xxs px-1"
                                          >
                                            {t("Cancel")}
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setResettingUid(adm.uid)}
                                          className="text-xxs font-extrabold text-indigo-505 hover:underline flex items-center gap-1 cursor-pointer bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/30 px-2 py-1.5 rounded-lg w-full justify-center"
                                        >
                                          <Key className="w-3 h-3" />
                                          <span>{t("Change password")}</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Suspend & Delete Actions */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800/40">
                                      <button
                                        onClick={() => handleToggleUserStatus(adm.uid, adm.status || 'active')}
                                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xxs font-bold transition-colors cursor-pointer ${
                                          adm.status === 'inactive' 
                                            ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                                            : 'bg-amber-50 dark:bg-amber-955/20 text-amber-605 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                                        }`}
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        <span>{adm.status === 'inactive' ? t("Activate Account") : t("Suspend Account")}</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(adm.uid, adm.fullName)}
                                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-955/20 text-red-655 dark:text-red-400 border border-red-101 dark:border-red-900/30 rounded-lg text-xxs font-bold transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{t("Delete")}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'all_files' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 transition-colors animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Sristy Education Family Storage")}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-505 mt-0.5">{t("Browsing all digital note's globally.")}</p>
            </div>
            <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-mono text-[10px] font-bold px-3 py-1 rounded-full uppercase">
              {t("Oversight Admin Terminal")}
            </span>
          </div>

          {files.length > 1 && (
            <div className="flex sm:hidden items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-450 mb-3.5 animate-pulse bg-amber-500/5 py-1 px-3 rounded-full border border-amber-500/10">
              <span className="font-semibold uppercase tracking-wider">Swipe horizontally</span>
              <span className="text-sm font-bold">↔</span>
              <span>to browse {files.length} documents</span>
            </div>
          )}

          {files.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              {t("No files found. Clean start!")}
            </div>
          ) : (
            <div className="space-y-4">
              <BatchDownloadBar
                selectedIds={selectedFileIds}
                allFiles={files}
                currentFilteredFiles={files}
                onSelectToggle={(id) => {
                  setSelectedFileIds(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  );
                }}
                onClearSelection={() => setSelectedFileIds([])}
                onSelectAll={(ids) => setSelectedFileIds(ids)}
              />

              <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:pb-0 sm:snap-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
                {files.map((file) => (
                  <div key={file.id} className="min-w-[290px] w-[88vw] sm:w-auto sm:min-w-0 snap-center shrink-0">
                    <FileCard
                      file={file}
                      user={user}
                      onDownload={onDownload}
                      onPreview={onPreview}
                      onApprove={onFileApprove}
                      onReject={onFileReject}
                      onDelete={onFileDelete}
                      isSelected={selectedFileIds.includes(file.id)}
                      onSelectToggle={(id) => {
                        setSelectedFileIds(prev =>
                          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                        );
                      }}
                      onViewTeacherDetails={onViewTeacherDetails}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity_logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 transition-colors animate-in fade-in duration-200" id="activity-log-dashboard">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500 animate-spin-slow" />
                <span>{t("System-Wide Activity Audit Log")}</span>
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-505 mt-1">
                {t("Contract Agreement SLA Clause 14: Automated un-alterable records of active teacher uploads, admin approvals, and folder deletions.")}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder={t("Filter by actor or file...")}
                  className="pl-8 pr-4 py-2 w-full sm:w-60 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg text-xs focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-205 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">{t("All Actions")}</option>
                <option value="file_uploaded">{t("Teacher Upload")}</option>
                <option value="file_approved">{t("Admin Approval")}</option>
                <option value="file_deleted">{t("File Deletion")}</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
            {loadingLogs ? (
              <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-505 font-medium">{t("Loading...")}</div>
            ) : (() => {
              const filteredLogs = logsList.filter(log => {
                const mSearch = !logSearchQuery.trim() || 
                  log.actorName?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                  log.fileName?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                  log.fileSubject?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                  log.fileBranch?.toLowerCase().includes(logSearchQuery.toLowerCase());
                const mAction = !logActionFilter || log.action === logActionFilter;
                return mSearch && mAction;
              });

              if (filteredLogs.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-550 text-xs font-medium">
                    {t("No activity logs recorded yet in cloud database. Safe start!")}
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop view (Table layout) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-803 text-gray-400 dark:text-gray-505 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/20">
                          <th className="py-3 px-5">{t("Timestamp")}</th>
                          <th className="py-3 px-5">{t("Operation Actor")}</th>
                          <th className="py-3 px-5">{t("Execution Action")}</th>
                          <th className="py-3 px-5">{t("Target Resource Details")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-gray-300">
                        {filteredLogs.map((log) => {
                          const isExpanded = expandedLogs[log.id];
                          let actionColorBadge = "bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 border border-green-105 dark:border-green-900/30";
                          let actionTextLabel = "Teacher Upload";
                          if (log.action === 'file_approved') {
                            actionColorBadge = "bg-sky-50 dark:bg-sky-955/20 text-sky-700 dark:text-sky-455 border border-sky-105 dark:border-sky-900/30";
                            actionTextLabel = "Admin Approval";
                          } else if (log.action === 'file_deleted') {
                            actionColorBadge = "bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 border border-red-105 dark:border-red-900/10";
                            actionTextLabel = "File Deletion";
                          } else if (log.action === 'file_rejected') {
                            actionColorBadge = "bg-amber-50 dark:bg-amber-955/25 text-amber-700 dark:text-amber-400 border border-amber-105 dark:border-amber-900/30";
                            actionTextLabel = "File Rejected";
                          }

                          return (
                            <React.Fragment key={log.id}>
                              <tr 
                                onClick={() => setExpandedLogs(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                className="hover:bg-gray-50/40 dark:hover:bg-slate-850/10 transition-colors cursor-pointer"
                              >
                                <td className="py-3.5 px-5 text-gray-400 dark:text-gray-500 font-mono text-[10px] whitespace-nowrap">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{log.createdAt ? log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "just now"}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 font-bold text-gray-800 dark:text-gray-100 text-xs">
                                  {log.actorName}
                                </td>
                                <td className="py-3.5 px-5">
                                  <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${actionColorBadge}`}>
                                    {t(actionTextLabel)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-gray-750 dark:text-gray-250 text-xs truncate max-w-[240px]" title={log.fileName}>
                                      {log.fileName}
                                    </span>
                                    <span className="text-xs text-brand-505 font-bold hover:underline shrink-0 flex items-center gap-1 select-none">
                                      <span>{isExpanded ? t("Hide") : t("View")}</span>
                                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-gray-50/30 dark:bg-slate-800/10">
                                  <td colSpan={4} className="py-4 px-6 border-b border-gray-100 dark:border-slate-800/40">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                      {/* Actor Details */}
                                      <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">{t("Full Actor Details")}</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{log.actorName}</p>
                                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                          {t(log.actorRole)} {log.actorBranch ? `• ${t(log.actorBranch)}` : ''}
                                        </p>
                                      </div>

                                      {/* Target Resource Details */}
                                      <div className="space-y-1 md:col-span-2">
                                        <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">{t("Full Resource Details")}</p>
                                        <p className="font-bold text-gray-805 dark:text-gray-150 break-all leading-tight">{log.fileName}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-extrabold uppercase tracking-wide">
                                          <span className="bg-gray-105 dark:bg-slate-800 text-gray-505 dark:text-gray-400 px-1.5 py-0.5 rounded-xs">{t(log.fileSubject)}</span>
                                          <span className="bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded-xs">{t(log.fileBranch)}</span>
                                          <span className="text-gray-400 font-mono text-[10px] normal-case font-medium">{log.createdAt ? log.createdAt.toLocaleString() : "just now"}</span>
                                        </div>
                                        {log.rejectionReason && (
                                          <div className="bg-red-50/50 dark:bg-red-955/15 border-l-4 border-red-500 py-2 px-3 rounded-r-lg mt-2 text-[11px] text-red-750 dark:text-red-350 leading-relaxed font-semibold">
                                            <p className="font-bold text-[9px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                              <AlertTriangle className="w-3.5 h-3.5 text-red-505" />
                                              <span>{t("Rejection Feedback")}</span>
                                            </p>
                                            <p className="whitespace-pre-wrap">{log.rejectionReason}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile stacked card layout */}
                  <div className="md:hidden divide-y divide-gray-105 dark:divide-slate-805/40 bg-white dark:bg-slate-900 transition-colors">
                    {filteredLogs.map((log) => {
                      const isExpanded = expandedLogs[log.id];
                      let actionColorBadge = "bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-400 border border-green-105 dark:border-green-900/30";
                      let actionTextLabel = "Teacher Upload";
                      if (log.action === 'file_approved') {
                        actionColorBadge = "bg-sky-50 dark:bg-sky-955/20 text-sky-700 dark:text-sky-455 border border-sky-105 dark:border-sky-900/30";
                        actionTextLabel = "Admin Approval";
                      } else if (log.action === 'file_deleted') {
                        actionColorBadge = "bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-400 border border-red-105 dark:border-red-900/10";
                        actionTextLabel = "File Deletion";
                      } else if (log.action === 'file_rejected') {
                        actionColorBadge = "bg-amber-50 dark:bg-amber-955/25 text-amber-700 dark:text-amber-400 border border-amber-105 dark:border-amber-900/30";
                        actionTextLabel = "File Rejected";
                      }

                      return (
                        <div 
                          key={log.id} 
                          onClick={() => setExpandedLogs(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                          className="p-3.5 space-y-2 hover:bg-gray-50/20 dark:hover:bg-slate-850/5 transition-colors cursor-pointer text-xs"
                        >
                          {/* Condensed Row: Badge, Actor name & view toggle */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`inline-block px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider shrink-0 ${actionColorBadge}`}>
                                {t(actionTextLabel)}
                              </span>
                              <span className="font-bold text-gray-800 dark:text-gray-100 truncate text-[11px]">{log.actorName}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-505 font-mono shrink-0">
                              {log.createdAt ? log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "just now"}
                            </span>
                          </div>

                          {/* Brief filename & expand toggle */}
                          <div className="flex items-center justify-between gap-3 text-[11px] text-gray-605 dark:text-gray-300">
                            <span className="truncate max-w-[200px] font-medium" title={log.fileName}>{log.fileName}</span>
                            <span className="text-[10px] text-brand-505 font-bold shrink-0 flex items-center gap-0.5">
                              <span>{isExpanded ? t("Hide") : t("View")}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </span>
                          </div>

                          {/* Expanded detail card */}
                          {isExpanded && (
                            <div className="bg-gray-50/60 dark:bg-slate-800/15 p-3 rounded-lg border border-gray-100/40 dark:border-slate-800/40 space-y-2.5 mt-1 animate-in slide-in-from-top-1 duration-150">
                              <div>
                                <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Actor Affiliation")}</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{log.actorName}</span>
                                <p className="text-[9px] font-medium text-gray-450 uppercase mt-0.5">{t(log.actorRole)} {log.actorBranch ? `• ${t(log.actorBranch)}` : ''}</p>
                              </div>

                              <div>
                                <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Target Resource Details")}</span>
                                <p className="font-bold text-gray-800 dark:text-gray-200 break-all leading-tight">{log.fileName}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-extrabold uppercase tracking-wide">
                                  <span className="bg-gray-105 dark:bg-slate-800 text-gray-505 dark:text-gray-400 px-1.5 py-0.5 rounded-xs">{t(log.fileSubject)}</span>
                                  <span className="bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 px-1.5 py-0.5 rounded-xs">{t(log.fileBranch)}</span>
                                </div>
                              </div>

                              <div>
                                <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Date & Time")}</span>
                                <span className="font-mono text-gray-500">{log.createdAt ? log.createdAt.toLocaleString() : "just now"}</span>
                              </div>

                              {log.rejectionReason && (
                                <div className="bg-red-50/50 dark:bg-red-955/15 border-l-4 border-red-500 py-2 px-3 rounded-r-lg text-[11px] text-red-750 dark:text-red-305 font-medium leading-relaxed">
                                  <p className="font-bold text-[8px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{t("Rejection Feedback")}</span>
                                  </p>
                                  <p className="whitespace-pre-wrap">{log.rejectionReason}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'trash_bin' && (
        /* Recycle Bin display */
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 transition-colors animate-in fade-in duration-200">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-red-50 dark:bg-red-950/30 text-red-750 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t("Secure Trash Bin Module")}</span>
              </span>
            </div>
            <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase">{t("Global Recycle Bin / 30-Day Recovery Slot")}</h3>
            <p className="text-xs text-gray-455 dark:text-gray-500 mt-1 leading-normal animate-pulse">
              {t("Super Admin / Master Admin rules: You can restore any deleted files from any branch below within 30-days. Permanent physical deletion (Hard Delete) is restricted strictly to Super Administrators.")}
            </p>
          </div>

          {deletedFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              {t("The system recycling storage is empty. No files require attention!")}
            </div>
          ) : (
            <div className="border border-gray-105 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden transition-colors">
              {/* Desktop view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/20">
                      <th className="py-4 px-6">{t("Deleted Resource Name")}</th>
                      <th className="py-4 px-6">{t("Governing Body / Branch")}</th>
                      <th className="py-4 px-6">{t("Assigned Subject Specialty")}</th>
                      <th className="py-4 px-6">{t("Deleter Information")}</th>
                      <th className="py-4 px-6 text-right">{t("Available Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-105 dark:divide-slate-805 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {deletedFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50/20 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100">{file.fileName}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType.toUpperCase()}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{t(file.branch)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-gray-100 dark:bg-slate-805 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-md text-xxs font-semibold uppercase">{t(file.subject)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-gray-805 dark:text-gray-200">{file.deletedByName || t("Unknown Actor")}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              {file.deletedAt ? file.deletedAt.toLocaleString() : (file.createdAt ? file.createdAt.toLocaleString() : '')}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onFileRestore(file.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{t("Restore")}</span>
                            </button>
                            
                            {user.role === 'super_admin' && (
                              <button
                                onClick={() => onFileHardDelete(file.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title={t("Permanently delete file and physical storage contents permanently.")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t("Hard Delete")}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked card layout */}
              <div className="md:hidden divide-y divide-gray-105 dark:divide-slate-805/40">
                {deletedFiles.map((file) => (
                  <div key={file.id} className="p-4 space-y-3">
                    {/* Header: Name & size */}
                    <div>
                      <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100 break-all leading-tight">{file.fileName}</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType.toUpperCase()}</p>
                    </div>

                    {/* Tags & info */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide">
                      <span className="bg-gray-105 dark:bg-slate-800 text-gray-500 dark:text-gray-450 px-2 py-0.5 rounded-md">{t(file.branch)}</span>
                      <span className="bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-md">{t(file.subject)}</span>
                    </div>

                    {/* Deleter details */}
                    <div className="bg-gray-50/50 dark:bg-slate-800/15 p-2.5 rounded-lg border border-gray-100/50 dark:border-slate-800/50 flex justify-between items-center text-[10px] text-gray-550 dark:text-gray-400">
                      <div>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Deleted By")}</span>
                        <span className="font-semibold text-gray-705 dark:text-gray-300">{file.deletedByName || t("Unknown Actor")}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Date Deleted")}</span>
                        <span className="font-mono">{file.deletedAt ? file.deletedAt.toLocaleString() : (file.createdAt ? file.createdAt.toLocaleString() : '')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onFileRestore(file.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/25 dark:hover:bg-brand-950/45 text-brand-605 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t("Restore")}</span>
                      </button>
                      
                      {user.role === 'super_admin' && (
                        <button
                          onClick={() => onFileHardDelete(file.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-105 dark:bg-red-955/20 dark:hover:bg-red-955/35 text-red-600 dark:text-red-400 border border-red-105 dark:border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1"
                          title={t("Permanently delete file.")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t("Hard Delete")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'database_backups' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="database-backup-dashboard">
          {/* Section 1: Dynamic Database Statistics Grid - Fully Responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-center shadow-xs transition-all">
              <p className="text-xxs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-display">{t("Users")}</p>
              <p className="text-2xl font-black font-display text-brand-600 dark:text-brand-400 mt-1">{adminsList.length + 1}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-center shadow-xs transition-all">
              <p className="text-xxs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-display">{t("Resource Files")}</p>
              <p className="text-2xl font-black font-display text-indigo-600 dark:text-indigo-400 mt-1">{files.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-center shadow-xs transition-all">
              <p className="text-xxs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-display">{t("Audit Logs")}</p>
              <p className="text-2xl font-black font-display text-amber-600 dark:text-amber-400 mt-1">{logsList.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-center shadow-xs transition-all flex flex-col justify-center items-center">
              <p className="text-xxs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-display">{t("System Health")}</p>
              <p className="text-xs font-bold text-emerald-500 mt-1.5 uppercase tracking-wide flex items-center gap-1.5 select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {t("Active")}
              </p>
            </div>
          </div>

          {/* Section 2: 1-Click Premium Full Backup Panel (Simple & Modern) */}
          <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-950 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-slate-800 transition-all">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <DownloadCloud className={`w-8 h-8 ${isZipping ? 'animate-bounce' : ''}`} />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white tracking-tight font-display">
                  {t("One-Click Complete Backup Archive")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto">
                  {t("Instantly compile and download all your academic resources, lectures, and files organized into branch and subject folder hierarchies, complete with a structured database JSON snapshot in a single high-integrity ZIP package.")}
                </p>
              </div>

              {/* Live ZIP Generation Progress View */}
              {isZipping && (
                <div className="bg-brand-50/50 dark:bg-slate-850/30 border border-brand-100/40 dark:border-slate-800 p-4 rounded-2xl max-w-md mx-auto space-y-3 animate-pulse">
                  <div className="flex items-center justify-between text-xxs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    <span>{t("Assembling Archive...")}</span>
                    <span className="animate-pulse">● {t("In Progress")}</span>
                  </div>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300 text-left line-clamp-1 break-all bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-slate-800">
                    {zipProgress}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-full rounded-full animate-pulse" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadFullBackupZip}
                  disabled={isZipping}
                  className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>{isZipping ? t("Assembling ZIP Archive...") : t("1-Click Full ZIP Backup")}</span>
                </button>
              </div>

              {/* Secondary Metadata or Script Downloads */}
              <div className="border-t border-gray-100 dark:border-slate-800/80 pt-6 mt-6 max-w-lg mx-auto">
                <p className="text-xxs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t("Alternative Single Downloads")}</p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isExporting || isZipping}
                    className="flex-1 py-2 px-3 text-[11px] font-semibold text-gray-650 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 hover:border-brand-500/30 rounded-xl transition-all shadow-xxs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Database className="w-3.5 h-3.5 text-gray-400" />
                    <span>{isExporting ? t("Compiling JSON...") : t("Download DB JSON Only")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePythonDownloader}
                    disabled={isZipping}
                    className="flex-1 py-2 px-3 text-[11px] font-semibold text-gray-650 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 hover:border-green-500/30 rounded-xl transition-all shadow-xxs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t("Download Python File Cloner")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Collapsible Advanced Settings (Keeps it clean & simple) */}
          <div className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-colors">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-slate-850/5 hover:bg-gray-50 dark:hover:bg-slate-850/20 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <Server className="w-4 h-4 text-indigo-500" />
                <span className="font-extrabold text-xs uppercase tracking-wider font-display">{t("Advanced Cloud Integrations & Migration")}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="p-6 border-t border-gray-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-top-4 duration-200">
                {/* Connection validation banner */}
                <div className="bg-gray-50/50 dark:bg-slate-850/10 border border-gray-100 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-gray-800 dark:text-gray-150 uppercase tracking-tight">{t("Active Cloud Storage Status")}</h4>
                    <p className="text-xxs text-gray-400 dark:text-gray-500 font-medium">
                      {t("Connection validation with Cloudflare R2 / AWS S3 storage backend system")}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={fetchR2Status}
                    disabled={isLoadingR2Status}
                    className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-150 dark:border-slate-800 rounded-lg py-1.5 px-3 text-gray-650 dark:text-gray-400 font-semibold text-xxs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingR2Status ? 'animate-spin' : ''}`} />
                    <span>{t("Re-test Connection")}</span>
                  </button>
                </div>

                {/* Cloud storage information layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/30 dark:bg-slate-850/5 text-center flex flex-col items-center justify-center min-h-[140px]">
                    {r2ConfigStatus.configured ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mb-2 inline-block" />
                        <span className="inline-block bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xxs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {t("R2 Storage Active")}
                        </span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-mono truncate max-w-full">
                          {r2ConfigStatus.bucketName}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 mb-2 inline-block" />
                        <span className="inline-block bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xxs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {t("Firebase Fallback")}
                        </span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
                          {t("Standard client channel active")}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="md:col-span-2 text-xxs text-gray-500 dark:text-gray-400 space-y-2">
                    <p className="font-medium text-gray-650 dark:text-gray-300">
                      {r2ConfigStatus.configured 
                        ? t("Enterprise Cloudflare R2 S3-Compatible storage pipeline is successfully operating. All worksheets, worksheets templates, custom lectures, and slide downloads uploaded by Sristy Faculty are automatically housed in R2.")
                        : t("Cloudflare R2 is currently in offline fallback mode. Sristy College system is utilizing standard Firebase static buckets. For complete data sovereignty, configure your secrets variables below.")
                      }
                    </p>
                    <div className="bg-gray-950 text-emerald-400 font-mono text-[9px] p-3 rounded-lg border border-gray-900 leading-relaxed overflow-x-auto whitespace-pre">
                      {`# Environment Credentials (Cloudflare R2 Storage Platform Config)
R2_ACCESS_KEY_ID="your_access_key_id"
R2_SECRET_ACCESS_KEY="your_secret_access_key"
R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
R2_BUCKET_NAME="${r2ConfigStatus.bucketName || 'sristy-academic-notes'}"`}
                    </div>
                  </div>
                </div>

                {/* Cloud-to-Cloud Storage Migrator Form */}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-6 space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-gray-800 dark:text-gray-150 uppercase tracking-tight flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-indigo-500" />
                      <span>{t("Server-to-Server Cloud Storage Migrator")}</span>
                    </h4>
                    <p className="text-xxs text-gray-400 dark:text-gray-500 mt-1">
                      {t("High-Integrity Bulk Replication: Clone Sristy Education physical files directly from active Cloudflare R2 bucket into any AWS S3, Cloudflare, or S3-Compatible bucket without local downloads.")}
                    </p>
                  </div>

                  <form onSubmit={handleInitiateS3Migration} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase text-gray-450 dark:text-gray-400 tracking-wider">
                          {t("Target Endpoint URL")}
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://<account_id>.r2.cloudflarestorage.com or https://s3.us-east-1.amazonaws.com"
                          value={targetEndpoint}
                          onChange={(e) => setTargetEndpoint(e.target.value)}
                          disabled={isMigrating}
                          className="w-full text-xs bg-gray-50 dark:bg-slate-850 hover:bg-gray-100/30 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 outline-hidden transition-all text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase text-gray-450 dark:text-gray-400 tracking-wider">
                          {t("Target Bucket Name")}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="sristy-academic-notes-backup"
                          value={targetBucketName}
                          onChange={(e) => setTargetBucketName(e.target.value)}
                          disabled={isMigrating}
                          className="w-full text-xs bg-gray-50 dark:bg-slate-850 hover:bg-gray-100/30 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 outline-hidden transition-all text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase text-gray-450 dark:text-gray-400 tracking-wider">
                          {t("Target Access Key ID")}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5d5a27ba8bf679c23577ef37c8fd..."
                          value={targetAccessKeyId}
                          onChange={(e) => setTargetAccessKeyId(e.target.value)}
                          disabled={isMigrating}
                          className="w-full text-xs bg-gray-50 dark:bg-slate-850 hover:bg-gray-100/30 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 outline-hidden transition-all text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase text-gray-455 dark:text-gray-400 tracking-wider">
                          {t("Target Secret Access Key")}
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••••••••••••••••••••••"
                          value={targetSecretAccessKey}
                          onChange={(e) => setTargetSecretAccessKey(e.target.value)}
                          disabled={isMigrating}
                          className="w-full text-xs bg-gray-50 dark:bg-slate-850 hover:bg-gray-100/30 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-955 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 outline-hidden transition-all text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>
                    </div>

                    {migrationError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-xxs font-semibold">
                        {migrationError}
                      </div>
                    )}

                    {migrationSummary && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-xxs font-bold">
                        {migrationSummary}
                      </div>
                    )}

                    <div>
                      <button
                        type="submit"
                        disabled={isMigrating}
                        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
                        <span>{isMigrating ? t("Bulk Replicating Cloud Files...") : t("Begin Cloud-to-Cloud replication")}</span>
                      </button>
                    </div>
                  </form>

                  {/* Migration Logs Terminal View */}
                  {migrationLogs.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="font-bold text-xxs uppercase text-gray-400 tracking-widest font-display flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{t("Server Sync Terminal Logs")}</span>
                      </h4>
                      <div className="bg-black/95 dark:bg-black rounded-lg border border-slate-900 p-4 font-mono text-[9px] text-green-400 space-y-1 max-h-[160px] overflow-auto leading-relaxed shadow-inner">
                        {migrationLogs.map((log, index) => (
                          <div key={index} className="flex gap-2">
                            <span className="text-gray-650">{`>`}</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Safeguard & Restore Warning */}
                <div className="bg-indigo-950 text-indigo-100 rounded-xl p-5 border border-indigo-900/60 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="inline-block bg-indigo-900 text-indigo-300 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest mb-2">
                        {t("Recovery Restore Safeguard")}
                      </span>
                      <h4 className="font-bold text-xs text-white mb-1">{t("Write-back Restore Restrictions")}</h4>
                      <p className="text-[10px] leading-relaxed text-indigo-300/85">
                        {t("To avoid active data collisions or malicious file escalations, automated database writing/import restores are strictly disabled within Sristy Family interface. To restore Sristy databases manually, submit this exported backup files structure directly to Sristy Academic Engineering Desk.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rejection_history' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="rejection-history-dashboard">
          {/* Header & Filters Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 dark:border-slate-800/50 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 tracking-tight font-display uppercase flex items-center gap-2">
                  <FileX className="w-5 h-5 text-red-500 animate-pulse" />
                  <span>{t("File Rejection Audit Records")}</span>
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t("Centralized oversight of all rejected files, reasons, and approving administrators across all branches.")}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-red-500/10 text-red-650 dark:text-red-400 font-mono text-[10.5px] font-bold px-3 py-1 rounded-full uppercase self-start">
                {rejectionLogs.length} {t("Total Rejections")}
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rejectionSearchQuery}
                  onChange={(e) => setRejectionSearchQuery(e.target.value)}
                  placeholder={t("Search file, reason, actor or uploader...")}
                  className="pl-9 pr-4 py-2 w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg text-xs focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              {/* Branch select */}
              <div>
                <select
                  value={rejectionBranchFilter}
                  onChange={(e) => setRejectionBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-205 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="">{t("All Academic Branches")}</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{t(b)}</option>
                  ))}
                </select>
              </div>

              {/* Subject select */}
              <div>
                <select
                  value={rejectionSubjectFilter}
                  onChange={(e) => setRejectionSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-205 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="">{t("All Specialized Subjects")}</option>
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{t(sub)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
            {loadingLogs ? (
              <div className="text-center py-16 text-xs text-gray-400 dark:text-gray-500 font-medium">
                {t("Scanning server archives...")}
              </div>
            ) : rejectionLogs.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
                  {t("Outstanding! No rejected submissions exist on this portal.")}
                </p>
              </div>
            ) : (() => {
              const filteredRejections = rejectionLogs.filter(log => {
                const queryLower = rejectionSearchQuery.toLowerCase();
                const textMatch = !rejectionSearchQuery.trim() ||
                  log.fileName?.toLowerCase().includes(queryLower) ||
                  log.rejectionReason?.toLowerCase().includes(queryLower) ||
                  log.actorName?.toLowerCase().includes(queryLower) ||
                  log.uploaderName?.toLowerCase().includes(queryLower);

                const branchMatch = !rejectionBranchFilter || log.fileBranch === rejectionBranchFilter;
                const subjectMatch = !rejectionSubjectFilter || log.fileSubject === rejectionSubjectFilter;

                return textMatch && branchMatch && subjectMatch;
              });

              if (filteredRejections.length === 0) {
                return (
                  <div className="text-center py-16 text-xs text-gray-405 dark:text-gray-500 font-semibold">
                    {t("No matching rejection records found for the active filters.")}
                  </div>
                );
              }

              return (
                <div className="bg-white dark:bg-slate-900 overflow-hidden transition-colors">
                  {/* Desktop view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[950px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-505 text-[10px] font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/10">
                          <th className="py-4 px-6">{t("File Details")}</th>
                          <th className="py-4 px-6">{t("Submitted By")}</th>
                          <th className="py-4 px-6">{t("Rejected By")}</th>
                          <th className="py-4 px-6">{t("Date Rejected")}</th>
                          <th className="py-4 px-6">{t("Rejection Reason & Feedback")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-gray-300">
                        {filteredRejections.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-slate-850/10 transition-colors">
                            {/* File Details */}
                            <td className="py-4 px-6">
                              <div className="max-w-[280px]">
                                <p className="font-bold text-gray-800 dark:text-gray-100 text-xs truncate animate-in fade-in" title={log.fileName}>
                                  {log.fileName}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 font-semibold text-[9px] uppercase tracking-wide">
                                  <span className="bg-brand-50/80 dark:bg-[#15803d]/15 text-[#15803d] dark:text-brand-400 px-1.5 py-0.5 rounded-xs">
                                    {t(log.fileSubject)}
                                  </span>
                                  <span className="text-gray-350 dark:text-gray-700">•</span>
                                  <span className="bg-gray-105 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-xs">
                                    {t(log.fileBranch)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Submitted By */}
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-bold text-gray-800 dark:text-gray-150 text-xs">{log.uploaderName || t("Unknown Teacher")}</p>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t("Teacher")}</span>
                              </div>
                            </td>

                            {/* Rejected By */}
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-bold text-red-600 dark:text-red-400 text-xs">{log.actorName}</p>
                                <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-bold text-gray-405 uppercase tracking-wider">
                                  <span>{t(log.actorRole)}</span>
                                  {log.actorBranch && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[120px]">{t(log.actorBranch)}</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Date Rejected */}
                            <td className="py-4 px-6 text-gray-400 dark:text-gray-505 font-mono text-[10px] whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{log.createdAt ? log.createdAt.toLocaleString() : "Just now"}</span>
                              </span>
                            </td>

                            {/* Rejection Reason */}
                            <td className="py-4 px-6">
                              <div className="bg-red-50/50 dark:bg-red-955/15 border-l-4 border-red-500 py-2 px-3 rounded-r-lg max-w-[340px]">
                                <p className="text-[10px] uppercase font-bold text-red-650 dark:text-red-400 tracking-wider flex items-center gap-1 mb-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{t("Rejection Reason")}</span>
                                </p>
                                <p className="text-xs text-red-750 dark:text-red-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
                                  {log.rejectionReason}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile stacked card view */}
                  <div className="md:hidden divide-y divide-gray-105 dark:divide-slate-805/40">
                    {filteredRejections.map((log) => (
                      <div key={log.id} className="p-4 space-y-3">
                        {/* Header: File name */}
                        <div>
                          <h4 className="font-bold text-xs text-gray-805 dark:text-white break-all leading-tight">{log.fileName}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-extrabold uppercase tracking-wide">
                            <span className="bg-brand-50/80 dark:bg-[#15803d]/15 text-[#15803d] dark:text-brand-400 px-1.5 py-0.5 rounded-xs">
                              {t(log.fileSubject)}
                            </span>
                            <span className="bg-gray-105 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-xs">
                              {t(log.fileBranch)}
                            </span>
                          </div>
                        </div>

                        {/* Info block: Submitted & Rejected by */}
                        <div className="grid grid-cols-2 gap-3 bg-gray-50/50 dark:bg-slate-800/15 p-3 rounded-lg border border-gray-100/50 dark:border-slate-800/50 text-[10px] text-gray-550 dark:text-gray-400">
                          <div>
                            <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Submitted By")}</span>
                            <p className="font-bold text-gray-750 dark:text-gray-200">{log.uploaderName || t("Unknown Teacher")}</p>
                            <span className="text-[9px] font-medium text-gray-400 uppercase">{t("Teacher")}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Rejected By")}</span>
                            <p className="font-bold text-red-605 dark:text-red-400">{log.actorName}</p>
                            <span className="text-[9px] font-medium text-gray-400 uppercase">{t(log.actorRole)}</span>
                          </div>
                          <div className="col-span-2 pt-1.5 border-t border-gray-100/40 dark:border-slate-800/50">
                            <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t("Date Rejected")}</span>
                            <span className="font-mono flex items-center gap-1 text-gray-600 dark:text-gray-300">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {log.createdAt ? log.createdAt.toLocaleString() : "Just now"}
                            </span>
                          </div>
                        </div>

                        {/* Rejection Reason */}
                        <div className="bg-red-50/50 dark:bg-red-955/15 border-l-4 border-red-500 py-2 px-3 rounded-r-lg">
                          <p className="text-[9px] uppercase font-bold text-red-655 dark:text-red-400 tracking-wider flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{t("Rejection Reason")}</span>
                          </p>
                          <p className="text-xs text-red-750 dark:text-red-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
                            {log.rejectionReason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}