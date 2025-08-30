import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Forward all query parameters to the backend
  const backendUrl = `${BACKEND_URL}/api/questions?${searchParams.toString()}`;
  
  try {
    const response = await fetch(backendUrl);
    const data = await response.json();
    
    return Response.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to fetch from backend:', error);
    return Response.json(
      { error: 'Failed to fetch questions from backend' },
      { status: 500 }
    );
  }
}
