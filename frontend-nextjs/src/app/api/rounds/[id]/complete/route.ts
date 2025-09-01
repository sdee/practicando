import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const backendUrl = `${BACKEND_URL}/api/rounds/${params.id}/complete`;
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Failed to complete round:', error);
    return Response.json(
      { error: 'Failed to complete round' },
      { status: 500 }
    );
  }
}
