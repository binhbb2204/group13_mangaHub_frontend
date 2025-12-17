import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebSocketContext } from '../context/WebSocketProvider';
import { ChevronLeft, Send, Hash } from 'lucide-react';

export default function ChatRoom() {
  const { id: rawRoomName } = useParams();
  const roomName = decodeURIComponent(rawRoomName || 'global');
  const { connected, roomMessages, joinRoom, leaveRoom, sendMessage } = useContext(WebSocketContext);
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    joinRoom(roomName);
    return () => leaveRoom(roomName);
  }, [roomName, joinRoom, leaveRoom]);

  const messages = useMemo(() => roomMessages[roomName] || [], [roomMessages, roomName]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const me = useMemo(() => localStorage.getItem('username') || 'Me', []);

  const onSend = () => {
    if (!draft.trim()) return;
    sendMessage(roomName, draft.trim());
    setDraft('');
  };

  return (
    <div className="h-screen bg-white pt-20 flex flex-col">
      {/* Room Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/chat')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Hash size={18} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 text-lg">{roomName}</h2>
            </div>
            <p className="text-xs text-green-500 font-medium">
              {connected ? '● Active' : '○ Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
      >
        {messages.map((m, i) => {
          const isMine = (m.from === me || m.username === me || m.userId === localStorage.getItem('userId'));
          const isSystem = m.type === 'system';

          if (isSystem) {
            return (
              <div key={i} className="flex justify-center my-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {m.content}
                </span>
              </div>
            );
          }

          return (
            <div key={i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {!isMine && (
                <span className="text-xs font-semibold text-slate-500 ml-2 mb-1">
                  {m.from || m.username}
                </span>
              )}
              <div className={`
                max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm
                ${isMine 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}
              `}>
                {m.content}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-slate-100 p-2 rounded-2xl">
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 py-2 outline-none"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
          />
          <button
            onClick={onSend}
            disabled={!connected || !draft.trim()}
            className={`p-3 rounded-xl transition-all ${
              connected && draft.trim() 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-slate-300 text-slate-100 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}