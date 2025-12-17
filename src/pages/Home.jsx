import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Star, 
  Loader2, Trophy, Book
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../utils/api';

const Home = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [showAllRankings, setShowAllRankings] = useState(false);
  
  // --- HERO STATE ---
  const [heroIndex, setHeroIndex] = useState(0);

  // Refs for custom carousel scrolling logic
  const carouselStates = useRef({});
  const scrollCooldowns = useRef({});
  const carouselListeners = useRef({});

  // Layout Constants
  const CARD_WIDTH = 220; 
  const GAP = 24;
  const STEP = CARD_WIDTH + GAP;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(buildApiUrl('/manga/featured'));
        if (!response.ok) throw new Error('Failed to fetch manga data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- INFINITE SCROLL LOGIC ---
  const normalizePosition = useCallback((sectionIndex, container) => {
    const state = carouselStates.current[sectionIndex];
    if (!state) return;
    const { middleStart, cycleLength } = state;
    const sl = container.scrollLeft;
    const relativePosition = sl - middleStart;
    
    if (Math.abs(relativePosition) >= cycleLength * 0.5) {
      if (relativePosition > 0) {
        container.scrollLeft = sl - cycleLength;
      } else {
        container.scrollLeft = sl + cycleLength;
      }
    }
  }, []);

  useEffect(() => {
    if (!data?.sections) return;
    
    const carouselSections = data.sections.filter(s => !s.label.includes('Top Ranked'));
    const numBuffer = 1; 

    carouselSections.forEach((section) => {
      const originalIndex = data.sections.indexOf(section);
      const isPopular = section.label.includes('Most Popular');
      
      const itemsToScroll = isPopular ? section.mangas.slice(1) : section.mangas;
      
      const numItems = itemsToScroll.length;
      if (numItems === 0) return;

      const container = document.getElementById(`carousel-${originalIndex}`);
      if (!container) return;

      const cycleLength = numItems * STEP;
      const middleStart = numBuffer * cycleLength;

      carouselStates.current[originalIndex] = { step: STEP, cycleLength, middleStart, numItems };
      scrollCooldowns.current[originalIndex] = false;

      container.scrollLeft = middleStart;

      const handleWheel = (e) => {
        if (scrollCooldowns.current[originalIndex]) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const delta = e.deltaY > 0 ? STEP : -STEP;
        container.scrollLeft += delta;
        normalizePosition(originalIndex, container);
        scrollCooldowns.current[originalIndex] = true;
        setTimeout(() => scrollCooldowns.current[originalIndex] = false, 250);
      };

      container.addEventListener('wheel', handleWheel, { passive: false });
      const handleReset = () => normalizePosition(originalIndex, container);
      container.addEventListener('scrollend', handleReset, { passive: true });

      carouselListeners.current[originalIndex] = { wheel: handleWheel, reset: handleReset };
    });

    return () => {
      Object.entries(carouselListeners.current).forEach(([idx, listeners]) => {
        const container = document.getElementById(`carousel-${idx}`);
        if (container) {
          container.removeEventListener('wheel', listeners.wheel);
          container.removeEventListener('scrollend', listeners.reset);
        }
      });
    };
  }, [data, normalizePosition, STEP]);

  const scroll = (sectionIndex, direction) => {
    const container = document.getElementById(`carousel-${sectionIndex}`);
    if (!container) return;
    const state = carouselStates.current[sectionIndex];
    if (!state) return;
    const delta = direction === 'left' ? -state.step : state.step;
    container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'currently_publishing': return 'bg-blue-600';
      case 'finished': return 'bg-emerald-500';
      case 'on_hiatus': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getAuthorName = (manga) => {
    if (!manga.authors || manga.authors.length === 0) return "Unknown Author";
    const author = manga.authors[0].node;
    return `${author.first_name} ${author.last_name}`.trim();
  }

  // --- RENDER STATES ---
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      {error}
    </div>
  );

  // --- DATA PREP ---
  const popularSection = data?.sections?.find(s => s.label.includes('Most Popular')) || data?.sections?.[0];
  const rankSection = data?.sections?.find(s => s.label.includes('Top Ranked')) || data?.sections?.[1];
  
  const heroMangas = popularSection?.mangas || [];
  const currentHeroManga = heroMangas[heroIndex];

  const nextHero = () => {
    setHeroIndex((prev) => (prev + 1) % heroMangas.length);
  };

  const prevHero = () => {
    setHeroIndex((prev) => (prev - 1 + heroMangas.length) % heroMangas.length);
  };

  const mainListSections = data?.sections?.filter(s => s !== rankSection) || [];

  const displayedRankings = showAllRankings 
    ? rankSection?.mangas?.slice(0, 10) 
    : rankSection?.mangas?.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-slate-800 font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      {currentHeroManga && (
        <div className="relative h-[600px] w-full overflow-hidden bg-[#121212] group">
          
          {/* Background Image */}
          <div key={`bg-${currentHeroManga.id}`} className="absolute inset-0 z-0 animate-fade-in">
            <img 
              src={currentHeroManga.main_picture?.large} 
              alt="Hero Background" 
              className="w-full h-full object-cover opacity-30 blur-sm scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
          </div>

          {/* Content Container */}
          <div className="relative z-10 max-w-[1440px] mx-auto px-8 h-full flex flex-col justify-center">
            
            <div className="flex flex-col lg:flex-row items-center gap-12 mt-10">
              {/* LEFT SIDE: Big Cover Art */}
              <div className="hidden lg:block flex-shrink-0 relative">
                 <div className="bg-white p-2 shadow-2xl rotate-[-2deg] transition-transform duration-500 group-hover:rotate-0">
                    <div className="w-[300px] h-[440px] overflow-hidden">
                      <img 
                        key={`img-${currentHeroManga.id}`}
                        src={currentHeroManga.main_picture?.large} 
                        alt={currentHeroManga.title} 
                        className="w-full h-full object-cover animate-fade-in" 
                      />
                    </div>
                 </div>
              </div>

              {/* RIGHT SIDE: Text Info */}
              <div key={`txt-${currentHeroManga.id}`} className="flex-1 text-white space-y-6 animate-slide-up">
                
                <h1 className="text-5xl lg:text-7xl font-black leading-none tracking-tight drop-shadow-lg">
                  {currentHeroManga.title}
                </h1>

                {/* Tags */}
                <div className="flex items-center gap-3 font-bold text-xs tracking-wider uppercase">
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-sm">Suggestive</span>
                    <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-sm backdrop-blur-sm">Action</span>
                    <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-sm backdrop-blur-sm">Comedy</span>
                    <span className={`px-3 py-1 rounded-sm ${getStatusColor(currentHeroManga.status)} text-white`}>
                      {currentHeroManga.status?.replace(/_/g, ' ')}
                    </span>
                </div>

                {/* UPDATED PARAGRAPH:
                  1. text-sm (Smaller text size)
                  2. Removed line-clamp entirely so it shows ALL text
                */}
                <p className="text-gray-300 text-sm leading-relaxed font-medium">
                  {currentHeroManga.synopsis || "The once legendary hitman Nighthawk is now a washed-up, 33-year-old, alcoholic, chain-smoking NEET. Will she ever make her comeback?!"}
                </p>

                <div className="pt-2">
                  <div className="text-2xl font-bold italic text-white/90">
                    {getAuthorName(currentHeroManga)}
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Right Navigation */}
            <div className="absolute bottom-8 right-8 flex items-center gap-6 z-20">
                <div className="text-indigo-400 font-black text-xl tracking-widest">
                  NO. {heroIndex + 1}
                </div>
                <div className="flex items-center gap-4 text-white">
                  <button onClick={prevHero} className="hover:text-indigo-400 transition-colors p-2 hover:bg-white/10 rounded-full">
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button onClick={nextHero} className="hover:text-indigo-400 transition-colors p-2 hover:bg-white/10 rounded-full">
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MAIN CONTENT GRID --- */}
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* CAROUSELS */}
          <div className="lg:col-span-8 space-y-16">
            {mainListSections.map((section, idx) => {
               const originalIndex = data.sections.indexOf(section);
               const isPopular = section.label.includes('Most Popular');
               const sourceList = isPopular ? section.mangas.slice(1) : section.mangas;
               const displayMangas = [...sourceList, ...sourceList, ...sourceList];
               
               if (sourceList.length === 0) return null;

               return (
                <div key={idx} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                      <span className="w-2 h-8 rounded-full bg-indigo-600"></span>
                      {isPopular ? "Trending Now" : section.label}
                    </h2>
                  </div>

                  <div className="relative group">
                    <button 
                      onClick={() => scroll(originalIndex, 'left')} 
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-20 flex items-center justify-center rounded-r-2xl bg-white/90 backdrop-blur-sm text-slate-800 shadow-[2px_0_10px_rgba(0,0,0,0.1)] border-y border-r border-slate-100 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:w-10 hover:bg-white disabled:opacity-0"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div 
                      id={`carousel-${originalIndex}`} 
                      className="flex overflow-x-auto scrollbar-hide snap-x py-4 px-1" 
                      style={{ scrollbarWidth: 'none', gap: `${GAP}px` }}
                    >
                      {displayMangas.map((manga, i) => (
                        <div 
                          key={`${manga.id}-${i}`} 
                          onClick={() => navigate(`/manga/${manga.id}`)}
                          className="flex-shrink-0 snap-start group/card cursor-pointer relative" style={{ width: CARD_WIDTH }}>
                          <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-sm bg-slate-100 group-hover/card:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-300 transform group-hover/card:-translate-y-2">
                            <img src={manga.main_picture?.large} alt={manga.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute top-2 left-2">
                               <span className={`text-[10px] font-bold text-white px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wide ${getStatusColor(manga.status)}`}>{manga.status?.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                          <div className="mt-4 px-1">
                            <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-1 group-hover/card:text-indigo-600 transition-colors">{manga.title}</h3>
                            <div className="flex items-center justify-between mt-2 text-sm text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Book className="w-4 h-4 text-indigo-400" /> {manga.num_chapters || '?'} Ch</span>
                              <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{manga.mean || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => scroll(originalIndex, 'right')} 
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-20 flex items-center justify-center rounded-l-2xl bg-white/90 backdrop-blur-sm text-slate-800 shadow-[-2px_0_10px_rgba(0,0,0,0.1)] border-y border-l border-slate-100 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:w-10 hover:bg-white disabled:opacity-0"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
               );
            })}
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/60 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" fill="currentColor" />
                      Top Ranked
                    </h3>
                  </div>
                  <button 
                    onClick={() => navigate('/manga?type=default&page=1&limit=100')}
                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors select-none"
                  >
                    View All
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {displayedRankings?.map((manga, idx) => {
                    const rank = idx + 1;
                    const isTop3 = rank <= 3;
                    return (
                      <div 
                        key={manga.id} 
                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 ${isTop3 ? 'bg-slate-50 border border-slate-100' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'}`}
                      >
                        <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl font-black text-lg ${
                          rank === 1 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' :
                          rank === 2 ? 'bg-slate-300 text-white' :
                          rank === 3 ? 'bg-orange-300 text-white' :
                          'bg-white text-slate-400 border border-slate-200'
                        }`}>
                          {rank}
                        </div>
                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                          <img 
                            src={manga.main_picture?.medium} 
                            alt="" 
                            className="w-12 h-16 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-700 text-sm truncate group-hover:text-indigo-600 transition-colors">
                              {manga.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                              <span className="flex items-center gap-1 font-medium text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Star className="w-3 h-3 fill-amber-500" />
                                {manga.mean || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.7s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.7s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Home;