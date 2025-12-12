import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, 
  Settings, Maximize, Minimize, MoveVertical, MoveHorizontal,
  AlignJustify
} from 'lucide-react';

const MangaReader = () => {
  const { mangadexId, chapterId } = useParams();
  const navigate = useNavigate();

  // --- Data States ---
  const [pages, setPages] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentChapterInfo, setCurrentChapterInfo] = useState(null);

  // --- UI/Reading Preferences States ---
  const [readingMode, setReadingMode] = useState('vertical'); // 'vertical' | 'horizontal'
  const [fitMode, setFitMode] = useState('width'); // 'width' | 'height' | 'original'
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // --- Navigation States ---
  const [currentHorizontalPage, setCurrentHorizontalPage] = useState(0); 
  const [showUI, setShowUI] = useState(true); 

  const uiTimeoutRef = useRef(null);

  // 1. Fetch Chapter List
  useEffect(() => {
    const fetchChapterList = async () => {
      if (!mangadexId) return;
      try {
        const response = await fetch(`http://localhost:8080/manga/chapters/${mangadexId}?language=en&limit=100`);
        const data = await response.json();
        const sorted = (data.chapters || []).sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));
        setChapters(sorted);
      } catch (err) {
        console.error("Failed to load chapter list", err);
      }
    };
    fetchChapterList();
  }, [mangadexId]);

  // 2. Fetch Images
  useEffect(() => {
    const fetchPages = async () => {
      if (!chapterId) return;
      try {
        setLoading(true);
        setPages([]);
        setCurrentHorizontalPage(0);
        
        const response = await fetch(`http://localhost:8080/manga/chapter/${chapterId}/pages`);
        const data = await response.json();
        if (data.page_urls) setPages(data.page_urls);
        
        window.scrollTo(0, 0);
      } catch (err) {
        console.error("Failed to load pages", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPages();
  }, [chapterId]);

  // 3. Determine Navigation Info
  useEffect(() => {
    if (chapters.length > 0 && chapterId) {
      const index = chapters.findIndex(c => c.id === chapterId);
      if (index !== -1) {
        setCurrentChapterInfo({
          current: chapters[index],
          prev: chapters[index - 1] || null,
          next: chapters[index + 1] || null
        });
      }
    }
  }, [chapters, chapterId]);

  // --- Interaction Logic (Hide/Show UI) ---
  const resetUITimer = useCallback(() => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      setSettingsOpen(prev => {
        if (!prev) setShowUI(false);
        return prev;
      });
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resetUITimer);
    window.addEventListener('scroll', resetUITimer);
    window.addEventListener('click', resetUITimer);
    window.addEventListener('keydown', resetUITimer); // Added keydown for horizontal arrow nav
    
    resetUITimer();

    return () => {
      window.removeEventListener('mousemove', resetUITimer);
      window.removeEventListener('scroll', resetUITimer);
      window.removeEventListener('click', resetUITimer);
      window.removeEventListener('keydown', resetUITimer);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUITimer]);

  // --- Navigation Functions ---
  const goToChapter = (id) => {
    if (id) {
        setLoading(true);
        navigate(`/read/${mangadexId}/${id}`);
    }
  };

  const handleHorizontalNav = (direction) => {
    if (direction === 'next') {
      if (currentHorizontalPage < pages.length - 1) {
        setCurrentHorizontalPage(prev => prev + 1);
      } else if (currentChapterInfo?.next) {
        goToChapter(currentChapterInfo.next.id);
      }
    } else {
      if (currentHorizontalPage > 0) {
        setCurrentHorizontalPage(prev => prev - 1);
      } else if (currentChapterInfo?.prev) {
        goToChapter(currentChapterInfo.prev.id);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (readingMode === 'horizontal') {
        if (e.key === 'ArrowRight') handleHorizontalNav('next');
        if (e.key === 'ArrowLeft') handleHorizontalNav('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, currentHorizontalPage, pages.length, currentChapterInfo]);


  // --- Helper: Dynamic Image Styles ---
  const getImageStyle = () => {
    if (readingMode === 'vertical') {
      switch (fitMode) {
        case 'height': return "h-screen w-auto mx-auto object-contain";
        case 'original': return "w-auto mx-auto max-w-none";
        default: return "w-full h-auto object-contain"; // fit-width
      }
    } else {
      switch (fitMode) {
        case 'width': return "w-full h-auto max-h-screen object-contain";
        case 'original': return "h-auto w-auto max-h-screen max-w-none"; 
        default: return "h-full w-auto object-contain max-w-full"; // fit-height
      }
    }
  };

  return (
    <div className={`min-h-screen bg-[#121212] text-white relative overflow-hidden ${readingMode === 'horizontal' ? 'h-screen' : ''}`}>
      
      {/* --- 1. HEADER (Now contains Chapter Nav) --- */}
      <div className={`fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur border-b border-white/10 transition-transform duration-300 ${showUI ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="px-4 py-2 sm:py-3 flex items-center justify-between shadow-xl">
          
          {/* Left: Back Button */}
          <button onClick={() => navigate(-1)} className="text-gray-300 hover:text-white flex items-center gap-2 min-w-[60px]">
            <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">Back</span>
          </button>

          {/* Center: Chapter Navigation (The "Better Pill" integrated in header) */}
          <div className="flex items-center gap-2 sm:gap-4 bg-white/5 px-2 py-1 rounded-full border border-white/5">
             <button 
               disabled={!currentChapterInfo?.prev}
               onClick={() => goToChapter(currentChapterInfo?.prev?.id)}
               className="p-1.5 sm:p-2 rounded-full hover:bg-indigo-600 disabled:opacity-20 disabled:hover:bg-transparent transition-colors text-white"
               title="Previous Chapter"
             >
               <ChevronLeft className="w-5 h-5" />
             </button>

             <div className="flex flex-col items-center text-center px-2 cursor-default min-w-[100px] sm:min-w-[140px]">
               <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Chapter {currentChapterInfo?.current?.chapter}</span>
               <span className="text-xs sm:text-sm font-semibold text-gray-100 max-w-[120px] sm:max-w-[200px] truncate">
                  {currentChapterInfo?.current?.title || 'No Title'}
               </span>
             </div>

             <button 
               disabled={!currentChapterInfo?.next}
               onClick={() => goToChapter(currentChapterInfo?.next?.id)}
               className="p-1.5 sm:p-2 rounded-full hover:bg-indigo-600 disabled:opacity-20 disabled:hover:bg-transparent transition-colors text-white"
               title="Next Chapter"
             >
               <ChevronRight className="w-5 h-5" />
             </button>
          </div>

          {/* Right: Settings */}
          <div className="relative min-w-[60px] flex justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); setSettingsOpen(!settingsOpen); }}
              className={`p-2 rounded-lg transition-colors ${settingsOpen ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-gray-300'}`}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Dropdown */}
            {settingsOpen && (
              <div className="absolute right-0 top-12 w-64 bg-[#222] border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-4 z-50">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Reading Mode</label>
                  <div className="flex bg-black/50 p-1 rounded-lg">
                    <button 
                      onClick={() => setReadingMode('vertical')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-all ${readingMode === 'vertical' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      <MoveVertical size={16} /> Vertical
                    </button>
                    <button 
                      onClick={() => setReadingMode('horizontal')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-all ${readingMode === 'horizontal' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                      <MoveHorizontal size={16} /> Horizontal
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Page Size</label>
                  <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-lg">
                    <button onClick={() => setFitMode('width')} className={`p-2 rounded flex justify-center ${fitMode === 'width' ? 'bg-gray-700 text-white' : 'text-gray-500'}`} title="Fit Width">
                        <AlignJustify size={18} />
                    </button>
                    <button onClick={() => setFitMode('height')} className={`p-2 rounded flex justify-center ${fitMode === 'height' ? 'bg-gray-700 text-white' : 'text-gray-500'}`} title="Fit Height">
                        <Minimize size={18} className="rotate-90" />
                    </button>
                    <button onClick={() => setFitMode('original')} className={`p-2 rounded flex justify-center ${fitMode === 'original' ? 'bg-gray-700 text-white' : 'text-gray-500'}`} title="Original Size">
                        <Maximize size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- 2. MAIN READER AREA --- */}
      <div 
        className={`w-full mx-auto bg-black transition-all duration-300 ease-out outline-none
          ${readingMode === 'horizontal' ? 'h-screen flex items-center justify-center' : 'min-h-screen pt-16'}`}
        onClick={() => {
           // In Horizontal mode, clicking edge or image advances page (optional UX)
           // But mostly used to toggle UI via the global listener
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-gray-500">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <p>Loading Chapter...</p>
          </div>
        ) : (
          <>
            {/* === VERTICAL MODE === */}
            {readingMode === 'vertical' && (
              <div className="flex flex-col items-center w-full">
                {pages.map((url, i) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt={`Page ${i + 1}`} 
                    loading="lazy"
                    className={`block mb-1 ${getImageStyle()}`}
                  />
                ))}

                {/* Vertical Bottom Navigation (Static, inline) */}
                <div className="w-full max-w-4xl p-10 flex flex-col items-center justify-center gap-4">
                    {currentChapterInfo?.next ? (
                        <button 
                        onClick={() => goToChapter(currentChapterInfo?.next?.id)}
                        className="w-full py-4 bg-[#1a1a1a] border border-white/10 hover:bg-indigo-600 hover:border-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                        >
                            Read Next Chapter <ChevronRight className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    ) : (
                        <div className="text-gray-500 italic">No more chapters available.</div>
                    )}
                </div>
              </div>
            )}

            {/* === HORIZONTAL MODE === */}
            {readingMode === 'horizontal' && pages.length > 0 && (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={pages[currentHorizontalPage]} 
                  alt={`Page ${currentHorizontalPage + 1}`} 
                  className={`shadow-2xl transition-all duration-200 ${getImageStyle()}`}
                />
                
                {/* Page Indicator (Horizontal Only) */}
                <div className={`absolute bottom-8 bg-black/70 px-4 py-1 rounded-full text-xs font-mono text-gray-300 pointer-events-none transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                    Page {currentHorizontalPage + 1} / {pages.length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- 3. HORIZONTAL ONLY CONTROLS --- */}
      {/* These ONLY show up if readingMode is 'horizontal'. 
          They control PAGE TURNING, not Chapter turning. */}
      {readingMode === 'horizontal' && !loading && (
         <div className={`fixed inset-0 pointer-events-none z-40 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleHorizontalNav('prev'); }}
              className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-start pl-4 pointer-events-auto hover:bg-gradient-to-r hover:from-black/50 to-transparent group outline-none"
            >
              <ChevronLeft className="w-12 h-12 text-white/50 group-hover:text-white transition-colors" />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleHorizontalNav('next'); }}
              className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-4 pointer-events-auto hover:bg-gradient-to-l hover:from-black/50 to-transparent group outline-none"
            >
              <ChevronRight className="w-12 h-12 text-white/50 group-hover:text-white transition-colors" />
            </button>
         </div>
      )}

    </div>
  );
};

export default MangaReader;