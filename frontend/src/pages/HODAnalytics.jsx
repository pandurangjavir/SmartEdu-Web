import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const YEARS = ['SY', 'TY', 'BE'];

const Card = ({ title, value, subtitle }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className="text-2xl font-semibold text-gray-900">{value}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

const HODAnalytics = () => {
  const { user } = useAuth();
  const [year, setYear] = useState('SY');
  const [semester, setSemester] = useState('1');
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const currentBranch = (user?.branch || 'CSE');
      const [att, mk] = await Promise.all([
        axios.get(`/api/hod/attendance/${currentBranch}/${year}`),
        axios.get(`/api/hod/marks/${currentBranch}/${year}`),
      ]);
      setAttendance(att.data || []);
      setMarks(mk.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.branch, year]);

  const attendanceSummary = useMemo(() => {
    if (!attendance.length) return { avg: 0, low: 0 };
    const avg = attendance.reduce((s,a)=> s + (a.total_percentage || 0), 0) / attendance.length;
    const low = attendance.filter(a => (a.total_percentage || 0) < 75).length;
    return { avg: Math.round(avg), low };
  }, [attendance]);

  const marksSummary = useMemo(() => {
    if (!marks.length) return { avg: 0, top: 0 };
    const avg = marks.reduce((s,m)=> s + (m.total_percentage || 0), 0) / marks.length;
    const top = marks.filter(m => (m.total_percentage || 0) >= 85).length;
    return { avg: Math.round(avg), top };
  }, [marks]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Department Analytics</h1>
        <p className="text-primary-100 mt-1">Attendance, results, and chatbot usage</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center"><ChartBarIcon className="h-5 w-5 mr-2"/> Overview</h2>
          <div className="space-x-2">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={`px-3 py-1.5 rounded text-sm ${year===y ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}>{y}</button>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Avg Attendance %" value={`${attendanceSummary.avg}%`} subtitle={`Below 75%: ${attendanceSummary.low}`} />
            <Card title="Avg Result %" value={`${marksSummary.avg}%`} subtitle={`Top performers: ${marksSummary.top}`} />
            <Card title="Attendance Records" value={attendance.length} />
            <Card title="Marks Records" value={marks.length} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Attendance %</th>
                  <th className="px-3 py-2">Result %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={3}>Loading...</td></tr>
                ) : (
                  (attendance || []).slice(0, 20).map((a, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2 text-sm">{a.student_id || a.roll_no}</td>
                      <td className="px-3 py-2 text-sm">{Math.round(a.total_percentage || 0)}%</td>
                      <td className="px-3 py-2 text-sm">{Math.round((marks[idx]?.total_percentage) || 0)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HODAnalytics; 