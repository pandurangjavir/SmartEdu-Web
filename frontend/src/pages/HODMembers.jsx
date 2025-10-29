import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { UsersIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const YEAR_OPTIONS = ['SY', 'TY', 'Final'];
const BRANCHES = ['CSE', 'ENTC', 'CIVIL', 'MECH', 'ELECTRICAL'];

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const Input = (props) => (
  <input {...props} className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 ${props.className || ''}`} />
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

const HODMembers = () => {
  const { user } = useAuth();

  // Students
  const [year, setYear] = useState('SY');
  const [students, setStudents] = useState([]);
  const [studentForm, setStudentForm] = useState({ roll_no: '', name: '', email: '', contact: '', username: '', admission_year: '' });
  const [studentEdit, setStudentEdit] = useState(null); // roll_no for edit
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [year]);

  const loadStudents = async () => {
    try {
      setStudentLoading(true);
      const currentBranch = (user?.branch || 'CSE');
      const { data } = await axios.get(`/api/hod/students/${currentBranch}/${year}`);
      setStudents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setStudentLoading(false);
    }
  };

  const upsertStudent = async (e) => {
    e.preventDefault();
    try {
      if (studentEdit) {
        const currentBranch = (user?.branch || 'CSE');
        await axios.put(`/api/hod/students/${currentBranch}/${year}/${studentEdit}`, studentForm);
      } else {
        const currentBranch = (user?.branch || 'CSE');
        await axios.post(`/api/hod/students/${currentBranch}/${year}`, studentForm);
      }
      setStudentForm({ roll_no: '', name: '', email: '', contact: '', username: '', admission_year: '' });
      setStudentEdit(null);
      await loadStudents();
    } catch (e) {
      console.error(e);
    }
  };

  const editStudent = (s) => {
    setStudentEdit(s.roll_no);
    setStudentForm({ roll_no: s.roll_no || '', name: s.name || '', email: s.email || '', contact: s.contact || '', username: s.username || '', admission_year: s.admission_year || '' });
  };
  const deleteStudent = async (rollNo) => {
    if (!confirm('Delete this student?')) return;
    try {
      const currentBranch = (user?.branch || 'CSE');
      await axios.delete(`/api/hod/students/${currentBranch}/${year}/${rollNo}`);
      await loadStudents();
    } catch (e) { console.error(e); }
  };

  const studentRows = useMemo(() => students.map((s) => (
    <tr key={s.roll_no} className="border-t">
      <td className="px-3 py-2 text-sm">{s.roll_no}</td>
      <td className="px-3 py-2 text-sm">{s.name}</td>
      <td className="px-3 py-2 text-sm">{s.email}</td>
      <td className="px-3 py-2 text-sm">{s.contact}</td>
      <td className="px-3 py-2 text-sm">{s.username}</td>
      <td className="px-3 py-2 text-sm">{s.admission_year}</td>
      <td className="px-3 py-2 text-sm text-right space-x-2">
        <Button variant="secondary" onClick={() => editStudent(s)}><PencilSquareIcon className="h-4 w-4 mr-1"/>Edit</Button>
        <Button variant="danger" onClick={() => deleteStudent(s.roll_no)}><TrashIcon className="h-4 w-4 mr-1"/>Delete</Button>
      </td>
    </tr>
  )), [students]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <p className="text-primary-100 mt-1">Manage students in your department</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center"><UsersIcon className="h-5 w-5 mr-2"/> Students</h2>
        </div>

        {/* Students */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-x-2">
              {YEAR_OPTIONS.map((y) => (
                <button key={y} onClick={() => setYear(y)} className={`px-3 py-1.5 rounded text-sm ${year===y ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}>{y}</button>
              ))}
            </div>
          </div>

          <form onSubmit={upsertStudent} className="grid grid-cols-1 md:grid-cols-7 gap-3 bg-gray-50 p-4 rounded">
            {!studentEdit && <Field label="Roll No"><Input value={studentForm.roll_no} onChange={(e)=>setStudentForm(v=>({ ...v, roll_no: e.target.value }))} required /></Field>}
            <Field label="Name"><Input value={studentForm.name} onChange={(e)=>setStudentForm(v=>({ ...v, name: e.target.value }))} required /></Field>
            <Field label="Email"><Input type="email" value={studentForm.email} onChange={(e)=>setStudentForm(v=>({ ...v, email: e.target.value }))} /></Field>
            <Field label="Contact"><Input value={studentForm.contact} onChange={(e)=>setStudentForm(v=>({ ...v, contact: e.target.value }))} /></Field>
            <Field label="Username"><Input value={studentForm.username} onChange={(e)=>setStudentForm(v=>({ ...v, username: e.target.value }))} required /></Field>
            <Field label="Admission Year"><Input value={studentForm.admission_year} onChange={(e)=>setStudentForm(v=>({ ...v, admission_year: e.target.value }))} /></Field>
            <div className="flex items-end"><Button type="submit"><PlusIcon className="h-4 w-4 mr-1"/>{studentEdit ? 'Update' : 'Add'} Student</Button></div>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Roll No</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Admission Year</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentLoading ? (
                  <tr><td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={7}>Loading...</td></tr>
                ) : studentRows.length ? studentRows : (
                  <tr><td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={7}>No students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HODMembers; 