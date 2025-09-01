import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const backendUrl = `${BACKEND_URL}/api/rounds/${params.id}/transition`;
    
    const body = await request.json();
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return Response.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to transition round:', error);
    return Response.json(
      { error: 'Failed to transition round' },
      { status: 500 }
    );
  }
}
