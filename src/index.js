export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==============================
    // ROUTE: UI Chat
    // ==============================
    if (url.pathname === "/") {
      return new Response(getUI(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // ==============================
    // ROUTE: CHAT TEXT ONLY
    // ==============================
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = await request.json();
      const { prompt, model } = body;

      const ai = await env.AI.run(model, {
        messages: [{ role: "user", content: prompt }]
      });

      // FIX [object Object]
      const reply =
        typeof ai.response === "string"
          ? ai.response
          : ai?.messages?.[0]?.content || "Maaf, terjadi kesalahan.";

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ==============================
    // ROUTE: AI IMAGE GENERATION
    // ==============================
    if (url.pathname === "/api/image" && request.method === "POST") {
      const { prompt } = await request.json();

      const image = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
        prompt
      });

      return new Response(image, {
        headers: { "Content-Type": "image/png" }
      });
    }

    // ==============================
    // ROUTE: AI IMAGE ANALYSIS
    // ==============================
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");

      const bytes = await file.arrayBuffer();

      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "Jelaskan gambar ini secara detail." },
          {
            role: "user",
            content: [
              {
                type: "input_image",
                image: [...new Uint8Array(bytes)]
              }
            ]
          }
        ]
      });

      const reply =
        typeof result.response === "string"
          ? result.response
          : result?.messages?.[0]?.content || "Tidak dapat menganalisis gambar.";

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};



// ==============================
// UI FRONTEND
// ==============================
function getUI() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Multi AI</title>
<style>
body {
  background: #ffffff;
  font-family: Arial;
  margin: 0;
}
.container {
  max-width: 900px;
  margin: auto;
  padding: 20px;
}
h1 {
  text-align: center;
  color: #111;
}
#chatBox {
  height: 65vh;
  overflow-y: auto;
  background: #f7f7f7;
  border-radius: 10px;
  padding: 15px;
  border: 1px solid #ddd;
}
.msg {
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 10px;
  max-width: 80%;
}
.me { background: #e3f2fd; }
.ai { background: #ececec; }
.input-area {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}
input,select {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
}
button {
  padding: 12px 18px;
  background: black;
  color: white;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
.typing { font-style: italic; color: #777; }
</style>
</head>
<body>

<div class="container">
  <h1>Multi AI Chat</h1>

  <select id="model">
    <option value="@cf/meta/llama-3.1-8b-instruct">Llama 3.1</option>
    <option value="@cf/qwen/qwen1.5-14b-chat">Qwen 14B</option>
    <option value="@cf/deepseek-ai/deepseek-coder-6.7b">DeepSeek Coder</option>
  </select>

  <div id="chatBox"></div>

  <div class="input-area">
    <input type="text" id="prompt" placeholder="Tulis pesan...">
    <button onclick="send()">Kirim</button>
  </div>

  <br>

  <h3>Analisis Gambar</h3>
  <input type="file" id="imgInput">
  <button onclick="analyze()">Analisis</button>

  <h3>Generate Gambar</h3>
  <input type="text" id="imgPrompt" placeholder="Prompt gambar...">
  <button onclick="generateImage()">Generate</button>
  <div id="resultImg"></div>

</div>

<script>
async function send() {
  const prompt = document.getElementById("prompt").value;
  const model = document.getElementById("model").value;
  if (!prompt) return;

  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML += \`<div class="msg me"><b>Anda:</b> \${prompt}</div>\`;
  document.getElementById("prompt").value = "";

  const typing = document.createElement("div");
  typing.className = "typing";
  typing.innerText = "AI sedang mengetik...";
  chatBox.appendChild(typing);

  chatBox.scrollTop = chatBox.scrollHeight;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model })
  });

  const data = await res.json();
  typing.remove();

  chatBox.innerHTML += \`<div class="msg ai"><b>AI:</b> \${data.reply}</div>\`;
  chatBox.scrollTop = chatBox.scrollHeight;
}



// ==============================
// ANALISIS GAMBAR
// ==============================
async function analyze() {
  const file = document.getElementById("imgInput").files[0];
  if (!file) return alert("Pilih gambar dulu!");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/analyze", { method: "POST", body: form });
  const data = await res.json();

  document.getElementById("chatBox").innerHTML +=
    \`<div class="msg ai"><b>AI Analisis:</b> \${data.reply}</div>\`;
}



// ==============================
// GENERATE GAMBAR
// ==============================
async function generateImage() {
  const prompt = document.getElementById("imgPrompt").value;
  if (!prompt) return;

  const res = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  document.getElementById("resultImg").innerHTML =
    \`<img src="\${url}" style="max-width:100%;margin-top:10px;border-radius:10px;">\`;
}
</script>

</body>
</html>
`;
}
