export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") return new Response(htmlUI, { headers });

    if (url.pathname === "/api/chat" && request.method === "POST")
      return chatAI(request, env);

    return new Response("Not Found", { status: 404 });
  }
};

const headers = {
  "content-type": "text/html; charset=utf-8"
};

// API key default (bebas kamu ganti)
const PUBLIC_API_KEY = "wanz-" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);

async function chatAI(req, env) {
  const { message, model } = await req.json();

  const aiResponse = await env.AI.run(model || "@cf/meta/llama-3.1-8b-instruct", {
    messages: [{ role: "user", content: message }]
  });

  return new Response(
    JSON.stringify({ response: aiResponse.response }),
    { headers: { "content-type": "application/json" } }
  );
}

const htmlUI = `
<!DOCTYPE html>
<html>
<head>
<title>Wanz AI</title>
<style>
  body {
    font-family: Arial, sans-serif;
    background: #ffffff;
    margin: 0;
    padding: 0;
    color: #333;
  }

  .topbar {
    background: white;
    padding: 18px;
    font-size: 22px;
    font-weight: bold;
    border-bottom: 1px solid #eee;
    text-align: center;
  }

  .container {
    max-width: 900px;
    margin: 30px auto;
    padding: 20px;
  }

  .card {
    border: 1px solid #ddd;
    padding: 18px;
    border-radius: 10px;
    background: white;
    margin-bottom: 20px;
  }

  select, input, button, textarea {
    width: 100%;
    padding: 12px;
    margin-top: 8px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 15px;
  }

  button {
    background: #1a73e8;
    color: white;
    border: none;
    cursor: pointer;
  }
  button:hover { background: #0c56c9; }

  .chat-box {
    border: 1px solid #ccc;
    padding: 15px;
    height: 310px;
    overflow-y: auto;
    border-radius: 10px;
    background: #fafafa;
  }

  .aiTyping {
    opacity: 0.7;
    font-style: italic;
  }

  @keyframes blink {
    0% { opacity: 1 }
    50% { opacity: 0 }
    100% { opacity: 1 }
  }
  .dot {
    animation: blink 1s infinite;
  }
</style>
</head>
<body>

<div class="topbar">Wanz AI Chat — Unlimited</div>

<div class="container">

<!-- Dashboard -->
<div class="card">
  <h3>🔑 API Key Publik</h3>
  <p>Semua user bisa pakai API Key ini tanpa login.</p>
  <input value="${PUBLIC_API_KEY}" readonly>
</div>

<!-- Chat UI -->
<div class="card">
  <h3>💬 Chat AI Unlimited</h3>

  <select id="model">
    <option value="@cf/meta/llama-3.1-8b-instruct">Llama 3.1 — 8B</option>
    <option value="@cf/meta/llama-3.1-70b-instruct">Llama 3.1 — 70B</option>
  </select>

  <div id="chatBox" class="chat-box"></div>

  <input id="msg" placeholder="Ketik pesan...">
  <button onclick="sendChat()">Kirim</button>
</div>

<!-- Dokumentasi -->
<div class="card">
  <h3>📘 Dokumentasi API</h3>
  <p><b>Endpoint:</b></p>
  <pre>/api/chat</pre>

  <p><b>Header:</b></p>
  <pre>x-api-key: ${PUBLIC_API_KEY}</pre>

  <p><b>Body:</b></p>
  <pre>{
  "message": "Halo!",
  "model": "@cf/meta/llama-3.1-8b-instruct"
}</pre>

  <p><b>Contoh cURL:</b></p>
  <pre>curl -X POST https://domainkamu.workers.dev/api/chat \\
  -H "x-api-key: ${PUBLIC_API_KEY}" \\
  -d '{"message":"hai"}'</pre>
</div>

</div>

<script>
const API_KEY = "${PUBLIC_API_KEY}";

function appendMessage(text, sender) {
  const div = document.getElementById("chatBox");
  div.innerHTML += "<p><b>" + sender + ":</b> " + text + "</p>";
  div.scrollTop = div.scrollHeight;
}

async function sendChat() {
  let msg = document.getElementById("msg").value;
  let model = document.getElementById("model").value;

  appendMessage(msg, "Kamu");

  let box = document.getElementById("chatBox");
  let typing = document.createElement("p");
  typing.className = "aiTyping";
  typing.innerHTML = "AI mengetik<span class='dot'>...</span>";
  box.appendChild(typing);

  let res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({ message: msg, model })
  });

  let data = await res.json();
  typing.remove();

  appendMessage(data.response, "AI");
}
</script>

</body>
</html>
`;
