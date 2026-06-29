import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeLocalStorage } from '../utils';

type Language = 'en' | 'bn';
type Theme = 'light' | 'dark';

interface ThemeLanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (text: string) => string;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

export const translations: Record<string, string> = {
  // Brand / Headings
  "Sristy Education Family": "সৃষ্টি শিক্ষা পরিবার",
  "Resource & File Storage": "রিসোর্স ও ফাইল স্টোরেজ",
  "Note's Sector": "নোটস সেক্টর",
  "Note/Resource Type": "নোটস/শীটের ধরন",
  "Or Pick a Cute Avatar Icon": "অথবা একটি কিউট প্রোফাইল আইকন বেছে নিন",
  "Chapter": "অধ্যায়/চ্যাপ্টার",
  "Topic": "টপিক/আলোচ্য বিষয়",
  "Choose Existing": "আগের তৈরি অপশন ব্যবহার করুন",
  "+ Create New Subject": "+ নতুন বিষয় তৈরি করুন",
  "+ Create New Chapter": "+ নতুন অধ্যায় তৈরি করুন",
  "+ Create New Topic": "+ নতুন টপিক তৈরি করুন",
  "+ Custom Item Type": "+ নতুন নোটের ধরন দিন",
  "Choose Preset": "লিস্ট থেকে সিলেক্ট করুন",
  "Word Meaning": "শব্দার্থ ও বাক্য গঠন (Word Meaning)",
  "Short Question": "সংক্ষিপ্ত প্রশ্নোত্তর (Short Question)",
  "Long Question": "কাঠামোবদ্ধ/দীর্ঘ প্রশ্নোত্তর (Long Question)",
  "Creative Question": "সৃজনশীল প্রশ্ন (Creative Question)",
  "Lecture Note": "শিক্ষকের লেকচার শিট (Lecture Note)",
  "Practice Sheet": "অনুশীলনী শিট (Practice Sheet)",
  "Syllabus & Suggestion": "সিলেবাস ও সাজেশন (Syllabus & Suggestion)",
  "Sristy Education Family Storage": "সৃষ্টি শিক্ষা পরিবার নোটস সেক্টর",
  "Connecting to secure cloud databases and indexing verified Sristy repository vaults...": "সুরক্ষিত ক্লাউড ডাটাবেজে সংযুক্ত হচ্ছে এবং সৃষ্টি আর্কাইভের ফাইলসমূহ ইনডেক্স করা হচ্ছে...",
  "Streaming Cloud Assets...": "ক্লাউড ডাটা লোড হচ্ছে...",

  // Navigation / Headers
  "Edit Profile": "প্রোফাইল সম্পাদন",
  "Edit Profile Details": "প্রোফাইল বিবরণী পরিবর্তন",
  "Sign Out": "লগ আউট",
  "Sign Out of System": "সিস্টেম থেকে লগ আউট",
  "Sign In / Log In": "সাইন ইন / লগ ইন",
  "Sign In to System": "সিস্টেমে লগ ইন",
  "Total Note's": "মোট নোট",
  "Browse All Storage": "সকল স্টোরেজ ব্রাউজ",
  "Admins Directory": "এডমিন ডিরেক্টরি",
  "Teachers Directory": "শিক্ষক ডিরেক্টরি",
  "Branch Administrators": "শাখা এডমিনগণ",
  "Branch Teachers": "শাখা শিক্ষকগণ",
  "Manage Teachers": "শিক্ষক পরিচালনা",

  // Tabs / Filters
  "Interactive Resource Directory Search": "রিসোর্স ডিরেক্টরি অনুসন্ধান",
  "Search file name, topic, notes...": "ফাইলের নাম, বিষয় বা নোট খুঁজুন...",
  "-- Apply Branch Filter --": "-- শাখা ফিল্টার করুন --",
  "-- Apply Subject Filter --": "-- বিষয় ফিল্টার করুন --",
  "Clear Search Parameters & Filters": "অনুসন্ধান ফিল্টার খালি করুন",
  "Available Note's": "টি নোট পাওয়া গেছে",
  "No matching verified files found in Sristy Education Family's digital database.": "সৃষ্টি শিক্ষা পরিবারের ডিজিটাল ডেটাবেজে কোনো ফাইল পাওয়া যায়নি।",

  // Notice Board / Announcements
  "Sristy Announcements & Bulletins": "সৃষ্টি ঘোষণা ও বুলেটিন বোর্ড",
  "Close Composer": "কম্পোজার বন্ধ করুন",
  "Write Notice": "নোটিশ লিখুন",
  "Post Notice Announcement": "নোটিশ পোস্ট করুন",
  "Title": "শিরোনাম",
  "Notice title...": "নোটিশের শিরোনাম...",
  "Notice content (Markdown or Plain Text)...": "নোটিশের বিস্তারিত বিবরণ...",
  "Posting...": "পোস্ট হচ্ছে...",
  "Post Bulletin": "বুলেটিন পোস্ট করুন",
  "Are you sure you want to delete this notice?": "আপনি কি নিশ্চিতভাবে এই নোটিশটি মুছে ফেলতে চান?",
  "Failed to post notice. Verify rules permissions.": "নোটিশ পোস্ট করা সম্ভব হয়নি। অনুমুতি পরীক্ষা করুন।",
  "Sristy Announcement Board": "সৃষ্টি নোটিশ বোর্ড",
  "No administrative notices have been posted. Check back later for official Sristy announcements.": "কোনো প্রশাসনিক নোটিশ পোস্ট করা হয়নি। সৃষ্টি পরীক্ষার বা অন্যান্য তথ্যের জন্য পুনরায় চেক করুন।",
  "No active notices published at this moment.": "বর্তমানে কোনো সক্রিয় নোটিশ নেই।",

  // File Card
  "Downloads": "ডাউনলোড",
  "Verified Storage": "অনুমোদিত আর্কাইভস",
  "PENDING APPROVAL": "অনুমোদনের অপেক্ষায়",
  "Approved": "অনুমোদিত",
  "Approved & Verified": "অনুমোদিত ও যাচাইকৃত",
  "Subject": "বিষয়",
  "Branch": "শাখা",
  "Uploader": "আপলোডার",
  "Download Material": "ডাউনলোড করুন",
  "Download counts will increment automatically upon extraction of binary streams or simulation loads.": "ফাইল ডাউনলোড করার সাথে সাথে মোট ডাউনলোড সংখ্যা স্বয়ংক্রিয়ভাবে বৃদ্ধি পাবে।",
  "Resource Files Details": "রিসোর্সের বিস্তারিত তথ্য",
  "Uploaded By": "আপলোডার",
  "Approve": "অনুমোদন করুন",
  "No note description notes provided.": "নোটের কোনো বর্ণনা প্রদান করা হয়নি।",

  // Auth Screen
  "Academic Portal Identity Verification": "একাডেমিক পোর্টাল পরিচয় যাচাইকরণ",
  "Authorized Access Control Gateway": "অনুমোদিত প্রবেশদ্বার নিয়ন্ত্রণ গেটওয়ে",
  "Role Selection": "ভূমিকা নির্বাচন",
  "Teacher / Instructor": "শিক্ষক / প্রশিক্ষক",
  "Institutional Viewer (Student/Guest)": "ভিউয়ার (শিক্ষার্থী/অতিথি)",
  "Branch Administrator": "শাখা অ্যাডমিনিস্ট্রেটর",
  "Central Governing Supervisor": "সেন্ট্রাল গভর্নিং সুপারভাইজার (মাস্টার)",
  "Username / Identifier": "ইউজারনেম / আইডি",
  "Enter registered username...": "নিবন্ধিত ইউজারনেম লিখুন...",
  "Password / Safe Key": "পাসওয়ার্ড / গোপন কোড",
  "Enter password...": "পাসওয়ার্ড লিখুন...",
  "Sign In Gateway": "প্রবেশ করুন",
  "Signing In...": "প্রবেশ করা হচ্ছে...",
  "Master Admin Setup Indicator": "মাস্টার এডমিন সেটআপ সূচক",
  "For guests / viewers, standard reading access is open. Authenticated credentials permitted only for teachers and administrative heads.": "ভিউয়ারদের প্রবেশ উন্মুক্ত। শিক্ষক এবং প্রশাসনিক এডমিনদের জন্য বিশেষ আইডি প্রয়োজন।",
  "Username lookups and credentials operations are managed securely via Firebase.": "ইউজারনেম এবং পাসওয়ার্ডের যাবতীয় প্রমাণাদি ফায়ারবেসের মাধ্যমে সুরক্ষিত রাখা হয়।",

  // Profile Modal
  "Institutional Profile Details": "প্রাতিষ্ঠানিক প্রোফাইল বিবরণী",
  "Edit your personal avatar, bio, and credentials saved inside the Sristy storage database directory.": "সৃষ্টি ডেটাবেজে সংরক্ষিত আপনার প্রোফাইল ছবি, বায়ো এবং তথ্যাদি পরিবর্তন করুন।",
  "Branch Assignment": "শাখা নির্ধারণ",
  "Assigned Academic Subject": "অর্পিত একাডেমিক বিষয়",
  "Personal Bio / Description": "ব্যক্তিগত বায়ো / বিবরণ",
  "Write something about your teaching philosophy or Sristy designation...": "আপনার শিক্ষকতা এবং সৃষ্টি পরিবার সম্পর্কিত একটি সুন্দর বিবরণ লিখুন...",
  "Drag & Drop Profile Picture (JPEG, PNG under 200KB)": "প্রোফাইল ছবি ড্র্যাগ ও ড্রপ করুন (অনূর্ধ্ব ২০০কেবি)",
  "or click to select photo": "অথবা ছবি নির্বাচন করতে ক্লিক করুন",
  "Invalid pic extension": "ছবিটি সঠিক ফরম্যাটে নেই",
  "File is too large! Must be under 200KB.": "ছবির সাইজ অনেক বড়! ২০০কেবি এর নিচে হওয়া আবশ্যক।",
  "Updating profile changes...": "প্রোফাইল আপডেট করা হচ্ছে...",
  "Save Profile Details": "প্রোফাইল সেভ করুন",
  "Verify details updates in dashboards on save.": "সেভ করার পর ড্যাশবোর্ডে পরিবর্তিত তথ্য দেখে নিন।",

  // Other Shared / Alerts
  "Close Window": "উইন্ডো বন্ধ করুন",
  "Confirm Action": "নিশ্চিত করুন",
  "Cancel": "বাতিল",
  "Success": "সফল",
  "Warning": "সতর্কতা",
  "Notice": "নোটিশ",
  "Create Account": "অ্যাকাউন্ট তৈরি করুন",
  "Access Restricted": "প্রবেশাধিকার সংরক্ষিত",

  // Branches
  "Sristy College of Tangail": "সৃষ্টি কলেজ অব টাঙ্গাইল",
  "Sristy Academic School, Tangail": "সৃষ্টি একাডেমিক স্কুল, টাঙ্গাইল",
  "Sristy Central School & College, Dhaka": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, ঢাকা",
  "Sristy Central School & College, Rajshahi": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, রাজশাহী",
  "Sristy Central School & College, Khulna": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, খুলনা",
  "Sristy Central School & College, Rangpur": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, রংপুর",
  "Sristy Central School & College, Ashulia": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, আশুলিয়া",
  "Sristy Central School & College, Jamalpur": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, জামালপুর",
  "Sristy Central School & College, Sherpur": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, শেরপুর",
  "Sristy Residential School, Tangail": "সৃষ্টি রেসিডেন্সিয়াল স্কুল, টাঙ্গাইল",
  "Sristy Central School & College, Sirajganj": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, সিরাজগঞ্জ",
  "Sristy Central School & College, Tangail": "সৃষ্টি সেন্ট্রাল school অ্যান্ড কলেজ, টাঙ্গাইল",
  "Sristy Central School & College, Gazipur": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, গাজীপুর",
  "Sristy International School, Tangail": "সৃষ্টি ইন্টারন্যাশনাল স্কুল, টাঙ্গাইল",
  "Sristy Central School & College, Natore": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, নাটোর",
  "Sristy Central School & College, Sarishabari": "সৃষ্টি সেন্ট্রাল স্কুল অ্যান্ড কলেজ, সরিষাবাড়ী",
  "Sristy College Academy, Tangail": "সৃষ্টি কলেজ একাডেমি, টাঙ্গাইল",
  "Sristy Academy, Tangail": "সৃষ্টি একাডেমি, টাঙ্গাইল",
  "Sristy Cadet Academy, Tangail": "সৃষ্টি ক্যাডেট একাডেমি, টাঙ্গাইল",
  "Sristy Juniors, Tangail": "সৃষ্টি জুনিয়র্স, টাঙ্গাইল",

  // Subjects
  "Bangla 1st Paper": "বাংলা ১ম পত্র",
  "Bangla 2nd Paper": "বাংলা ২য় পত্র",
  "English 1st Paper": "ইংরেজি ১ম পত্র",
  "English 2nd Paper": "ইংরেজি ২য় পত্র",
  "Math": "সাধারণ গণিত",
  "Religion": "ধর্ম",
  "ICT": "আইসিটি",
  "Physics 1st Paper": "পদার্থবিজ্ঞান ১ম পত্র",
  "Physics 2nd Paper": "পদার্থবিজ্ঞান ২য় পত্র",
  "Chemistry 1st Paper": "রসায়ন ১ম পত্র",
  "Chemistry 2nd Paper": "রসায়ন ২য় পত্র",
  "Biology 1st Paper": "জীববিজ্ঞান ১ম পত্র",
  "Biology 2nd Paper": "জীববিজ্ঞান ২য় পত্র",
  "Higher Math": "উচ্চতর গণিত",
  "Accounting": "হিসাববিজ্ঞান",
  "Finance": "ফিন্যান্স",
  "Business Entrepreneurship": "ব্যবসায় উদ্যোগ",
  "Geography": "ভূগোল",
  "General Science": "সাধারণ বিজ্ঞান",
  "Bangladesh and Global Studies": "বাংলাদেশ ও বিশ্বপরিচয়",

  // Master Dashboard / Admins
  "Sristy Governance Dashboard": "সৃষ্টি গভর্ন্যান্স ড্যাশবোর্ড",
  "Root control terminal for supervising and configuring administrators and browse the global cloud vaults.": "প্রশাসনিক এডমিন নিয়ন্ত্রণ এবং সামগ্রিক ডেটাবেজ تদারকির প্রধান ড্যাশবোর্ড।",
  "Add System Branch Admin": "নতুন শাখা এডমিন যোগ করুন",
  "Branch Administrators Directory": "শাখা এডমিন ডিরেক্টরি",
  "No administrative branch leads found inside the firestore. Rules permit master to register and toggle admins status.": "কোনো শাখা এডমিন খুঁজে পাওয়া যায়নি। মাষ্টার এডমিন এখান থেকে নতুন অ্যাকাউন্ট তৈরি করতে পারেন।",
  "Add Administrator Account": "এডমিন অ্যাকাউন্ট তৈরি করুন",
  "Fill out the secure fields to register a verified branch administrator in the system.": "সঠিক তথ্যাদি দিয়ে সিস্টেমের জন্য একজন অনুমোদিত শাখা এডমিন নিবন্ধন করুন।",
  "Full Name": "পূর্ণ নাম",
  "Username": "ইউজারনেম",
  "Assigned Branch Location": "অর্পিত শাখা অবস্থান",
  "Creating Profile...": "প্রোফাইল তৈরি হচ্ছে...",
  "Submit Activation Registrations": "নিবন্ধন সম্পন্ন করুন",
  "Select Assigned Branch": "শাখা নির্বাচন করুন",

  // Admin Dashboard / Teachers
  "Administrative Control Dashboard": "প্রশাসনিক নিয়ন্ত্রণ ড্যাশবোর্ড",
  "Manage and approve educational uploads from instructors and teachers of your branch.": "আপনার শাখার শিক্ষকদের আপলোডসমূহ পর্যবেক্ষণ ও অনুমোদন করুন।",
  "Register Faculty Teacher": "নতুন শিক্ষক নিবন্ধন করুন",
  "Register Faculty Account": "শিক্ষক অ্যাকাউন্ট তৈরি করুন",
  "Register a teacher to upload slides, worksheets, and syllabus items.": "লেকচার স্লাইড, নোট বা সিলেবাস আপলোড করার জন্য একজন শিক্ষক নিবন্ধন করুন।",
  "Assigned Subject Specialty": "অর্পিত বিষয়ের পারদর্শিতা",
  "Select Specialty Subject": "বিষয় নির্বাচন করুন",
  "Active Branch Faculty": "অনুষদ শিক্ষকগণ",
  "No faculty teachers registered for your branch yet. Register them above.": "আপনার শাখার কোনো শিক্ষক এখনও নিবন্ধিত হননি। ওপরে নতুন শিক্ষক নিবন্ধন করুন।",
  "Branch Pending Note's": "শাখার অনুমোদনের অপেক্ষমাণ নোটসমূহ",
  "Approve / Deny files in real-time.": "ফাইলসমূহ তাৎক্ষণিক অনুমোদন বা বাতিল করুন।",
  "Pending Files Scope": "অপেক্ষমাণ ফাইলের আওতা",
  "My Branch Only": "শুধুমাত্র আমার শাখা",
  "All System Pending": "সিস্টেমের সকল অপেক্ষমাণ",
  "Approve File": "অনুমোদন করুন",
  "Delete File": "মুছে ফেলুন",
  "Verify File Details": "ফাইলের তথ্য পরীক্ষা করুন",
  "Below are files uploaded by all Branch Admins and Teachers.": "শাখা এডমিন এবং শিক্ষকদের দ্বারা আপলোডকৃত ফাইলসমূহ নিচে দেওয়া হলো।",
  "No files available to view inside this scope.": "এই সীমায় দেখার জন্য কোনো ফাইল পাওয়া যায়নি।",

  // Teacher Dashboard
  "Instructor Upload Portal": "শিক্ষক আপলোড পোর্টাল",
  "Publish lecture sheets, practice guides, PDFs, or slides to the digital library vaults.": "লেকচার শিট, প্র্যাকটিস গাইড, পিডিএফ বা প্রেজেন্টেশন স্লাইড সৃষ্টি ডিজিটাল লাইব্রেরিতে আপলোড করুন।",
  "New Resource Upload Composer": "নতুন রিসোর্স আপলোড কম্পোজার",
  "File (PDF, PNG, JPG, JPEG, DOC, DOCX, PPT, PPTX under 2MB SLA Limit)": "ফাইল (পিডিএফ, ইমেজ, ওয়ার্ড ও পাওয়ারপয়েন্ট অনূর্ধ্ব ২এমবি চুক্তি সীমা)",
  "File exceeds SLA limit of 2MB (Contract Clause 11.2). Please compress your resource file.": "ফাইলের সাইজ চুক্তির ২ মেগাবাইট (ক্লজ ১১.২) সীমা অতিক্রম করেছে। দয়া করে কম্প্রেস করুন।",
  "Supported file types: PDF, Word, PPT or Image (Max 2MB due to SLA limit)": "সমর্থিত ফাইলসমূহ: পিডিএফ, ওয়ার্ড, পিপিটি বা ছবি (চুক্তি অনুযায়ী সর্বোচ্চ ২ মেগাবাইট)",
  "or click to browse local files": "অথবা লোকাল ফাইল ব্রাউজ করতে এখানে ক্লিক করুন",
  "Details Description Overview": "বিস্তারিত বর্ণনা / ওভারভিউ",
  "Write summary description of the file's content...": "ফাইলটিতে কী কী রয়েছে তার একটি সংক্ষিপ্ত বিবরণ লিখুন...",
  "Upload To Storage": "স্টোরেজে আপলোড করুন",
  "Uploading File Integrity...": "ফাইল আপলোড হচ্ছে...",
  "My Handheld Note's / Upload History": "আমার আপলোডকৃত নোটসমূহ",
  "Total My Uploads": "আমার মোট আপলোড",
  "Shared Subject Resources": "সহপাঠী শিক্ষকদের শেয়ার করা রিসোর্সসমূহ",
  "See verified books and files from other teachers teaching": "আপনার বিষয়ের সহপাঠী অন্যান্য শিক্ষকদের অনুমোদিত ফাইল ডাউনলোড করতে পারেন",
  "You haven't uploaded any documents yet. Create some using the drag-n-drop uploader.": "আপনি কোন ফাইল এখনো আপলোড করেননি। ড্রেগ ও ড্রপ আপলোডারের মাধ্যমে ফাইল আপলোড করুন।",

  // Newly Added / Master Dashboard Audit & Backup Keys
  "Please fill in all mandatory field parameters.": "দয়া করে সব বাধ্যতামূলক তথ্য প্রদান করুন।",
  "Account registration error: Username is already reserved.": "অ্যাকাউন্ট নিবন্ধন ত্রুটি: ইউজারনেমটি আগে থেকেই সংরক্ষিত রয়েছে।",
  "Profile created beautifully! Logging you into the note's system...": "প্রোফাইল চমৎকারভাবে তৈরি হয়েছে! সিস্টেমে লগইন করা হচ্ছে...",
  "Registration failed: Email address is already registered to another account.": "নিবন্ধন ব্যর্থ হয়েছে: ইমেইলটি অন্য একটি অ্যাকাউন্টে ব্যবহার করা হয়েছে।",
  "Registration failed: Password should be at least 6 characters long.": "নিবন্ধন ব্যর্থ হয়েছে: পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।",
  "Failed to register user. Ensure details are correct and try again.": "ব্যবহারকারী নিবন্ধন ব্যর্থ হয়েছে। দয়া করে সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।",
  "Password has been successfully updated.": "পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।",
  "Failed to reset account credentials.": "অ্যাকাউন্টের তথ্য রিসেট করা সম্ভব হয়নি।",
  "Are you sure you want to delete this user?": "আপনি কি নিশ্চিতভাবে এই ব্যবহারকারীকে মুছে ফেলতে চান?",
  "Failed to delete user.": "ব্যবহারকারী মুছতে ব্যর্থ হয়েছে।",
  "Master Administrator Control Panel": "মাস্টার গভর্ন্যান্স এডমিন কন্ট্রোল প্যানেল",
  "Email Address": "ইমেইল অ্যাড্রেস",
  "Global Note's": "সার্বিক নোট",
  "Manage Branch Admins": "শাখা এডমিন পরিচালনা",
  "Activity Logs": "অডিট অ্যাক্টিভিটি লগ",
  "System Backups": "সিস্টেম ব্যাকআপসমূহ",
  "Create Branch Admin": "শাখা এডমিন তৈরি করুন",
  "Portal Key / Password": "পোর্টাল বা পাসওয়ার্ড কী",
  "Active Branch Registrations": "শাখার সক্রিয় নিবন্ধনসমূহ",
  "Active Branch Administrators": "শাখার সক্রিয় এডমিনবৃন্দ",
  "No files found. Clean start!": "কোনো ফাইল পাওয়া যায়নি। নতুন সূচনা!",
  "Institutional Branch Member": "প্রাতিষ্ঠানিক শাখার সদস্য",
  "Portal Key / Passwords": "পোর্টাল কি / পাসওয়ার্ডসমূহ",
  "Suspend Status": "স্থগিতকরণ অবস্থা",
  "Remove": "মুছে ফেলুন",
  "System-Wide Activity Audit Log": "সিস্টেম অডিট অ্যাক্টিভিটি লগ",
  "Contract Agreement SLA Clause 14: Automated un-alterable records of active teacher uploads, admin approvals, and folder deletions.": "চুক্তিপত্রের এসএলএ ধারা ১৪: শিক্ষক আপলোড, এডমিন অনুমোদন এবং ফাইল মুছে ফেলার চিরস্থায়ী ও পরিবর্তন-অযোগ্য ডেটা অডিট বিবরণী।",
  "Filter by actor or file...": "এডমিন বা ফাইল দিয়ে ফিল্টার করুন...",
  "All Actions": "সকল অ্যাকশন",
  "Teacher Upload": "শিক্ষক আপলোড",
  "Admin Approval": "এডমিন অনুমোদন",
  "File Deletion": "ফাইল মুছে ফেলা",
  "Timestamp": "সময়কাল",
  "Operation Actor": "অপারেশন সম্পাদনকারী",
  "Execution Action": "সম্পাদিত অ্যাকশন",
  "Target Resource Details": "টার্গেট ফাইলের বিবরণ",
  "Secure Database Backup Terminal": "সুরক্ষিত ডাটাবেস ব্যাকআপ টার্মিনাল",
  "Contract SLA Clause 7.1 Compliance: Full database snapshots exporter. Facilitates instantaneous localized physical exports for Sristy Family server-side archives.": "চুক্তিপত্রের এসএলএ ধারা ৭.১ বাস্তবায়ন: সম্পূর্ণ ডাটাবেসের অফলাইন স্ন্যাপশট এক্সপোর্টার। সৃষ্টি পরিবারের সার্ভার সাইড ডাটা ব্যাকআপ সংরক্ষণ করার নিরাপদ লোকাল ব্যবস্থা।",
  "Cloud Snapshot Package Overview": "ক্লাউড স্ন্যাপশট প্যাকেজ বিবরণ",
  "Executing a manual download generates a single, clean JSON snapshot encompassing users database entries, notices, files structure metadata, and activity logs archives immediately.": "ম্যানুয়াল ডাউনলোড বোতামে ক্লিক করলে ইউজার প্রোফাইল, নোটিশ বোর্ড, ফাইলের মেটাডাটা এবং ব্যাকআপ লক সম্বলিত একটি নিরাপদ ও সচ্ছল JSON স্ন্যাপশট ফাইল স্বয়ংক্রিয়ভাবে তৈরি হবে।",
  "Registered Users": "নিবন্ধিত ব্যবহারকারী",
  "Resource Files": "সম্পদ ফাইলসমূহ",
  "Audit Log Count": "অডিট লগের সংখ্যা",
  "Status Health": "সার্ভার সক্রিয় অবস্থা",
  "ACTIVE ACTIVE": "সক্রিয় সক্রিয়",
  "Compiling Backup Snap...": "ব্যাকআপ সংগ্রহ করা হচ্ছে...",
  "Download Local SQL/JSON Backup Snapshot": "লোকাল SQL/JSON ব্যাকআপ স্ন্যাপশট ডাউনলোড করুন",
  "Recovery Restore Safeguard": "ডাটা পুনরুদ্ধার প্রতিরোধ ব্যবস্থা",
  "Write-back Restore Restrictions": "ডাটা রাইট-ব্যাক পুনরুদ্ধার নিষেধাজ্ঞা",
  "To avoid active data collisions or malicious file escalations, automated database writing/import restores are strictly disabled within Sristy Family interface. To restore Sristy databases manually, submit this exported backup files structure directly to Sristy Academic Engineering Desk.": "অনাকাঙ্ক্ষিত ডাটা ওভাররাইট বা নিরাপত্তা ক্ষুণ্ণ হওয়া এড়াতে সৃষ্টি ফ্যামিলি ইউজার ইন্টারফেসে অনলাইন অটো ডাটা রিস্টোর সরাসরি নিষেধ করা হয়েছে। কোন কারণে ডাটা রিস্টোর করার জরুরি প্রয়োজন হলে এই স্ন্যাপশট ফাইলটি সৃষ্টি আইটি ও ইঞ্জিনিয়ারিং ডেস্কে জমা দিন।",
  "SECURE PORTAL RECOVERY LAYER v2.1": "সুরক্ষিত পোর্টাল রিকভারি লেয়ার সংস্করণ ২.১",

  // Auth Screen dynamic keys
  "Please specify both username/email and password.": "ইউজারনেম বা ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।",
  "Authentication failed: Invalid username or incorrect credentials.": "প্রবেশ করতে ব্যর্থ: ইউজারনেম সঠিক নয় অথবা অননুমোদিত অ্যাকাউন্টের বিবরণ।",
  "Account configuration error: No corporate email mapped to this username.": "অ্যাকাউন্ট ত্রুটি: এই ইউজারনেমের সাথে কোনো ইমেইল সংযুক্ত করা নেই।",
  "This account has been deactivated by the branch admin.": "আপনার অ্যাকাউন্টটি শাখা এডমিন দ্বারা সাময়িকভাবে বন্ধ রাখা হয়েছে।",
  "Authentication succeeded in Auth, but your user profile does not exist in Firestore users collection.": "ফায়ারবেস অথেনটিকেশন সফল কিন্তু প্রোফাইল ফায়ারবেস ক্লাউড স্টোরেজে পাওয়া যায়নি।",
  "Welcome back": "স্বাগতম",
  "Authentication failed: Invalid credentials / incorrect key parameters.": "প্রবেশ ব্যর্থ হয়েছে: ইউজারনেম বা গোপন কি ভুল দেওয়া হয়েছে।",
  "Email/Password credential registry is disabled in your Firebase console. Please go to your Firebase Console > Authentication > Sign-in method and enable the Email/Password provider. Alternatively, use our dynamic Local Bypass buttons below!": "ফায়ারবেস ইমেইল/পাসওয়ার্ড সুবিধা বন্ধ রয়েছে। আপনার ফায়ারবেস কনসোলে লগইন করে এটি চালু করুন অথবা নিচের ডেমো বোতাম ব্যবহার করুন।",
  "Failed to complete sign in due to network blockages. Please verify your internet/proxy settings, or alternatively click any 'Quick Sandbox / Demo Bypass Login' button below to explore the file portal layout offline instantly!": "নেটওয়ার্ক জটিলতার কারণে সাইন ইন করা সম্ভব হয়নি। সংযোগ অথবা প্রক্সি চেক করুন। ওখান থেকে নিচে ডেমো সিস্টেমে সরাসরি ক্লিক করে পোর্টালে ডেমো প্রবেশ করুন!",
  "Failed to complete sign in. Please verify network settings or try again. Or click any 'Quick Sandbox / Demo Bypass Login' button below to log in offline instantly! Error detail:": "লগইন ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় ট্রাই করুন। কোনো ডেমো বোতাম চিপে অফলাইনেও প্রবেশ করতে পারেন। ত্রুটির বিবরণ:",
  "Teachers must specify an active branch and teaching subject group.": "শিক্ষকদের অবশ্যই একটি শিক্ষা শাখা এবং বিষয় গ্রুপ নির্বাচন করতে হবে।",
  "Quick Sandbox / Demo Bypass Login": "দ্রুত স্যান্ডবক্স / ডেমো বাইপাস লগইন",
  "Having trouble with network configuration or Firebase Auth? Access test profiles instantly:": "নেটওয়ার্ক বা ফায়ারবেসের কারণে লগইন করতে সমস্যা হচ্ছে? সরাসরি নিচের ডেমো প্রোফাইলগুলো ব্যবহার করে পোর্টাল ঘুরে দেখুন:",
  "Master Admin": "মাস্টার এডমিন",
  "Branch Admin": "শাখা এডমিন",
  "Teacher": "শিক্ষক",
  "Student": "শিক্ষার্থী / ভিজিটর",

  // Branch Admin specific keys
  "Section Teachers & Students": "শিক্ষক ও শিক্ষার্থী বিভাগ",
  "Verify Submissions": "জমা ফাইল অনুমোদন ও যাচাই",
  "Add Branch Member": "শাখা সদস্য যোগ করুন",
  "Viewer / Student": "শিক্ষার্থী / দর্শক",
  "Specialty Subject": "পাঠ্য বিষয়",
  "Status & Suspend Actions": "সক্রিয় বা স্থগিতকরণ অ্যাকশন",
  "Currently compiling note's of": "নোট তদারকি করছেন",
  "Currently Browsing: EVERYONE": "সার্বিক ব্রাউজিং: সবাই",
  "Currently Browsing: BRANCH NOTE'S": "সার্বিক ব্রাউজিং: নিজ শাখা",
  "Branch Administrator Panel": "শাখা এডমিন প্যানেল",
  "Governing Body": "পরিচালনা পর্ষদ",
  "Global Note's Visibility": "বৈশ্বিক নোট দৃশ্যমানতা",

  // Teacher Specific keys
  "Invalid file extension. Only PDF, DOC/DOCX, PPT/PPTX and images are allowed.": "ভুল ফাইল এক্সটেনশন। শুধুমাত্র পিডিএফ, ওয়ার্ড, পাওয়ারপয়েন্ট এবং ছবি আপলোড করার অনুমতি আছে।",
  "Please choose or drag-and-drop a file note first.": "দয়া করে প্রথমে একটি ফাইল নির্বাচন ও ড্র্যাগ করুন।",
  "Upload successful! Awaiting admin approval.": "ফাইল আপলোড সফল হয়েছে! শাখা এডমিন অনুমোদনের অপেক্ষায় রয়েছে।",
  "Failed to upload file.": "ফাইল আপলোড করতে ব্যর্থ হয়েছে।",
  "Sristy Academic Note's Portal": "সৃষ্টি একাডেমিক নোট পোর্টাল",
  "Teaching Department": "শিক্ষাদান বিভাগ",
  "My Submissions": "আমার জমাকৃত ফাইল",
  "Note's uploaded": "নোট আপলোড করা হয়েছে",
  "Upload Resource File": "রিসোর্স ফাইল আপলোড",
  "Ready to encode": "এনকোড করার জন্য প্রস্তুত",
  "Drag & Drop educational file": "শিক্ষা বিষয়ক ফাইল ড্র্যাগ ও ড্রপ করুন",
  "Description Notes": "নোট বা বিবরণী",
  "Briefly state target topics, chapters, and summary of the note...": "ফাইলটির বিষয়বস্তু, অধ্যায় এবং একটি সংক্ষিপ্ত বিবরণ দিন...",
  "Uploading...": "আপলোড হচ্ছে...",
  "My Document Vault": "আমার নথি ভল্ট",
  "Same Subject Shares": "একই বিষয়ের শেয়ার করা ফাইল",
  "Teacher Shared Files": "শিক্ষকদের শেয়ার করা ফাইল",
  "Department": "বিভাগ",
  "Verified note's": "অনুমোদিত আর্কাইভস",

  // Viewer / Dashboard specific keys
  "Viewing approved files matching your current parameters.": "আপনার অনুসন্ধান ও ফিল্টার অনুযায়ী অনুমোদিত ফাইলসমূহ দেখা হচ্ছে।",

  // Profile Modal specific keys
  "Image is too large. Please select a dynamic avatar under 500KB.": "ছবিটি অনেক বড়। দয়া করে ৫০০কেবি এর নিচের কোনো ফাইল নির্বাচন করুন।",
  "Display Full Name is required.": "নিশ্চিত পূর্ণ নাম প্রদান করা আবশ্যক।",
  "Failed to update profile settings. Try again.": "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
  "Edit Profile & Credentials": "প্রোফাইল ও তথ্যাদি পরিবর্তন",
  "Profile saved successfully.": "প্রোফাইল সফলভাবে সংরক্ষণ করা হয়েছে।",
  "Upload Image": "ছবি আপলোড",
  "Maximum image size: 500KB": "ছবির সর্বোচ্চ সাইজ: ৫০০কেবি",
  "Short Bio / Credentials": "সংক্ষিপ্ত বায়ো ও যোগ্যতা",
  "e.g. Master Instructor of Physics at Tangail Branch": "যেমন: সাধারণ পদার্থবিজ্ঞানের শিক্ষক, টাঙ্গাইল শাখা",
  "Save Profile": "প্রোফাইল সেভ করুন",
  "Saving...": "সেভ হচ্ছে...",
  "Subject assignment is locked for teachers. Please coordinate with a Sristy Administrator to modify your specialty subjects.": "শিক্ষকদের জন্য বিষয় পরিবর্তন লক করা আছে। আপনার স্পেশালিস্ট বিষয় পরিবর্তন করতে দয়া করে সৃষ্টি এডমিনের সাথে যোগাযোগ করুন।",
  "Security Alert: You do not have any subjects officially assigned to you yet. Please request your administrator to map your subjects.": "নিরাপত্তা সতর্কতা: অফিশিয়ালভাবে আপনার কোনো দায়িত্বপ্রাপ্ত বিষয় ম্যাপিং করা নেই। দয়া করে এডমিনকে আপনার বিষয় অর্পণ করতে অনুরোধ করুন।",
  "Authorized Only": "শুধুমাত্র অনুমোদিত",
  "Institutional Role": "প্রাতিষ্ঠানিক দায়িত্ব",

  // Soft Deletion & Roles Additions
  "Super Admin": "সুপার এডমিন",
  "File Approver": "ফাইল অনুমোদক",
  "File Approver Panel": "ফাইল অনুমোদনকারী প্যানেল",
  "File Approver Workspace": "ফাইল অনুমোদনকারী টার্মিনাল",
  "Secure Trash Bin Module": "নিরাপদ ট্র্যাশ বিন মডিউল",
  "Recycle Bin": "ট্র্যাশ বিন",
  "Recycle Bin / 30-Day Recovery Slot": "ট্র্যাশ বিন / ৩০ দিনের রিকভারি স্টোরেজ",
  "Branch Admin recover rules: You can restore any deleted file from your branch space within 30 days. Hard delete actions are managed by Super Admin.": "শাখা এডমিন নিয়মাবলী: আপনি ৩০ দিনের মধ্যে আপনার শাখার মুছে ফেলা যেকোনো ফাইল পুনরুদ্ধার করতে পারবেন। স্থায়ীভাবে অপসারণের সুবিধা সুপার এডমিনের জন্য সংরক্ষিত।",
  "Deleted Resource Name": "মুছে ফেলা ফাইলের নাম",
  "Deleter Information": "অপসারণকারীর তথ্য",
  "Restore action": "পুনরুদ্ধার অ্যাকশন",
  "Restore": "পুনরুদ্ধার করুন",
  "Hard Delete": "স্থায়ীভাবে মুছুন",
  "The branch recycling storage is empty. No files require attention!": "শাখার ট্র্যাশ বিন খালি রয়েছে। কোনো ফাইল পাওয়া যায়নি!",
  "Global Recycle Bin / 30-Day Recovery Slot": "গ্লোবাল ট্র্যাশ বিন / ৩০ দিনের রিকভারী স্টোরেজ",
  "Super Admin / Master Admin rules: You can restore any deleted files from any branch below within 30-days. Permanent physical deletion (Hard Delete) is restricted strictly to Super Administrators.": "সুপার ও মাষ্টার এডমিন নিয়মাবলী: আপনি ৩০ দিনের মধ্যে সকল শাখার যেকোনো মুছে ফেলা ফাইল পুনরুদ্ধার করতে পারবেন। স্থায়ীভাবে অপসারণের ক্ষমতা শুধু মাত্র সুপার এডমিনের রয়েছে।",
  "The system recycling storage is empty. No files require attention!": "সিস্টেম ট্র্যাশ বিন খালি রয়েছে। কোনো ফাইল পাওয়া যায়নি!",
  "Governing Body / Branch": "পরিচালনা পর্ষদ / শাখা",
  "Available Actions": "উপলব্ধ অ্যাকশনসমূহ",
  "Permanently delete file and physical storage contents permanently.": "ফাইল ও ফিজিক্যাল স্টোরেজ স্থায়ীভাবে অপসারণ করুন।",
  "Are you sure you want to move this file to trash? This can be recovered within 30 days.": "আপনি কি নিশ্চিত যে এই ফাইলটি ট্র্যাশ বিনে সরাতে চান? এটি ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।",
  "Are you sure you want to PERMANENTLY and IRREVERSIBLY delete this file from Sristy servers? This cannot be undone!": "আপনি কি নিশ্চিত যে এই ফাইলটি স্থায়ীভাবে এবং চিরতরে স্রিষ্টি শিক্ষাপরিবার সার্ভার থেকে মুছে দিতে চান? এটি আর ফেরত আনা সম্ভব নয়!",

  // Diagram Translations
  "Sristy Family Digital User System Hierarchy": "সৃষ্টি পরিবার ডিজিটাল ইউজার সিস্টেম ডায়াগ্রাম",
  "Interactive logical authorization blueprint highlighting the 6 distinct system roles, permissions routing, and operational flow.": "ছয়টি পৃথক সিস্টেমের ভূমিকা, অনুমতির বিন্যাস এবং কার্যপ্রণালী প্রদর্শনকারী সুরক্ষিত ভূমিকা ম্যাপ।",
  "Hard Delete (Permanent Physical Removal)": "স্থায়ীভাবে অপসারণ (চিরতরে ফাইল ধ্বংসকরণ)",
  "Manage Central Backups & Activity Logs": "সামগ্রিক ব্যাকআপ ও অ্যাক্টিভিটি লগ তদারকি",
  "Supervise Branch Administrators": "শাখা অ্যাডমিনিস্ট্রেটরদের তদারকি বা পরিচালনা",
  "Verify Global Archive Submissions": "সার্বিক স্টোরেজ আর্কাইভ তদারকি ও যাচাইকরণ",
  "Register Branch Faculty Teachers": "শাখার শিক্ষকদের অ্যাকাউন্ট নিবন্ধন",
  "Approve / Deny Lecture Materials": "লেকচার ও পরীক্ষা সামগ্রী অনুমোদন / বাতিল",
  "Move Files to Recycling Trash Bin": "ফাইলসমূহ সাধারণ ট্র্যাশ বিনে স্থানান্তরের অধিকার",
  "Verify Uploaded Teacher Slides": "শিক্ষকদের আপলোডকৃত স্লাইড বা শিট যাচাই",
  "Inspect Lesson Material Integrity": "লেকচার নোটের সঠিকতা নির্ধারণ",
  "Toggle Asset Approval Status": "রিসোর্সের অনুমোদন অবস্থা পরিবর্তন",
  "Upload Lectures & Sheets (Max 10MB)": "লেকচার ও পরীক্ষা শিট আপলোড (সর্বোচ্চ ১০এমবি)",
  "Organize Material by Subject Specialty": "বিষয়ের সিলেবাস অনুযায়ী সাজানো",
  "Acquire Peer Shared Worksheets": "সহপাঠী শিক্ষকদের শেয়ারড ফাইল সংগ্রহ",
  "Search Subject-wise Catalogues": "অধ্যায় ও বিষয় অনুযায়ী ফাইল খোঁজা",
  "Verify Document Preview Material": "ফাইলের বিবরণ বা ভিউ দেখা",
  "Extract Verified Learning Assets": "অনুমোদিত ফাইলসমূহ ডাউনলোড",

  // Document Preview Translations
  "Senior Faculty member": "সিনিয়র ফ্যাকাল্টি মেম্বার",
  "Chapter Detail": "অধ্যায়ের বিস্তারিত",
  "Special Lecture Notes": "বিশেষ লেকচার নোট",
  "Sristy Academic Digitization Board • Signed by": "সৃষ্টি একাডেমিক ডিজিটালাইজেশন বোর্ড • স্বাক্ষরিত:",
  "Prev": "পূর্ববর্তী",
  "Next": "পরবর্তী",
  "Seeded mock records have fully calibrated interactive learning view pre-sets.": "ডামি রেকর্ডের জন্য সরাসরি ইন্টারেক্টিভ লার্নিং ভিউ প্রস্তুত করা আছে।",
  "Uploader Identity": "আপলোডকারীর পরিচয়",
  "Open External Link": "এক্সটার্নাল লিংকে যান",
  "Tip: Google cloud renderer converts PDF/Word vectors, providing quick navigation. Use controls at top if document fails to stream.": "পরামর্শ: গুগল ক্লাউড রেন্ডারার পিডিএফ/ওয়ার্ডকে সামঞ্জস্যপূর্ণ ফরম্যাটে রূপান্তর করে দ্রুত দেখায়। স্ট্রিম হতে সমস্যা হলে উপরের কন্ট্রোল ব্যবহার করুন।",
  "Tip: Microsoft Office Live works best for Word/Powerpoint materials, allowing beautiful page layout previews.": "পরামর্শ: ওয়ার্ড/পাওয়ারপয়েন্ট ফাইলের ক্ষেত্রে মাইক্রোসফট অফিস লাইভ সবচেয়ে নিখুঁত ভিউ দেয়।",
  "Tip: Displaying using your local web browser engine. High performance & privacy.": "পরামর্শ: আপনার ব্রাউজারের নিজস্ব ইঞ্জিন ব্যবহার করে দেখানো হচ্ছে। অত্যন্ত দ্রুত ও নিরাপদ।",
  "Restore Size": "আগের সাইজে ফিরুন",
  "Fullscreen Mode": "ফুলস্ক্রিন মোড",
  "Close Preview": "প্রিভিউ বন্ধ করুন",

  // Public Features Highlights
  "Verified Material": "অনুমোদিত রিসোর্স",
  "Every lecture sheet, study guide, and question is uploaded and audited by authorized branch educators.": "প্রতিটি লেকচার শিট, গাইড এবং প্রশ্নপত্র অনুমোদিত শাখা শিক্ষকদের দ্বারা আপলোড এবং যাচাই করা হয়।",
  "Unified Directory": "সমন্বিত ডিরেক্টরি",
  "Bridges multiple Sristy colleges and school campuses under a singular directory for seamless access.": "সবগুলো কলেজ এবং স্কুল ক্যাম্পাসকে একটি অভিন্ন ডিরেক্টরিতে সংযুক্ত করে সহজে ফাইল পাওয়ার জন্য।",
  "Structured Library": "সুসজ্জিত লাইব্রেরি",
  "Categorized intuitively by subjects, classes, semesters, and chapters to avoid digital clutter.": "ডিজিটাল বিশৃঙ্খলা এড়াতে বিষয়, শ্রেণী, সেমিস্টার এবং অধ্যায় অনুযায়ী সাজানো হয়েছে।",
  "Secure Distribution": "নিরাপদ বিতরণ ব্যবস্থা",
  "Rigorous access regulations guarantee that files are safely stored, previewed, and fetched cryptographically.": "কঠোর অ্যাক্সেস নিয়ন্ত্রণ নিশ্চিত করে যে প্রতিটি ফাইল সুরক্ষিত উপায়ে সংরক্ষিত ও প্রদর্শিত হয়।"
};

