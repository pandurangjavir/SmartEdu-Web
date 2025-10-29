import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { MagnifyingGlassIcon, PaperAirplaneIcon, PlusIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

export default function Messages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activePeer, setActivePeer] = useState(null); // { id, role }
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [newRole, setNewRole] = useState('teacher');
  const [newId, setNewId] = useState('');
  const [directory, setDirectory] = useState({ teachers: [], students: [], hod: [], principal: [] });
  const [filterRole, setFilterRole] = useState('all'); // all|teacher|student|hod|principal
  const pollRef = useRef(null);

  const tokenHeader = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }), []);

  const loadThreads = async () => {
    try {
      const res = await fetch('/api/messages/threads', { headers: tokenHeader });
      const data = await res.json();
      setThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch {}
  };

  const loadDirectory = async () => {
    try {
      const res = await fetch('/api/messages/directory', { headers: tokenHeader });
      const data = await res.json();
      setDirectory({
        teachers: data.directory?.teachers || [],
        students: data.directory?.students || [],
        hod: data.directory?.hod || [],
        principal: data.directory?.principal || []
      });
    } catch {}
  };

  const loadConversation = async (peer) => {
    if (!peer) return;
    try {
      const res = await fetch(`/api/messages/with/${encodeURIComponent(peer.role)}/${encodeURIComponent(peer.id)}`, { headers: tokenHeader });
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {}
  };

  const openPeer = async (peer) => {
    setActivePeer(peer);
    await loadConversation(peer);
    try {
      await fetch('/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json', ...tokenHeader }, body: JSON.stringify({ fromId: peer.id }) });
    } catch {}
  };

  const send = async () => {
    if (!activePeer || !input.trim()) return;
    try {
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...tokenHeader }, body: JSON.stringify({ toId: activePeer.id, toRole: activePeer.role, content: input.trim() }) });
      setInput('');
      await loadConversation(activePeer);
    } catch {}
  };

  useEffect(() => {
    loadThreads();
    loadDirectory();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activePeer) loadConversation(activePeer);
      else loadThreads();
    }, 4000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [activePeer]);

  const filteredThreads = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => `${t.other_role} ${t.other_id} ${t.content}`.toLowerCase().includes(q));
  }, [threads, search]);

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-lg shadow overflow-hidden flex">
      {/* Left: Threads */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2 top-2" />
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search or start a new chat" className="w-full pl-7 pr-2 py-1.5 border rounded text-sm" />
          </div>
          <select value={filterRole} onChange={(e)=>setFilterRole(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="all">All</option>
            <option value="teacher">Teachers</option>
            <option value="student">Students</option>
            <option value="hod">HOD</option>
            <option value="principal">Principal</option>
          </select>
        </div>
        <div className="p-0 border-b bg-gray-50">
          <div className="p-3 grid grid-cols-2 gap-3">
            {(filterRole === 'all' || filterRole === 'teacher') && (
              <div className="border rounded">
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 border-b">Teachers</div>
                <div className="max-h-44 overflow-y-auto p-1 space-y-1">
                  {directory.teachers.map((p, i) => (
                    <button key={`t-${i}`} onClick={() => openPeer({ id: p.id, role: p.role })} className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm">{p.name}</button>
                  ))}
                </div>
              </div>
            )}
            {(filterRole === 'all' || filterRole === 'student') && (
              <div className="border rounded">
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 border-b">Students</div>
                <div className="max-h-44 overflow-y-auto p-1 space-y-1">
                  {directory.students.map((p, i) => (
                    <button key={`s-${i}`} onClick={() => openPeer({ id: p.id, role: p.role })} className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm">{p.name} • {p.id}</button>
                  ))}
                </div>
              </div>
            )}
            {(filterRole === 'all' || filterRole === 'hod') && (
              <div className="border rounded">
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 border-b">HOD</div>
                <div className="p-1 space-y-1">
                  {directory.hod.map((p, i) => (
                    <button key={`h-${i}`} onClick={() => openPeer({ id: p.id, role: p.role })} className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm">{p.name}</button>
                  ))}
                </div>
              </div>
            )}
            {(filterRole === 'all' || filterRole === 'principal') && (
              <div className="border rounded">
                <div className="px-2 py-1 text-xs font-semibold text-gray-600 border-b">Principal</div>
                <div className="p-1 space-y-1">
                  {directory.principal.map((p, i) => (
                    <button key={`p-${i}`} onClick={() => openPeer({ id: p.id, role: p.role })} className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm">{p.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No conversations</div>
          ) : (
            filteredThreads.map((t, i) => (
              <button key={i} onClick={() => openPeer({ id: t.other_id, role: t.other_role })} className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${activePeer && activePeer.id === t.other_id && activePeer.role === t.other_role ? 'bg-gray-50' : ''}`}>
                <div className="text-sm font-medium text-gray-900">{t.other_role} #{t.other_id}</div>
                <div className="text-xs text-gray-500 truncate">{t.content}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Conversation */}
      <div className="flex-1 flex flex-col" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'32\' height=\'32\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 32V.5h31.5V32z\' fill=\'%23f7f7f7\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23ffffff\'/%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23p)\' opacity=\'1\'/%3E%3C/svg%3E")' }}>
        <div className="border-b p-3">
          <div className="text-sm text-gray-700">{activePeer ? `${activePeer.role} #${activePeer.id}` : 'Select a conversation'}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((m) => {
            const mine = String(m.sender_id) === String(user?.id || user?.roll_no || user?.username);
            return (
              <div key={m.id} className={`text-sm ${mine ? 'text-right' : 'text-left'}`}>
                <div className="text-gray-500 mb-1">{m.sender_role} #{m.sender_id} • {new Date(m.created_at).toLocaleString()}</div>
                <div className={`inline-block max-w-[70%] px-3 py-2 rounded-lg ${mine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
              </div>
            );
          })}
        </div>
        <div className="border-t p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e)=>{ if (e.key === 'Enter') send(); }}
            placeholder={activePeer ? `Message ${activePeer.role} #${activePeer.id}` : 'Select a conversation or start a new one'}
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button onClick={send} className="bg-primary-600 hover:bg-primary-700 text-white rounded px-3 py-2 text-sm inline-flex items-center gap-1">
            <PaperAirplaneIcon className="h-4 w-4"/> Send
          </button>
        </div>
      </div>


    </div>
  );
}


