'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Optimizing() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const optimizeResume = async () => {
      try {
        // Get data from local storage
        const resumeContent = localStorage.getItem('resumeContent') || '';
        const jobDescription = localStorage.getItem('jobDescription') || '';
        
        if (!resumeContent || !jobDescription) {
          throw new Error('Missing resume or job description');
        }
        
        setProgress(25); // Starting optimization
        
        // Call our Next.js API route
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
        
        setProgress(75); // Almost done
        
        if (!response.ok) {
          throw new Error('Failed to optimize resume');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error during optimization');
        }
        
        // Store the optimized resume in local storage
        localStorage.setItem('optimizedResume', data.optimizedResume);
        
        setProgress(100); // Complete
        
        // Navigate to the results page
        router.push('/result');
      } catch (error) {
        console.error('Error optimizing resume:', error);
        alert('There was an error optimizing your resume. Please try again.');
        router.push('/'); // Go back to home
      }
    };
    
    optimizeResume();
  }, [router]);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">Optimizing Your Resume</h1>
        
        <div className="w-full max-w-md bg-gray-200 rounded-full h-4 mb-8">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <p className="text-lg">
          {progress < 25 && "Analyzing your resume..."}
          {progress >= 25 && progress < 75 && "Matching skills to job requirements..."}
          {progress >= 75 && progress < 100 && "Finalizing optimizations..."}
          {progress === 100 && "Optimization complete! Redirecting..."}
        </p>
      </div>
    </main>
  );
}