export interface BoardMember {
  id: string;
  nameBangla: string;
  nameEnglish: string;
  designationBangla: string;
  designationEnglish: string;
  branch: string;
  phone: string;
  email: string;
  username: string;
  defaultPassword: string;
  category: 'SEB' | 'EB'; // Supreme Executive Body vs Executive Body
}

export const SRISTY_BOARD_MEMBERS: BoardMember[] = [
  {
    id: "anik_tangail",
    nameBangla: "মো: অনিক ইসলাম",
    nameEnglish: "Md. Anik Islam",
    designationBangla: "উপাধ্যক্ষ, সৃষ্টি ইন্টারন্যাশনাল স্কুল, টাঙ্গাইল",
    designationEnglish: "Vice Principal, Sristy International School, Tangail",
    branch: "Sristy International School, Tangail",
    phone: "",
    email: "anik.tangail@sristyedu.com",
    username: "anik_tangail",
    defaultPassword: "Anik@Sristy",
    category: "EB"
  },
  {
    id: "mostafa_gazipur",
    nameBangla: "ডি এম মোস্তফা",
    nameEnglish: "D. M. Mostafa",
    designationBangla: "এডমিন অফিসার, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, গাজীপুর",
    designationEnglish: "Admin Officer, Sristy Central School & College, Gazipur",
    branch: "Sristy Central School & College, Gazipur",
    phone: "",
    email: "mostafa.gazipur@sristyedu.com",
    username: "mostafa_gazipur",
    defaultPassword: "Mostafa@Sristy",
    category: "EB"
  },
  {
    id: "saad_ashulia",
    nameBangla: "মির নাজমুল হুদা সা'দ",
    nameEnglish: "Mir Nazmul Huda Sa'ad",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, আশুলিয়া",
    designationEnglish: "Principal, Sristy Central School & College, Ashulia",
    branch: "Sristy Central School & College, Ashulia",
    phone: "01896-197109",
    email: "saad.ashulia@sristyedu.com",
    username: "saad_ashulia",
    defaultPassword: "Sristy@197109",
    category: "SEB"
  },
  {
    id: "said_academic",
    nameBangla: "মুহাম্মদ সাইদুর রহমান সাইদ",
    nameEnglish: "Muhammad Saidur Rahman Said",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি একাডেমিক স্কুল, টাঙ্গাইল",
    designationEnglish: "Principal, Sristy Academic School, Tangail",
    branch: "Sristy Academic School, Tangail",
    phone: "01896-197103",
    email: "said.academic@sristyedu.com",
    username: "said_academic",
    defaultPassword: "Sristy@197103",
    category: "SEB"
  },
  {
    id: "shibly_college",
    nameBangla: "শিবলী ফেরদৌসী",
    nameEnglish: "Shibly Ferdousi",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি কলেজ অব টাঙ্গাইল",
    designationEnglish: "Principal, Sristy College of Tangail",
    branch: "Sristy College of Tangail",
    phone: "01896-197102",
    email: "shibly.college@sristyedu.com",
    username: "shibly_college",
    defaultPassword: "Sristy@197102",
    category: "SEB"
  },
  {
    id: "razzak_rajshahi",
    nameBangla: "মোহাম্মদ আব্দুর রাজ্জাক",
    nameEnglish: "Mohammad Abdur Razzak",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, রাজশাহী",
    designationEnglish: "Principal, Sristy Central School & College, Rajshahi",
    branch: "Sristy Central School & College, Rajshahi",
    phone: "01896-197106",
    email: "razzak.rajshahi@sristyedu.com",
    username: "razzak_rajshahi",
    defaultPassword: "Sristy@197106",
    category: "SEB"
  },
  {
    id: "kibria_residential",
    nameBangla: "মোঃ গোলাম কিবরিয়া",
    nameEnglish: "Md. Golam Kibria",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি রেসিডেন্সিয়াল স্কুল, টাঙ্গাইল",
    designationEnglish: "Principal, Sristy Residential School, Tangail",
    branch: "Sristy Residential School, Tangail",
    phone: "01896-197112",
    email: "kibria.residential@sristyedu.com",
    username: "kibria_residential",
    defaultPassword: "Sristy@197112",
    category: "SEB"
  },
  {
    id: "sattar_jamalpur",
    nameBangla: "আল. এফ. এম. আব্দুস সাত্তার",
    nameEnglish: "Al. F. M. Abdus Sattar",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, জামালপুর",
    designationEnglish: "Principal, Sristy Central School & College, Jamalpur",
    branch: "Sristy Central School & College, Jamalpur",
    phone: "01896-197110",
    email: "sattar.jamalpur@sristyedu.com",
    username: "sattar_jamalpur",
    defaultPassword: "Sristy@197110",
    category: "EB"
  },
  {
    id: "mominul_khulna",
    nameBangla: "মোমিনুল ইসলাম",
    nameEnglish: "Mominul Islam",
    designationBangla: "প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, খুলনা",
    designationEnglish: "Principal, Sristy Central School & College, Khulna",
    branch: "Sristy Central School & College, Khulna",
    phone: "01896-197107",
    email: "mominul.khulna@sristyedu.com",
    username: "mominul_khulna",
    defaultPassword: "Sristy@197107",
    category: "EB"
  },
  {
    id: "proloy_sherpur",
    nameBangla: "প্রলয় কুমার বিন্দু",
    nameEnglish: "Proloy Kumar Bindu",
    designationBangla: "ভাইস প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, শেরপুর",
    designationEnglish: "Vice Principal, Sristy Central School & College, Sherpur",
    branch: "Sristy Central School & College, Sherpur",
    phone: "01896-197111",
    email: "proloy.sherpur@sristyedu.com",
    username: "proloy_sherpur",
    defaultPassword: "Sristy@197111",
    category: "EB"
  },
  {
    id: "jiban_dhaka",
    nameBangla: "জীবন ঘোষ",
    nameEnglish: "Jiban Ghosh",
    designationBangla: "ভাইস প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, ঢাকা",
    designationEnglish: "Vice Principal, Sristy Central School & College, Dhaka",
    branch: "Sristy Central School & College, Dhaka",
    phone: "01896-197105",
    email: "jiban.dhaka@sristyedu.com",
    username: "jiban_dhaka",
    defaultPassword: "Sristy@197105",
    category: "EB"
  },
  {
    id: "zafar_rangpur",
    nameBangla: "মোঃ জাফর সাদিক",
    nameEnglish: "Md. Zafar Sadik",
    designationBangla: "ভাইস প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, রংপুর",
    designationEnglish: "Vice Principal, Sristy Central School & College, Rangpur",
    branch: "Sristy Central School & College, Rangpur",
    phone: "01896-197007",
    email: "zafar.rangpur@sristyedu.com",
    username: "zafar_rangpur",
    defaultPassword: "Sristy@197007",
    category: "EB"
  },
  {
    id: "lovelu_tangail",
    nameBangla: "মোঃ শফিকুল ইসলাম লাভলু",
    nameEnglish: "Md. Shafiqul Islam Lovelu",
    designationBangla: "ভাইস প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, টাঙ্গাইল",
    designationEnglish: "Vice Principal, Sristy Central School & College, Tangail",
    branch: "Sristy Central School & College, Tangail",
    phone: "01896-197114",
    email: "lovelu.tangail@sristyedu.com",
    username: "lovelu_tangail",
    defaultPassword: "Sristy@197114",
    category: "EB"
  },
  {
    id: "shahidul_natore",
    nameBangla: "মোঃ শহিদুল ইসলাম",
    nameEnglish: "Md. Shahidul Islam",
    designationBangla: "ভাইস প্রিন্সিপাল, সৃষ্টি সেন্ট্রাল স্কুল এন্ড কলেজ, নাটোর",
    designationEnglish: "Vice Principal, Sristy Central School & College, Natore",
    branch: "Sristy Central School & College, Natore",
    phone: "01896-197117",
    email: "shahidul.natore@sristyedu.com",
    username: "shahidul_natore",
    defaultPassword: "Sristy@197117",
    category: "EB"
  },
  {
    id: "asad_juniors",
    nameBangla: "আসাদুজ্জামান আসাদ",
    nameEnglish: "Asaduzzaman Asad",
    designationBangla: "নির্বাহী প্রধান, সৃষ্টি একাডেমিক-জুনিয়র্স",
    designationEnglish: "Executive Head, Sristy Academic-Juniors",
    branch: "Sristy Juniors, Tangail",
    phone: "01896-197120",
    email: "asad.juniors@sristyedu.com",
    username: "asad_juniors",
    defaultPassword: "Sristy@197120",
    category: "EB"
  }
];
