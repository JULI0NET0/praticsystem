import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Falta o parâmetro url' }, { status: 400 });
    }

    // Parse URL and ensure it has protocol
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.hostname;

    // Fetch site content with user-agent to avoid getting blocked
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 }, // Cache response for 24 hours
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();

    // Regex parsing for metadata (safe fallback without heavy libraries)
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/i;
    const ogTitleRegex = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i;
    const ogTitleRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i;

    const descRegex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i;
    const descRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i;
    const ogDescRegex = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i;
    const ogDescRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["'][^>]*>/i;

    const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i;
    const ogImageRegexAlt = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i;

    // Extract title
    let title = '';
    const ogTitleMatch = html.match(ogTitleRegex) || html.match(ogTitleRegexAlt);
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    } else {
      const titleMatch = html.match(titleRegex);
      title = titleMatch ? titleMatch[1] : domain;
    }

    // Extract description
    let description = '';
    const ogDescMatch = html.match(ogDescRegex) || html.match(ogDescRegexAlt);
    const descMatch = html.match(descRegex) || html.match(descRegexAlt);
    if (ogDescMatch) {
      description = ogDescMatch[1];
    } else if (descMatch) {
      description = descMatch[1];
    } else {
      description = `Visite o link em ${domain}`;
    }

    // Extract image
    let image = '';
    const ogImageMatch = html.match(ogImageRegex) || html.match(ogImageRegexAlt);
    if (ogImageMatch) {
      image = ogImageMatch[1];
      // Resolve relative path if needed
      if (image.startsWith('/')) {
        image = `${parsedUrl.origin}${image}`;
      }
    }

    // Favicon fallback
    const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

    // Clean up entities
    const clean = (str: string) => str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();

    return NextResponse.json({
      title: clean(title),
      description: clean(description),
      image,
      url: targetUrl,
      domain,
      favicon,
    });

  } catch (err: any) {
    console.error('Error fetching preview:', err);
    // Return gracefully even if fetch fails, so frontend link card is created fallback
    try {
      const { searchParams } = new URL(request.url);
      const url = searchParams.get('url') || '';
      const parsedUrl = new URL(url.startsWith('http') ? url : 'https://' + url);
      return NextResponse.json({
        title: parsedUrl.hostname,
        description: `Link externo para ${parsedUrl.hostname}`,
        image: '',
        url: parsedUrl.href,
        domain: parsedUrl.hostname,
        favicon: `https://www.google.com/s2/favicons?sz=64&domain=${parsedUrl.hostname}`,
      });
    } catch {
      return NextResponse.json({
        title: 'Link Externo',
        description: 'Não foi possível carregar os detalhes do link.',
        image: '',
        url: '',
        domain: '',
        favicon: '',
      });
    }
  }
}
