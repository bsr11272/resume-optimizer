'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function Result() {
  const [originalResume, setOriginalResume] = useState('');
  const [optimizedResume, setOptimizedResume] = useState('');
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Retrieve data from local storage
    const resumeContent = localStorage.getItem('resumeContent');
    const optimizedContent = localStorage.getItem('optimizedResume');
    
    if (!resumeContent || !optimizedContent) {
      alert('Missing resume data. Please start over.');
      router.push('/');
      return;
    }
    
    setOriginalResume(resumeContent);
    setOptimizedResume(optimizedContent);
  }, [router]);
  
  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      // Upload the optimized resume to Firebase first
      const storageRef = ref(storage, `optimized-resumes/${Date.now()}-optimized.tex`);
      await uploadString(storageRef, optimizedResume);
      
      // Create a download link
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(optimizedResume));
      element.setAttribute('download', 'optimized-resume.tex');
      
      element.style.display = 'none';
      document.body.appendChild(element);
      
      element.click();
      
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Failed to download your optimized resume. Please try again.');
    } finally {
      setDownloading(false);
    }
  };
  
  const handleStartOver = () => {
    // Clear local storage
    localStorage.removeItem('resumeContent');
    localStorage.removeItem('jobDescription');
    localStorage.removeItem('resumeUrl');
    localStorage.removeItem('optimizedResume');
    
    // Go back to home
    router.push('/');
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="z-10 max-w-6xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Your Optimized Resume</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Original Resume</h2>
            <div className="p-4 bg-gray-100 rounded overflow-auto h-96">
              <pre className="text-sm whitespace-pre-wrap">{originalResume}</pre>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold mb-4">Optimized Resume</h2>
            <div className="p-4 bg-gray-100 rounded overflow-auto h-96">
              <pre className="text-sm whitespace-pre-wrap">{optimizedResume}</pre>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {downloading ? 'Preparing Download...' : 'Download Optimized Resume'}
          </button>
          
          <button
            onClick={handleStartOver}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Optimize Another Resume
          </button>
        </div>
      </div>
    </main>
  );
}