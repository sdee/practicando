import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = `${BACKEND_URL}/api/rounds/active`;
    
    const response = await fetch(backendUrl, {
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    // Check if the response is OK before trying to parse JSON
    if (!response.ok) {
      if (response.status === 404) {
        return Response.json(
          { error: 'No active round found' },
          { status: 404 }
        );
      }
      
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} - ${errorText}`);
      return Response.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return Response.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to fetch active round:', error);
    return Response.json(
      { error: 'Failed to fetch active round' },
      { status: 500 }
    );
  }
}
