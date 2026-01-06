const originWhitelist = [
  "https://forhyundaisofteer.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    
    // 공통 응답 헤더 생성 함수 (CORS 해결의 핵심)
    const getCorsHeaders = () => ({
      "Access-Control-Allow-Origin": originWhitelist.includes(origin) ? origin : (origin ? "null" : "*"),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json;charset=UTF-8"
    });

    // 1. OPTIONS 요청 처리
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders() });
    }

    try {
      // 2. 네이버 호출
      const response = await fetch("https://www.naver.com/", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" }
      });
      const html = await response.text();

      // 3. 정규표현식 개선 (홀따옴표/쌍따옴표 모두 대응)
      const dataRegex = /window\[["']EAGER-DATA["']\]\s*=\s*({.*?});/s;
      const match = html.match(dataRegex);

      if (!match) {
        return new Response(JSON.stringify({ error: "EAGER-DATA 파싱 실패", htmlPreview: html.substring(0, 200) }), {
          status: 404,
          headers: getCorsHeaders()
        });
      }

      // 4. 성공 응답
      return new Response(match[1], {
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
