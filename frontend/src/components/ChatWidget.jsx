import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PaperAirplaneIcon, ChatBubbleOvalLeftEllipsisIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

export default function ChatWidget({ initialOpen = false }) {
  const [open, setOpen] = useState(!!initialOpen);
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activePeer, setActivePeer] = useState(null); // { id, role }
  const [input, setInput] = useState('');
  const pollRef = useRef(null);
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState({ id: null, role: null });
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatRole, setNewChatRole] = useState('student');
  const [newChatId, setNewChatId] = useState('');

  const fetchThreads = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages/threads', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch {}
  };

  const fetchUnread = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages/unread-count', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUnread(Number(data.unread || 0));
    } catch {}
  };

  const fetchConversation = async (peer) => {
    if (!peer) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/with/${encodeURIComponent(peer.other_role || peer.role)}/${encodeURIComponent(peer.other_id || peer.id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {}
  };

  useEffect(() => {
    // load my profile
    (async () => {
      try {
        const resp = await axios.get('/api/auth/profile');
        const user = resp.data?.user || {};
        setMe({ id: String(user.id || user.roll_no || user.username || ''), role: String(user.role || '') });
      } catch {}
    })();
    fetchUnread();
    if (!open) return;
    fetchThreads();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activePeer) fetchConversation(activePeer);
      else fetchThreads();
      fetchUnread();
    }, 5000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [open, activePeer]);

  const openThread = (t) => {
    const peer = { id: t.other_id, role: t.other_role };
    setActivePeer(peer);
    fetchConversation(peer);
    // mark read
    (async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fromId: peer.id }) });
        fetchUnread();
      } catch {}
    })();
  };

  const sendMessage = async () => {
    if (!activePeer || !input.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toId: activePeer.id, toRole: activePeer.role, content: input.trim() })
      });
      setInput('');
      fetchConversation(activePeer);
    } catch {}
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6">
        <button
          className="relative rounded-full bg-primary-600 text-white p-4 shadow-lg hover:bg-primary-700"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open chat"
        >
          {open ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>
          )}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-96 max-h-[70vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-gray-800 bg-gray-50 flex items-center justify-between">
            <span>Messages</span>
            <button className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700" onClick={() => { setNewChatOpen((v)=>!v); }}>
              <PlusIcon className="h-4 w-4"/> New Chat
            </button>
          </div>
          <div className="flex flex-1 min-h-0">
            <div className="w-40 border-r overflow-y-auto">
              {threads.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No conversations</div>
              ) : (
                threads.map((t, i) => (
                  <button key={i} onClick={() => openThread(t)} className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${activePeer && activePeer.id === t.other_id && activePeer.role === t.other_role ? 'bg-gray-100' : ''}`}>
                    <div className="text-sm font-medium text-gray-800">{t.other_role} #{t.other_id}</div>
                    <div className="text-xs text-gray-500 truncate">{t.content}</div>
                  </button>
                ))
              )}
            </div>
            <div className="flex-1 flex flex-col">
              {newChatOpen && (
                <div className="border-b p-3 flex items-center gap-2 bg-gray-50">
                  <select value={newChatRole} onChange={(e)=>setNewChatRole(e.target.value)} className="border rounded px-2 py-1 text-sm">
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="hod">hod</option>
                    <option value="principal">principal</option>
                  </select>
                  <input value={newChatId} onChange={(e)=>setNewChatId(e.target.value)} placeholder="Recipient ID (roll/username)" className="flex-1 border rounded px-2 py-1 text-sm" />
                  <button className="text-xs px-2 py-1 bg-primary-600 text-white rounded" onClick={() => {
                    if (!newChatId.trim()) return;
                    const peer = { id: newChatId.trim(), role: newChatRole };
                    setActivePeer(peer);
                    setNewChatOpen(false);
                    fetchConversation(peer);
                  }}>Start</button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-500">Select a conversation</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`text-sm ${String(m.sender_id) === String(me.id) ? 'text-right' : 'text-left'}`}>
                      <div className="text-gray-500 mb-1">{m.sender_role} #{m.sender_id} • {new Date(m.created_at).toLocaleString()}</div>
                      <div className={`inline-block px-3 py-2 rounded-lg ${String(m.sender_id) === String(me.id) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t p-2 flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder={activePeer ? `Message ${activePeer.role} #${activePeer.id}` : 'Select a conversation'}
                  className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button onClick={sendMessage} className="bg-primary-600 hover:bg-primary-700 text-white rounded px-3 py-2 text-sm flex items-center gap-1">
                  <PaperAirplaneIcon className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


