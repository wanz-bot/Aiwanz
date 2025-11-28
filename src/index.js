export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Halaman UI
    if (url.pathname === "/") {
      return new Response(getUI(), {
        headers: { "Content-Type": "text/html" }
      });
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

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

// ================================
// HTML UI Modern
// ================================
function getUI() {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Wanz AI Chat</title>
<style>
body {
  margin:0; padding:0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg,#667eea,#764ba2);
  color:#fff;
}
.container {
  max-width: 700px;
  margin: 50px auto;
  background:#1f1f2e;
  padding:20px;
  border-radius:15px;
  box-shadow:0 10px 30px rgba(0,0,0,0.5);
}
h1 {
  text-align:center;
  margin-bottom:20px;
  font-size:28px;
  color:#fff;
}
#chatBox {
  height:60vh;
  overflow-y:auto;
  background:#2a2a3c;
  padding:15px;
  border-radius:10px;
  margin-bottom:15px;
}
.bubble {
  padding:10px 15px;
  border-radius:15px;
  margin-bottom:10px;
  max-width:80%;
  word-wrap:break-word;
}
.me { background:#667eea; align-self:flex-end; }
.ai { background:#764ba2; align-self:flex-start; }
.loader {
  font-style:italic;
  color:#ccc;
  padding:10px;
}
.input-area {
  display:flex;
  gap:10px;
}
input, select {
  flex:1;
  padding:12px;
  border-radius:10px;
  border:none;
  outline:none;
}
button {
  padding:12px 20px;
  border-radius:10px;
  border:none;
  background:#ff9800;
  color:#fff;
  cursor:pointer;
}
#chatBox .bubbles { display:flex; flex-direction:column; }
</style>
</head>
<body>
<div class="container">
<h1>Wanz AI Chat</h1>

<select id="model">
  <option value="@cf/meta/llama-3.1-8b-instruct">LLaMA 8B</option>
  <option value="@cf/meta/llama-3.1-70b-instruct">LLaMA 70B</option>
</select>

<div id="chatBox"><div class="bubbles"></div></div>

<div class="input-area">
<input type="text" id="prompt" placeholder="Tulis pesan..." />
<button onclick="send()">Kirim</button>
</div>
</div>

<script>
async function send() {
  const prompt = document.getElementById("prompt").value;
  if(!prompt) return;
  const model = document.getElementById("model").value;
  const chatBox = document.querySelector("#chatBox .bubbles");

  chatBox.innerHTML += '<div class="bubble me"><b>Anda:</b> '+prompt+'</div>';
  document.getElementById("prompt").value = "";

  const typing = document.createElement("div");
  typing.className="loader";
  typing.innerText="AI mengetik...";
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;

  const res = await fetch("/api/chat", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ message: prompt, model: model })
  });

  const data = await res.json();
  typing.remove();
  chatBox.innerHTML += '<div class="bubble ai"><b>AI:</b> '+data.reply+'</div>';
  chatBox.scrollTop = chatBox.scrollHeight;
}
</script>
</body>
</html>
`;
}
