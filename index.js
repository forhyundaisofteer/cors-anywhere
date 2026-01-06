const originWhitelist = [
  "https://forhyundaisofteer.github.io", 
  "http://localhost:8080", 
  "http://127.0.0.1:8080"
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    // 1. CORS Preflight (OPTIONS) 처리
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": originWhitelist.includes(origin) ? origin : "null",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. 화이트리스트 보안 체크
    if (origin && !originWhitelist.includes(origin)) {
      return new Response("Forbidden: 허용되지 않은 도메인입니다.", { status: 403 });
    }

    try {
      // 3. 네이버 메인 페이지 가져오기
      const targetUrl = "https://www.naver.com/";
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) throw new Error("네이버 페이지 로드 실패");

      const html = await response.text();

      // 4. [Lightweight Parsing] 정규표현식으로 EAGER-DATA 추출
      // 설명: window["EAGER-DATA"] = { ... } 형태의 문자열을 찾습니다.
      const dataRegex = /window\["EAGER-DATA"\]\s*=\s*({.*?});/s;
      const match = html.match(dataRegex);

      if (!match || !match[1]) {
        return new Response(JSON.stringify({ error: "EAGER-DATA를 찾을 수 없습니다." }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 5. 추출된 JSON 데이터를 즉시 반환
      return new Response(match[1], {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET",
        },
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "서버 내부 오류: " + e.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
