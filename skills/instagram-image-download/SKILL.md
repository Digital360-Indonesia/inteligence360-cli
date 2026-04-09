---
name: instagram-image-download
description: Download full-resolution Instagram post images without authentication, browser, or yt-dlp. Use when the user wants to download, save, or scrape images from Instagram post URLs.
category: social-media
status: working
tested-on: 2026-04-09
metadata:
  author: intelligence360
  version: "1.0"
---

## Instagram Image Download

Use the legacy `/media/` endpoint — direct, fast, no login needed.

```python
import requests

shortcode = 'DUAo705ATTw'  # extract from instagram.com/p/{shortcode}/
url = f'https://www.instagram.com/p/{shortcode}/media/?size=l'
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://www.instagram.com/',
}
resp = requests.get(url, headers=headers, allow_redirects=True)
with open('output.jpg', 'wb') as f:
    f.write(resp.content)
```

## Size Options
- `?size=l` — full resolution (1080px+) ← use this
- `?size=m` — medium (640px)
- `?size=t` — thumbnail

## Key Rules
- `allow_redirects=True` is required — Instagram redirects to fbcdn.net CDN
- Do NOT use yt-dlp → only handles video, errors on image posts
- Do NOT use GraphQL API → requires authentication
- Do NOT scrape page HTML → fragile, blocked

## Edge Cases
- **Carousel posts**: `/media/` returns first image only. For the rest, scrape `og:image` meta tags from the page HTML.
- **Private posts**: This method does not work — requires authentication.
- **Verification**: Check `len(resp.content) > 10000` and JPEG magic bytes `\xff\xd8\xff`
