import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, BookOpen, Sparkles } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const NotificationBell = ({ useDarkText }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [mangaTitles, setMangaTitles] = useState({});
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch manga titles for notifications with manga_id
    useEffect(() => {
        const fetchMangaTitles = async () => {
            const mangaIds = notifications
                .filter(n => n.data?.manga_id && !mangaTitles[n.data.manga_id])
                .map(n => n.data.manga_id);

            if (mangaIds.length === 0) return;

            // Fetch titles for each manga_id
            for (const mangaId of mangaIds) {
                try {
                    const response = await fetch(`${API_URL}/manga/${mangaId}`);
                    if (response.ok) {
                        const data = await response.json();
                        setMangaTitles(prev => ({
                            ...prev,
                            [mangaId]: data.title || `Manga #${mangaId}`
                        }));
                    }
                } catch (error) {
                    console.error('Failed to fetch manga title:', error);
                    setMangaTitles(prev => ({
                        ...prev,
                        [mangaId]: `Manga #${mangaId}`
                    }));
                }
            }
        };

        fetchMangaTitles();
    }, [notifications]);

    const getDisplayTitle = (notif) => {
        if (notif.data?.manga_id) {
            return mangaTitles[notif.data.manga_id] || `Loading...`;
        }
        return notif.data?.title || '';
    };

    const getIcon = (type) => {
        switch (type) {
            case 'manga_created':
                return <BookOpen className="w-5 h-5 text-indigo-600" />;
            case 'chapter_release':
                return <Sparkles className="w-5 h-5 text-amber-600" />;
            case 'library_update':
                return <BookOpen className="w-5 h-5 text-green-600" />;
            case 'progress_update':
                return <Sparkles className="w-5 h-5 text-blue-600" />;
            default:
                return <Bell className="w-5 h-5 text-slate-600" />;
        }
    };

    const formatTime = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp * 1000;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const handleNotificationClick = (notif) => {
        if (!notif.read) {
            markAsRead(notif.id);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount > 0) {
                        // Mark all as read when opening
                        setTimeout(() => markAllAsRead(), 500);
                    }
                }}
                className={`relative p-2 rounded-full transition-all ${useDarkText
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-white hover:bg-white/10'
                    }`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-800">
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <Bell className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-500">No notifications yet</p>
                                <p className="text-xs text-slate-400 mt-1">We'll notify you when something happens</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer relative ${!notif.read ? 'bg-indigo-50/50' : ''
                                            }`}
                                    >
                                        {/* Unread indicator */}
                                        {!notif.read && (
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 rounded-full" />
                                        )}

                                        <div className="flex gap-3 items-start pl-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getIcon(notif.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 leading-snug">
                                                    {notif.message}
                                                </p>
                                                {(notif.data?.title || notif.data?.manga_id) && (
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                        {getDisplayTitle(notif)}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatTime(notif.timestamp)}
                                                </p>
                                            </div>

                                            {/* Remove button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeNotification(notif.id);
                                                }}
                                                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
