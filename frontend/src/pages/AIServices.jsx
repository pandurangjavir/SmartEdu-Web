import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  DocumentTextIcon, 
  QuestionMarkCircleIcon, 
  ArrowDownTrayIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const AIServices = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notes');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [fileName, setFileName] = useState('');

  const [formData, setFormData] = useState({
    content: '',
    file: null,
    numQuestions: 5,
    subject: 'general'
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        file: file
      });
      setFileName(file.name);
      
      // Auto-read text files
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData(prev => ({
            ...prev,
            content: e.target.result
          }));
        };
        reader.readAsText(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');

    try {
      let response;
      const formDataToSend = new FormData();

      if (formData.file) {
        formDataToSend.append('file', formData.file);
      }
      
      if (formData.content) {
        formDataToSend.append('content', formData.content);
      }

      switch (activeTab) {
        case 'notes':
          response = await axios.post('/api/ai/notes', formDataToSend);
          setResult(response.data.notes);
          break;
        case 'quiz':
          formDataToSend.append('num_questions', formData.numQuestions);
          response = await axios.post('/api/ai/quiz', formDataToSend);
          setResult(JSON.stringify(response.data.questions, null, 2));
          break;
        default:
          break;
      }

      toast.success('AI service completed successfully!');
    } catch (error) {
      toast.error('Failed to process request');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_result.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('File downloaded!');
  };

  const clearForm = () => {
    setFormData({
      content: '',
      file: null,
      numQuestions: 5,
      subject: 'general'
    });
    setFileName('');
    setResult('');
  };

  const tabs = [
    {
      id: 'notes',
      name: 'Notes Generator',
      icon: DocumentTextIcon,
      description: 'Generate comprehensive notes from content'
    },
    {
      id: 'quiz',
      name: 'Quiz Generator',
      icon: QuestionMarkCircleIcon,
      description: 'Create quiz questions from content'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Services</h1>
        <p className="text-gray-600 mt-2">
          Leverage AI to enhance your learning experience
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  clearForm();
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 inline mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab content */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {tabs.find(tab => tab.id === activeTab)?.name}
              </h3>
              <p className="text-gray-600">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload File (PDF, DOCX, DOC, TXT)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {fileName && (
                  <p className="mt-1 text-sm text-gray-500">Selected: {fileName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Or paste content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  rows="6"
                  placeholder="Paste your content here..."
                />
              </div>

              {activeTab === 'quiz' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.numQuestions}
                    onChange={(e) => setFormData({...formData, numQuestions: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || (!formData.content && !formData.file)}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Generate'}
                </button>
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>

            {/* Result */}
            {result && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-medium text-gray-900">Result</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={downloadResult}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{result}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIServices; 