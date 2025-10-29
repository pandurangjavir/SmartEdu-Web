import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  PaperAirplaneIcon, 
  MicrophoneIcon, 
  StopIcon,
  TrashIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/chatbot', {
        message: messageToSend,
        user_id: user?.user_id || 1
      });

      const aiMessage = {
        id: Date.now() + 1,
        content: response.data.response,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        sentiment: response.data.sentiment,
        intent: response.data.intent,
        confidence: response.data.confidence
      };

      const updates = [aiMessage];
      if (response.data.table) {
        updates.push({
          id: Date.now() + 2,
          sender: 'ai',
          type: 'table',
          table: response.data.table,
          timestamp: new Date().toISOString()
        });
      }
      if (Array.isArray(response.data.tables)) {
        response.data.tables.forEach((tbl, idx) => {
          updates.push({
            id: Date.now() + 3 + idx,
            sender: 'ai',
            type: 'table',
            table: tbl,
            timestamp: new Date().toISOString()
          });
        });
      }

      setMessages(prev => [...prev, ...updates]);
      toast.success('Message sent successfully!');
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      // Check if browser supports media recording
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Voice recording is not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Check if the recording has content
          if (audioBlob.size < 1000) {
            toast.error('Recording too short. Please try again.');
            return;
          }
          
          await sendVoiceMessage(audioBlob);
        } catch (error) {
          console.error('Error processing recording:', error);
          toast.error('Failed to process recording');
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording failed. Please try again.');
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success('Recording started... Speak now!');
    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error('Failed to start recording: ' + error.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.wav');
    formData.append('user_id', user?.user_id || '');
    formData.append('student_id', user?.student_id || '');

    setLoading(true);

    try {
      const response = await axios.post('/api/chatbot/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Get the recognized text from the response
      const recognizedText = response.data.response || 'Voice message received';
      
      const userMessage = {
        id: Date.now(),
        content: `🎤 ${recognizedText}`,
        sender: 'user',
        timestamp: new Date().toISOString()
      };

      const aiMessage = {
        id: Date.now() + 1,
        content: response.data.response,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        audioResponse: response.data.audio_response || false,
        audioData: response.data.audio_data || null
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Play audio response if available
      if (response.data.audio_response && response.data.audio_data) {
        playAudioResponse(response.data.audio_data);
      }
      
      toast.success('Voice message processed!');
    } catch (error) {
      console.error('Voice processing error:', error);
      
      // Provide specific error messages
      let errorMessage = 'Failed to process voice message';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // Add error message to chat
      const errorMsg = {
        id: Date.now(),
        content: `❌ Voice processing failed: ${errorMessage}`,
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const playAudioResponse = (audioDataHex) => {
    try {
      // Convert hex string back to binary
      const audioData = new Uint8Array(audioDataHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      
      // Create blob from binary data
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      const audio = new Audio(audioUrl);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Could not play audio response');
      });
      
      // Clean up URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Error processing audio response:', error);
      toast.error('Could not process audio response');
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
    toast.success('Chat history cleared!');
  };

  const speakMessage = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      speechSynthesis.speak(utterance);
    } else {
      toast.error('Speech synthesis not supported');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">SmartEdu</span>
              <span className="text-gray-900">AI Assistant</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">Your intelligent academic companion</p>
          </div>
          <button
            onClick={clearChatHistory}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
          >
            <TrashIcon className="h-5 w-5" />
            <span className="font-medium">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-7xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <PaperAirplaneIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">Welcome to SmartEdu AI Assistant!</p>
            <p className="text-gray-600 max-w-md mx-auto">Ask me anything about your fees, attendance, marks, events, or announcements. I'm here to help!</p>
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">💰 Fees</p>
                <p className="text-sm text-gray-600">"Show my fees"</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">📈 Attendance</p>
                <p className="text-sm text-gray-600">"Show my attendance"</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">📊 Marks</p>
                <p className="text-sm text-gray-600">"Show my marks"</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">📅 Events</p>
                <p className="text-sm text-gray-600">"Show events"</p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'table' ? (
              <div className="bg-white text-gray-900 shadow-sm border border-gray-200 rounded-lg p-3 max-w-full overflow-x-auto">
                <p className="text-sm font-semibold mb-2">{message.table?.title || 'Table'}</p>
                <table className="min-w-[600px] table-auto border-collapse text-sm">
                  <thead>
                    <tr>
                      {message.table?.columns?.map((col) => (
                        <th key={col.key} className="border-b px-3 py-2 text-left font-medium text-gray-700">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {message.table?.rows?.map((row, idx) => (
                      <tr key={idx} className="odd:bg-gray-50">
                        {message.table.columns.map((col) => (
                          <td key={col.key} className="border-b px-3 py-2 whitespace-nowrap">{row[col.key] ?? '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs mt-2 text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</p>
              </div>
            ) : (
              <div
                className={`max-w-2xl px-5 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow-md border border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.sender === 'ai' && (
                    <button
                      onClick={() => {
                        if (message.audioResponse && message.audioData) {
                          playAudioResponse(message.audioData);
                        } else {
                          speakMessage(message.content);
                        }
                      }}
                      disabled={isPlaying}
                      className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-all"
                      title={message.audioResponse ? "Play audio response" : "Read aloud"}
                    >
                      <SpeakerWaveIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                {/* Sentiment Analysis Display */}
                {message.sender === 'ai' && message.sentiment && (
                  <div className="mt-2 flex items-center space-x-2 text-xs">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      message.sentiment.sentiment === 'positive' 
                        ? 'bg-green-100 text-green-800'
                        : message.sentiment.sentiment === 'negative'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.sentiment.sentiment} ({message.sentiment.polarity?.toFixed(2)})
                    </span>
                    {message.sentiment.has_empathetic_prefix && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        💙 Empathetic
                      </span>
                    )}
                    {message.intent && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {message.intent}
                      </span>
                    )}
                  </div>
                )}
                
                <p className={`text-xs mt-2 opacity-70 ${
                  message.sender === 'user' ? 'text-white' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 shadow-lg border border-gray-200 px-6 py-4 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about fees, attendance, marks, events..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                rows="1"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim()}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`px-5 py-3 rounded-xl focus:ring-2 transition-all shadow-lg hover:shadow-xl ${
                  isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' 
                    : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        
        {/* Voice recording indicator */}
        {isRecording && (
          <div className="mt-3 flex items-center justify-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-700">Recording... Click to stop</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot; 