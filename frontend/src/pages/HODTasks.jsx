import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MegaphoneIcon, ClipboardDocumentListIcon, TrashIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';

const Select = (props) => (
  <select {...props} className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 ${props.className || ''}`}/>
);
const Input = (props) => (
  <input {...props} className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 ${props.className || ''}`} />
);
const Textarea = (props) => (
  <textarea {...props} className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 ${props.className || ''}`} />
);
const Button = ({ variant = 'primary', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center px-3 py-2 rounded text-sm font-medium transition-colors';
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return <button {...props} className={`${base} ${variants[variant]} ${className}`} />;
};

const HODTasks = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ id: null, title: '', body: '', type: 'general', target_audience: 'all', target_year: 'all', is_active: true });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/announcements');
      setAnnouncements(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const upsert = async (e) => {
    e.preventDefault();
    try {
      const payload = { title: form.title, body: form.body, type: form.type, target_audience: form.target_audience, target_year: form.target_year, is_active: form.is_active };
      if (form.id) await axios.put(`/api/announcements/${form.id}`, payload);
      else await axios.post('/api/announcements', payload);
      setForm({ id: null, title: '', body: '', type: 'general', target_audience: 'all', target_year: 'all', is_active: true });
      await load();
    } catch (e) { console.error(e); }
  };

  const edit = (a) => setForm({ id: a.id, title: a.title || a.message || '', body: a.message || a.body || '', type: a.type || 'general', target_audience: a.target_audience || 'all', target_year: a.target_year || 'all', is_active: a.is_active !== false });
  const remove = async (id) => {
    // No delete endpoint for announcements; we can set is_active=false
    try {
      await axios.put(`/api/announcements/${id}`, { is_active: false });
      await load();
    } catch (e) { console.error(e); }
  };

  const rows = useMemo(() => announcements.map((a) => (
    <tr key={a.id} className="border-t">
      <td className="px-3 py-2 text-sm">{a.title}</td>
      <td className="px-3 py-2 text-sm">{a.type}</td>
      <td className="px-3 py-2 text-sm">{a.target_audience}</td>
      <td className="px-3 py-2 text-sm">{a.target_year}</td>
      <td className="px-3 py-2 text-sm">{a.is_active ? 'Active' : 'Inactive'}</td>
      <td className="px-3 py-2 text-sm text-right space-x-2">
        <Button variant="secondary" onClick={() => edit(a)}><PencilSquareIcon className="h-4 w-4 mr-1"/>Edit</Button>
        <Button variant="danger" onClick={() => remove(a.id)}><TrashIcon className="h-4 w-4 mr-1"/>Disable</Button>
      </td>
    </tr>
  )), [announcements]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Tasks & Notices</h1>
        <p className="text-primary-100 mt-1">Assign department tasks and publish notices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center"><MegaphoneIcon className="h-5 w-5 mr-2"/> Publish Notice</h2>
          </div>
          <form onSubmit={upsert} className="p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-sm text-gray-700">Title</span>
                <Input value={form.title} onChange={(e)=>setForm(v=>({ ...v, title: e.target.value }))} required/>
              </div>
              <div>
                <span className="text-sm text-gray-700">Type</span>
                <Select value={form.type} onChange={(e)=>setForm(v=>({ ...v, type: e.target.value }))}>
                  <option value="general">General</option>
                  <option value="exam">Exam</option>
                  <option value="event">Event</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-700">Body</span>
              <Textarea rows={5} value={form.body} onChange={(e)=>setForm(v=>({ ...v, body: e.target.value }))} required/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-sm text-gray-700">Audience</span>
                <Select value={form.target_audience} onChange={(e)=>setForm(v=>({ ...v, target_audience: e.target.value }))}>
                  <option value="all">All</option>
                  <option value="teachers">Teachers</option>
                  <option value="students">Students</option>
                </Select>
              </div>
              <div>
                <span className="text-sm text-gray-700">Year</span>
                <Select value={form.target_year} onChange={(e)=>setForm(v=>({ ...v, target_year: e.target.value }))}>
                  <option value="all">All</option>
                  <option value="SY">SY</option>
                  <option value="TY">TY</option>
                  <option value="BE">BE</option>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e)=>setForm(v=>({ ...v, is_active: e.target.checked }))}/>
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit"><PlusIcon className="h-4 w-4 mr-1"/>{form.id ? 'Update' : 'Publish'} Notice</Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center"><ClipboardDocumentListIcon className="h-5 w-5 mr-2"/> Notices</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Audience</th>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={6}>Loading...</td></tr>
                ) : rows.length ? rows : (
                  <tr><td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={6}>No notices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HODTasks; 