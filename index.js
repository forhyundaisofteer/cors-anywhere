const originWhitelist = [
  "https://forhyundaisofteer.github.io", 
  "http://localhost:8080", 
  "http://127.0.0.1:8080"
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let targetUrl = url.pathname.slice(1) + url.search;

    if (!targetUrl) {
      return new Response("나의 CORS 프록시가 실행 중입니다. 주소 뒤에 https://...를 붙여주세요.", { status: 200 });
    }

    const origin = request.headers.get("Origin");
    
    if (origin && !originWhitelist.includes(origin)) {
      return new Response("허용되지 않은 도메인입니다 (Forbidden Origin).", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const newRequestHeaders = new Headers(request.headers);
      newRequestHeaders.set("Host", new URL(targetUrl).host);

      let response = await fetch(targetUrl, {
        method: request.method,
        headers: newRequestHeaders,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
        redirect: "follow"
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", origin || "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      responseHeaders.set("Access-Control-Expose-Headers", "*");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (e) {
      return new Response("프록시 요청 중 오류 발생: " + e.message, { status: 500 });
    }
  }
};