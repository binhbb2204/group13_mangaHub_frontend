import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, BookOpen, Users, Trophy,
  Hash, Heart, ArrowLeft, Send,
  MessageCircle, ChevronDown, ChevronUp, Loader2, List
} from 'lucide-react';
import { libraryAPI } from '../utils/api';

const MangaDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]); // // Added state for chapters
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userCurrentChapter, setUserCurrentChapter] = useState(0);

  // REVIEW STATES
  const [commentText, setCommentText] = useState("");

  // RATING STATISTICS STATES
  const [ratingStats, setRatingStats] = useState(null);

  // Input State
  const [inputRating, setInputRating] = useState(0);

  // --- LIBRARY STATES ---
  const [inLibrary, setInLibrary] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [checkingLibrary, setCheckingLibrary] = useState(true);

  useEffect(() => {
    const fetchMangaDetails = async () => {
      try {
        setLoading(true);
        // 1. Fetch Basic Info
        const response = await fetch(`http://localhost:8080/manga/info/${id}`);
        if (!response.ok) throw new Error('Failed to load manga details');
        const data = await response.json();
        setManga(data);

        // Extract rating statistics if available
        if (data.rating_stats) {
          setRatingStats(data.rating_stats);
        } else {
          // Initialize with zero stats if backend doesn't provide them (5-star system)
          setRatingStats({
            average: 0,
            total_count: 0,
            distribution: {
              5: 0, 4: 0, 3: 0, 2: 0, 1: 0
            }
          });
        }

        // // 2. Fetch Chapters using mangadex_id
        if (data.mangadex_id) {
          const chResponse = await fetch(`http://localhost:8080/manga/chapters/${data.mangadex_id}?language=en&limit=100`);
          if (chResponse.ok) {
            const chData = await chResponse.json();
            // // Sort chapters by number
            const sorted = (chData.chapters || []).sort((a, b) =>
              parseFloat(a.chapter) - parseFloat(b.chapter)
            );
            setChapters(sorted);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserProgress = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`http://localhost:8080/users/progress/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user_rating) {
            setUserRating(data.user_rating);
          }
          if (data.current_chapter !== undefined) {
            setUserCurrentChapter(data.current_chapter);
          }

          // Add user's rating to reviews list
        }
      } catch (err) {
        console.log('No user rating found');
      }
    };

    const checkLibraryStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setCheckingLibrary(false);
        return;
      }

      try {
        const response = await libraryAPI.getLibrary();
        // console.log('Library API response:', response.data);

        // Backend returns {reading: [], completed: [], plan_to_read: []}
        // Flatten all categories into a single array
        const libraryData = response.data || {};
        const allItems = [
          ...(libraryData.reading || []),
          ...(libraryData.completed || []),
          ...(libraryData.plan_to_read || []),
          ...(libraryData.on_hold || []),
          ...(libraryData.dropped || [])
        ];

        // console.log('Flattened library items:', allItems);
        // console.log('Current manga ID:', id, '(type:', typeof id, ')');

        // Debug each item
        allItems.forEach((item, index) => {
          console.log(`Item ${index}:`, {
            manga_id: item.manga_id,
            'manga?.id': item.manga?.id,
            'matches manga_id === id': item.manga_id === id,
            'matches manga?.id === parseInt(id)': item.manga?.id === parseInt(id)
          });
        });


        const isInLibrary = allItems.some(item => {
          const itemMangaId = item.manga_id || item.manga?.id;
          return itemMangaId && (parseInt(itemMangaId) === parseInt(id));
        });
        console.log('✅ Is in library?', isInLibrary);
        setInLibrary(isInLibrary);
      } catch (err) {
        console.error('Failed to check library status:', err);
      } finally {
        setCheckingLibrary(false);
      }
    };

    if (id) {
      fetchMangaDetails();
      checkLibraryStatus();
      fetchUserProgress();
      window.scrollTo(0, 0);
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'currently_publishing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'finished':
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatValue = (data, keys) => {
    let value = null;
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null) {
        value = data[key];
        break;
      }
    }
    if (value === null || value === undefined) return '?';
    if (value === 0) return 'Unknown';
    return value;
  };

  // // Handle Start Reading (First Chapter)
  const handleStartReading = () => {
    if (chapters.length > 0 && manga.mangadex_id) {
      // Store manga info for progress tracking
      sessionStorage.setItem(`manga_${manga.mangadex_id}`, JSON.stringify({ id, mangadex_id: manga.mangadex_id }));
      navigate(`/read/${manga.mangadex_id}/${chapters[0].id}`);
    }
  };

  // // Handle Specific Chapter Click
  const handleChapterClick = (chapterId) => {
    // Store manga info for progress tracking
    sessionStorage.setItem(`manga_${manga.mangadex_id}`, JSON.stringify({ id, mangadex_id: manga.mangadex_id }));
    navigate(`/read/${manga.mangadex_id}/${chapterId}`);
  };

  const handleJoinChat = () => {
    navigate(`/chat/${id}`);
  };

  const scrollToReviews = () => {
    const section = document.getElementById('discussion');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmitReview = async () => {
    if (!commentText.trim() && inputRating === 0) return;

    if (inputRating > 0) {
      setUserRating(inputRating);

      // Update rating statistics locally
      setRatingStats(prev => {
        const newStats = prev || { average: 0, total_count: 0, distribution: {} };

        // Update distribution
        const newDistribution = { ...newStats.distribution };
        newDistribution[inputRating] = (newDistribution[inputRating] || 0) + 1;

        // Calculate new average
        const newTotalCount = newStats.total_count + 1;
        const oldSumcontrib = (newStats.average || 0) * newStats.total_count;
        const newAverage = (oldSumcontrib + inputRating) / newTotalCount;

        return {
          average: parseFloat(newAverage.toFixed(1)),
          total_count: newTotalCount,
          distribution: newDistribution
        };
      });

      // Submit rating to backend
      try {
        await libraryAPI.updateProgress(id, userCurrentChapter, inputRating);
        console.log('Rating submitted successfully');
      } catch (err) {
        console.error('Failed to submit rating:', err);
      }
    }

    setCommentText("");
    setInputRating(0);
  };

  const handleLibraryToggle = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLibraryLoading(true);
    try {
      if (inLibrary) {
        await libraryAPI.removeFromLibrary(id);
        setInLibrary(false);
      } else {
        await libraryAPI.addToLibrary(id);
        setInLibrary(true);
      }
    } catch (err) {
      console.error('Library operation failed:', err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setLibraryLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
    </div>
  );

  if (error || !manga) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 gap-4">
      <p className="text-red-500 font-medium">Error: {error}</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold">
        Go Back
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans pb-20">

      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[350px] md:h-[400px] overflow-hidden bg-slate-900 group">
        <div className="absolute inset-0">
          <img
            src={manga.main_picture?.large || manga.cover_url}
            alt="Background"
            className="w-full h-full object-cover opacity-30 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FC] via-slate-900/60 to-slate-900/80"></div>
        </div>

        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:text-indigo-400 bg-black/30 hover:bg-black/50 backdrop-blur-md px-4 py-2 rounded-full transition-all border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" /> <span className="font-bold text-sm">Back</span>
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-64 md:-mt-48">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">

          {/* LEFT COLUMN: Sticky Actions */}
          <div className="flex-shrink-0 flex flex-col items-center md:items-start w-full md:w-[280px]">
            {/* Cover Image */}
            <div className="w-[200px] md:w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-4 ring-white bg-slate-200 mb-6 relative z-20">
              <img
                src={manga.main_picture?.large || manga.cover_url}
                alt={manga.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3 sticky top-24">
              <button
                onClick={handleStartReading}
                disabled={chapters.length === 0}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <BookOpen className="w-5 h-5" />
                {chapters.length > 0 ? "Start Reading" : "No Chapters"}
              </button>

              <button
                onClick={handleJoinChat}
                className="w-full py-3 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                Join Community Chat
              </button>

              <button
                onClick={handleLibraryToggle}
                disabled={libraryLoading || checkingLibrary}
                className={`w-full py-3 border font-bold rounded-xl transition-colors flex items-center justify-center gap-2 group active:scale-95 ${inLibrary
                  ? 'bg-pink-500 border-pink-500 text-white hover:bg-pink-600 hover:border-pink-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Heart className={`w-5 h-5 transition-colors ${inLibrary
                  ? 'fill-white text-white'
                  : 'text-slate-400 group-hover:text-pink-500 group-hover:fill-pink-500'
                  }`} />
                {libraryLoading ? 'Loading...' : inLibrary ? 'In Library' : 'Add to Library'}
              </button>

              <button
                onClick={scrollToReviews}
                className="w-full py-2 text-sm text-slate-400 font-medium hover:text-indigo-600 transition-colors"
              >
                Have you read this? <span className="underline decoration-dotted">Rate it</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Info & Details */}
          <div className="flex-1 pt-4 md:pt-12 pb-12">

            {/* Header Info */}
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-2 md:text-white md:drop-shadow-lg">
                {manga.title}
              </h1>
              {manga.alternative_titles?.en && (
                <h2 className="text-lg text-slate-500 font-medium md:text-gray-200 mb-4">
                  {manga.alternative_titles.en}
                </h2>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-bold mt-4">
                <span className="bg-slate-900 text-white px-3 py-1 rounded-md uppercase tracking-wider text-xs">
                  {manga.media_type || 'MANGA'}
                </span>
                <span className={`px-3 py-1 rounded-md border uppercase tracking-wider text-xs ${getStatusColor(manga.status)}`}>
                  {manga.status?.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-600 md:text-white font-medium drop-shadow-md ml-2">
                  by {manga.authors?.map(a => `${a.node.first_name} ${a.node.last_name}`).join(', ') || manga.author || "Unknown"}
                </span>
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="text-2xl font-black text-slate-800">
                    {userRating > 0 ? userRating.toFixed(1) : "N/A"}
                  </span>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">Your Score</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-1.5 text-indigo-500 mb-1">
                  <Trophy className="w-5 h-5" />
                  <span className="text-2xl font-black text-slate-800">#{manga.rank || 'N/A'}</span>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">Rank</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                  <Users className="w-5 h-5" />
                  <span className="text-lg md:text-xl font-black text-slate-800">{manga.num_list_users?.toLocaleString()}</span>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">Members</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
                  <Hash className="w-5 h-5" />
                  <span className="text-2xl font-black text-slate-800">{manga.popularity || 'N/A'}</span>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">Popularity</span>
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-10">
              {manga.genres?.map((genre, idx) => (
                <span key={idx} className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer transition-colors">
                  {typeof genre === 'string' ? genre : genre.name}
                </span>
              ))}
            </div>

            <div className="space-y-10">
              {/* Synopsis */}
              <section>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Synopsis</h3>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative">
                  <p className={`text-slate-600 leading-relaxed whitespace-pre-line text-sm md:text-base ${!isDescExpanded ? 'line-clamp-4' : ''}`}>
                    {manga.description || manga.synopsis}
                  </p>
                  <button
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="mt-4 flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    {isDescExpanded ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Read More</>}
                  </button>
                </div>
              </section>

              {/* Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Background</h3>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {manga.background || "No background information available for this title."}
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-xl font-bold text-slate-800 mb-3">Information</h3>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-medium">Type</span>
                      <span className="font-bold text-slate-700 capitalize">{manga.media_type || 'Manga'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-medium">Volumes</span>
                      <span className="font-bold text-slate-700">
                        {formatValue(manga, ['num_volumes', 'volumes'])}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-medium">Chapters</span>
                      <span className="font-bold text-slate-700">
                        {formatValue(manga, ['total_chapters', 'num_chapters', 'chapters'])}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-medium">Published</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-700 block">{formatDate(manga.start_date)}</span>
                        <span className="text-xs text-slate-400">to {formatDate(manga.end_date)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">Serialization</span>
                      <span className="font-bold text-indigo-600 truncate max-w-[150px] text-right">
                        {manga.serialization?.[0]?.node?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* // --- CHAPTER LIST SECTION --- */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <List className="w-5 h-5 text-indigo-600" /> Chapters
                    <span className="text-sm font-normal text-slate-500">({chapters.length})</span>
                  </h3>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
                  {chapters.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No chapters available.</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {chapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterClick(chapter.id)}
                          className="w-full text-left p-4 hover:bg-indigo-50 transition-colors flex justify-between items-center group"
                        >
                          <div>
                            <div className="font-bold text-slate-700 group-hover:text-indigo-700">
                              Chapter {chapter.chapter}
                            </div>
                            {chapter.title && (
                              <div className="text-xs text-slate-400 mt-0.5 max-w-[200px] md:max-w-none truncate">{chapter.title}</div>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-300 group-hover:text-indigo-300 whitespace-nowrap ml-4">
                            {formatDate(chapter.readableAt)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Rating Section */}
              <section id="rating">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Rating</h3>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                  {/* Rating Distribution Bars - Full Width (5-star system) */}
                  <div className="space-y-2 mb-8">
                    {[5, 4, 3, 2, 1].map((level) => {
                      const count = ratingStats?.distribution?.[level] || 0;
                      const total = ratingStats?.total_count || 1;
                      const percentage = (count / total) * 100;

                      return (
                        <div key={level} className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-700 w-6 text-right">{level}</span>
                          <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Aggregate Rating Display - Horizontal Layout */}
                  <div className="pb-8 border-b border-slate-100">
                    <div className="flex items-center justify-center gap-4">
                      {/* Stars on the left (5-star system) */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${star <= Math.round(ratingStats?.average || 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                              }`}
                          />
                        ))}
                      </div>

                      {/* Number on the right */}
                      <div className="text-4xl font-black text-slate-900">
                        {ratingStats?.average || '0.0'}
                      </div>
                    </div>

                    {/* Rating count below */}
                    <div className="text-center mt-2">
                      <div className="text-xs text-slate-500 font-medium">
                        {ratingStats?.total_count || 0} {ratingStats?.total_count === 1 ? 'rating' : 'ratings'}
                      </div>
                    </div>
                  </div>

                  {/* Review Input Box */}
                  <div className="border-t border-slate-100 pt-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-4">Write a Review</h4>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 flex-shrink-0">
                        U
                      </div>
                      <div className="flex-1 relative">
                        {/* 5-STAR RATING SELECTOR */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase">Rate this:</span>
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="cursor-pointer px-1 focus:outline-none transition-transform active:scale-95"
                                onClick={() => setInputRating(star)}
                              >
                                <Star
                                  className={`w - 5 h - 5 transition - colors duration - 200 ${inputRating >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                    }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write your review here (optional)..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none h-24 transition-all"
                        />
                        <button
                          onClick={handleSubmitReview}
                          disabled={!commentText.trim() && inputRating === 0}
                          className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div >
        </div >
      </div >
    </div >
  );
};

export default MangaDetails;