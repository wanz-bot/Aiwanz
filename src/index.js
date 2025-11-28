export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(UI, { headers: { "Content-Type": "text/html" } });
    }

    // CHAT
    if (url.pathname === "/api/chat") {
      const { prompt, model } = await request.json();

      const ai = await env.AI.run(model, {
        messages: [{ role: "user", content: prompt }],
      });

      return Response.json({ reply: ai.response });
    }

    // ANALISIS GAMBAR
    if (url.pathname === "/api/vision") {
      const body = await request.formData();
      const file = body.get("file");
      const bytes = await file.arrayBuffer();

      const ai = await env.AI.run("@cf/mistral/mistral-embed-image", {
        image: [...new Uint8Array(bytes)],
      });

      return Response.json({ result: ai });
    }

    // ANALISIS FILE
    if (url.pathname === "/api/analyze-file") {
      const body = await request.formData();
      const file = body.get("file");
      const text = await file.text();

      const ai = await env.AI.run("@cf/meta/llama-3.1-70b-instruct", {
        messages: [
          { role: "system", content: "Analisis mendalam isi file:" },
          { role: "user", content: text }
        ]
      });

      return Response.json({ reply: ai.response });
    }

    // IMAGE GENERATOR
    if (url.pathname === "/api/generate-image") {
      const { prompt } = await request.json();

      const image = await env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        { prompt }
      );

      return new Response(image, { headers: { "Content-Type": "image/png" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};

// =============================
// MODERN UI — WANZ AI
// =============================
const UI = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">

<title>Wanz AI</title>

<style>
body {
  margin:0;
  background:#fafafa;
  font-family: "Segoe UI", Arial;
  display:flex;
  height:100vh;
}

/* SIDEBAR */
.sidebar {
  width:260px;
  background:#ffffff;
  border-right:1px solid #e5e5e5;
  padding:20px;
}

.logo {
  font-size:22px;
  font-weight:700;
  margin-bottom:25px;
}

.menu button {
  width:100%;
  padding:12px;
  margin-bottom:10px;
  border-radius:10px;
  border:none;
  background:#f1f1f1;
  cursor:pointer;
  font-size:15px;
}

.menu button.active {
  background:#000;
  color:#fff;
}

.main {
  flex:1;
  padding:20px;
  overflow:auto;
}

/* CHAT UI */
#chatBox {
  background:#fff;
  height:70vh;
  padding:15px;
  border-radius:12px;
  overflow-y:auto;
  box-shadow:0 0 10px rgba(0,0,0,0.06);
}

.bubble {
  padding:12px 15px;
  margin:10px 0;
  border-radius:10px;
  max-width:80%;
  line-height:1.5;
}

.me { background:#dff1ff; align-self:flex-end }
.ai { background:#eeeeee }

/* TYPING ANIMATION */
.typing {
  display:inline-block;
  width:60px;
  height:14px;
  background:url('https://i.imgur.com/6RMhx.gif');
  background-size:contain;
}

/* FORMS */
input, textarea {
  width:100%;
  padding:12px;
  border-radius:10px;
  border:1px solid #ccc;
  margin-top:10px;
  font-size:15px;
}

button.send {
  padding:12px 18px;
  margin-top:10px;
  background:#000;
  color:#fff;
  border:none;
  border-radius:10px;
  cursor:pointer;
}
</style>
</head>

<body>

<div class="sidebar">
  <div class="logo">⚡ Wanz AI</div>

  <div class="menu">
    <button class="active" onclick="showPage('chat')">Chat AI</button>
    <button onclick="showPage('vision')">Analisis Gambar</button>
    <button onclick="showPage('file')">Analisis File</button>
    <button onclick="showPage('imagegen')">Buat Gambar</button>
  </div>
</div>

<div class="main">

  <!-- CHAT -->
  <div id="chat" class="page active">
    <h2>Chat AI</h2>
    <select id="model">
      <option value="@cf/meta/llama-3.1-8b-instruct">LLaMA 8B</option>
      <option value="@cf/meta/llama-3.1-70b-instruct">LLaMA 70B</option>
    </select>

    <div id="chatBox"></div>

    <input id="prompt" placeholder="Tulis pesan...">
    <button class="send" onclick="sendChat()">Kirim</button>
  </div>

  <!-- VISION -->
  <div id="vision" class="page" style="display:none">
    <h2>Analisis Gambar</h2>
    <input type="file" id="visionFile" accept="image/*">
    <button class="send" onclick="analyzeImage()">Analisis</button>
    <div id="visionResult"></div>
  </div>

  <!-- FILE -->
  <div id="file" class="page" style="display:none">
    <h2>Analisis File</h2>
    <input type="file" id="uploadFile">
    <button class="send" onclick="analyzeFile()">Analisis</button>
    <div id="fileResult"></div>
  </div>

  <!-- IMAGEGEN -->
  <div id="imagegen" class="page" style="display:none">
    <h2>Buat Gambar</h2>
    <textarea id="imgPrompt" placeholder="Deskripsi gambar..."></textarea>
    <button class="send" onclick="generateImage()">Generate</button>
    <div id="imgOutput"></div>
  </div>

</div>


<script>
// PAGE SWITCH
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.style.display="none");
  document.querySelectorAll('.menu button').forEach(b=>b.classList.remove("active"));
  document.getElementById(id).style.display="block";
  event.target.classList.add("active");
}

// CHAT
async function sendChat(){
  const box = document.getElementById("chatBox");
  const prompt = document.getElementById("prompt").value;
  const model = document.getElementById("model").value;

  if (!prompt) return;

  box.innerHTML += '<div class="bubble me"><b>Anda:</b> '+prompt+'</div>';
  document.getElementById("prompt").value = "";

  box.innerHTML += '<div id="typing" class="bubble ai"><div class="typing"></div></div>';
  box.scrollTop = box.scrollHeight;

  const res = await fetch("/api/chat", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ prompt, model })
  });

  const data = await res.json();

  document.getElementById("typing").remove();
  box.innerHTML += '<div class="bubble ai"><b>AI:</b> '+data.reply+'</div>';
  box.scrollTop = box.scrollHeight;
}

// VISION
async function analyzeImage(){
  const f = document.getElementById("visionFile").files[0];
  if (!f) return alert("Pilih file");

  const fd = new FormData();
  fd.append("file", f);

  const res = await fetch("/api/vision", { method:"POST", body:fd });
  const j = await res.json();

  document.getElementById("visionResult").innerHTML =
    "<pre>"+JSON.stringify(j,null,2)+"</pre>";
}

// FILE
async function analyzeFile(){
  const f = document.getElementById("uploadFile").files[0];
  if (!f) return alert("Pilih file");

  const fd = new FormData();
  fd.append("file", f);

  const res = await fetch("/api/analyze-file", { method:"POST", body:fd });
  const j = await res.json();

  document.getElementById("fileResult").innerHTML =
    "<pre>"+j.reply+"</pre>";
}

// IMAGE GENERATION
async function generateImage(){
  const p = document.getElementById("imgPrompt").value;

  const res = await fetch("/api/generate-image", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ prompt:p })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  document.getElementById("imgOutput").innerHTML =
    '<img src="'+url+'" width="400">';
}
</script>

</body>
</html>
`;
