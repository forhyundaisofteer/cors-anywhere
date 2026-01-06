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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" 
        }
      });
      const html = await response.text();

      const finalEagerData = {};

      // 🎯 [패턴 추적 방식]
      // 1. window["EAGER-DATA"][" 를 기준으로 전체 HTML을 분할합니다. (따옴표 종류 모두 대응)
      const segments = html.split(/window\s*\[\s*["']EAGER-DATA["']\s*\]\s*\[\s*["']/);

      // 첫 번째 세그먼트는 초기화 구문 이전의 내용이므로 제외하고 1번부터 순회합니다.
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        
        // 2. 키값 추출 (예: PC-FEED-WRAPPER)
        const keyMatch = segment.match(/^([^"']+)/);
        if (!keyMatch) continue;
        const key = keyMatch[1];

        // 3. 데이터 시작 지점(=)과 종료 지점(};) 사이의 내용을 추출합니다.
        const assignmentIndex = segment.indexOf('=');
        if (assignmentIndex === -1) continue;

        // 실제 객체 시작 부분({)을 찾습니다.
        const braceIndex = segment.indexOf('{', assignmentIndex);
        if (braceIndex === -1) continue;

        // 세미콜론(;)을 기준으로 객체의 끝을 찾습니다.
        const semicolonIndex = segment.indexOf('};', braceIndex);
        if (semicolonIndex === -1) continue;

        const jsonString = segment.substring(braceIndex, semicolonIndex + 1).trim();

        try {
          // 4. 추출된 문자열을 JSON으로 파싱하여 최종 객체에 할당합니다.
          finalEagerData[key] = JSON.parse(jsonString);
        } catch (e) {
          // 파싱 실패 시 디버깅을 위해 기록하거나 건너뜁니다.
          console.error(`Parsing failed for key: ${key}`);
        }
      }

      // 최종 수집된 데이터 검증
      if (Object.keys(finalEagerData).length === 0) {
        return new Response(JSON.stringify({ 
          error: "데이터 추출 실패", 
          debug: html.substring(html.indexOf('window["EAGER-DATA"]'), html.indexOf('window["EAGER-DATA"]') + 400) 
        }), { status: 404, headers: getCorsHeaders() });
      }

      return new Response(JSON.stringify(finalEagerData), {
        headers: getCorsHeaders()
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Worker Error: " + e.message }), { 
        status: 500, 
        headers: getCorsHeaders() 
      });
    }
  }
};
