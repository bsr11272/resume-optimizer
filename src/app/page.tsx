'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function Home() {
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setResumeContent(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Save the original resume to Firebase Storage
      const storageRef = ref(storage, `resumes/${Date.now()}-resume.tex`);
      await uploadString(storageRef, resumeContent);
      const resumeUrl = await getDownloadURL(storageRef);

      // Store data in local storage for the next page
      localStorage.setItem('resumeContent', resumeContent);
      localStorage.setItem('jobDescription', jobDescription);
      localStorage.setItem('resumeUrl', resumeUrl);

      // Navigate to the optimizing page
      router.push('/optimizing');
    } catch (error) {
      console.error('Error preparing optimization:', error);
      alert('There was an error uploading your resume. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Resume Optimizer</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lg mb-2">Upload LaTeX Resume:</label>
            <input 
              type="file" 
              accept=".tex"
              onChange={handleResumeUpload}
              className="w-full p-2 border rounded"
              required
            />
            {resumeContent && (
              <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto max-h-60">
                <pre className="text-sm">{resumeContent}</pre>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-lg mb-2">Job Description:</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-2 border rounded h-40"
              placeholder="Paste the job description here..."
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !resumeContent || !jobDescription}
            className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Preparing...' : 'Optimize Resume'}
          </button>
        </form>
      </div>
    </main>
  );
}