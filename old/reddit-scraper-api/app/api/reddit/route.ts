import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url, retainUsernames } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Strip query params and append .json
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Force base reddit URL for JSON (bypassing old.reddit HTML blocks)
    let jsonUrl = `https://www.reddit.com${parsedUrl.pathname}`;
    // Remove trailing slash if exists before appending .json
    if (jsonUrl.endsWith('/')) {
      jsonUrl = jsonUrl.slice(0, -1);
    }
    jsonUrl += '.json';

    // 2. Fetch using ScraperAPI to bypass strict IP blocks
    const scraperApiKey = process.env.SCRAPER_API_KEY;
    if (!scraperApiKey) {
      throw new Error('SCRAPER_API_KEY environment variable is missing.');
    }

    const proxyUrl = `https://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(jsonUrl)}`;

    let response: Response | null = null;
    let fetchError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(proxyUrl, {
          // ScraperAPI proxy routes can take longer, bump timeout to 25s
          signal: AbortSignal.timeout(25000),
        });
        
        if (response.ok) {
          break; // Break the automatic retry loop if cleanly fetched
        }
        
        throw new Error(`Non-OK status: ${response.status}`);
      } catch (err: any) {
        fetchError = err;
        if (attempt < 3) {
          // Wait precisely 1 second before trying next proxy rotation
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Failed to fetch JSON from proxy after 3 attempts. Last error: ${fetchError?.message || 'Unknown'}`);
    }

    const payload = await response.json();

    if (!Array.isArray(payload) || payload.length < 2) {
      throw new Error('Invalid Reddit JSON payload structure.');
    }

    // 4. Parse JSON Structure
    const postData = payload[0].data.children[0].data;
    const title = postData.title || 'Reddit_Post';
    const opAuthor = postData.author;
    const bodyText = postData.selftext || '[No text body or link/image only.]';

    const authorMap = new Map<string, string>();
    if (opAuthor && opAuthor !== '[deleted]') {
      authorMap.set(opAuthor, retainUsernames ? opAuthor : 'Person 1 (OP)');
    }

    // Media extraction (OP Image / Gallery fallback from JSON)
    const media: string[] = [];
    if (postData.url && postData.url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      media.push(postData.url);
    } else if (postData.is_gallery && postData.media_metadata) {
      for (const key of Object.keys(postData.media_metadata)) {
        const item = postData.media_metadata[key];
        if (item.s && item.s.u) {
          media.push(item.s.u.replace(/&amp;/g, '&'));
        }
      }
    } else if (postData.preview && postData.preview.images) {
      const img = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
      media.push(img);
    }

    const opDisplay = retainUsernames ? (opAuthor && opAuthor !== '[deleted]' ? opAuthor : 'Unknown User') : 'Person 1 (OP)';
    let fullText = `TITLE: ${title}\n\n--- POST BODY ---\n${opDisplay}:\n${bodyText}\n\n--- COMMENTS ---\n\n`;

    // 5. Recreate exact anonymization and indentation recursively
    const processComment = (commentNode: any, depth: number = 0): string => {
      // Exclude "more" indicators at the end of lists
      if (commentNode.kind !== 't1') return '';

      let output = '';
      const data = commentNode.data;
      const author = data.author;

      if (author && author !== '[deleted]') {
        if (!authorMap.has(author)) {
          authorMap.set(author, retainUsernames ? author : `Person ${authorMap.size + 1}`);
        }

        const text = data.body || '';
        if (text) {
          const indent = '    '.repeat(depth);
          const prefix = depth > 0 ? '↳ ' : '';
          const indentedText = text.split('\n').map((l: string) => `${indent}${l}`).join('\n');
          
          output += `${indent}${prefix}${authorMap.get(author)}:\n${indentedText}\n\n`;
        }
      }

      // Check for nested replies
      if (data.replies && typeof data.replies === 'object' && data.replies.data && data.replies.data.children) {
        for (const nestedComment of data.replies.data.children) {
          output += processComment(nestedComment, depth + 1);
        }
      }

      return output;
    };

    const topLevelComments = payload[1].data.children || [];
    for (const comment of topLevelComments) {
      fullText += processComment(comment);
    }

    // 6. Return identical format + raw developer data
    return NextResponse.json({ 
      title, 
      text_content: fullText,
      media,
      dev_raw: {
        proxy_url: proxyUrl.replace(scraperApiKey, "MASKED_KEY"),
        headers: Object.fromEntries(response.headers.entries()),
        raw_json: payload,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server JSON parsing error' }, { status: 500 });
  }
}
