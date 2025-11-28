export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ============
    // UI
    // ============
    if (url.pathname === "/") {
      return new Response(getUI(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // ============
    // TEXT CHAT
    // ============
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const { prompt, model } = await request.json();

      const ai = await env.AI.run(model, {
        messages: [{ role: "user", content: prompt }],
      });

      let reply = ai.response || ai?.messages?.[0]?.content || "Tidak ada output.";

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ============
    // ANALISIS GAMBAR
    // ============
    if (url.pathname === "/api/vision" && request.method === "POST") {
      const body = await request.formData();
      const file = body.get("file");

      const bytes = await file.arrayBuffer();

      const ai = await env.AI.run("@cf/mistral/mistral-embed-image", {
        image: [...new Uint8Array(bytes)],
      });

      return new Response(JSON.stringify({ result: ai }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ============
    // ANALISIS FILE (PDF, TXT, JSON, DOCX, dll)
    // ============
    if (url.pathname === "/api/analyze-file" && request.method === "POST") {
      const body = await request.formData();
      const file = body.get("file");

      const text = await file.text();

      const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "Analisis isi file berikut secara detail." },
          { role: "user", content: text },
        ],
      });

      const reply = ai.response || "Tidak bisa membaca file.";

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ============
    // TEXT → IMAGE
    // ============
    if (url.pathname === "/api/generate-image" && request.method === "POST") {
      const { prompt } = await request.json();

      const img = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
        prompt,
      });

      return new Response(img, {
        headers: { "Content-Type": "image/png" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

function getUI() {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Wanz Multi-AI</title>

<style>
  body {
    margin: 0;
    background: #f7f7f7;
    font-family: Inter, Arial;
  }

  .nav {
    background: white;
    padding: 20px;
    display: flex;
    gap: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,.05);
    position: sticky;
    top: 0;
    z-index: 99;
  }

  .nav button {
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    background: #eaeaea;
    cursor: pointer;
  }

  .nav button.active {
    background: black;
    color: white;
  }

  .page {
    display: none;
    padding: 20px;
    max-width: 900px;
    margin: auto;
  }

  .page.active {
    display: block;
  }

  #chatBox {
    height: 70vh;
    overflow-y: auto;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,.1);
  }

  .bubble {
    margin-bottom: 15px;
    padding: 12px 16px;
    border-radius: 10px;
    max-width: 80%;
    line-height: 1.6;
  }

  .me { background: #dff1ff; }
  .ai { background: #f0f0f0; }

  .input-area {
    margin-top: 15px;
    display: flex;
    gap: 10px;
  }

  input, textarea {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #ccc;
  }

  button {
    padding: 12px 18px;
    border-radius: 8px;
    background: black;
    color: white;
    border: none;
    cursor: pointer;
  }

  .loader {
    text-align: center;
    padding: 20px;
    color: #666;
    font-style: italic;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0% { opacity: .4; }
    50% { opacity: 1; }
    100% { opacity: .4; }
  }

  .img-output {
    text-align: center;
    margin-top: 20px;
  }
</style>

</head>
<body>

<!-- NAV -->
<div class="nav">
  <button onclick="showPage('chat')" class="active">Chat AI</button>
  <button onclick="showPage('vision')">Analisis Gambar</button>
  <button onclick="showPage('file')">Analisis File</button>
  <button onclick="showPage('imagegen')">Buat Gambar</button>
</div>

<!-- CHAT -->
<div id="chat" class="page active">
  <h2>Chat AI</h2>

  <select id="model">
    <option value="@cf/meta/llama-3.1-8b-instruct">LLaMA 8B</option>
    <option value="@cf/meta/llama-3.1-70b-instruct">LLaMA 70B</option>
    <option value="@cf/qwen/qwen2.5-7b-instruct">Qwen 7B</option>
  </select>

  <div id="chatBox"></div>

  <div class="input-area">
    <input id="prompt" placeholder="Tulis pesan..." />
    <button onclick="sendChat()">Kirim</button>
  </div>
</div>

<!-- VISION -->
<div id="vision" class="page">
  <h2>Analisis Gambar</h2>

  <input type="file" id="visionFile" accept="image/*">
  <button onclick="analyzeImage()">Analisis</button>

  <div id="visionResult"></div>
</div>

<!-- FILE ANALYZER -->
<div id="file" class="page">
  <h2>Analisis File (PDF, TXT, JSON, DLL)</h2>

  <input type="file" id="uploadFile">
  <button onclick="analyzeFile()">Analisis</button>

  <div id="fileResult"></div>
</div>

<!-- IMAGE GENERATOR -->
<div id="imagegen" class="page">
  <h2>Buat Gambar</h2>

  <textarea id="imgPrompt" placeholder="Deskripsikan gambar..."></textarea>
  <button onclick="generateImage()">Buat Gambar</button>

  <div id="imgOutput" class="img-output"></div>
</div>

<script>
// PAGE SWITCH
function showPage(p) {
  document.querySelectorAll(".page").forEach(e => e.classList.remove("active"));
  document.querySelectorAll(".nav button").forEach(e => e.classList.remove("active"));

  document.getElementById(p).classList.add("active");
  event.target.classList.add("active");
}

// CHAT
async function sendChat() {
  const prompt = document.getElementById("prompt").value;
  const model = document.getElementById("model").value;
  const box = document.getElementById("chatBox");

  if (!prompt) return;

  box.innerHTML += `<div class="bubble me"><b>Anda:</b> ${prompt}</div>`;
  document.getElementById("prompt").value = "";

  const loader = document.createElement("div");
  loader.className = "loader";
  loader.innerText = "AI sedang memproses...";
  box.appendChild(loader);

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });

  loader.remove();
  const data = await res.json();

  box.innerHTML += `<div class="bubble ai"><b>AI:</b> ${data.reply}</div>`;
  box.scrollTop = box.scrollHeight;
}

// IMAGE ANALYSIS
async function analyzeImage() {
  const file = document.getElementById("visionFile").files[0];
  if (!file) return alert("Pilih gambar dulu!");

  const result = document.getElementById("visionResult");
  result.innerHTML = `<div class="loader">Menganalisis gambar...</div>`;

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/vision", {
    method: "POST",
    body: form,
  });

  const json = await res.json();
  result.innerHTML = `<pre>${JSON.stringify(json, null, 2)}</pre>`;
}

// FILE ANALYSIS
async function analyzeFile() {
  const file = document.getElementById("uploadFile").files[0];
  if (!file) return alert("Upload file dulu!");

  const result = document.getElementById("fileResult");
  result.innerHTML = `<div class="loader">Menganalisis file...</div>`;

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/analyze-file", {
    method: "POST",
    body: form,
  });

  const json = await res.json();
  result.innerHTML = `<pre>${json.reply}</pre>`;
}

// IMAGE GENERATOR
async function generateImage() {
  const prompt = document.getElementById("imgPrompt").value;
  const out = document.getElementById("imgOutput");

  out.innerHTML = `<div class="loader">Membuat gambar...</div>`;

  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  out.innerHTML = `<img src="${url}" width="400" style="border-radius:12px;">`;
}
</script>

</body>
</html>
`;
}
