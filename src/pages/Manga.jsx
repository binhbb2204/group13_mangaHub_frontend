import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, X, ChevronLeft, ChevronRight, ChevronDown,
  Filter, Hash, Check 
} from 'lucide-react';
import { buildApiUrl } from '../utils/api';

const GENRES_LIST = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Isekai", "Mystery", "Romance", "Sci-Fi", 
  "Slice of Life", "Sports", "Supernatural", "Thriller", 
  "Psychological", "Seinen", "Shoujo", "Shounen"
];

const FORMAT_OPTIONS = [
  { id: 'all', label: 'All Content' },
  { id: 'manga', label: 'Manga' },
  { id: 'manhwa', label: 'Manhwa' },
  { id: 'manhua', label: 'Manhua' },
  { id: 'novels', label: 'Light Novels' },
  { id: 'oneshot', label: 'One-shot' },
  { id: 'doujin', label: 'Doujinshi' }
];

const SORT_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'bypopularity', label: 'Popularity' },
  { id: 'favorite', label: 'Most Favorite' }
];

// --- REUSABLE CUSTOM DROPDOWN COMPONENT ---
const FilterDropdown = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id === value) || options[0];

  return (
    <div className="mb-6" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-white border text-left font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-sm
            ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}
            text-slate-700
          `}
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDown 
            size={16} 
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between
                    ${value === opt.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}
                  `}
                >
                  {opt.label}
                  {value === opt.id && <Check size={14} className="text-white" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const Manga = () => {
  // --- State ---
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // URL Params
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read params
  const currentQ = searchParams.get('q') || '';
  const currentType = searchParams.get('type') || 'all';
  const currentGenres = searchParams.get('genre') ? searchParams.get('genre').split(',') : [];
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentLimit = parseInt(searchParams.get('limit') || '20', 10);

  // Local state for inputs
  const [searchInput, setSearchInput] = useState(currentQ);
  const [limitInput, setLimitInput] = useState(currentLimit);

  // Determine current Sort vs Format for UI state
  const isSortActive = SORT_OPTIONS.some(s => s.id === currentType);
  const currentSortUI = isSortActive ? currentType : 'default';
  const currentFormatUI = !isSortActive ? currentType : 'all';

  // --- Scroll Detection ---
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- API Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (currentQ) queryParams.append('q', currentQ);
        queryParams.append('type', currentType);
        if (currentGenres.length > 0) queryParams.append('genre', currentGenres.join(','));
        queryParams.append('limit', currentLimit);
        queryParams.append('page', currentPage);

        const url = buildApiUrl(`/manga/search?${queryParams.toString()}`);
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Fetch failed');
        
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
        if (paginationData.total_pages) setTotalPages(paginationData.total_pages);

      } catch (err) {
        console.error(err);
        setMangaList([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [currentQ, currentType, searchParams.get('genre'), currentPage, currentLimit]);

  // --- Helpers ---
  const updateParams = (newParams) => {
    const params = {
      q: currentQ,
      type: currentType,
      genre: currentGenres.join(','),
      page: 1, 
      limit: currentLimit,
      ...newParams
    };

    Object.keys(params).forEach(key => {
      if (params[key] === '' || (key === 'type' && params[key] === 'all')) {
        delete params[key];
      }
    });
    setSearchParams(params);
  };

  const toggleGenre = (genre) => {
    let newGenres;
    if (currentGenres.includes(genre)) {
      newGenres = currentGenres.filter(g => g !== genre);
    } else {
      newGenres = [...currentGenres, genre];
    }
    updateParams({ genre: newGenres.join(',') });
  };

  const handleLimitBlur = () => {
    const val = parseInt(limitInput, 10);
    if (!isNaN(val) && val > 0 && val <= 500) {
      updateParams({ limit: val });
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      updateParams({ page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] pt-28 pb-10 font-sans text-slate-800">
      <div className="container mx-auto px-4 max-w-[1400px] flex flex-col lg:flex-row gap-8">
        
        {/* === LEFT SIDEBAR FILTERS === */}
        <aside className={`
            fixed inset-0 z-50 bg-white lg:bg-transparent lg:static lg:w-72 lg:block flex-shrink-0 
            transition-transform duration-300 overflow-y-auto lg:overflow-visible p-6 lg:p-0
            ${showMobileFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex items-center justify-between lg:hidden mb-6">
            <span className="text-xl font-bold text-slate-800">Filters</span>
            <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-slate-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="lg:sticky lg:top-28 space-y-8">
             <div>
                <h3 className="text-2xl font-black text-slate-800 mb-6">Filters</h3>
                
                {/* Custom Format Dropdown */}
                <FilterDropdown 
                  label="Format" 
                  options={FORMAT_OPTIONS} 
                  value={currentFormatUI} 
                  onChange={(val) => updateParams({ type: val })} 
                />

                {/* Custom Sort Dropdown */}
                {/* <FilterDropdown 
                  label="Sort By" 
                  options={SORT_OPTIONS} 
                  value={currentSortUI} 
                  onChange={(val) => updateParams({ type: val })} 
                /> */}

                {/* Genres Chips */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES_LIST.map((genre) => {
                      const isSelected = currentGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 ${
                            isSelected
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-500 border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-700 hover:shadow-sm'
                          }`}
                        >
                          {genre}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Reset Button */}
                <button 
                  onClick={() => {
                    setSearchParams({ limit: currentLimit });
                    setSearchInput("");
                    setLimitInput(20);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  Reset Filters
                </button>
             </div>
          </div>
        </aside>

        {/* === MAIN CONTENT === */}
        <main className="flex-1 min-w-0">
          
          {/* Sticky Floating Search Pill */}
          <div className={`
             sticky top-24 z-30 transition-all duration-300 mb-8
             ${isScrolled ? 'translate-y-0' : 'translate-y-0'}
          `}>
             <div className="bg-white/90 backdrop-blur-md border border-white/20 shadow-lg shadow-slate-200/50 rounded-full p-2 flex items-center gap-2 max-w-3xl">
                
                {/* Search Input */}
                <div className="flex-1 flex items-center px-4">
                   <Search className="w-5 h-5 text-slate-400 mr-3" />
                   <input
                     type="text"
                     placeholder="Search manga title..."
                     value={searchInput}
                     onChange={(e) => setSearchInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && updateParams({ q: searchInput })}
                     className="w-full bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
                   />
                   {searchInput && (
                     <button onClick={() => { setSearchInput(''); updateParams({ q: '' }); }} className="text-slate-400 hover:text-slate-600">
                       <X size={16} />
                     </button>
                   )}
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-8 bg-slate-200 my-1"></div>

                {/* Limit Input */}
                <div className="flex items-center gap-2 px-4">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Limit</span>
                   <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                      <Hash size={14} className="text-slate-400 mr-1" />
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        onBlur={handleLimitBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleLimitBlur()}
                        className="w-12 bg-transparent text-sm font-bold text-slate-700 outline-none text-center" 
                      />
                   </div>
                </div>

                {/* Mobile Filter Trigger */}
                <button 
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                >
                  <Filter size={20} />
                </button>
                
                {/* Search Button (Desktop) */}
                <button 
                  onClick={() => updateParams({ q: searchInput })}
                  className="hidden lg:flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                >
                  Search
                </button>
             </div>
          </div>

          {/* Results Grid */}
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
               <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
               <p className="text-slate-400 font-medium animate-pulse">Fetching library...</p>
             </div>
          ) : mangaList.length === 0 ? (
             <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="text-lg font-bold text-slate-700">No manga found</h3>
               <p className="text-slate-500 mt-1 max-w-xs">We couldn't find anything matching your filters. Try adjusting your search terms.</p>
               <button 
                 onClick={() => { setSearchInput(''); updateParams({ q: '', type: 'all' }); }}
                 className="mt-6 text-indigo-600 font-bold hover:underline"
               >
                 Clear all filters
               </button>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {mangaList.map((manga) => (
                <div key={manga.id} 
                  onClick={() => navigate(`/manga/${manga.id}`)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-4 bg-slate-100 shadow-sm group-hover:shadow-xl group-hover:shadow-indigo-100/50 transition-all duration-300 group-hover:-translate-y-1">
                    <img 
                      src={manga.cover_url || manga.main_picture?.medium} 
                      alt={manga.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Floating Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                        {manga.media_type || 'MANGA'}
                      </span>
                    </div>

                    {/* Quick Stats Overlay (Hover) */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between">
                       <div className="text-white text-xs font-medium">
                          {manga.status === 'finished' ? 'Completed' : 'Ongoing'}
                       </div>
                       {manga.score && (
                         <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
                           <span>★</span> {manga.score}
                         </div>
                       )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {manga.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 line-clamp-1">{manga.author || 'Unknown Author'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* === SMART PAGINATION === */}
          {!loading && mangaList.length > 0 && (
            <div className="mt-12 flex justify-center items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {/* First Page */}
                {currentPage > 3 && (
                   <>
                     <button onClick={() => handlePageChange(1)} className="w-10 h-10 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">1</button>
                     <span className="text-slate-400 px-1">...</span>
                   </>
                )}

                {/* Page Range */}
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

                {/* Last Page */}
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
          )}

        </main>
      </div>
      
      {/* Mobile Drawer Overlay */}
      {showMobileFilters && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setShowMobileFilters(false)}
        />
      )}
    </div>
  );
};

export default Manga;