export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve UI
    if (url.pathname === "/") {
      return new Response(uiHTML(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // Chat endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { prompt, model } = await request.json();
        const ai = await env.AI.run(model || "@cf/meta/llama-3.1-8b-instruct", {
          messages: [{ role: "user", content: prompt }]
        });
        const reply = typeof ai.response === "string"
          ? ai.response
          : ai?.messages?.[0]?.content || "Maaf, saya tidak dapat menjawab.";
        return new Response(JSON.stringify({ reply }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    // Generate image endpoint
    if (url.pathname === "/api/image" && request.method === "POST") {
      try {
        const { prompt } = await request.json();
        const image = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
          prompt
        });
        return new Response(image, { headers: { "Content-Type": "image/png" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    // Analyze uploaded image (vision) endpoint
    if (url.pathname === "/api/vision" && request.method === "POST") {
      try {
        const form = await request.formData();
        const file = form.get("file");
        const buffer = await file.arrayBuffer();
        const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "user", content: "Jelaskan gambar ini:" },
            { role: "user", content: [{ type: "input_image", image: [...new Uint8Array(buffer)] }] }
          ]
        });
        const reply = typeof ai.response === "string"
          ? ai.response
          : ai?.messages?.[0]?.content || "Tidak bisa analisis gambar.";
        return new Response(JSON.stringify({ reply }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    // Analyze uploaded text file
    if (url.pathname === "/api/file" && request.method === "POST") {
      try {
        const form = await request.formData();
        const file = form.get("file");
        const text = await file.text();
        const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "user", content: "Berikut isi file:\n" + text }
          ]
        });
        const reply = typeof ai.response === "string"
          ? ai.response
          : ai?.messages?.[0]?.content || "Tidak dapat analisis file.";
        return new Response(JSON.stringify({ reply }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};


function uiHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Multi-AI Chat</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body { margin:0; padding:0; background:#f6f7fb; font-family:Arial, sans-serif; }
  .app { max-width: 800px; margin: auto; height: 100vh; display:flex; flex-direction: column; }
  .chat-window { flex:1; overflow-y: auto; padding: 20px; background: white; }
  .input-bar { display: flex; padding: 10px; background: #e9ecef; }
  .input-bar input { flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; }
  .input-bar button { padding: 10px 15px; margin-left: 8px; background:#0b5ed7; color:white; border:none; border-radius:6px; cursor:pointer; }
  .msg { margin-bottom: 15px; }
  .msg.user { text-align: right; }
  .msg .bubble { display: inline-block; padding: 10px 14px; border-radius: 14px; max-width:70%; }
  .msg.user .bubble { background:#d1e7ff; }
  .msg.ai .bubble { background:#f1f3f5; }
  .typing { font-style: italic; color: #666; }
  .toolbar { padding: 10px; background:#f1f3f5; border-bottom:1px solid #ddd; display: flex; gap:10px; }
  .toolbar select { padding:6px; }
  .section { padding: 15px; background:white; border-top:1px solid #ddd; }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="app">

  <div class="toolbar">
    <select id="modeSelect">
      <option value="chat">Chat</option>
      <option value="image">Generate Gambar</option>
      <option value="vision">Analisis Foto</option>
      <option value="file">Analisis File</option>
    </select>
  </div>

  <div id="chatSection" class="chat-window"></div>

  <div id="actionSection" class="section">
    <div id="chatUI">
      <div class="input-bar">
        <input type="text" id="prompt" placeholder="Ketik sesuatu..." />
        <button onclick="handleChat()">Kirim</button>
      </div>
    </div>

    <div id="imageUI" class="hidden">
      <input type="text" id="imgPrompt" placeholder="Deskripsi gambar..." />
      <button onclick="handleImage()">Generate Gambar</button>
      <div id="imgResult" style="margin-top: 15px;"></div>
    </div>

    <div id="visionUI" class="hidden">
      <input type="file" id="imgFile"/>
      <button onclick="handleVision()">Analisis Foto</button>
    </div>

    <div id="fileUI" class="hidden">
      <input type="file" id="textFile"/>
      <button onclick="handleFile()">Analisis File</button>
    </div>
  </div>

</div>

<script>
const chatWindow = document.getElementById("chatSection");
const mode = document.getElementById("modeSelect");

mode.onchange = () => {
  document.querySelectorAll("#actionSection > div").forEach(d => d.classList.add("hidden"));
  if (mode.value === "chat") document.getElementById("chatUI").classList.remove("hidden");
  if (mode.value === "image") document.getElementById("imageUI").classList.remove("hidden");
  if (mode.value === "vision") document.getElementById("visionUI").classList.remove("hidden");
  if (mode.value === "file") document.getElementById("fileUI").classList.remove("hidden");
};

async function handleChat(){
  const prompt = document.getElementById("prompt").value;
  if (!prompt) return;

  addMessage("Anda", prompt, "user");

  const typing = addTyping();
  const res = await fetch("/api/chat", {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ prompt, model: "@cf/meta/llama-3.1-8b-instruct" })
  });
  const data = await res.json();
  removeTyping(typing);

  addMessage("AI", data.reply, "ai");
}

async function handleImage(){
  const p = document.getElementById("imgPrompt").value;
  if (!p) return;
  const imgRes = await fetch("/api/image", {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ prompt: p })
  });
  const blob = await imgRes.blob();
  const url = URL.createObjectURL(blob);
  document.getElementById("imgResult").innerHTML = \`<img src="\${url}" style="max-width:100%; border-radius:8px;">\`;
}

async function handleVision(){
  const f = document.getElementById("imgFile").files[0];
  if (!f) return alert("Pilih file dulu!");
  const form = new FormData();
  form.append("file", f);
  const res = await fetch("/api/vision", { method:"POST", body: form });
  const data = await res.json();
  addMessage("AI (Vision)", data.reply, "ai");
}

async function handleFile(){
  const f = document.getElementById("textFile").files[0];
  if (!f) return alert("Pilih file dulu!");
  const form = new FormData();
  form.append("file", f);
  const res = await fetch("/api/file", { method:"POST", body: form });
  const data = await res.json();
  addMessage("AI (File)", data.reply, "ai");
}

function addMessage(sender, text, cls){
  chatWindow.innerHTML += \`<div class="msg \${cls}"><div class="bubble"><b>\${sender}:</b> \${text}</div></div>\`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addTyping(){
  const el = document.createElement("div");
  el.className = "msg ai typing";
  el.innerHTML = '<div class="bubble">AI mengetik<span class="typing">...</span></div>';
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

function removeTyping(el){
  el.remove();
}
</script>
</body>
</html>
`;
}
