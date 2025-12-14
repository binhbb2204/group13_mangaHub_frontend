import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Star, Loader2, BookOpen, Heart, PlayCircle, RotateCcw } from 'lucide-react';
import { libraryAPI } from '../utils/api';

const Library = () => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chaptersCache, setChaptersCache] = useState({}); // Cache chapters by mangadex_id
  const [loadingChapters, setLoadingChapters] = useState({}); // Track loading state
  const [removingManga, setRemovingManga] = useState(null); // Track which manga is being removed
  const [mangaDetailsCache, setMangaDetailsCache] = useState({}); // Cache fresh manga details by ID
  const [enriching, setEnriching] = useState(false); // Track when enriching with fresh API data
  const navigate = useNavigate();

  // Fetch fresh manga details from API to get up-to-date info
  const fetchMangaDetails = useCallback(async (mangaId) => {
    try {
      const response = await fetch(`http://localhost:8080/manga/info/${mangaId}`);
      if (response.ok) {
        const data = await response.json();
        setMangaDetailsCache(prev => ({ ...prev, [mangaId]: data }));
        return data;
      }
    } catch (err) {
      console.error(`Failed to fetch manga details for ID ${mangaId}:`, err);
    }
    return null;
  }, []); // Empty deps - stable function reference

  const fetchChapters = useCallback(async (mangadexId) => {
    try {
      setLoadingChapters(prev => {
        // Skip if already loading
        if (prev[mangadexId]) return prev;
        return { ...prev, [mangadexId]: true };
      });

      const response = await fetch(`http://localhost:8080/manga/chapters/${mangadexId}?language=en&limit=100`);

      if (response.ok) {
        const data = await response.json();
        const sorted = (data.chapters || []).sort((a, b) =>
          parseFloat(a.chapter) - parseFloat(b.chapter)
        );
        setChaptersCache(prev => ({ ...prev, [mangadexId]: sorted }));
        return sorted;
      }
    } catch (err) {
      console.error('Failed to fetch chapters:', err);
    } finally {
      setLoadingChapters(prev => ({ ...prev, [mangadexId]: false }));
    }
    return null;
  }, []); // Empty deps - stable function reference

  useEffect(() => {
    const fetchLibrary = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);

        // Step 1: Fetch library metadata from database (IDs, progress, status)
        const response = await libraryAPI.getLibrary();
        const libraryData = response.data || {};
        const allItems = [
          ...(libraryData.reading || []),
          ...(libraryData.completed || []),
          ...(libraryData.plan_to_read || []),
          ...(libraryData.on_hold || []),
          ...(libraryData.dropped || [])
        ];


        // Step 2: Enrich each manga with fresh API data (prioritize external APIs)
        const enrichmentPromises = allItems.map(async (item) => {
          const manga = item.manga || item;
          if (!manga.id) return item;

          try {
            // Try to fetch fresh data from external API first
            const freshDetails = await fetchMangaDetails(manga.id);

            // If we got fresh details with mangadex_id, fetch chapters
            if (freshDetails?.mangadex_id) {
              await fetchChapters(freshDetails.mangadex_id);
            }

            // Return enriched item (state will be updated via cache)
            return { ...item, manga: { ...manga, ...freshDetails } };
          } catch (err) {
            console.error(`Failed to enrich manga ${manga.id}:`, err);
            // Fallback: keep database data
            return item;
          }
        });

        // Step 3: Wait for all enrichment to complete
        const enrichedItems = await Promise.allSettled(enrichmentPromises);

        // Update library with enriched data (single update, no flicker)
        const finalLibrary = enrichedItems.map((result, index) =>
          result.status === 'fulfilled' ? result.value : allItems[index]
        );

        setLibrary(finalLibrary);
        setLoading(false);
        setEnriching(false);

      } catch (err) {
        console.error('Library fetch error:', err);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        } else {
          setError(err.response?.data?.error || err.message || 'Failed to load library');
        }
        setLoading(false);
      }
    };

    fetchLibrary();
  }, [navigate, fetchMangaDetails, fetchChapters]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'reading': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'plan_to_read': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'on_hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'dropped': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    return status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
  };

  // Calculate status based on reading progress
  const getCalculatedStatus = (item, manga) => {
    const backendStatus = item.status?.toLowerCase();

    // Manual statuses (On Hold, Dropped) override automatic calculation
    if (backendStatus === 'on_hold' || backendStatus === 'dropped') {
      return backendStatus;
    }

    const currentChapter = item.current_chapter || 0;
    const totalChapters = formatTotalChapters(manga);

    // If we don't know total chapters, use backend status
    if (totalChapters === '?') {
      return backendStatus || 'plan_to_read';
    }

    // Calculate based on progress
    if (currentChapter === 0) {
      return 'plan_to_read';
    } else if (currentChapter >= totalChapters) {
      return 'completed';
    } else {
      return 'reading';
    }
  };

  // Helper function to get total chapters - prioritizes external API data
  const formatTotalChapters = (manga) => {
    // Priority 1: MangaDex chapters API (most accurate, real-time)
    if (manga.mangadex_id && chaptersCache[manga.mangadex_id]) {
      return chaptersCache[manga.mangadex_id].length;
    }

    // Priority 2: Fresh manga details from API cache
    const freshData = mangaDetailsCache[manga.id];
    if (freshData?.mangadex_id && chaptersCache[freshData.mangadex_id]) {
      return chaptersCache[freshData.mangadex_id].length;
    }

    // Priority 3: Manga details API fields (from /manga/info endpoint)
    const apiData = freshData || manga;
    const apiFields = ['total_chapters', 'num_chapters', 'chapters'];
    for (const field of apiFields) {
      const value = apiData[field];
      if (value && value !== 'unknown' && value !== 0) {
        const numValue = typeof value === 'number' ? value : parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          return numValue;
        }
      }
    }

    // Priority 4: Database cached fields (fallback only)
    const dbFields = ['total_chapters', 'num_chapters', 'chapters'];
    for (const field of dbFields) {
      const value = manga[field];
      if (value && value !== 'unknown' && value !== 0) {
        const numValue = typeof value === 'number' ? value : parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          return numValue;
        }
      }
    }

    // If all sources fail, return unknown
    return '?';
  };


  const handleContinueReading = async (manga, currentChapter) => {
    // Get mangadex_id from either the manga object or the cache
    const mangadexId = manga.mangadex_id || mangaDetailsCache[manga.id]?.mangadex_id;

    if (!mangadexId) {
      console.warn('⚠️ MangaDex ID not available, redirecting to details page');
      navigate(`/manga/${manga.id}`);
      return;
    }

    // Get chapters from cache
    const chapters = chaptersCache[mangadexId];

    if (!chapters || chapters.length === 0) {
      console.warn('⚠️ Chapters not loaded yet, redirecting to details page');
      navigate(`/manga/${manga.id}`);
      return;
    }

    // Find the chapter that matches the current chapter number
    const targetChapter = chapters.find(ch =>
      parseFloat(ch.chapter) === parseFloat(currentChapter)
    );

    if (targetChapter) {
      // Navigate to the specific chapter in reader
      console.log(`� Continue reading: Chapter ${currentChapter}`);
      sessionStorage.setItem(`manga_${mangadexId}`, JSON.stringify({
        id: manga.id,
        mangadex_id: mangadexId
      }));
      navigate(`/read/${mangadexId}/${targetChapter.id}`);
    } else {
      // If exact chapter not found, navigate to the next available chapter
      const nextChapter = chapters.find(ch =>
        parseFloat(ch.chapter) >= parseFloat(currentChapter)
      ) || chapters[chapters.length - 1];

      console.log(`📖 Chapter ${currentChapter} not found, navigating to nearest: Chapter ${nextChapter.chapter}`);
      sessionStorage.setItem(`manga_${mangadexId}`, JSON.stringify({
        id: manga.id,
        mangadex_id: mangadexId
      }));
      navigate(`/read/${mangadexId}/${nextChapter.id}`);
    }
  };

  const handleStartFromBeginning = async (manga) => {
    // Get mangadex_id from either the manga object or the cache
    const mangadexId = manga.mangadex_id || mangaDetailsCache[manga.id]?.mangadex_id;

    if (!mangadexId) {
      console.warn('⚠️ MangaDex ID not available, redirecting to details page');
      navigate(`/manga/${manga.id}`);
      return;
    }

    // Get chapters from cache
    const chapters = chaptersCache[mangadexId];

    if (!chapters || chapters.length === 0) {
      console.warn('⚠️ Chapters not loaded yet, redirecting to details page');
      navigate(`/manga/${manga.id}`);
      return;
    }

    // Navigate to first chapter
    const firstChapter = chapters[0];
    console.log(`� Starting from beginning: Chapter ${firstChapter.chapter}`);
    sessionStorage.setItem(`manga_${mangadexId}`, JSON.stringify({
      id: manga.id,
      mangadex_id: mangadexId
    }));
    navigate(`/read/${mangadexId}/${firstChapter.id}`);
  };

  const handleRemoveFromLibrary = async (mangaId, e) => {
    e.stopPropagation(); // Prevent card click

    if (removingManga === mangaId) return; // Prevent double-click

    setRemovingManga(mangaId);

    try {
      await libraryAPI.removeFromLibrary(mangaId);
      // Remove from local state
      setLibrary(prevLibrary => prevLibrary.filter(item => {
        const manga = item.manga || item;
        return manga.id !== mangaId;
      }));
    } catch (err) {
      console.error('Failed to remove from library:', err);
      // Optionally show error to user
    } finally {
      setRemovingManga(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center text-slate-500 gap-4">
        <p className="text-red-500 font-medium">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans pb-20">
      <div className="max-w-[1440px] mx-auto px-6 pt-24 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900">My Library</h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 font-medium">
                  {library.length === 0 ? 'No manga in your library yet' : `${library.length} manga in your collection`}
                </p>
                {enriching && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Updating...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {library.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center">
                <Heart className="w-12 h-12 text-slate-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Library is Empty</h2>
                <p className="text-slate-500 leading-relaxed">
                  Start building your manga collection by adding titles you love. Browse manga and click "Add to Library" to get started!
                </p>
              </div>
              <button
                onClick={() => navigate('/manga')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                <Book className="w-5 h-5" />
                Browse Manga
              </button>
            </div>
          </div>
        ) : (
          /* Manga Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {library.map((item) => {
              const manga = item.manga || item;
              return (
                <div
                  key={manga.id}
                  className="group cursor-pointer"
                >
                  {/* Card */}
                  <div className="relative">
                    {/* Cover Image */}
                    <div
                      className="aspect-[2/3] rounded-2xl overflow-hidden shadow-sm bg-slate-100 group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-300 transform group-hover:-translate-y-2"
                      onClick={() => navigate(`/manga/${manga.id}`)}
                    >
                      <img
                        src={manga.main_picture?.large || manga.cover_url}
                        alt={manga.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Hover Overlay with Reading Options */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4">
                        {/* Determine button behavior based on progress */}
                        {(() => {
                          const currentChapter = item.current_chapter || 0;
                          const totalChapters = formatTotalChapters(manga);
                          const hasProgress = currentChapter > 0;
                          const allRead = totalChapters !== '?' && currentChapter >= totalChapters;

                          // If no progress, show single "Start Reading" button
                          if (!hasProgress) {
                            return (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  console.log('🚀 Start Reading clicked for:', manga.title);
                                  await handleContinueReading(manga, currentChapter);
                                }}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                              >
                                <PlayCircle className="w-5 h-5" />
                                Start Reading
                              </button>
                            );
                          }

                          // If all chapters read
                          if (allRead) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartFromBeginning(manga);
                                }}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                              >
                                <RotateCcw className="w-5 h-5" />
                                Re-read from Ch. 1
                              </button>
                            );
                          }

                          // Has progress but not finished - show both buttons
                          return (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContinueReading(manga, currentChapter);
                                }}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                              >
                                <PlayCircle className="w-5 h-5" />
                                Continue Reading - Ch. {currentChapter}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartFromBeginning(manga);
                                }}
                                className="w-full py-3 bg-white/90 hover:bg-white text-slate-800 font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                              >
                                <RotateCcw className="w-5 h-5" />
                                Start from Beginning
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wide border ${getStatusColor(getCalculatedStatus(item, manga))}`}>
                        {getStatusLabel(getCalculatedStatus(item, manga))}
                      </span>
                    </div>

                    {/* Heart Button - Remove from Library */}
                    <button
                      onClick={(e) => handleRemoveFromLibrary(manga.id, e)}
                      disabled={removingManga === manga.id}
                      className="absolute top-2 right-2 z-20 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/heart"
                      title="Remove from Library"
                    >
                      <Heart className="w-5 h-5 text-pink-500 fill-pink-500 group-hover/heart:fill-pink-600 transition-colors" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="mt-4 px-1" onClick={() => navigate(`/manga/${manga.id}`)}>
                    <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors min-h-[2.5rem]">
                      {manga.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Book className="w-4 h-4 text-indigo-400" />
                        {item.current_chapter || 0}/{formatTotalChapters(manga)}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {item.user_rating ? item.user_rating.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div >
  );
};

export default Library;