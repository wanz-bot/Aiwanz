export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve UI
    if (url.pathname === "/") {
      return new Response(uiHTML(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // -------------------------
    // CHAT (Multi AI)
    // -------------------------
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const { prompt, model } = await request.json();

      const ai = await env.AI.run(model, {
        messages: [
          { role: "user", content: prompt }
        ]
      });

      const reply =
        ai?.response ||
        ai?.messages?.[0]?.content ||
        "Maaf, saya tidak bisa menjawab.";

      return json({ reply });
    }

    // -------------------------
    // TEXT TO IMAGE
    // -------------------------
    if (url.pathname === "/api/t2i" && request.method === "POST") {
      const { prompt } = await request.json();

      const img = await env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        { prompt }
      );

      return new Response(img, {
        headers: { "Content-Type": "image/png" }
      });
    }

    // -------------------------
    // IMAGE ANALYZER (Vision)
    // -------------------------
    if (url.pathname === "/api/vision" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      const buf = await file.arrayBuffer();

      const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "user", content: "Jelaskan isi gambar ini secara detail:" },
          {
            role: "user",
            content: [
              { type: "input_image", image: [...new Uint8Array(buf)] }
            ]
          }
        ]
      });

      return json({ reply: ai.response || "Gagal membaca gambar." });
    }

    // -------------------------
    // FILE ANALYZER (Text File)
    // -------------------------
    if (url.pathname === "/api/file" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      const text = await file.text();

      const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "user", content: "Analisis isi file berikut:\n" + text }
        ]
      });

      return json({ reply: ai.response || "Tidak bisa analisis file." });
    }

    return new Response("Not Found", { status: 404 });
  }
};

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json" }
  });
}

function uiHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AI Studio</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
*{box-sizing:border-box;font-family:Inter,Arial}
body{margin:0;background:#f5f7fa;color:#111}
.app{max-width:900px;margin:auto;height:100vh;display:flex;flex-direction:column}

.topbar{
  padding:15px;
  background:white;
  border-bottom:1px solid #ddd;
  display:flex;
  gap:10px;
}

.mode-btn{
  padding:10px 16px;
  border-radius:8px;
  border:1px solid #ddd;
  background:white;
  cursor:pointer;
  transition:.2s;
}
.mode-btn.active{
  background:#2563eb;
  color:white;
  border-color:#2563eb;
}

.chatbox{
  flex:1;
  overflow-y:auto;
  padding:25px;
  background:white;
}

.bubble{
  max-width:75%;
  padding:12px 16px;
  border-radius:14px;
  margin-bottom:14px;
  line-height:1.45;
  animation:fadeIn .3s;
}
.user{background:#dbeafe; margin-left:auto}
.ai{background:#f3f4f6; margin-right:auto}

@keyframes fadeIn{
 from{opacity:0;transform:translateY(6px)}
 to{opacity:1;transform:translateY(0)}
}

.typing{
  width:60px;height:20px;display:flex;align-items:center;margin-bottom:12px;margin-right:auto;
}
.typing span{
  width:8px;height:8px;background:#bbb;margin-right:4px;border-radius:50%;animation:blink 1.4s infinite;
}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}

@keyframes blink{
  0%{opacity:.2}
  50%{opacity:1}
  100%{opacity:.2}
}

.inputbar{
  display:flex;
  padding:15px;
  background:#eef1f5;
  gap:10px;
  border-top:1px solid #ddd;
}
.inputbar input{
  flex:1;
  padding:12px;
  border-radius:8px;
  border:1px solid #ccc;
}
.inputbar button{
  background:#2563eb;
  border:none;
  color:white;
  padding:12px 20px;
  border-radius:8px;
  cursor:pointer;
}

.hidden{display:none}
.section{padding:20px; background:white; border-top:1px solid #ddd}
</style>
</head>
<body>
<div class="app">

  <div class="topbar">
    <button class="mode-btn active" onclick="switchMode('chat', this)">Chat</button>
    <button class="mode-btn" onclick="switchMode('t2i', this)">Text → Image</button>
    <button class="mode-btn" onclick="switchMode('vision', this)">Analisis Foto</button>
    <button class="mode-btn" onclick="switchMode('file', this)">Analisis File</button>

    <select id="modelSelect" style="padding:10px;border-radius:8px;border:1px solid #ddd;margin-left:auto;">
      <option value="@cf/meta/llama-3.1-8b-instruct">Llama 3.1 8B</option>
      <option value="@cf/meta/llama-3.1-70b-instruct">Llama 3.1 70B</option>
      <option value="@cf/qwen/qwen2.5-14b-instruct">Qwen2.5</option>
      <option value="@cf/mistral/mistral-7b-instruct">Mistral</option>
    </select>
  </div>

  <div id="chatbox" class="chatbox"></div>

  <!-- CHAT INPUT -->
  <div id="chatUI" class="inputbar">
    <input id="prompt" placeholder="Ketik pesan...">
    <button onclick="sendChat()">Kirim</button>
  </div>

  <!-- TEXT TO IMAGE -->
  <div id="t2iUI" class="section hidden">
    <input id="imgPrompt" style="width:80%;padding:10px;" placeholder="Deskripsi gambar...">
    <button onclick="generateImage()">Generate</button>
    <div id="imgResult" style="margin-top:20px;"></div>
  </div>

  <!-- VISION -->
  <div id="visionUI" class="section hidden">
    <input type="file" id="visionFile">
    <button onclick="analyzeImage()">Analisis</button>
  </div>

  <!-- FILE ANALYZER -->
  <div id="fileUI" class="section hidden">
    <input type="file" id="textFile">
    <button onclick="analyzeFile()">Analisis File</button>
  </div>

</div>


<script>
function switchMode(mode, btn){
  document.querySelectorAll(".mode-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");

  document.getElementById("chatUI").classList.add("hidden");
  document.getElementById("t2iUI").classList.add("hidden");
  document.getElementById("visionUI").classList.add("hidden");
  document.getElementById("fileUI").classList.add("hidden");

  if(mode==="chat") document.getElementById("chatUI").classList.remove("hidden");
  if(mode==="t2i") document.getElementById("t2iUI").classList.remove("hidden");
  if(mode==="vision") document.getElementById("visionUI").classList.remove("hidden");
  if(mode==="file") document.getElementById("fileUI").classList.remove("hidden");
}

const chatbox = document.getElementById("chatbox");

function addBubble(text, who){
  const div=document.createElement("div");
  div.className="bubble "+who;
  div.innerText=text;
  chatbox.appendChild(div);
  chatbox.scrollTop=chatbox.scrollHeight;
}

function addTyping(){
  const wrap=document.createElement("div");
  wrap.className="typing";
  wrap.innerHTML="<span></span><span></span><span></span>";
  chatbox.appendChild(wrap);
  chatbox.scrollTop=chatbox.scrollHeight;
  return wrap;
}

function removeTyping(t){ t.remove(); }

async function sendChat(){
  const prompt=document.getElementById("prompt").value;
  if(!prompt) return;

  addBubble(prompt,"user");

  const typing=addTyping();

  const model=document.getElementById("modelSelect").value;

  const res=await fetch("/api/chat",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,model})
  });
  const data=await res.json();

  removeTyping(typing);
  addBubble(data.reply,"ai");
}

/* IMAGE GENERATOR */
async function generateImage(){
  const prompt=document.getElementById("imgPrompt").value;
  const res=await fetch("/api/t2i",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt})
  });
  const blob=await res.blob();
  const url=URL.createObjectURL(blob);
  document.getElementById("imgResult").innerHTML=
    \`<img src="\${url}" style="max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.2)">\`;
}

/* VISION */
async function analyzeImage(){
  const f=document.getElementById("visionFile").files[0];
  const fd=new FormData();
  fd.append("file",f);
  const res=await fetch("/api/vision",{method:"POST",body:fd});
  const data=await res.json();
  addBubble(data.reply,"ai");
}

/* FILE ANALYZER */
async function analyzeFile(){
  const f=document.getElementById("textFile").files[0];
  const fd=new FormData();
  fd.append("file",f);
  const res=await fetch("/api/file",{method:"POST",body:fd});
  const data=await res.json();
  addBubble(data.reply,"ai");
}
</script>

</body>
</html>
`;
}
