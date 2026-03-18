import { NextResponse } from 'next/server';

// Ultra-basic edge rate limiting dictionary
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_POINTS = 50; 
const RATE_LIMIT_WINDOW = 60 * 1000; 

export async function POST(req: Request) {
  // 1. Basic Rate Limiter
  const ip = req.headers.get('x-forwarded-for') || 'anonymous-ip';
  const now = Date.now();
  const userRate = rateLimitMap.get(ip);
  if (userRate && now - userRate.timestamp < RATE_LIMIT_WINDOW) {
    if (userRate.count >= RATE_LIMIT_POINTS) {
      return NextResponse.json({ status: 'error', error: '429 Too Many Requests: Rate limit exceeded.' }, { status: 429 });
    }
    userRate.count += 1;
  } else {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
  }

  try {
    const body = await req.json();
    const url = body.url;
    const xRayMode = body.xRayMode === true; // Extract boolean
    const retainUsernames = body.retainUsernames === true;

    if (!url) {
      return NextResponse.json({ status: 'error', error: '400 Bad Request: target URL string is required inside JSON body payload.' }, { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ status: 'error', error: '400 Bad Request: Invalid URL format string passed.' }, { status: 400 });
    }

    // Append standard payload mapping route
    let jsonUrl = `https://www.reddit.com${parsedUrl.pathname}`;
    if (jsonUrl.endsWith('/')) jsonUrl = jsonUrl.slice(0, -1);
    jsonUrl += '.json';

    const scraperApiKey = process.env.SCRAPER_API_KEY;
    if (!scraperApiKey) {
      throw new Error('SCRAPER_API_KEY environment variable is missing entirely on edge container.');
    }

    // Extract postId strictly for X-Ray Lookups
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    let postId = '';
    const commentsIndex = pathParts.indexOf('comments');
    if (commentsIndex !== -1 && pathParts.length > commentsIndex + 1) {
      postId = pathParts[commentsIndex + 1];
    }

    const proxyUrl = `https://api.scraperapi.com/?api_key=${scraperApiKey}&url=${encodeURIComponent(jsonUrl)}`;

    // Fire all three pipelines concurrently ensuring Pullpush API lags do not fatally kill the Proxy pipeline
    const [mainResponse, xRaySubmissions, xRayComments] = await Promise.allSettled([
       // Core ScraperAPI Routing
       (async () => {
         let res: Response | null = null;
         let lastErr: Error | null = null;
         for (let attempt = 1; attempt <= 3; attempt++) {
           try {
             res = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });
             if (res.ok) return await res.json();
             throw new Error(`Proxy target returned HTTP ${res.status}`);
           } catch (e: any) {
             lastErr = e;
             if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
           }
         }
         throw new Error(`Failed to map valid JSON from proxy after 3 consecutive retry attempts. Last internal bridge error: ${lastErr?.message}`);
       })(),
       // X-Ray Submission Lookup
       (async () => {
         if (!xRayMode || !postId) return null;
         try {
           const r = await fetch(`https://api.pullpush.io/reddit/search/submission/?ids=${postId}`, { signal: AbortSignal.timeout(8000) });
           if (!r.ok) return null;
           return await r.json();
         } catch { return null; }
       })(),
       // X-Ray Comments Array
       (async () => {
         if (!xRayMode || !postId) return null;
         try {
           const r = await fetch(`https://api.pullpush.io/reddit/search/comment/?link_id=${postId}&size=500`, { signal: AbortSignal.timeout(8000) });
           if (!r.ok) return null;
           return await r.json();
         } catch { return null; }
       })()
    ]);

    if (mainResponse.status === 'rejected') {
      throw new Error(mainResponse.reason?.message || 'Primary Proxy Pipeline collapsed concurrently.');
    }

    const payload = mainResponse.value;
    
    // Process X-Ray Data Maps
    const xRayCommentMap = new Map<string, string>();
    let xRaySubmissionRaw: string | null = null;

    if (xRayMode) {
       if (xRayComments.status === 'fulfilled' && xRayComments.value?.data) {
          for (const c of xRayComments.value.data) {
             if (c.id && c.body) xRayCommentMap.set(c.id, c.body);
          }
       }
       if (xRaySubmissions.status === 'fulfilled' && xRaySubmissions.value?.data?.[0]) {
          xRaySubmissionRaw = xRaySubmissions.value.data[0].selftext;
       }
    }

    // Safety check missing nodes
    if (!Array.isArray(payload) || payload.length < 2) {
      if (payload.error === 404) throw new Error('404 Reddit payload returned completely empty. Make sure target URL path exists publicly.');
      throw new Error('Invalid Reddit native JSON payload structure.');
    }

    // Map Post OP Data
    const postData = payload[0].data.children[0].data;
    const title = postData.title || 'Reddit_Post_Unknown';
    const opAuthor = postData.author;
    let bodyText = postData.selftext || '[No thread body / Link-Only Submission Payload]';

    // Inject X-Ray Body Recoveries
    if (xRayMode && (bodyText === '[removed]' || bodyText === '[deleted]') && xRaySubmissionRaw) {
      bodyText = `⚠️ [RECOVERED VIA X-RAY]\n${xRaySubmissionRaw}`;
    }

    const authorMap = new Map<string, string>();
    if (opAuthor && opAuthor !== '[deleted]') {
      authorMap.set(opAuthor, retainUsernames ? opAuthor : 'Person 1 (OP)');
    }

    const opDisplay = retainUsernames ? (opAuthor && opAuthor !== '[deleted]' ? opAuthor : 'Unknown User') : 'Person 1 (OP)';
    let fullText = `TITLE: ${title}\n\n--- POST BODY ---\n${opDisplay}:\n${bodyText}\n\n--- COMMENTS ---\n\n`;

    // Map recursive comments natively retaining tree architecture depth
    const processComment = (commentNode: any, depth: number = 0): string => {
      if (commentNode.kind !== 't1') return '';
      let output = '';
      const data = commentNode.data;
      const author = data.author || '[deleted]';
      let text = data.body || '';

      // Inject X-Ray Comment Replacements
      if (xRayMode && (text === '[deleted]' || text === '[removed]') && data.id && xRayCommentMap.has(data.id)) {
        text = `⚠️ [RECOVERED VIA X-RAY] ${xRayCommentMap.get(data.id)}`;
      }

      const assignedAuthor = author !== '[deleted]' ? author : 'Unknown User';
      if (!authorMap.has(assignedAuthor) && assignedAuthor !== 'Unknown User') {
         authorMap.set(assignedAuthor, retainUsernames ? assignedAuthor : `Person ${authorMap.size + 1}`);
      }
      
      const alias = authorMap.get(assignedAuthor) || assignedAuthor;

      if (text) {
        const indent = '    '.repeat(depth);
        const prefix = depth > 0 ? '↳ ' : '';
        const indentedText = text.split('\n').map((l: string) => `${indent}${l}`).join('\n');
        output += `${indent}${prefix}${alias}:\n${indentedText}\n\n`;
      }

      // Descend recursive comment topologies
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

    return NextResponse.json({ 
      status: 'success',
      title, 
      content: fullText,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', error: error.message || 'Server extraction container mapping error' }, { status: 500 });
  }
}
