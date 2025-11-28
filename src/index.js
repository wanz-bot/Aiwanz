export default {
  async fetch(request, env) {
    // Routing
    const url = new URL(request.url);

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = await request.json();
      const prompt = body.prompt || "Hello";

      // AI Cloudflare (tidak di global scope)
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "user", content: prompt }
        ]
      });

      return new Response(JSON.stringify({ reply: aiResponse }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Default: return HTML UI
    return new Response(uiHTML, {
      headers: { "Content-Type": "text/html" }
    });
  }
}

// UI halaman (tidak async)
const uiHTML = `
<!DOCTYPE html>
<html>
<head>
<title>AI Chat</title>
<style>
body {
  margin: 0;
  background: #ffffff;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 800px;
  margin: auto;
  padding: 20px;
}

.chat-box {
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 12px;
  height: 70vh;
  overflow-y: auto;
}

.input-box {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ccc;
}

button {
  padding: 12px 18px;
  border-radius: 10px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
}

.ai-typing {
  font-style: italic;
  opacity: 0.6;
  animation: blink 1s infinite;
}

@keyframes blink {
  0% { opacity: 0.3; }
  100% { opacity: 1; }
}
</style>
</head>
<body>
<div class="container">
  <h1>AI Chat</h1>
  <div class="chat-box" id="chat"></div>

  <div id="typing" style="margin-top:10px;"></div>

  <div class="input-box">
    <input id="msg" placeholder="Tulis pesan..." />
    <button onclick="send()">Kirim</button>
  </div>
</div>

<script>
  const chatBox = document.getElementById("chat");
  const typing = document.getElementById("typing");

  async function send() {
    let text = document.getElementById("msg").value;
    if (!text) return;

    chatBox.innerHTML += "<p><b>Anda:</b> " + text + "</p>";

    typing.innerHTML = "<p class='ai-typing'>AI sedang mengetik...</p>";

    let res = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ prompt: text })
    });

    let data = await res.json();

    typing.innerHTML = "";
    chatBox.innerHTML += "<p><b>AI:</b> " + data.reply + "</p>";
  }
</script>
</body>
</html>
`;
