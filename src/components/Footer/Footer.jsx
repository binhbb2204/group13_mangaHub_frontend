import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Github, Mail, Heart } from 'lucide-react';
import './footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { name: 'Home', path: '/' },
    { name: 'Manga', path: '/manga' },
    { name: 'Library', path: '/library' },
    { name: 'Chat', path: '/chat' },
  ];

  const socialLinks = [
    {
      name: 'GitHub',
      icon: <Github className="w-5 h-5" />,
      url: 'https://github.com/binhbb2204/group13_mangaHub_frontend'
    },
    {
      name: 'Email',
      icon: <Mail className="w-5 h-5" />,
      url: 'mailto:binhbb2204@gmail.com'
    },
  ];

  return (
    <footer className="footer mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-800">
                MangaHub
              </span>
            </Link>
            <p className="text-sm text-slate-600 max-w-sm">
              Your ultimate destination for reading and tracking manga.
              Discover, read, and share your favorite stories.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Quick Links
            </h3>
            <div className="flex flex-col gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm text-slate-600 hover:text-indigo-600 transition-colors w-fit"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Connect
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all hover:-translate-y-0.5"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © {currentYear} MangaHub. All rights reserved.
            </p>
            <p className="text-sm text-slate-600 flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> by Group 13
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;