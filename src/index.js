export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==============================
    // HALAMAN CHAT UI
    // ==============================
    if (url.pathname === "/") {
      return new Response(getUI(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // ==============================
    // API CHAT
    // ==============================
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const { prompt } = await request.json();

      // Panggil AI Cloudflare
      const ai = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: prompt }]
      });

      let reply = "";

      // FIX agar tidak [object Object]
      if (typeof ai.response === "string") {
        reply = ai.response;
      } else if (ai.messages && ai.messages[0]?.content) {
        reply = ai.messages[0].content;
      } else {
        reply = "Maaf, saya tidak mengerti.";
      }

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

function getUI() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Chat</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 900px;
      margin: auto;
      padding: 20px;
    }

    h1 {
      text-align: center;
      font-size: 28px;
      margin-bottom: 20px;
      color: #222;
    }

    #chatBox {
      height: 70vh;
      overflow-y: auto;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fafafa;
    }

    .me {
      margin-bottom: 15px;
      padding: 10px 15px;
      background: #e3f2fd;
      border-radius: 8px;
      max-width: 80%;
    }

    .ai {
      margin-bottom: 15px;
      padding: 10px 15px;
      background: #f1f1f1;
      border-radius: 8px;
      max-width: 80%;
    }

    .input-area {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }

    input {
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

    .typing {
      font-style: italic;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Chat</h1>

    <div id="chatBox"></div>

    <div class="input-area">
      <input type="text" id="prompt" placeholder="Tulis pesan..." />
      <button onclick="send()">Kirim</button>
    </div>
  </div>

  <script>
    async function send() {
      const prompt = document.getElementById("prompt").value;
      if (!prompt) return;

      const chatBox = document.getElementById("chatBox");

      chatBox.innerHTML += \`<div class="me"><b>Anda:</b> \${prompt}</div>\`;

      document.getElementById("prompt").value = "";

      // Animasi AI mengetik
      const typing = document.createElement("div");
      typing.className = "typing";
      typing.innerText = "AI sedang mengetik...";
      chatBox.appendChild(typing);

      // Scroll otomatis
      chatBox.scrollTop = chatBox.scrollHeight;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      typing.remove();

      chatBox.innerHTML += \`<div class="ai"><b>AI:</b> \${data.reply}</div>\`;

      chatBox.scrollTop = chatBox.scrollHeight;
    }
  </script>

</body>
</html>
`;
}
