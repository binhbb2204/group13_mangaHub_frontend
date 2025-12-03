import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, BookOpen, MessageCircle, Settings 
} from 'lucide-react';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // ==========================================
  // 1. CONFIGURATION
  // ==========================================
  const darkHeroRoutes = ['/', '/featured']; 
  const isDarkPage = darkHeroRoutes.includes(location.pathname);

  // ==========================================
  // 2. SCROLL LISTENER
  // ==========================================
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // ==========================================
  // 3. DYNAMIC STYLING LOGIC
  // ==========================================
  const useDarkText = isScrolled || !isDarkPage;

  const getHeaderBackground = () => {
    if (isScrolled) {
      return 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 py-3';
    } 
    if (isDarkPage) {
      return 'bg-transparent border-b border-white/10 py-4';
    }
    return 'bg-white border-b border-slate-100 py-4';
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Manga', path: '/manga' },
  ];

  // 2. Added Settings to userLinks
  const userLinks = [
    { name: 'Library', path: '/library', icon: <BookOpen className="w-4 h-4" /> },
    { name: 'Chat', path: '/chat', icon: <MessageCircle className="w-4 h-4" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${getHeaderBackground()}`}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between">
        
        {/* --- LOGO --- */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg transition-colors">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className={`text-xl font-black tracking-tight transition-colors ${
            useDarkText ? 'text-slate-800' : 'text-white'
          }`}>
            MangaHub
          </span>
        </Link>

        {/* --- DESKTOP NAV --- */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`text-sm font-bold transition-colors flex items-center gap-2 ${
                isActive(link.path)
                  ? (useDarkText ? 'text-indigo-600' : 'text-indigo-400')
                  : (useDarkText ? 'text-slate-500 hover:text-slate-800' : 'text-white/70 hover:text-indigo-300')
              }`}
            >
              {link.icon && link.icon}
              {link.name}
            </Link>
          ))}
        </nav>

        {/* --- RIGHT ACTIONS --- */}
        <div className="hidden lg:flex items-center gap-6">
          <div className={`flex items-center gap-4 border-r pr-6 transition-colors ${
            useDarkText ? 'border-slate-200' : 'border-white/20'
          }`}>
            {userLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                  isActive(link.path) 
                    ? (useDarkText ? 'text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full' : 'text-indigo-300 bg-indigo-500/20 px-3 py-1.5 rounded-full')
                    : (useDarkText ? 'text-slate-600 hover:text-indigo-600' : 'text-white/80 hover:text-indigo-300')
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <button className={`text-sm font-bold px-4 py-2 rounded-full transition-all ${
                useDarkText 
                  ? 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50' 
                  : 'text-white hover:text-indigo-300 hover:bg-white/10'
              }`}>
                Log In
              </button>
            </Link>
            <Link to="/register">
              <button className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-full shadow-md shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5">
                Sign Up
              </button>
            </Link>
          </div>
        </div>

        {/* --- MOBILE MENU BUTTON --- */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            useDarkText ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'
          }`}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* --- MOBILE MENU DROPDOWN --- */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-xl lg:hidden p-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
          
          {/* Main Links */}
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
            {[...navLinks, ...userLinks].map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={`p-3 rounded-xl flex items-center gap-3 font-bold text-base ${
                  isActive(link.path) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {link.icon || <span className="w-4 h-4" />}
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Mobile */}
          <div className="flex flex-col gap-3">
            <Link to="/login" className="w-full">
              <button className="w-full text-center font-bold text-slate-600 border border-slate-200 py-3.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all">
                Log In
              </button>
            </Link>
            <Link to="/register" className="w-full">
              <button className="w-full text-center font-bold text-white bg-indigo-600 py-3.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-500/20">
                Sign Up Free
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;