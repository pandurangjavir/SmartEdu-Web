import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const VoiceChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [chatbotResponse, setChatbotResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Initialize Web Speech API for speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Speech recognition is supported
      console.log('Speech recognition is supported');
    } else {
      console.log('Speech recognition is not supported');
    }
  }, []);

  // Start voice recording
  const startRecording = async () => {
    try {
      // Check if getUserMedia is supported
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
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        toast.error('MediaRecorder is not supported in this browser');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        processAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      toast.success('Recording started');

    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.');
      } else {
        toast.error('Error accessing microphone. Please check permissions.');
      }
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  // Process audio blob and send to backend
  const processAudioBlob = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setTranscribedText(result.transcribedText);
        setChatbotResponse(result.chatbotResponse);
        
        // Play the response if it's audio
        if (result.chatbotResponse && result.chatbotResponse.length > 0) {
          speakResponse(result.chatbotResponse[0].text);
        }
      } else {
        toast.error('Error processing voice message');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Error processing voice message');
    } finally {
      setIsProcessing(false);
    }
  };

  // Text-to-Speech for chatbot response
  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  // Play recorded audio
  const playRecordedAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setTranscribedText('');
    setChatbotResponse('');
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Voice Chat Assistant
        </h1>
        
        {/* Voice Recording Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`p-4 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors duration-200 disabled:opacity-50`}
            >
              {isRecording ? (
                <StopIcon className="h-8 w-8" />
              ) : (
                <MicrophoneIcon className="h-8 w-8" />
              )}
            </button>
            
            <button
              onClick={playRecordedAudio}
              disabled={!audioUrl}
              className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors duration-200 disabled:opacity-50"
            >
              <SpeakerWaveIcon className="h-8 w-8" />
            </button>
          </div>
          
          <p className="text-gray-600">
            {isRecording ? 'Recording... Click stop when finished' : 
             'Click the microphone to start recording'}
          </p>
          
          {isProcessing && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Processing your voice message...</p>
            </div>
          )}
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="mb-6">
            <audio ref={audioRef} controls className="w-full">
              <source src={audioUrl} type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Conversation Display */}
        {(transcribedText || chatbotResponse) && (
          <div className="space-y-4 mb-6">
            {transcribedText && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">You said:</h3>
                <p className="text-blue-800">{transcribedText}</p>
              </div>
            )}
            
            {chatbotResponse && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Assistant:</h3>
                <p className="text-green-800">{chatbotResponse[0]?.text}</p>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={clearConversation}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            Clear Conversation
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How to use Voice Chat:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Click the microphone button to start recording</li>
            <li>• Speak your question or request clearly</li>
            <li>• Click the stop button when finished</li>
            <li>• The system will transcribe and respond to your message</li>
            <li>• You can play back your recorded message</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
