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
      // 1. 네이버 메인 로드 (최신 브라우저 환경 모방)
      const response = await fetch("https://www.naver.com/", {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" 
        }
      });
      const html = await response.text();

      const finalEagerData = {};

      // 🎯 [개선된 정규식] 
      // window["EAGER-DATA"]["KEY"] = { ... } 형태를 공백/줄바꿈 무관하게 모두 찾음
      const regex = /window\s*\[\s*["']EAGER-DATA["']\s*\]\s*\[\s*["'](.*?)["']\s*\]\s*=\s*({[\s\S]*?});/g;
      
      let match;
      let matchCount = 0;

      while ((match = regex.exec(html)) !== null) {
        const key = match[1];
        let valueStr = match[2].trim();
        
        try {
          // 가끔 네이버 데이터 끝에 세미콜론이나 불필요한 공백이 포함될 수 있어 정리 후 파싱
          finalEagerData[key] = JSON.parse(valueStr);
          matchCount++;
        } catch (e) {
          // JSON 파싱 실패 시 (trailing comma 등) 브라우저가 해석하는 방식으로 정제 시도
          try {
            // 매우 드문 경우지만, 정규식이 객체 끝을 잘못 잡았을 경우를 대비해 마지막 중괄호까지만 자름
            const lastBraceIndex = valueStr.lastIndexOf('}');
            if (lastBraceIndex !== -1) {
              finalEagerData[key] = JSON.parse(valueStr.substring(0, lastBraceIndex + 1));
              matchCount++;
            }
          } catch (innerError) {
            console.error(`Failed to parse key: ${key}`);
          }
        }
      }

      // 2. 수집 결과 검증
      if (matchCount === 0) {
        return new Response(JSON.stringify({ 
          error: "EAGER-DATA 수집 실패", 
          debug: html.substring(html.indexOf('window["EAGER-DATA"]'), html.indexOf('window["EAGER-DATA"]') + 500) 
        }), { 
          status: 404, 
          headers: getCorsHeaders() 
        });
      }

      // 3. 전체 병합된 객체 반환 (사용자님의 콘솔 화면과 동일한 구조)
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
