import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSSE } from '../hooks/useSSE';

const NotificationContext = createContext(null);

// Connect to UDP server's SSE endpoint (port 9094)
const API_URL = process.env.REACT_APP_UDP_SSE_URL || 'http://localhost:9094';

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const { isConnected } = useSSE(`${API_URL}/events`, {
        enabled: true,
        onMessage: (event) => {
            // Ignore heartbeat and connected messages
            if (event.type === 'heartbeat' || event.type === 'connected') {
                return;
            }

            // Add notification
            const newNotification = {
                id: Date.now(),
                type: event.type,
                message: event.message,
                data: event.data,
                timestamp: event.timestamp || Date.now(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    });

    const markAsRead = useCallback((id) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === id ? { ...notif, read: true } : notif
            )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        setUnreadCount(0);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => {
            const notif = prev.find(n => n.id === id);
            if (notif && !notif.read) {
                setUnreadCount(count => Math.max(0, count - 1));
            }
            return prev.filter(n => n.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    const value = {
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
