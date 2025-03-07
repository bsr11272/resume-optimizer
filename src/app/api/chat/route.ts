// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Message type definition
type ChatMessage = {
  role: string;
  content: string;
  type?: string;
  filename?: string; // Add this property
  fileContent?: string; // Add this too for completeness
};

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
    // Log that we received a request
    console.log('Chat API: Received request');
    
    const { messages, resumeText, jobDescription } = await request.json();
    
    // Log request details (without full resume/job text for brevity)
    console.log(`Chat API: Processing ${messages.length} messages`);
    console.log(`Chat API: Has resume: ${!!resumeText}, Has job description: ${!!jobDescription}`);
    
    // Prepare the system message based on context
    let systemMessage = 'You are a professional resume assistant that helps users optimize their resumes for specific job descriptions.';
    
    // Add relevant context if available
    if (resumeText) {
      systemMessage += ' You have access to the user\'s resume.';
    }
    
    if (jobDescription) {
      systemMessage += ' You have access to the job description the user is applying for.';
    }
    
    // Create the full context with resume and job description if available
    let fullContext = '';
    if (resumeText) {
      // Limit the size of the resume to avoid token limits
      const limitedResumeText = resumeText.length > 4000 
        ? resumeText.substring(0, 4000) + "... [resume truncated for brevity]" 
        : resumeText;
      
      fullContext += `\n\nUser's resume in LaTeX:\n${limitedResumeText}`;
    }
    
    if (jobDescription) {
      // Limit the size of the job description to avoid token limits
      const limitedJobDescription = jobDescription.length > 2000
        ? jobDescription.substring(0, 2000) + "... [job description truncated for brevity]"
        : jobDescription;
        
      fullContext += `\n\nJob description:\n${limitedJobDescription}`;
    }
    
    // Format user messages for API
    const formattedMessages = messages
      .map((msg: ChatMessage) => {
        // Remove file content to avoid token limits
        if (msg.type === 'file') {
          return {
            role: msg.role,
            content: `[User uploaded a resume file: ${msg.filename || 'resume.tex'}]`
          };
        }
        
        return {
          role: msg.role,
          content: msg.content
        };
      })
      .slice(-8); // Only use the last 8 messages to stay within context limits
    
    // Prepare conversation for the API
    const apiMessages = [
      {
        role: 'system',
        content: systemMessage + fullContext
      },
      ...formattedMessages
    ];
    
    console.log('Chat API: Calling OpenAI');
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 800, // Limit response size to avoid very long messages
    });
    
    const assistantResponse = response.choices[0].message.content;
    console.log('Chat API: Got response from OpenAI');
    
    return NextResponse.json({ 
      success: true, 
      message: assistantResponse
    });
  } catch (error: unknown) {
    console.error('Error in chat route:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
                         
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'I apologize, but I encountered an error processing your request. Please try again.' 
      },
      { status: 500 }
    );
  }
}