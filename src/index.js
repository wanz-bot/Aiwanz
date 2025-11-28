export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const DAILY_LIMIT = 200;
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const dateKey = new Date().toISOString().slice(0, 10);
    const limitKey = `limit:${ip}:${dateKey}`;
    const used = Number(await env.LIMIT_KV.get(limitKey)) || 0;

    if (url.pathname === "/api" && request.method === "POST") {
      if (used >= DAILY_LIMIT) {
        return Response.json({
          success: false,
          error: "Limit habis hari ini."
        });
      }

      const body = await request.json();
      const model =
        body.model === "70b"
          ? "@cf/meta/llama-3.1-70b-instruct"
          : "@cf/meta/llama-3-8b-instruct";

      const result = await env.AI.run(model, { prompt: body.prompt });

      await env.LIMIT_KV.put(limitKey, used + 1);

      return Response.json({
        success: true,
        model,
        remaining: DAILY_LIMIT - (used + 1),
        reply: result.response
      });
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Chat Futuristik</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body{background:#0d1117;margin:0;color:white;font-family:sans-serif;}
          #box{max-width:900px;margin:40px auto;background:#161b22;padding:20px;
               border-radius:12px;box-shadow:0 0 20px rgba(0,0,0,0.5);}
          .msg{padding:12px;margin:12px 0;border-radius:10px;max-width:75%;}
          .you{background:#21262d;margin-left:auto;}
          .ai{background:#005dff;}
          .input{display:flex;gap:10px;margin-top:20px;}
          input,select{padding:12px;background:#21262d;border:none;color:white;border-radius:8px;flex:1;}
          button{padding:12px 20px;background:#0066ff;border:none;border-radius:8px;color:white;cursor:pointer;}
        </style>
      </head>
      <body>
        <div id="box">
          <h2 style="text-align:center;">🤖 AI Chat Futuristik</h2>

          <div>
            <select id="model">
              <option value="8b">Llama 3 - 8B</option>
              <option value="70b">Llama 3 - 70B</option>
            </select>
          </div>

          <div style="color:#ccc;margin-top:10px;">Limit: ${DAILY_LIMIT}/hari</div>

          <div id="msgbox" style="min-height:200px;"></div>

          <div class="input">
            <input id="prompt" placeholder="Tulis pesan...">
            <button onclick="send()">Kirim</button>
          </div>
        </div>

        <script>
          async function send(){
            const p = document.getElementById("prompt").value;
            const m = document.getElementById("model").value;
            const box = document.getElementById("msgbox");

            box.innerHTML += '<div class="msg you">'+p+'</div>';
            document.getElementById("prompt").value = "";

            const r = await fetch("/api",{
              method:"POST",
              body:JSON.stringify({prompt:p, model:m})
            });

            const d = await r.json();

            if(!d.success){
              box.innerHTML += '<div class="msg ai" style="background:#8b0000;">'+d.error+'</div>';
              return;
            }

            box.innerHTML += '<div class="msg ai">'+d.reply+'</div>';
          }
        </script>
      </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  }
};