export const ThemeLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (safeLocalStorage.getItem('app-language') as Language) || 'en';
  });

  const [theme, setTheme] = useState<Theme>('light');

  // Apply theme to document documentElement
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    safeLocalStorage.setItem('app-theme', 'light');
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem('app-language', language);
  }, [language]);

  const toggleTheme = () => {
    // Locked to light theme as requested, no-op
  };

  const t = (text: any): string => {
    if (text === null || text === undefined) return '';
    const textStr = String(text);
    if (!textStr) return '';
    
    const trimmed = textStr.trim();
    let bangla = '';

    if (translations[trimmed]) {
      bangla = translations[trimmed];
    } else {
      const lower = trimmed.toLowerCase();
      const foundKey = Object.keys(translations).find(k => k.toLowerCase() === lower);
      if (foundKey) {
        bangla = translations[foundKey];
      }
    }

    // If no translation was found or translation is exactly identical to the original key, just return the text
    if (!bangla || bangla === trimmed) {
      return text;
    }

    if (language === 'bn') {
      return bangla;
    } else {
      return text;
    }
  };

  return (
    <ThemeLanguageContext.Provider value={{ language, setLanguage, theme, toggleTheme, t }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLanguage = () => {
  const context = useContext(ThemeLanguageContext);
  if (context === undefined) {
    throw new Error('useThemeLanguage must be used within a ThemeLanguageProvider');
  }
  return context;
};
