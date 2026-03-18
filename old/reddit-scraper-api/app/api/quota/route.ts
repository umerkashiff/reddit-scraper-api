import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    if (!scraperApiKey) {
      return NextResponse.json({ error: 'SCRAPER_API_KEY environment variable is missing.' }, { status: 500 });
    }

    const response = await fetch(`https://api.scraperapi.com/account?api_key=${scraperApiKey}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch ScraperAPI account info. Status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      requestCount: data.requestCount || 0,
      requestLimit: data.requestLimit || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
