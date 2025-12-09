
import { GIFS, STICKERS } from '../constants';

// Replace with your actual Klipy API Key
const API_KEY = 'YOUR_KLIPY_API_KEY';
const BASE_URL = 'https://api.klipy.co/v1';

export interface KlipyMedia {
  id: string;
  url: string;
  title: string;
}

// Helper to shuffle and repeat arrays to simulate "infinite" content in demo mode
const getInfiniteFallback = (source: string[], offset: number, limit: number): KlipyMedia[] => {
  const repeated = [];
  // Create a large pool
  for (let i = 0; i < 50; i++) {
    repeated.push(...source);
  }
  
  return repeated.slice(offset, offset + limit).map((url, i) => ({
    id: `local-${offset + i}`,
    url: url,
    title: `Media ${offset + i}`
  }));
};

export const fetchKlipyMedia = async (
  type: 'gifs' | 'stickers',
  query: string = '',
  offset: number = 0,
  limit: number = 20
): Promise<KlipyMedia[]> => {
  // If no API Key is set or default is used, return infinite fallback data
  if (API_KEY === 'YOUR_KLIPY_API_KEY') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const source = type === 'gifs' ? GIFS : STICKERS;
    return getInfiniteFallback(source, offset, limit);
  }

  try {
    // Construct URL for Klipy API
    // Note: This endpoint structure is assumed based on common API standards. 
    // Refer to specific Klipy documentation for exact endpoints.
    const endpoint = query ? 'search' : 'trending';
    const mediaTypeParam = type === 'stickers' ? 'sticker' : 'gif';
    
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('key', API_KEY);
    url.searchParams.append('type', mediaTypeParam);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    if (query) {
      url.searchParams.append('q', query);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Klipy API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map Klipy response to our internal format
    // Adjust 'data.results' based on actual API response structure
    return data.results.map((item: any) => ({
      id: item.id,
      url: item.url || item.images?.original?.url, // Fallback to common structures
      title: item.title || ''
    }));

  } catch (error) {
    console.warn("Failed to fetch from Klipy API, falling back to local data:", error);
    const source = type === 'gifs' ? GIFS : STICKERS;
    return getInfiniteFallback(source, offset, limit);
  }
};
