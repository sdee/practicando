import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Forward all query parameters to the backend
  const backendUrl = `${BACKEND_URL}/api/rounds?${searchParams.toString()}`;
  
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
      { error: 'Failed to fetch rounds from backend' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch (e) {
      // Gracefully handle empty or invalid JSON
      return Response.json(
        { error: 'Invalid or missing JSON body' },
        { status: 400 }
      );
    }
    
    const backendUrl = `${BACKEND_URL}/api/rounds`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Try to forward JSON; if not JSON, forward text
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return Response.json(data, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    } else {
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': contentType || 'text/plain',
        },
      });
    }
  } catch (error) {
    console.error('Failed to create round:', error);
    return Response.json(
      { error: 'Failed to create round' },
      { status: 500 }
    );
  }
}
