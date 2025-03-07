import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { resumeText, jobDescription } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume optimizer. Your task is to modify a LaTeX resume to better match a job description.'
        },
        {
          role: 'user',
          content: `Here is my resume in LaTeX format:\n\n${resumeText}\n\nHere is the job description:\n\n${jobDescription}\n\nPlease optimize my resume to better match this job description. Return only the modified LaTeX code.`
        }
      ],
    });

    const optimizedResume = response.choices[0].message.content;

    return NextResponse.json({ 
      success: true, 
      optimizedResume 
    });
  } catch (error) {
    console.error('Error in optimize route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to optimize resume' },
      { status: 500 }
    );
  }
}