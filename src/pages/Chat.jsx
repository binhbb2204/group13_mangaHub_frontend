import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebSocketContext } from '../context/WebSocketProvider';
import { Search, Plus, Globe, Book, Hash, MessageSquare } from 'lucide-react';

const TypeBadge = ({ type }) => {
  const map = { 
    global: { icon: <Globe size={16} />, color: 'bg-blue-100 text-blue-600' }, 
    manga: { icon: <Book size={16} />, color: 'bg-purple-100 text-purple-600' }, 
    custom: { icon: <Hash size={16} />, color: 'bg-indigo-100 text-indigo-600' } 
  };
  const config = map[type] || { icon: <MessageSquare size={16} />, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`p-2 rounded-lg ${config.color}`}>
      {config.icon}
    </span>
  );
};

export default function Chat() {
  const { connected, roomList, isLoading, fetchRooms, createRoom } = useContext(WebSocketContext);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchRooms(); }, []);

  const filteredRooms = useMemo(() => {
    const byType = filter === 'all' ? roomList : roomList.filter((r) => r.type === filter);
    return search.trim()
      ? byType.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
      : byType;
  }, [roomList, filter, search]);

  const onCreate = () => {
    const name = newRoom.trim();
    if (!name) return;
    createRoom(name);
    setNewRoom('');
    setTimeout(() => navigate(`/chat/${encodeURIComponent(name)}`), 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Chat Rooms</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              {connected ? (
                <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Connected to Server</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-red-500" /> Disconnected</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <input
              className="bg-transparent border-none focus:ring-0 text-sm px-2 w-48"
              placeholder="Create new room..."
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
            />
            <button 
              onClick={onCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Search for a topic or manga..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-600"
          >
            <option value="all">All Categories</option>
            <option value="global">Global</option>
            <option value="manga">Manga Discussions</option>
            <option value="custom">Custom Rooms</option>
          </select>
        </div>

        {/* Room Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Loading channels...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={`${room.type}:${room.name}`}
                onClick={() => navigate(`/chat/${encodeURIComponent(room.name)}`)}
                className="group bg-white border border-slate-200 p-5 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <TypeBadge type={room.type} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {room.messageCount || 0} msgs
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors truncate">
                  {room.displayName || room.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Click to join the conversation
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}