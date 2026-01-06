const originWhitelist = [
  "https://forhyundaisofteer.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    
    const getCorsHeaders = () => ({
      "Access-Control-Allow-Origin": originWhitelist.includes(origin) ? origin : (origin ? "null" : "*"),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json;charset=UTF-8"
    });

    if (request.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders() });

    try {
      // 1. 네이버 메인 요청 (데스크톱 User-Agent 필수)
      const response = await fetch("https://www.naver.com/", {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        }
      });
      const html = await response.text();

      // 2. 뉴스스탠드 핵심 데이터(PC-MEDIA-WRAPPER) 추출 정규식
      // 네이버 소스: window["EAGER-DATA"]["PC-MEDIA-WRAPPER"] = { ... };
      const newsstandRegex = /window\["EAGER-DATA"\]\["PC-MEDIA-WRAPPER"\]\s*=\s*({.*?});/s;
      const match = html.match(newsstandRegex);

      if (match && match[1]) {
        return new Response(match[1], { headers: getCorsHeaders() });
      }

      // 3. 만약 위 형식이 없다면, 통합 EAGER-DATA 할당 시도 검색
      const eagerDataRegex = /window\["EAGER-DATA"\]\s*=\s*window\["EAGER-DATA"\]\s*\|\|\s*{};\s*window\["EAGER-DATA"\]\["PC-MEDIA-WRAPPER"\]\s*=\s*({.*?});/s;
      const secondaryMatch = html.match(eagerDataRegex);

      if (secondaryMatch && secondaryMatch[1]) {
        return new Response(secondaryMatch[1], { headers: getCorsHeaders() });
      }

      // 4. 실패 시 디버깅을 위한 정보 반환
      return new Response(JSON.stringify({ 
        error: "데이터 추출 실패", 
        suggestion: "네이버의 스크립트 구조가 변경되었을 수 있습니다.",
        htmlSnippet: html.substring(html.indexOf('window["EAGER-DATA"]'), html.indexOf('window["EAGER-DATA"]') + 500)
      }), {
        status: 404,
        headers: getCorsHeaders()
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: getCorsHeaders()
      });
    }
  }
};
