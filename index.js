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
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0" }
      });
      const html = await response.text();
      const finalData = {};

      // 1. 데이터가 시작되는 지점들을 모두 찾습니다.
      const searchPattern = /window\[["']EAGER-DATA["']\]\[["']([^"']+)["']\]\s*=\s*\{/g;
      let match;

      while ((match = searchPattern.exec(html)) !== null) {
        const key = match[1];
        const startPos = match.index + match[0].length - 1; // '{' 가 시작되는 위치
        
        // 2. 괄호 짝을 맞춰서 실제 객체의 끝(})을 찾습니다.
        let braceCount = 0;
        let endPos = -1;
        
        for (let i = startPos; i < html.length; i++) {
          if (html[i] === '{') braceCount++;
          else if (html[i] === '}') braceCount--;
          
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }

        if (endPos !== -1) {
          const jsonString = html.substring(startPos, endPos + 1);
          try {
            finalData[key] = JSON.parse(jsonString);
          } catch (e) {
            console.error(`파싱 실패: ${key}`);
          }
        }
      }

      // 3. 수집된 전체 데이터 반환
      if (Object.keys(finalData).length === 0) {
        return new Response(JSON.stringify({ error: "데이터 추출 실패", sample: html.substring(0, 200) }), { status: 404, headers: getCorsHeaders() });
      }

      return new Response(JSON.stringify(finalData), { headers: getCorsHeaders() });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: getCorsHeaders() });
    }
  }
};
