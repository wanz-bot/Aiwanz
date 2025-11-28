export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // UI halaman
    if (url.pathname === "/") {
      return new Response(getUI(), { headers: { "Content-Type": "text/html" } });
    }

    // API Chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const { model, message } = await request.json();

      const ai = await env.AI.run(model, {
        messages: [
          { role: "system", content: "You are Wanz AI. Answer clearly, fast, simply." },
          { role: "user", content: message }
        ]
      });

      let reply = "";
      if (typeof ai.response === "string") reply = ai.response;
      else if (ai.messages && ai.messages[0]?.content) reply = ai.messages[0].content;
      else reply = "Maaf, saya tidak mengerti.";

      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};

function getUI() {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wanz AI Chat</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

* { box-sizing: border-box; margin:0; padding:0; font-family:'Inter',sans-serif; }
body {
  background: linear-gradient(135deg,#667eea,#764ba2);
  min-height:100vh; display:flex; justify-content:center; align-items:center;
}
.container {
  width:100%; max-width:720px;
  background:#1f1f2e; border-radius:20px;
  padding:20px; display:flex; flex-direction:column;
  box-shadow:0 15px 35px rgba(0,0,0,0.5);
}
h1 {
  text-align:center; margin-bottom:20px; color:#fff; font-size:28px;
}
#model { 
  width:100%; padding:10px; border-radius:10px; border:none; margin-bottom:15px; font-size:16px;
}
#chatBox {
  flex:1; background:#2a2a3c; padding:15px;
  border-radius:15px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;
  margin-bottom:15px;
}
.bubble { padding:12px 16px; border-radius:15px; max-width:80%; word-wrap:break-word; opacity:0; transform:translateY(20px); animation: fadeInUp 0.4s forwards; }
.me { background:#667eea; align-self:flex-end; color:#fff; }
.ai { background:#764ba2; align-self:flex-start; color:#fff; }
.loader { font-style:italic; color:#ccc; padding:10px; text-align:center; }

.input-area { display:flex; gap:10px; }
input {
  flex:1; padding:12px; border-radius:12px; border:none; outline:none; font-size:16px;
}
button {
  padding:12px 20px; border-radius:12px; border:none; background:#ff9800; color:#fff; font-weight:600; cursor:pointer;
  transition: all 0.2s;
}
button:hover { background:#e68900; transform:scale(1.05); }

@keyframes fadeInUp { to { opacity:1; transform:translateY(0); } }
@media(max-width:600px){
  .container { padding:15px; border-radius:15px; }
  h1 { font-size:24px; }
  input, button { font-size:14px; padding:10px; }
}
</style>
</head>
<body>
<div class="container">
<h1>Wanz AI Chat</h1>

<select id="model">
  <option value="@cf/meta/llama-3.1-8b-instruct">LLaMA 8B</option>
  <option value="@cf/meta/llama-3.1-70b-instruct">LLaMA 70B</option>
</select>

<div id="chatBox"></div>

<div class="input-area">
<input type="text" id="prompt" placeholder="Tulis pesan..." onkeydown="if(event.key==='Enter'){send();}" />
<button onclick="send()">Kirim</button>
</div>
</div>

<script>
async function send() {
  const prompt = document.getElementById("prompt").value.trim();
  if(!prompt) return;
  const model = document.getElementById("model").value;
  const chatBox = document.getElementById("chatBox");

  const meBubble = document.createElement("div");
  meBubble.className="bubble me";
  meBubble.innerHTML="<b>Anda:</b> "+prompt;
  chatBox.appendChild(meBubble);
  chatBox.scrollTop = chatBox.scrollHeight;
  document.getElementById("prompt").value="";

  const typing = document.createElement("div");
  typing.className="loader";
  typing.innerText="AI mengetik...";
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message: prompt, model: model })
    });
    const data = await res.json();
    typing.remove();

    const aiBubble = document.createElement("div");
    aiBubble.className="bubble ai";
    aiBubble.innerHTML="<b>AI:</b> "+data.reply;
    chatBox.appendChild(aiBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch(e) {
    typing.innerText="Error: tidak bisa koneksi server.";
  }
}
</script>
</body>
</html>
`;
}
