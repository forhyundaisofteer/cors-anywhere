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
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
        }
      });
      const html = await response.text();

      // 전체 데이터를 담을 객체 생성
      const finalData = {};

      // 🎯 사용자님이 주신 패턴에 딱 맞춘 정규표현식
      // 패턴: window["EAGER-DATA"]["KEY"] = { ... };
      const regex = /window\[["']EAGER-DATA["']\]\[["'](.*?)["']\]\s*=\s*({[\s\S]*?});/g;
      
      let match;
      while ((match = regex.exec(html)) !== null) {
        const key = match[1];      // 예: "PC-FEED-WRAPPER"
        const valueStr = match[2]; // 할당된 JSON 문자열
        
        try {
          // 추출된 문자열을 JSON 객체로 변환하여 병합
          finalData[key] = JSON.parse(valueStr);
        } catch (e) {
          // 만약 순수 JSON이 아니라면(예: trailing comma 등), 실패한 키는 건너뜁니다.
          console.error(`Parsing failed for key: ${key}`);
        }
      }

      // 수집된 데이터가 없다면 디버깅 정보 반환
      if (Object.keys(finalData).length === 0) {
        return new Response(JSON.stringify({ 
          error: "데이터를 찾을 수 없습니다.",
          htmlSample: html.substring(html.indexOf('window["EAGER-DATA"]'), html.indexOf('window["EAGER-DATA"]') + 300)
        }), { status: 404, headers: getCorsHeaders() });
      }

      return new Response(JSON.stringify(finalData), {
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
