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
      const response = await fetch("https://www.naver.com/", {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        }
      });
      const html = await response.text();

      // 전체 데이터를 담을 객체
      let finalEagerData = {};

      // 🎯 패턴 1: window["EAGER-DATA"] = { ... }; (통째로 할당하는 경우)
      const rootMatch = html.match(/window\[["']EAGER-DATA["']\]\s*=\s*({[\s\S]*?});/);
      if (rootMatch && rootMatch[1]) {
        try {
          finalEagerData = JSON.parse(rootMatch[1]);
        } catch (e) {
          // JSON 파싱 실패 시 일단 무시하고 다음 패턴 시도
        }
      }

      // 🎯 패턴 2: window["EAGER-DATA"]["KEY"] = { ... }; (부분별로 할당하는 경우)
      // 전역 검색(/g)을 통해 모든 키-값 쌍을 찾아냅니다.
      const partRegex = /window\[["']EAGER-DATA["']\]\[["'](.*?)["']\]\s*=\s*({[\s\S]*?});/g;
      let match;
      while ((match = partRegex.exec(html)) !== null) {
        const key = match[1];
        const valueStr = match[2];
        try {
          finalEagerData[key] = JSON.parse(valueStr);
        } catch (e) {
          // 개별 파싱 실패 시 텍스트 그대로 저장하거나 무시
        }
      }

      // 데이터가 아무것도 없다면 에러 반환
      if (Object.keys(finalEagerData).length === 0) {
        return new Response(JSON.stringify({ 
          error: "EAGER-DATA 수집 실패", 
          debug: html.substring(0, 500) 
        }), { status: 404, headers: getCorsHeaders() });
      }

      // 수집된 전체 객체 반환
      return new Response(JSON.stringify(finalEagerData), {
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
