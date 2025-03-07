'use client';

import { useState, useRef, useEffect } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadString } from 'firebase/storage';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'file' | 'resume' | 'job';
  filename?: string;
  fileContent?: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help optimize your resume for a specific job. Please upload your LaTeX resume and share the job description.',
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const content = event.target.result as string;
        setResumeContent(content);
        
        // Add user message about file upload
        const userMessage: Message = {
          role: 'user',
          content: `I've uploaded my resume: ${file.name}`,
          type: 'file',
          filename: file.name,
          fileContent: content
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Get AI response to file upload
        await getAIResponse([...messages, userMessage], content, jobDescription);
      }
    };
    reader.readAsText(file);
  };

  const getAIResponse = async (currentMessages: Message[], resume: string, job: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages,
          resumeText: resume,
          jobDescription: job,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error during chat response');
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        type: 'text'
      }]);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        type: 'text'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage('');
    
    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      type: 'text'
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    // If this is a job description and we don't have one yet, save it
    if (!jobDescription && resumeContent) {
      setJobDescription(userMessage);
    }
    
    // Check if this is an optimization request
    if (resumeContent && (userMessage.toLowerCase().includes('optimize') || 
        userMessage.toLowerCase().includes('yes') || 
        userMessage.toLowerCase().includes('proceed'))) {
      await optimizeResume();
    } else {
      // Otherwise get a regular AI response
      await getAIResponse([...messages, newUserMessage], resumeContent, jobDescription);
    }
  };

  const optimizeResume = async () => {
    setIsLoading(true);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'I\'m optimizing your resume now. This may take a minute...',
      type: 'text'
    }]);

    try {
      // Save the original resume to Firebase Storage
      const storageRef = ref(storage, `resumes/${Date.now()}-resume.tex`);
      await uploadString(storageRef, resumeContent);
      // const resumeUrl = await getDownloadURL(storageRef);

      // Call the optimization API
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: resumeContent,
          jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize resume');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error during optimization');
      }

      // Store optimized resume in local storage and add to chat
      localStorage.setItem('originalResume', resumeContent);
      localStorage.setItem('optimizedResume', data.optimizedResume);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'ve optimized your resume! Here\'s the optimized version:',
        type: 'text'
      }, {
        role: 'assistant',
        content: data.optimizedResume,
        type: 'resume'
      }]);

      // Get AI response about the optimization
      const optimizationMessages: Message[] = [
        ...messages, 
        {
          role: 'user',
          content: 'What improvements did you make to my resume?',
          type: 'text'
        }
      ];
      
      await getAIResponse(
        optimizationMessages, 
        resumeContent, 
        jobDescription
      );

    } catch (error) {
      console.error('Error optimizing resume:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'There was an error optimizing your resume. Please try again.',
        type: 'text'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadOptimizedResume = () => {
    const optimizedResume = localStorage.getItem('optimizedResume');
    if (!optimizedResume) return;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(optimizedResume));
    element.setAttribute('download', 'optimized-resume.tex');
    
    element.style.display = 'none';
    document.body.appendChild(element);
    
    element.click();
    
    document.body.removeChild(element);
  };

  const startOver = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hello! I can help optimize your resume for a specific job. Please upload your LaTeX resume and share the job description.',
      type: 'text'
    }]);
    setResumeContent('');
    setJobDescription('');
    localStorage.removeItem('originalResume');
    localStorage.removeItem('optimizedResume');
  };

  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header with enhanced design */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 py-4 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Resume Optimizer</h1>
          </div>
          <button 
            onClick={startOver}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md transition-colors duration-300 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Start Over
          </button>
        </div>
      </header>
      
      {/* Progress indicator - shows if resume and job description are provided */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto py-3 px-6">
          <div className="flex items-center space-x-6">
            <div className={`flex items-center ${resumeContent ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${resumeContent ? 'bg-green-100' : 'bg-gray-100'}`}>
                {resumeContent ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>1</span>
                )}
              </div>
              <span className={`text-sm ${resumeContent ? 'font-medium' : ''}`}>Resume Uploaded</span>
            </div>
            
            <div className="text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className={`flex items-center ${jobDescription ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${jobDescription ? 'bg-green-100' : 'bg-gray-100'}`}>
                {jobDescription ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>2</span>
                )}
              </div>
              <span className={`text-sm ${jobDescription ? 'font-medium' : ''}`}>Job Description Added</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                    : 'bg-white border border-gray-100 text-gray-800'
                }`}
              >
                {message.type === 'file' && (
                  <div className="mb-2 flex items-center text-sm opacity-90">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {message.filename}
                  </div>
                )}
                
                {message.type === 'resume' ? (
                  <div>
                    <div className="bg-gray-50 p-4 rounded-md text-gray-800 text-sm overflow-auto max-h-60 mb-3 border border-gray-200">
                      <pre className="whitespace-pre-wrap break-words font-mono">{message.content}</pre>
                    </div>
                    <button
                      onClick={downloadOptimizedResume}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors duration-300 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Optimized Resume
                    </button>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}

                {/* Timestamp for messages */}
                <div className={`text-xs mt-1 text-right ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input area */}
      <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="file"
              accept=".tex"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              type="button"
              onClick={triggerFileUpload}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-md transition-colors duration-300"
              title="Upload resume"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message or paste job description..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md transition-colors duration-300 flex items-center font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading || !inputMessage.trim()}
            >
              <span className="mr-1">Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer with info */}
      <footer className="bg-gray-50 border-t border-gray-200 py-3 text-center text-sm text-gray-500">
        <div className="max-w-4xl mx-auto px-6">
          Resume Optimizer uses AI to help tailor your resume for specific job descriptions
        </div>
      </footer>
    </main>
  );
}