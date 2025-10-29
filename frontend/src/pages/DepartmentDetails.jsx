import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const DepartmentDetails = () => {
  const { branch } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ teachers: 0, students: 0, attendance: null, result: null });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [year, setYear] = useState('SY');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [tRes, sRes, aRes, attRes, resRes] = await Promise.allSettled([
          axios.get(`/api/principal/teachers/${branch}`),
          axios.get(`/api/principal/students/${branch}/${year}`),
          axios.get('/api/principal/announcements'),
          axios.get(`/api/principal/attendance/${branch}`, { params: { year } }),
          axios.get(`/api/principal/results/${branch}`, { params: { year } })
        ]);

        const teachersData = tRes.status === 'fulfilled' ? (tRes.value.data || []) : [];
        const studentsData = sRes.status === 'fulfilled' ? (sRes.value.data || []) : [];
        const announcementsData = aRes.status === 'fulfilled' ? (aRes.value.data || []) : [];
        const attendanceData = attRes.status === 'fulfilled' ? attRes.value.data : {};
        const resultsData = resRes.status === 'fulfilled' ? resRes.value.data : {};

        setTeachers(teachersData);
        setStudents(studentsData);
        setAnnouncements(announcementsData.filter(x => (x.source||'').toUpperCase() === (branch||'').toUpperCase()).slice(0, 10));
        setSummary({
          teachers: Array.isArray(teachersData) ? teachersData.length : 0,
          students: Array.isArray(studentsData) ? studentsData.length : 0,
          attendance: attendanceData?.average_attendance ?? null,
          result: resultsData?.average_result ?? null
        });
      } catch (e) {
        console.error('Error loading department details:', e);
        setError('Failed to load department details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [branch, year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{branch} Department Details</h1>
          <p className="text-gray-600">Overview and drill-downs by branch</p>
        </div>
        <Link to="/principal" className="text-sm text-primary-600 hover:text-primary-700">← Back to Dashboard</Link>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded p-3">
            <p className="text-xs text-gray-600">Teachers</p>
            <p className="text-xl font-semibold">{summary.teachers}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-gray-600">Students</p>
            <p className="text-xl font-semibold">{summary.students}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-gray-600">Avg Attendance</p>
            <p className="text-xl font-semibold">{summary.attendance == null ? '—' : `${Math.round(summary.attendance)}%`}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-gray-600">Avg Result</p>
            <p className="text-xl font-semibold">{summary.result == null ? '—' : `${Math.round(summary.result)}%`}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <p className="text-sm text-gray-600">Update year and semester for metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={year} onChange={(e)=>setYear(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="SY">SY</option>
              <option value="TY">TY</option>
              <option value="BE">BE</option>
            </select>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded">
            <div className="p-3 border-b">
              <h3 className="font-medium">Teachers</h3>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {(teachers || []).length > 0 ? teachers.map(t => (
                    <tr key={t.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">{t.id}</td>
                      <td className="px-3 py-2 text-sm">{t.name}</td>
                      <td className="px-3 py-2 text-sm">{t.email}</td>
                      <td className="px-3 py-2 text-sm">{t.subject || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-3 py-8 text-center text-gray-500">No teachers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="border rounded">
            <div className="p-3 border-b">
              <h3 className="font-medium">Students</h3>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2">Roll No</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {(students || []).length > 0 ? students.map(s => (
                    <tr key={s.roll_no} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">{s.roll_no}</td>
                      <td className="px-3 py-2 text-sm">{s.name}</td>
                      <td className="px-3 py-2 text-sm">{s.email || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="px-3 py-8 text-center text-gray-500">No students found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-3 border-b">
          <h3 className="font-medium">Recent Announcements</h3>
        </div>
        <div className="divide-y">
          {(announcements || []).length > 0 ? announcements.map(a => (
            <div key={`${a.source}-${a.id}`} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-sm text-gray-600">{a.message}</p>
                </div>
                <span className="text-xs text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
          )) : (
            <div className="p-6 text-center text-gray-500">No announcements</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetails;


