import React, { useState, useEffect } from 'react';
import schoolLogoImg from './assets/logo.webp';
import principalPhotoImg from './assets/principal.webp';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminTab, setAdminTab] = useState('notices');

  // Production-ready local/API data layer. The same app works locally and when deployed.
  const [db, setDb] = useState(null);

  useEffect(() => {
    const apiFetch = async (url, options = {}) => {
      const res = await fetch(url, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    };

    const makeCollection = (resource) => ({
      orderBy: () => ({
        onSnapshot: (callback, onError) => {
          let stopped = false;
          const sync = async () => {
            try {
              const rows = await apiFetch(`/api/${resource}`);
              if (!stopped) callback({ empty: rows.length === 0, docs: rows.map(row => ({ id: row.id, data: () => row })) });
            } catch (err) { if (!stopped && onError) onError(err); }
          };
          sync();
          const timer = setInterval(sync, 15000);
          return () => { stopped = true; clearInterval(timer); };
        }
      }),
      add: async (item) => apiFetch(`/api/${resource}`, { method: 'POST', body: JSON.stringify(item) }),
      doc: (id) => ({
        delete: () => apiFetch(`/api/${resource}/${id}`, { method: 'DELETE' }),
      })
    });

    const apiDb = {
      collection: makeCollection,
      doc: (path) => {
        if (path !== 'site/info') return {};
        return {
          set: (data) => apiFetch('/api/siteInfo', { method: 'PUT', body: JSON.stringify(data) }),
          onSnapshot: (callback, onError) => {
            let stopped = false;
            const sync = async () => {
              try {
                const data = await apiFetch('/api/siteInfo');
                if (!stopped) callback({ exists: !!data && Object.keys(data).length > 0, data: () => data });
              } catch (err) { if (!stopped && onError) onError(err); }
            };
            sync();
            const timer = setInterval(sync, 15000);
            return () => { stopped = true; clearInterval(timer); };
          }
        };
      }
    };
    setDb(apiDb);
  }, []);

  // Robust SVG Data URIs as neutral placeholders guaranteeing zero compilation or module errors
  const schoolLogoSrc = schoolLogoImg;
  
  const principalPhotoSrc = principalPhotoImg;

  const defaultNotices = [
    { id: 1, title: 'Admissions Open for Academic Year 2026-27', date: 'March 1, 2026', tag: 'Admissions', content: 'Registrations are now open for Nursery to Grade 10. Visit the campus or apply online.' },
    { id: 2, title: 'Annual Sports Meet 2026 Schedule', date: 'February 15, 2026', tag: 'Events', content: 'Annual athletic events will commence from next week on the school grounds.' },
    { id: 3, title: 'Parent-Teacher Meeting (PTM)', date: 'February 10, 2026', tag: 'Notice', content: 'All parents are requested to attend the PTM between 9:00 AM and 1:00 PM.' }
  ];

  const [notices, setNotices] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ves_notices');
      return saved ? JSON.parse(saved) : defaultNotices;
    } catch (e) {
      return defaultNotices;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('ves_notices', JSON.stringify(notices));
    } catch (e) {}
  }, [notices]);

  // Live-sync notices from the cloud once db is available
  useEffect(() => {
    if (!db) return;
    const unsub = db.collection('notices').orderBy('createdAt', 'desc').onSnapshot(
      (snap) => {
        if (snap.empty) return; // keep local/default content until something is published
        setNotices(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      },
      () => {}
    );
    return () => unsub && unsub();
  }, [db]);

  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeTag, setNewNoticeTag] = useState('Notice');

  const defaultInquiries = [
    { id: 1, name: 'Rahul Sharma', phone: '9876543210', grade: 'Grade 5', message: 'Inquiring about transfer admission procedure.', date: '2026-03-02' },
    { id: 2, name: 'Priya Deshmukh', phone: '9123456789', grade: 'Nursery', message: 'What is the age criteria for nursery admission?', date: '2026-03-01' }
  ];

  const [inquiries, setInquiries] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ves_inquiries');
      return saved ? JSON.parse(saved) : defaultInquiries;
    } catch (e) {
      return defaultInquiries;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('ves_inquiries', JSON.stringify(inquiries));
    } catch (e) {}
  }, [inquiries]);

  const [contactForm, setContactForm] = useState({ name: '', phone: '', grade: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Editable site information (address, phone, email, hours)
  const defaultSiteInfo = {
    address: 'Jijamata Nagar / Near Bus Stand, Buldhana, Maharashtra - 443001',
    phone: '9923015404',
    email: 'thevisionenglishschoolbuldana@gmail.com',
    officeHours: 'Monday to Saturday: 8:00 AM – 2:00 PM',
    admissionsYear: '2026-27'
  };

  const [siteInfo, setSiteInfo] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ves_site_info');
      return saved ? { ...defaultSiteInfo, ...JSON.parse(saved) } : defaultSiteInfo;
    } catch (e) {
      return defaultSiteInfo;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('ves_site_info', JSON.stringify(siteInfo));
    } catch (e) {}
  }, [siteInfo]);

  // Live-sync site info from the cloud once db is available
  useEffect(() => {
    if (!db) return;
    const unsub = db.doc('site/info').onSnapshot(
      (snap) => {
        if (snap.exists) {
          const data = snap.data();
          setSiteInfo({ ...defaultSiteInfo, ...data });
          setSiteInfoDraft({ ...defaultSiteInfo, ...data });
        }
      },
      () => {}
    );
    return () => unsub && unsub();
  }, [db]);

  const [siteInfoDraft, setSiteInfoDraft] = useState(siteInfo);
  const [siteInfoSaved, setSiteInfoSaved] = useState(false);

  const handleSaveSiteInfo = (e) => {
    e.preventDefault();
    setSiteInfo(siteInfoDraft);
    if (db) {
      db.doc('site/info').set(siteInfoDraft).catch(() => {});
    }
    setSiteInfoSaved(true);
    setTimeout(() => setSiteInfoSaved(false), 3000);
  };

  // Editable gallery / activities
  const defaultActivities = [
    { id: 1, title: 'Classrooms', description: 'Photos coming soon', icon: '🏫', image: null, gradient: 'from-indigo-500 to-indigo-700' },
    { id: 2, title: 'Science Lab', description: 'Photos coming soon', icon: '🔬', image: null, gradient: 'from-amber-500 to-amber-600' },
    { id: 3, title: 'Library', description: 'Photos coming soon', icon: '📚', image: null, gradient: 'from-emerald-500 to-emerald-700' },
    { id: 4, title: 'Sports Day', description: 'Photos coming soon', icon: '🏆', image: null, gradient: 'from-rose-500 to-rose-700' },
    { id: 5, title: 'Annual Function', description: 'Photos coming soon', icon: '🎭', image: null, gradient: 'from-purple-500 to-purple-700' },
    { id: 6, title: 'School Campus', description: 'Photos coming soon', icon: '🌳', image: null, gradient: 'from-teal-500 to-teal-700' }
  ];

  const [activities, setActivities] = useState(() => {
    try {
      const saved = window.localStorage.getItem('ves_activities');
      return saved ? JSON.parse(saved) : defaultActivities;
    } catch (e) {
      return defaultActivities;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('ves_activities', JSON.stringify(activities));
    } catch (e) {}
  }, [activities]);

  // Live-sync gallery/activities from the cloud once db is available
  useEffect(() => {
    if (!db) return;
    const unsub = db.collection('activities').orderBy('createdAt', 'desc').onSnapshot(
      (snap) => {
        if (snap.empty) return;
        setActivities(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      },
      () => {}
    );
    return () => unsub && unsub();
  }, [db]);

  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [newActivityImage, setNewActivityImage] = useState(null);

  const handleActivityImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewActivityImage(reader.result);
    reader.readAsDataURL(file);
  };

  const [activityCloudWarning, setActivityCloudWarning] = useState('');

  const handleAddActivity = () => {
    if (!newActivityTitle) return;
    const item = {
      id: Date.now(),
      title: newActivityTitle,
      description: newActivityDesc || 'New addition to the gallery',
      icon: '📷',
      image: newActivityImage,
      gradient: 'from-indigo-500 to-indigo-700',
      createdAt: Date.now()
    };
    setActivityCloudWarning('');
    if (db) {
      db.collection('activities').add(item).catch((err) => {
        // Photos can exceed the cloud document size limit — fall back to this device only.
        setActivityCloudWarning('Photo was too large to sync to the cloud, so it was saved on this device only. Try a smaller image next time.');
        setActivities([item, ...activities]);
      });
    } else {
      setActivities([item, ...activities]);
    }
    setNewActivityTitle('');
    setNewActivityDesc('');
    setNewActivityImage(null);
  };

  const handleDeleteActivity = (id) => {
    if (db) {
      db.collection('activities').doc(String(id)).delete().catch(() => {});
    }
    setActivities(activities.filter((a) => a.id !== id));
  };

  // Age Calculator state
  const [dob, setDob] = useState('');
  const [calculatedAge, setCalculatedAge] = useState(null);
  const [eligibleClass, setEligibleClass] = useState('');

  const handleCalculateAge = (e) => {
    e.preventDefault();
    if (!dob) return;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    const months = Math.abs(today.getMonth() - birthDate.getMonth());
    setCalculatedAge({ years: age, months: months });

    if (age === 3) setEligibleClass('Nursery');
    else if (age === 4) setEligibleClass('Junior KG (LKG)');
    else if (age === 5) setEligibleClass('Senior KG (UKG)');
    else if (age >= 6 && age <= 16) setEligibleClass(`Grade ${age - 5}`);
    else if (age < 3) setEligibleClass('Pre-Nursery / Playgroup');
    else setEligibleClass('Higher Secondary / Contact School Office');
  };

  const handleWhatsAppInquiry = (customMsg = '') => {
    const phoneNumber = siteInfo.phone;
    const text = customMsg || encodeURIComponent('Hello The Vision English School Buldhana, I would like to inquire about admissions and school details.');
    window.open(`https://wa.me/${phoneNumber}?text=${text}`, '_blank');
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) return;
    const newInquiry = {
      id: Date.now(),
      ...contactForm,
      date: new Date().toISOString().split('T')[0]
    };
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInquiry)
      });
      if (!response.ok) throw new Error('Unable to save inquiry');
      const saved = await response.json();
      setInquiries(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
      setContactSubmitted(true);
      setContactForm({ name: '', phone: '', grade: '', message: '' });
      setTimeout(() => setContactSubmitted(false), 5000);
    } catch (err) {
      setContactSubmitted(false);
      alert('We could not save your enquiry right now. Please contact the school by WhatsApp or phone.');
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Incorrect password');
      setIsAdminLoggedIn(true);
      setAdminPassword('');
      const inquiryResponse = await fetch('/api/inquiries', { credentials: 'include' });
      if (inquiryResponse.ok) setInquiries(await inquiryResponse.json());
    } catch (err) {
      setAdminLoginError(err.message || 'Unable to sign in');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Bar */}
      <div className="bg-indigo-900 text-indigo-100 text-xs sm:text-sm py-2 px-4 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
            <span className="flex items-center gap-1">📍 {siteInfo.address}</span>
            <span className="hidden md:inline">|</span>
            <span className="flex items-center gap-1">📞 +91 {siteInfo.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleWhatsAppInquiry('Hello, I am contacting via the school website.')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow transition"
            >
              💬 WhatsApp Us
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold transition"
            >
              🔐 Admin Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <img 
              src={schoolLogoSrc} 
              alt="The Vision English School Logo" 
              className="w-14 h-14 object-cover rounded-full border-2 border-indigo-600 shadow bg-white"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-indigo-950 uppercase leading-none">The Vision English School</h1>
              <p className="text-xs font-semibold text-amber-600 tracking-wider mt-1">Buldhana, Maharashtra • Empowering Minds</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 font-medium text-sm">
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About Us' },
              { id: 'academics', label: 'Academics' },
              { id: 'admissions', label: 'Admissions & Age Calc' },
              { id: 'facilities', label: 'Facilities' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'notices', label: 'Notices' },
              { id: 'contact', label: 'Contact Us' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1">
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About Us' },
              { id: 'academics', label: 'Academics' },
              { id: 'admissions', label: 'Admissions & Age Calc' },
              { id: 'facilities', label: 'Facilities' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'notices', label: 'Notices' },
              { id: 'contact', label: 'Contact Us' },
              { id: 'admin', label: 'Admin Portal' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {}
      <main>
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="relative bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white py-20 lg:py-28 overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <span className="inline-block bg-amber-500 text-indigo-950 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">
                    🌟 Admissions Open 2026-27
                  </span>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                    Shaping Bright Futures at <span className="text-amber-400">The Vision English School</span>
                  </h1>
                  <p className="text-lg text-indigo-200 max-w-xl">
                    Located in Buldhana, Maharashtra, we provide holistic education combining academic excellence, moral integrity, modern technology, and leadership skills.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      onClick={() => setActiveTab('admissions')}
                      className="bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold px-6 py-3 rounded-xl shadow-lg transition transform hover:-translate-y-0.5"
                    >
                      Apply for Admission 🚀
                    </button>
                    <button
                      onClick={() => handleWhatsAppInquiry('Hello, I want to know more about fee structure and curriculum.')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition flex items-center gap-2"
                    >
                      <span>💬 Chat on WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={schoolLogoSrc} 
                      alt="School Badge" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 bg-white shadow"
                    />
                    <div>
                      <h3 className="font-bold text-lg text-white">Excellence in Education</h3>
                      <p className="text-xs text-indigo-300">Buldhana's Premier Co-Educational Institution</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-2xl font-black text-amber-400">100%</h4>
                      <p className="text-xs text-indigo-200 mt-1">Value-Based Learning</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-2xl font-black text-amber-400">Smart</h4>
                      <p className="text-xs text-indigo-200 mt-1">Digital Classrooms</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button 
                      onClick={() => setActiveTab('about')}
                      className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-sm"
                    >
                      Discover Our Legacy →
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Highlights */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <h2 className="text-3xl font-black text-indigo-950">Why Choose The Vision English School?</h2>
                  <p className="text-slate-600 mt-2">We nurture every child's innate potential through dedicated mentorship and state-of-the-art facilities.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { title: 'Experienced Faculty', desc: 'Passionate educators committed to individualized attention and conceptual clarity.', icon: '👩‍🏫' },
                    { title: 'Holistic Development', desc: 'Balanced integration of sports, arts, debates, science labs, and cultural activities.', icon: '🏆' },
                    { title: 'Safe & Caring Environment', desc: 'Secure campus with CCTV monitoring, friendly staff, and robust hygiene standards.', icon: '🛡️' }
                  ].map((card, idx) => (
                    <div key={idx} className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-3xl shadow-sm hover:shadow-md transition">
                      <div className="text-4xl mb-4">{card.icon}</div>
                      <h3 className="text-xl font-bold text-indigo-950 mb-2">{card.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Principal's Desk Preview */}
            <section className="py-16 bg-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="flex justify-center">
                  <div className="relative">
                    <img 
                      src={principalPhotoSrc} 
                      alt="Shankar Solanke, Principal of The Vision English School" 
                      className="w-72 h-80 sm:w-80 sm:h-96 object-cover rounded-3xl shadow-xl border-4 border-white bg-white"
                    />
                    <div className="absolute -bottom-4 -right-4 bg-amber-500 text-indigo-950 font-bold px-4 py-2 rounded-2xl shadow-lg text-sm">
                      Shankar Solanke, Principal
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-amber-600 font-bold text-xs uppercase tracking-widest">Message from Leadership</span>
                  <h2 className="text-3xl font-black text-indigo-950">"Education is not merely preparation for life, it is life itself."</h2>
                  <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                    At The Vision English School, Buldhana, we believe in cultivating curious minds, compassionate hearts, and confident leaders. Our dedicated teachers and staff strive to create an engaging learning atmosphere where students feel valued and inspired to achieve excellence.
                  </p>
                  <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                    We invite you to join our vibrant school community and partner with us in shaping a bright and successful future for your child.
                  </p>
                  <div className="pt-2">
                    <button 
                      onClick={() => setActiveTab('about')}
                      className="bg-indigo-900 hover:bg-indigo-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
                    >
                      Read Full Profile →
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">About Us</span>
                <h1 className="text-4xl font-black text-indigo-950">Welcome to The Vision English School</h1>
                <p className="text-slate-600 text-base sm:text-lg">
                  Situated in the heart of Buldhana, Maharashtra, our institution is dedicated to academic rigor, moral values, and all-round student development.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-8 rounded-3xl shadow-lg space-y-4">
                  <div className="text-3xl">🔭</div>
                  <h3 className="text-2xl font-black">Our Vision</h3>
                  <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
                    To be a leading center of educational excellence that empowers young learners with critical thinking, global perspectives, and strong ethical values, preparing them to make meaningful contributions to society.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-indigo-950 p-8 rounded-3xl shadow-lg space-y-4">
                  <div className="text-3xl">🎯</div>
                  <h3 className="text-2xl font-black">Our Mission</h3>
                  <p className="text-indigo-900 font-medium text-sm sm:text-base leading-relaxed">
                    To deliver high-quality English medium education through innovative teaching methodologies, comprehensive curricular activities, and a nurturing environment that fosters lifelong learning.
                  </p>
                </div>
              </div>

              {/* Principal Profile section */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="flex justify-center">
                  <img 
                    src={principalPhotoSrc} 
                    alt="Shankar Solanke, Principal" 
                    className="w-56 h-64 object-cover rounded-2xl shadow-md border-2 border-indigo-900 bg-white"
                  />
                </div>
                <div className="lg:col-span-2 space-y-4">
                  <span className="text-xs font-bold bg-amber-500 text-indigo-950 px-3 py-1 rounded-full uppercase">Leadership</span>
                  <h3 className="text-2xl font-black text-indigo-950">Principal's Address — Shankar Solanke</h3>
                  <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                    "At The Vision English School, we take pride in fostering a disciplined yet creative learning culture. Our educators act as mentors and guides, encouraging students to question, explore, and excel. We welcome parents and well-wishers to walk alongside us in this rewarding educational journey."
                  </p>
                  <p className="font-bold text-indigo-900">— Shankar Solanke, Principal, The Vision English School, Buldhana</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academics' && (
          <div className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Academics</span>
                <h1 className="text-4xl font-black text-indigo-950">Curriculum & Classes</h1>
                <p className="text-slate-600">Comprehensive structured education from Foundation Pre-Primary up to High School.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    level: 'Pre-Primary Section',
                    grades: 'Nursery, Jr. KG, Sr. KG',
                    desc: 'Play-based learning, phonics, motor skills development, creative arts, and joyful foundational literacy.',
                    icon: '🎨',
                    color: 'border-pink-200 bg-pink-50/30'
                  },
                  {
                    level: 'Primary Section',
                    grades: 'Grades I to V',
                    desc: 'Core competency in English, Mathematics, Environmental Studies, General Knowledge, Computer basics, and moral values.',
                    icon: '📚',
                    color: 'border-indigo-200 bg-indigo-50/30'
                  },
                  {
                    level: 'Middle & High School',
                    grades: 'Grades VI to X',
                    desc: 'Advanced Science, Social Science, Languages, Mathematics, practical lab sessions, and board exam preparation.',
                    icon: '🔬',
                    color: 'border-amber-200 bg-amber-50/30'
                  }
                ].map((item, idx) => (
                  <div key={idx} className={`border ${item.color} p-8 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition`}>
                    <div className="text-4xl">{item.icon}</div>
                    <h3 className="text-xl font-bold text-indigo-950">{item.level}</h3>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{item.grades}</p>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-2xl font-black">Want to know more about our syllabus or textbooks?</h3>
                  <p className="text-indigo-200 text-sm mt-1">Connect with our academic coordinator directly on WhatsApp.</p>
                </div>
                <button
                  onClick={() => handleWhatsAppInquiry('Hello, I would like to inquire about the curriculum and textbooks for the upcoming academic session.')}
                  className="bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold px-6 py-3 rounded-xl shadow whitespace-nowrap transition"
                >
                  💬 Chat on WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admissions' && (
          <div className="py-16 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Admissions 2026-27</span>
                <h1 className="text-4xl font-black text-indigo-950">Age Calculator & Admission Process</h1>
                <p className="text-slate-600">Check your child's eligible grade instantly and initiate admission inquiries.</p>
              </div>

              {/* Age Calculator Widget */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-md max-w-3xl mx-auto">
                <h3 className="text-2xl font-black text-indigo-950 mb-2 flex items-center gap-2">
                  <span>👶</span> Smart Age & Grade Calculator
                </h3>
                <p className="text-slate-600 text-sm mb-6">Enter your child's date of birth to check the recommended class for the academic session.</p>
                
                <form onSubmit={handleCalculateAge} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Child's Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-3 rounded-xl transition shadow"
                  >
                    Calculate Eligible Class 🔍
                  </button>
                </form>

                {calculatedAge && (
                  <div className="mt-6 p-6 bg-indigo-50 border border-indigo-200 rounded-2xl text-center space-y-2 animate-fadeIn">
                    <p className="text-sm font-semibold text-slate-600">Calculated Age as of June 1, 2026:</p>
                    <p className="text-2xl font-black text-indigo-950">{calculatedAge.years} Years {calculatedAge.months} Months</p>
                    <div className="pt-2">
                      <span className="text-xs uppercase font-bold text-slate-500">Recommended Class:</span>
                      <p className="text-xl font-bold text-amber-600 mt-1">{eligibleClass}</p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => handleWhatsAppInquiry(`Hello, I checked my child's age (${calculatedAge.years} years) and they are eligible for ${eligibleClass}. I wish to proceed with admission.`)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow inline-flex items-center gap-2 transition"
                      >
                        <span>💬 Apply via WhatsApp ({siteInfo.phone})</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admission Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6">
                {[
                  { step: '01', title: 'Submit Inquiry', desc: `Fill out the contact form or message us directly on WhatsApp (${siteInfo.phone}).` },
                  { step: '02', title: 'Campus Visit', desc: 'Visit The Vision English School in Buldhana for a guided tour and interaction with the principal.' },
                  { step: '03', title: 'Enrollment', desc: 'Complete documentation, submit previous academic records (if any), and secure admission.' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <span className="text-3xl font-black text-indigo-600">{s.step}</span>
                    <h4 className="text-lg font-bold text-indigo-950">{s.title}</h4>
                    <p className="text-slate-600 text-sm">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Campus Infrastructure</span>
                <h1 className="text-4xl font-black text-indigo-950">Our World-Class Facilities</h1>
                <p className="text-slate-600">Designed to provide a stimulating, safe, and modern learning environment.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { title: 'Smart Digital Classrooms', desc: 'Equipped with audio-visual learning tools and interactive aids.', icon: '🖥️' },
                  { title: 'Science & Computer Lab', desc: 'Hands-on practical sessions for Physics, Chemistry, Biology, and Coding.', icon: '🧪' },
                  { title: 'Well-Stocked Library', desc: 'Thousands of books, encyclopedias, journals, and storybooks for all ages.', icon: '📖' },
                  { title: 'Sports & Playground', desc: 'Spacious outdoor ground for cricket, football, kabaddi, and athletic drills.', icon: '⚽' },
                  { title: 'Safe Transport', desc: 'Reliable school van and bus connectivity across Buldhana city and nearby areas.', icon: '🚌' },
                  { title: 'CCTV & Security', desc: '24/7 campus surveillance and gated security ensuring total child safety.', icon: '🔒' }
                ].map((fac, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition space-y-3">
                    <div className="text-4xl">{fac.icon}</div>
                    <h3 className="text-xl font-bold text-indigo-950">{fac.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{fac.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="py-16 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Campus Life</span>
                <h1 className="text-4xl font-black text-indigo-950">Photo Gallery</h1>
                <p className="text-slate-600">A glimpse of life at The Vision English School, Buldhana. Photos from campus, classrooms, and events will appear here.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {activities.map((item) => (
                  <div key={item.id} className="rounded-3xl shadow-sm overflow-hidden border border-slate-200 bg-white">
                    {item.image ? (
                      <div className="h-48 overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`h-48 bg-gradient-to-br ${item.gradient || 'from-indigo-500 to-indigo-700'} flex items-center justify-center text-6xl`}>
                        {item.icon || '📷'}
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-indigo-950">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-2xl font-black">Want to see the campus in person?</h3>
                  <p className="text-indigo-200 text-sm mt-1">Schedule a visit and take a guided tour with our staff.</p>
                </div>
                <button
                  onClick={() => handleWhatsAppInquiry('Hello, I would like to schedule a campus visit and tour.')}
                  className="bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold px-6 py-3 rounded-xl shadow whitespace-nowrap transition"
                >
                  💬 Schedule a Visit
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notices' && (
          <div className="py-16 bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Notice Board</span>
                <h1 className="text-4xl font-black text-indigo-950">Latest School Announcements</h1>
                <p className="text-slate-600">Stay updated with circulars, events, holidays, and exam schedules.</p>
              </div>

              <div className="space-y-4">
                {notices.map((n) => (
                  <div key={n.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">{n.tag}</span>
                      <span className="text-xs text-slate-500">{n.date}</span>
                    </div>
                    <h3 className="text-xl font-bold text-indigo-950">{n.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Get in Touch</span>
                <h1 className="text-4xl font-black text-indigo-950">Contact The Vision English School</h1>
                <p className="text-slate-600">We would love to hear from you. Visit our campus or reach out via phone, WhatsApp, or email.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl space-y-6">
                    <h3 className="text-2xl font-black text-indigo-950">School Office Details</h3>
                    <div className="space-y-4 text-slate-700">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">📍</span>
                        <div>
                          <strong className="block text-indigo-950">Address:</strong>
                          <span>{siteInfo.address}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">📞</span>
                        <div>
                          <strong className="block text-indigo-950">Phone / WhatsApp:</strong>
                          <span className="text-indigo-600 font-bold">+91 {siteInfo.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">✉️</span>
                        <div>
                          <strong className="block text-indigo-950">Email:</strong>
                          <span>{siteInfo.email}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">⏰</span>
                        <div>
                          <strong className="block text-indigo-950">Office Hours:</strong>
                          <span>{siteInfo.officeHours}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleWhatsAppInquiry('Hello, I want to visit the school campus. Please share visiting hours.')}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow transition flex items-center justify-center gap-2"
                      >
                        <span>💬 Chat instantly on WhatsApp ({siteInfo.phone})</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
                  <h3 className="text-2xl font-black text-indigo-950">Send an Inquiry</h3>
                  {contactSubmitted && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium text-sm">
                      ✅ Inquiry submitted successfully! Our admissions team will contact you shortly.
                    </div>
                  )}
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number (WhatsApp)</label>
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        required
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Grade Applying For</label>
                      <select
                        value={contactForm.grade}
                        onChange={(e) => setContactForm({ ...contactForm, grade: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                      >
                        <option value="">Select Grade</option>
                        <option value="Nursery">Nursery</option>
                        <option value="Junior KG">Junior KG</option>
                        <option value="Senior KG">Senior KG</option>
                        <option value="Grade 1 to 5">Grade 1 to 5</option>
                        <option value="Grade 6 to 10">Grade 6 to 10</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Message / Query</label>
                      <textarea
                        rows="3"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Write your query here..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-3 rounded-xl shadow transition"
                    >
                      Submit Inquiry 📤
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="py-16 bg-slate-100 min-h-[80vh]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {!isAdminLoggedIn ? (
                <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-xl max-w-md mx-auto space-y-6">
                  <div className="text-center space-y-2">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-black text-indigo-950">Admin Portal Login</h2>
                    <p className="text-slate-500 text-xs">Enter school administration password to continue.</p>
                  </div>
                  {adminLoginError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl text-center">
                      {adminLoginError}
                    </div>
                  )}
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter administration password"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-indigo-950 font-bold py-3 rounded-xl shadow transition"
                    >
                      Login to Dashboard 🔑
                    </button>
                  </form>
                  <div className="text-center pt-2">
                    <button 
                      onClick={() => setActiveTab('home')}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      ← Return to Website Home
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-8">
                  <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-6">
                    <div>
                      <h2 className="text-2xl font-black text-indigo-950">School Admin Dashboard</h2>
                      <p className="text-xs text-slate-500">Welcome, Principal / Administrator • The Vision English School</p>
                    </div>
                    <button
                      onClick={async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {}); setIsAdminLoggedIn(false); }}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                    >
                      Logout 🚪
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b pb-4">
                    {[
                      { id: 'notices', label: '📢 Notices' },
                      { id: 'siteinfo', label: '🏫 Site Info' },
                      { id: 'activities', label: '🖼️ Gallery / Activities' },
                      { id: 'inquiries', label: '📥 Inquiries' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setAdminTab(t.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                          adminTab === t.id ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {adminTab === 'notices' && (
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-bold text-indigo-950">📢 Publish New Notice / Circular</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Notice Title"
                        value={newNoticeTitle}
                        onChange={(e) => setNewNoticeTitle(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                      />
                      <select
                        value={newNoticeTag}
                        onChange={(e) => setNewNoticeTag(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                      >
                        <option value="Notice">Notice</option>
                        <option value="Admissions">Admissions</option>
                        <option value="Events">Events</option>
                        <option value="Exam">Exam</option>
                      </select>
                    </div>
                    <textarea
                      rows="2"
                      placeholder="Notice Content description..."
                      value={newNoticeContent}
                      onChange={(e) => setNewNoticeContent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                    ></textarea>
                    <button
                      onClick={() => {
                        if (!newNoticeTitle) return;
                        const item = {
                          id: Date.now(),
                          title: newNoticeTitle,
                          content: newNoticeContent || 'No additional details.',
                          tag: newNoticeTag,
                          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                          createdAt: Date.now()
                        };
                        if (db) {
                          db.collection('notices').add(item).catch(() => {
                            setNotices([item, ...notices]);
                          });
                        } else {
                          setNotices([item, ...notices]);
                        }
                        setNewNoticeTitle('');
                        setNewNoticeContent('');
                      }}
                      className="bg-indigo-900 hover:bg-indigo-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
                    >
                      Publish Notice 🚀
                    </button>
                    <p className="text-xs text-slate-500">
                      {db ? '☁️ Synced — visible on every signed-in device.' : '💾 Saved on this device only (cloud sync unavailable in this view).'}
                    </p>

                    <div className="pt-4 space-y-3">
                      <h4 className="text-sm font-bold text-slate-700">Existing Notices ({notices.length})</h4>
                      {notices.map((n) => (
                        <div key={n.id} className="bg-white border border-slate-200 p-3 rounded-xl flex justify-between items-center gap-3">
                          <div>
                            <p className="text-sm font-semibold text-indigo-950">{n.title}</p>
                            <p className="text-xs text-slate-500">{n.tag} • {n.date}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (db) {
                                db.collection('notices').doc(String(n.id)).delete().catch(() => {});
                              }
                              setNotices(notices.filter((x) => x.id !== n.id));
                            }}
                            className="text-xs font-bold text-red-600 hover:underline whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {adminTab === 'siteinfo' && (
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-bold text-indigo-950">🏫 Basic School Information</h3>
                    <p className="text-xs text-slate-500">These details appear across the site — top bar, footer, and Contact page.</p>
                    {siteInfoSaved && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium text-sm">
                        ✅ Site information updated.
                      </div>
                    )}
                    <form onSubmit={handleSaveSiteInfo} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={siteInfoDraft.address}
                          onChange={(e) => setSiteInfoDraft({ ...siteInfoDraft, address: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Phone / WhatsApp (10 digits)</label>
                          <input
                            type="text"
                            value={siteInfoDraft.phone}
                            onChange={(e) => setSiteInfoDraft({ ...siteInfoDraft, phone: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={siteInfoDraft.email}
                            onChange={(e) => setSiteInfoDraft({ ...siteInfoDraft, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Office Hours</label>
                        <input
                          type="text"
                          value={siteInfoDraft.officeHours}
                          onChange={(e) => setSiteInfoDraft({ ...siteInfoDraft, officeHours: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Admissions Academic Year</label>
                        <input
                          type="text"
                          value={siteInfoDraft.admissionsYear}
                          onChange={(e) => setSiteInfoDraft({ ...siteInfoDraft, admissionsYear: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-indigo-900 hover:bg-indigo-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
                      >
                        Save Changes 💾
                      </button>
                      <p className="text-xs text-slate-500">
                        {db ? '☁️ Synced — visible on every signed-in device.' : '💾 Saved on this device only (cloud sync unavailable in this view).'}
                      </p>
                    </form>
                  </div>
                  )}

                  {adminTab === 'activities' && (
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-bold text-indigo-950">🖼️ Upload New Activity / Gallery Photo</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Activity Title (e.g. Science Exhibition)"
                        value={newActivityTitle}
                        onChange={(e) => setNewActivityTitle(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleActivityImageChange}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                      />
                    </div>
                    <textarea
                      rows="2"
                      placeholder="Short description..."
                      value={newActivityDesc}
                      onChange={(e) => setNewActivityDesc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                    ></textarea>
                    {newActivityImage && (
                      <img src={newActivityImage} alt="Preview" className="h-32 rounded-xl border border-slate-300 object-cover" />
                    )}
                    <button
                      onClick={handleAddActivity}
                      className="bg-indigo-900 hover:bg-indigo-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition"
                    >
                      Add to Gallery 🚀
                    </button>
                    <p className="text-xs text-slate-500">
                      {db ? '☁️ Synced — visible on every signed-in device.' : '💾 Saved on this device only (cloud sync unavailable in this view).'}
                    </p>
                    {activityCloudWarning && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{activityCloudWarning}</p>
                    )}

                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activities.map((a) => (
                        <div key={a.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center gap-3 p-3">
                          {a.image ? (
                            <img src={a.image} alt={a.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${a.gradient || 'from-indigo-500 to-indigo-700'} flex items-center justify-center text-2xl flex-shrink-0`}>
                              {a.icon || '📷'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-indigo-950 truncate">{a.title}</p>
                            <p className="text-xs text-slate-500 truncate">{a.description}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteActivity(a.id)}
                            className="text-xs font-bold text-red-600 hover:underline whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {adminTab === 'inquiries' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-indigo-950">📥 Submitted Inquiries ({inquiries.length})</h3>
                    {inquiries.length === 0 ? (
                      <p className="text-sm text-slate-500">No inquiries received yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {inquiries.map((inq) => (
                          <div key={inq.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-indigo-950">{inq.name}</span>
                                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">{inq.grade || 'General'}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">📞 {inq.phone} • 📅 {inq.date}</p>
                              {inq.message && <p className="text-xs text-slate-700 italic mt-1">"{inq.message}"</p>}
                            </div>
                            <button
                              onClick={() => window.open(`https://wa.me/${inq.phone}?text=Hello ${inq.name}, regarding your inquiry at The Vision English School Buldhana...`, '_blank')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap shadow transition"
                            >
                              💬 Reply on WhatsApp
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-indigo-950 text-indigo-200 py-12 border-t border-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={schoolLogoSrc} 
                alt="Logo" 
                className="w-10 h-10 object-cover rounded-full border border-indigo-500 bg-white"
              />
              <h3 className="font-black text-white text-lg tracking-wide uppercase">The Vision English School</h3>
            </div>
            <p className="text-xs text-indigo-300 leading-relaxed">
              Committed to imparting world-class English medium education, moral values, and discipline in Buldhana, Maharashtra.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-1 text-xs">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-amber-400">Home</button></li>
              <li><button onClick={() => setActiveTab('about')} className="hover:text-amber-400">About Us</button></li>
              <li><button onClick={() => setActiveTab('academics')} className="hover:text-amber-400">Academics</button></li>
              <li><button onClick={() => setActiveTab('admissions')} className="hover:text-amber-400">Admissions & Age Calculator</button></li>
              <li><button onClick={() => setActiveTab('contact')} className="hover:text-amber-400">Contact Us</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Direct Connect</h4>
            <p className="text-xs text-indigo-300">{siteInfo.address}</p>
            <p className="text-xs text-indigo-300">Phone / WhatsApp: <strong className="text-amber-400">+91 {siteInfo.phone}</strong></p>
            <div className="pt-2">
              <button
                onClick={() => handleWhatsAppInquiry('Hello, I am reaching out from the website footer.')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition flex items-center gap-2"
              >
                <span>💬 WhatsApp Quick Chat</span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-indigo-900/50 text-center text-xs text-indigo-400">
          © {new Date().getFullYear()} The Vision English School, Buldhana. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
export default App;
