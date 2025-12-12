import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, BookOpen, MessageCircle, Settings, LogOut, 
  User, ChevronDown 
} from 'lucide-react';
import axios from 'axios';

const Header = () => {
  // 1. ALL HOOKS MUST BE DECLARED FIRST
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // 2. CONFIGURATION
  const darkHeroRoutes = ['/', '/featured']; 
  const isDarkPage = darkHeroRoutes.includes(location.pathname);

  // 3. SCROLL & EVENT LISTENERS (useEffect)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check login status (useEffect)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (token && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    } else {
      setIsLoggedIn(false);
      setUsername('');
    }
  }, [location]);

  // Reset menus on route change (useEffect)
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [location]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8080/auth/logout', {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.clear();
      setIsLoggedIn(false);
      setUsername('');
      setIsMobileMenuOpen(false);
      setIsUserDropdownOpen(false);
      navigate('/');
    }
  };

  // 4. CONDITIONAL RENDER (MUST BE AFTER HOOKS)
  // If we are on the reading page, do not render the header
  if (location.pathname.startsWith('/read/')) {
    return null;
  }

  // 5. DYNAMIC STYLING LOGIC
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

  const quickLinks = [
    { name: 'Library', path: '/library', icon: <BookOpen className="w-4 h-4" /> },
    { name: 'Chat', path: '/chat', icon: <MessageCircle className="w-4 h-4" /> },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  // 6. FINAL RETURN
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

        {/* --- RIGHT ACTIONS (DESKTOP) --- */}
        <div className="hidden lg:flex items-center gap-6">
          
          {/* Quick Links (Library, Chat) */}
          <div className={`flex items-center gap-4 border-r pr-6 transition-colors ${
            useDarkText ? 'border-slate-200' : 'border-white/20'
          }`}>
            {quickLinks.map((link) => (
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

          {/* User Section / Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {isLoggedIn ? (
              <>
                {/* Trigger Button */}
                <button 
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className={`flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border transition-all ${
                    useDarkText 
                      ? 'border-slate-200 bg-slate-50 hover:border-indigo-200 text-slate-700' 
                      : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {username ? username[0].toUpperCase() : <User size={14} />}
                  </div>
                  <span className="text-sm font-bold max-w-[100px] truncate">
                    {username}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{username}</p>
                    </div>

                    <div className="py-1">
                      <Link 
                        to="/settings" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Login/Register Buttons
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
                  <button className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-full shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
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
            {/* Nav Links */}
            {[...navLinks, ...quickLinks].map((link) => (
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
            
            {/* Manually add Settings for Mobile view */}
            {isLoggedIn && (
              <Link 
                to="/settings"
                className={`p-3 rounded-xl flex items-center gap-3 font-bold text-base ${
                  isActive('/settings') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            )}
          </div>

          {/* Auth Mobile */}
          <div className="flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <div className="p-3 rounded-xl bg-indigo-50 flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {username ? username[0].toUpperCase() : 'U'}
                  </div>
                  <p className="text-sm font-bold text-indigo-900">{username}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-center font-bold text-white bg-red-600 py-3.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;