import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, Star, BookOpen, 
  Loader2, ArrowLeft, ChevronLeft, ChevronRight, Hash 
} from 'lucide-react';
import { buildApiUrl } from '../utils/api';

const TopRankedManga = () => {
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [serverConfig, setServerConfig] = useState({ page: 1, limit: 20 });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentType = searchParams.get('type') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '20', 10);

  const [limitInput, setLimitInput] = useState(currentLimit);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'manga', label: 'Manga' },
    { id: 'manhwa', label: 'Manhwa' },
    { id: 'manhua', label: 'Manhua' },
    { id: 'novels', label: 'Novels' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setLimitInput(currentLimit);
  }, [currentLimit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const val = parseInt(limitInput, 10);
      if (!isNaN(val) && val > 0 && val <= 500 && val !== currentLimit) {
        updateParams({ limit: val, page: 1 });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [limitInput]);

  const updateParams = (newParams) => {
    const params = {
      type: currentType,
      page: currentPage,
      limit: currentLimit,
      ...newParams
    };
    setSearchParams(params);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(buildApiUrl(`/manga/ranking?type=${currentType}&limit=${currentLimit}&page=${currentPage}`));
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const result = await response.json();
        
        let newMangas = [];
        let paginationData = {};

        if (Array.isArray(result) && result.length > 0) {
            newMangas = result[0].mangas || [];
            paginationData = result[0].pagination || {};
        } else if (result.mangas) {
            newMangas = result.mangas;
            paginationData = result.pagination;
        }

        setMangaList(newMangas);
        
        if (paginationData) {
            setTotalPages(paginationData.total_pages || 1);
            setServerConfig({
                page: paginationData.page || currentPage,
                limit: paginationData.limit || currentLimit 
            });
        }

      } catch (err) {
        console.error("Error fetching data:", err);
        setMangaList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.scrollTo({ top: 0, behavior: 'smooth' });

  }, [currentType, currentPage, currentLimit]);

  const handleFilterChange = (typeId) => {
    updateParams({ type: typeId, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateParams({ page: newPage });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(limitInput, 10);
      if (!isNaN(val) && val > 0 && val <= 500) {
        updateParams({ limit: val, page: 1 });
        e.target.blur();
      }
    }
  };

  const getRankStyle = (actualRank) => {
    if (actualRank === 1) return "bg-yellow-400 text-white border-yellow-300 shadow-yellow-200/50";
    if (actualRank === 2) return "bg-slate-300 text-white border-slate-300 shadow-slate-200/50";
    if (actualRank === 3) return "bg-orange-400 text-white border-orange-300 shadow-orange-200/50";
    return "bg-white text-slate-500 border-slate-200";
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 pt-24 md:pt-28">
      <div className={`sticky top-[81px] z-30 transition-all duration-300 ease-in-out px-4 md:px-6
        ${isScrolled ? 'pointer-events-none' : 'pt-0'}
      `}>
        <div className={`
          max-w-[1200px] mx-auto pointer-events-auto
          flex flex-col md:flex-row items-center justify-between gap-4 
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isScrolled 
            ? 'bg-white/80 backdrop-blur-md border border-white/40 shadow-lg shadow-slate-200/40 rounded-2xl p-4' 
            : 'bg-transparent border-transparent py-4'
          }
        `}>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => navigate('/')}
              className={`p-2 rounded-full transition-colors group ${
                isScrolled ? 'hover:bg-slate-100' : 'bg-white hover:bg-slate-50 shadow-sm border border-slate-100'
              }`}
              title="Back to Home"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Top Ranked
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {/* Filter Buttons */}
            <div className={`flex gap-4 overflow-x-auto scrollbar-hide w-full md:w-auto ${isScrolled ? '' : 'bg-white/50 p-1.5 rounded-xl border border-slate-100'}`}>
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                    currentType === f.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Limit Input */}
            <div className={`flex items-center gap-2 text-sm text-slate-500 px-3 py-1.5 rounded-lg border ml-auto md:ml-0 group focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all ${
              isScrolled 
                ? 'bg-slate-50 border-slate-200' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <span className="font-medium flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Limit:
              </span>
              <input 
                type="number"
                min="1"
                max="500" 
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-16 bg-transparent font-bold text-slate-800 outline-none text-right" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 min-h-[60vh]">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {mangaList.map((manga, index) => {
              const actualRank = (serverConfig.page - 1) * serverConfig.limit + (index + 1);

              return (
                <div 
                  key={`${manga.id}-${actualRank}`} 
                  className="group bg-white rounded-2xl p-3 md:p-4 flex items-start gap-4 shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl font-black text-lg md:text-xl border-2 shadow-lg ${getRankStyle(actualRank)}`}>
                    {actualRank}
                  </div>

                  <div className="w-20 h-28 md:w-24 md:h-36 flex-shrink-0 rounded-lg overflow-hidden shadow-md bg-slate-100">
                    <img 
                      src={manga.cover_url || manga.main_picture?.medium} 
                      alt={manga.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy" 
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-28 md:h-36 py-1">
                    <div>
                      <h2 className="text-base md:text-lg font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        {manga.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {manga.author || "Unknown Author"}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-500">
                        <span className={`px-2 py-0.5 rounded-md ${
                          manga.status === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                           {manga.status === 'currently_publishing' ? 'Ongoing' : 'Completed'}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {manga.total_chapters > 0 ? `${manga.total_chapters} Ch` : '?'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-amber-700 text-sm">
                            {manga.mean || manga.score || "N/A"}
                          </span>
                        </div>
                        <button 
                        onClick={() => navigate(`/manga/${manga.id}`)}
                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-colors">
                          View Details
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- PAGINATION --- */}
      {!loading && mangaList.length > 0 && (
        <div className="max-w-[1200px] mx-auto px-6 pb-12">
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {currentPage > 3 && (
                 <>
                   <button onClick={() => handlePageChange(1)} className="w-10 h-10 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">1</button>
                   <span className="text-slate-400 px-1">...</span>
                 </>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p >= currentPage - 2 && p <= currentPage + 2)
                .map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                      currentPage === pageNum 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

              {currentPage < totalPages - 2 && (
                 <>
                   <span className="text-slate-400 px-1">...</span>
                   <button onClick={() => handlePageChange(totalPages)} className="w-10 h-10 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">{totalPages}</button>
                 </>
              )}
            </div>

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center mt-4 text-xs text-slate-400 font-medium">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

    </div>
  );
};

export default TopRankedManga;