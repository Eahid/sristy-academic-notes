export type UserRole = 'super_admin' | 'master_admin' | 'admin' | 'file_approver' | 'teacher' | 'viewer';

export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  branch?: string; // Optional (not needed or blank for master_admin)
  subject?: string; // Optional (primarily for teachers)
  subjects?: string[]; // Multiple assigned subjects for teachers
  classes?: string[]; // Multiple assigned classes for teachers
  classAssignments?: { subject: string; classLevel: string }[]; // Specific subject-class pairings
  status: 'active' | 'inactive';
  profilePic?: string; // Base64 image
  profilePictureUrl?: string;
  bio?: string;
  createdAt: any;
}

export interface FileUpdateHistory {
  id?: string;
  version: number;
  replacedAt: any;
  replacedBy: string;
  replacedByName: string;
  previousFileName: string;
  previousFileSize: number;
  previousFileType?: string;
  previousFileUrl?: string;
  previousStoragePath?: string;
  changeNote?: string;
}

export interface CommentEditHistory {
  content: string;
  editedAt: any;
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorBranch?: string;
  authorSubject?: string;
  authorProfilePic?: string;
  isOwnerReply: boolean;
  content: string;
  createdAt: any;
}

export interface FileComment {
  id: string;
  fileId: string;
  fileOwnerId?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorBranch?: string;
  authorSubject?: string;
  authorProfilePic?: string;
  content: string; // Latest content
  createdAt: any;
  updatedAt?: any;
  isEdited?: boolean;
  editHistory?: CommentEditHistory[];
  replies?: CommentReply[];
}

export interface FileArchive {
  id: string;
  fileName: string;
  fileType: string; // pdf, doc, docx, ppt, pptx, png, jpg, jpeg
  fileSize: number; // in bytes
  fileUrl?: string; // Standard Firebase Storage URL
  storagePath?: string; // Path within Firebase Storage
  fileData?: string; // Base64 content or simulation txt
  description?: string;
  uploadedBy: string;
  uploaderName: string;
  uploaderRole: string;
  branch: string;
  subject: string;
  chapter?: string;
  topic?: string;
  itemType?: string;
  classLevel?: string;
  isApproved: boolean;
  approvedBy?: string; // UID of admin who approved it
  downloadCount: number;
  likes?: number;
  dislikes?: number;
  likedBy?: string[];
  dislikedBy?: string[];
  commentCount?: number;
  needsReplacement?: boolean;
  rejectionReason?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Timestamp of last file update/replacement
  updateHistory?: FileUpdateHistory[]; // Audit trail of file replacements
  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
  deletedByName?: string;
}

export interface NoticeAnnouncement {
  id: string;
  title: string;
  content: string; // Markdown / plan content
  uploadedBy: string;
  uploaderName: string;
  uploaderRole?: string;
  createdAt: any;
}

export interface AppState {
  currentUser: UserProfile | null;
  loading: boolean;
}

export interface ActivityLog {
  id: string;
  action: 'file_uploaded' | 'file_approved' | 'file_deleted';
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorBranch?: string;
  fileId: string;
  fileName: string;
  fileSubject: string;
  fileBranch: string;
  createdAt: any;
}
