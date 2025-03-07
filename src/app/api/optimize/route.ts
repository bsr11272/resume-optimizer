// src/app/api/optimize/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Check if OpenAI API key is set
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('WARNING: OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function POST(request: Request) {
  try {
    console.log('Optimize API: Received request');
    const { resumeText, jobDescription } = await request.json();

    // Validate inputs
    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Both resume and job description are required' 
        },
        { status: 400 }
      );
    }

    console.log('Optimize API: Calling OpenAI for resume optimization');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: 'system',
          content: `You are a professional resume optimizer. Your task is to modify a LaTeX resume to better match a job description.
          
          Follow these guidelines:
          1. Identify keywords and skills in the job description and emphasize matching skills in the resume
          2. Reword achievements to better align with job requirements
          3. Maintain the original LaTeX structure and formatting
          4. Preserve all section headings and content organization
          5. Keep all \\\\ commands, \\begin{} and \\end{} tags intact
          6. Do not add comments or explanations - ONLY return the optimized LaTeX code
          7. Your response should be valid LaTeX code that compiles properly
          8. Make sure the content improvements are substantial and targeted to the job
          9. Preserve all formatting commands like \\textbf{}, \\emph{}, etc.`
        },
        {
          role: 'user',
          content: `Here is my resume in LaTeX format:

${resumeText}

Here is the job description:

${jobDescription}

Please optimize my resume to better match this job description. Return only the modified LaTeX code.`
        }
      ],
      temperature: 0.5, // Lower temperature for more consistent output
      max_tokens: 4000, // Allow sufficient tokens for large resumes
    });

    const optimizedResume = response.choices[0].message.content;
    console.log('Optimize API: Successfully optimized resume');

    return NextResponse.json({ 
      success: true, 
      optimizedResume 
    });
  } catch (error: unknown) {
    console.error('Error in optimize route:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
                         
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}