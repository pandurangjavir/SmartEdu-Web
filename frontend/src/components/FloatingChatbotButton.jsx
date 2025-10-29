import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';

export default function FloatingChatbotButton() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const goChatbot = () => {
    if (location.pathname !== '/chatbot') navigate('/chatbot');
  };
  
  // Hide the button when on chatbot page
  if (location.pathname === '/chatbot') {
    return null;
  }
  
  return (
    <button
      className="fixed bottom-6 right-6 rounded-full bg-primary-600 text-white p-4 shadow-lg hover:bg-primary-700 transition-all duration-300"
      onClick={goChatbot}
      aria-label="Open chatbot"
    >
      <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
    </button>
  );
}


