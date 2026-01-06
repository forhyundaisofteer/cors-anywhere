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

      const finalData = {};

      // 🎯 [핵심] 사용자님 제안대로 할당 패턴을 공략하는 정규식
      // 1. window["EAGER-DATA"]["KEY"] 형식을 찾음
      // 2. 이후 처음 나오는 { 부터 마지막 ; 직전의 } 까지를 캡처
      const regex = /window\s*\[\s*["']EAGER-DATA["']\s*\]\s*\[\s*["']([^"']+)["']\s*\]\s*=\s*([\s\S]*?);(?=\s*(?:window|<\/script>))/g;
      
      let match;
      while ((match = regex.exec(html)) !== null) {
        const key = match[1];
        let valueStr = match[2].trim();
        
        try {
          // 추출된 값이 유효한 JSON인지 확인하고 객체에 추가
          finalData[key] = JSON.parse(valueStr);
        } catch (e) {
          // JSON 파싱 실패 시, 혹시 모를 끝부분의 불필요한 문자를 제거하고 재시도
          try {
            const cleanValue = valueStr.substring(0, valueStr.lastIndexOf('}') + 1);
            finalData[key] = JSON.parse(cleanValue);
          } catch (err) {
            console.error(`파싱 실패 키: ${key}`);
          }
        }
      }

      // 수집된 데이터가 하나도 없을 경우 (정규식 미매칭 대비)
      if (Object.keys(finalData).length === 0) {
        return new Response(JSON.stringify({ 
          error: "EAGER-DATA 수집 실패", 
          hint: "정규식이 데이터를 캡처하지 못했습니다. 네이버 소스 구조를 확인하세요.",
          sample: html.substring(html.indexOf('window["EAGER-DATA"]'), html.indexOf('window["EAGER-DATA"]') + 400)
        }), { status: 404, headers: getCorsHeaders() });
      }

      return new Response(JSON.stringify(finalData), { headers: getCorsHeaders() });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Worker Error: " + e.message }), { 
        status: 500, 
        headers: getCorsHeaders() 
      });
    }
  }
};
