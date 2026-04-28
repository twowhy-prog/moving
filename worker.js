// Cloudflare Worker — 개인용 CORS 프록시 (국토부 실거래가 API용)
//
// 배포 방법:
//   1. https://dash.cloudflare.com 에서 무료 계정 생성
//   2. Workers & Pages → Create → Hello World
//   3. 이 파일 내용 붙여넣기 → 저장 & 배포
//   4. 배포된 URL(예: https://xxx.workers.dev)을 복사
//   5. compare.html 상단 CUSTOM_PROXY_URL 에 붙여넣기
//
// 또는 wrangler CLI:
//   npm install -g wrangler
//   wrangler login
//   wrangler deploy worker.js --name molit-proxy --compatibility-date 2025-01-01

const ALLOWED_HOSTS = [
  'apis.data.go.kr',
  'openapi.seoul.go.kr',
];

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    if (!targetUrl) {
      return new Response('url 파라미터 필요', { status: 400 });
    }

    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch {
      return new Response('잘못된 URL', { status: 400 });
    }

    if (!ALLOWED_HOSTS.some(h => targetHost.endsWith(h))) {
      return new Response('허용되지 않은 호스트', { status: 403 });
    }

    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': res.headers.get('Content-Type') || 'text/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
};
