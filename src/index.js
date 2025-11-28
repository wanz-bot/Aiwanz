export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ------------------- ROUTES -----------------------
    if (url.pathname === "/") return new Response(htmlUI, { headers });

    if (url.pathname === "/api/register" && request.method === "POST") {
      return register(request, env);
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      return login(request, env);
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      return chatAI(request, env);
    }

    if (url.pathname === "/api/user") {
      return getUser(request, env);
    }

    return new Response("Not Found", { status: 404 });
  }
};

// ------------------ HELPERS --------------------------

const headers = {
  "content-type": "text/html; charset=utf-8"
};

function generateApiKey() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
}

async function register(req, env) {
  const body = await req.json();
  const { email, password } = body;

  const exist = await env.LIMIT_KV.get(`user:${email}`);
  if (exist) return json({ error: "Email sudah terdaftar" }, 400);

  const apiKey = generateApiKey();

  await env.LIMIT_KV.put(`user:${email}`, JSON.stringify({
    email,
    password,
    apiKey,
    created: Date.now()
  }));

  // buat limit default
  await env.LIMIT_KV.put(`limit:${apiKey}`, JSON.stringify({
    used: 0,
    max: 50,
    reset: Date.now() + 86400000
  }));

  return json({ success: true, apiKey });
}

async function login(req, env) {
  const { email, password } = await req.json();
  const user = await env.LIMIT_KV.get(`user:${email}`, { type: "json" });

  if (!user || user.password !== password)
    return json({ error: "Email atau password salah" }, 400);

  return json({ success: true, apiKey: user.apiKey });
}

async function getUser(req, env) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return json({ error: "Missing API key" }, 401);

  const user = await env.LIMIT_KV.list({ prefix: "user:" });
  let u = null;
  for (const key of user.keys) {
    const data = await env.LIMIT_KV.get(key.name, { type: "json" });
    if (data.apiKey === apiKey) u = data;
  }
  if (!u) return json({ error: "Invalid API key" }, 401);

  const limit = await env.LIMIT_KV.get(`limit:${apiKey}`, { type: "json" });

  return json({ email: u.email, apiKey, limit });
}

async function chatAI(req, env) {
  const { message, model } = await req.json();
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) return json({ error: "API key required" }, 401);

  // cek limit
  const limit = await env.LIMIT_KV.get(`limit:${apiKey}`, { type: "json" });
  if (!limit) return json({ error: "Limit tidak ditemukan" }, 400);

  if (Date.now() > limit.reset) {
    limit.used = 0;
    limit.reset = Date.now() + 86400000;
  }

  if (limit.used >= limit.max)
    return json({ error: "Limit AI harian habis" }, 429);

  limit.used++;
  await env.LIMIT_KV.put(`limit:${apiKey}`, JSON.stringify(limit));

  // AI Response
  const aiResponse = await env.AI.run(model || "@cf/meta/llama-3.1-8b-instruct", {
    messages: [{ role: "user", content: message }]
  });

  return json({ response: aiResponse.response });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}

// ===================== HTML UI (REWORK) =======================
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
    background: #ffffff;
    padding: 18px 25px;
    border-bottom: 1px solid #ddd;
    font-size: 22px;
    font-weight: bold;
    text-align: left;
  }

  .container {
    max-width: 1000px;
    margin: 25px auto;
    padding: 20px;
  }

  .card {
    border: 1px solid #ddd;
    padding: 20px;
    border-radius: 10px;
    background: white;
    margin-bottom: 20px;
  }

  input, select, button, textarea {
    width: 100%;
    padding: 12px;
    margin-top: 8px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
  }

  button {
    background: #0068ff;
    color: white;
    border: none;
    cursor: pointer;
  }

  button:hover {
    background: #0052cb;
  }

  .chat-box {
    border: 1px solid #ccc;
    padding: 15px;
    height: 250px;
    overflow-y: auto;
    border-radius: 10px;
    background: #fafafa;
  }

  .typing-anim {
    display: inline-block;
    border-right: 2px solid #333;
    padding-right: 3px;
    animation: blink 0.7s infinite;
  }

  @keyframes blink {
    0% { border-color: #333; }
    50% { border-color: transparent; }
    100% { border-color: #333; }
  }

  pre {
    background: #f7f7f7;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
  }
</style>
</head>
<body>

<div class="topbar">Wanz AI Platform</div>

<div class="container">

<!-- LOGIN BOX -->
<div id="authBox" class="card">
  <h3>Login / Register</h3>
  <input id="email" placeholder="Email">
  <input id="password" placeholder="Password" type="password">
  <button onclick="login()">Login</button>
  <button onclick="register()">Register</button>
</div>

<!-- DASHBOARD -->
<div id="dashboard" class="card" style="display:none;">
  <h3>Dashboard</h3>
  <p><b>Email:</b> <span id="dbEmail"></span></p>
  <p><b>API Key:</b> <code id="dbApiKey"></code></p>
  <p><b>Limit Harian:</b> <span id="dbLimitMax"></span></p>
  <p><b>Sudah Dipakai:</b> <span id="dbLimitUsed"></span></p>
  <p><b>Reset Pada:</b> <span id="dbLimitReset"></span></p>
</div>

<!-- CHAT -->
<div id="chatUI" class="card" style="display:none;">
  <h3>Chat AI</h3>

  <select id="model">
    <option value="@cf/meta/llama-3.1-8b-instruct">Llama 3.1 - 8B</option>
    <option value="@cf/meta/llama-3.1-70b-instruct">Llama 3.1 - 70B</option>
  </select>

  <div class="chat-box" id="chatBox"></div>

  <input id="msg" placeholder="Tulis pesan...">
  <button onclick="sendChat()">Kirim</button>
</div>

<!-- DOKUMENTASI -->
<div id="docs" class="card" style="display:none;">
  <h3>Dokumentasi API</h3>

  <p><b>Endpoint:</b></p>
  <pre>/api/chat</pre>

  <p><b>Headers:</b></p>
  <pre>x-api-key: API_KEY_KAMU</pre>

  <p><b>Body:</b></p>
  <pre>{
  "message": "Halo",
  "model": "@cf/meta/llama-3.1-8b-instruct"
}</pre>

  <p><b>Contoh Request cURL:</b></p>
  <pre>curl -X POST https://domainkamu.workers.dev/api/chat \\
  -H "x-api-key: API_KEY_KAMU" \\
  -d '{"message":"Halo","model":"@cf/meta/llama-3.1-8b-instruct"}'</pre>
</div>

</div>

<script>
let apiKey = null;

function appendMessage(text, sender) {
  const box = document.getElementById("chatBox");
  box.innerHTML += "<p><b>"+sender+":</b> "+text+"</p>";
  box.scrollTop = box.scrollHeight;
}

async function register() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  let res = await fetch("/api/register", {
    method:"POST",
    body: JSON.stringify({ email, password })
  });

  let data = await res.json();
  if(data.error) return alert(data.error);
  alert("Registrasi berhasil!\nAPI Key kamu: " + data.apiKey);
}

async function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  let res = await fetch("/api/login", {
    method:"POST",
    body: JSON.stringify({ email, password })
  });

  let data = await res.json();

  if(data.error) return alert(data.error);

  apiKey = data.apiKey;

  document.getElementById("authBox").style.display = "none";

  await loadDashboard();

  document.getElementById("dashboard").style.display = "block";
  document.getElementById("chatUI").style.display = "block";
  document.getElementById("docs").style.display = "block";
}

async function loadDashboard() {
  let res = await fetch("/api/user", {
    headers: { "x-api-key": apiKey }
  });

  let data = await res.json();

  document.getElementById("dbEmail").innerText = data.email;
  document.getElementById("dbApiKey").innerText = data.apiKey;
  document.getElementById("dbLimitMax").innerText = data.limit.max;
  document.getElementById("dbLimitUsed").innerText = data.limit.used;

  const d = new Date(data.limit.reset);
  document.getElementById("dbLimitReset").innerText = d.toLocaleString();
}

async function sendChat() {
  let msg = document.getElementById("msg").value;
  let model = document.getElementById("model").value;

  if (!msg.trim()) return;

  appendMessage(msg, "Kamu");

  const box = document.getElementById("chatBox");
  const typing = document.createElement("p");
  typing.innerHTML = "<i>AI sedang mengetik <span class='typing-anim'>...</span></i>";
  box.appendChild(typing);

  let res = await fetch("/api/chat", {
    method:"POST",
    headers: { "x-api-key": apiKey },
    body: JSON.stringify({ message: msg, model })
  });

  let data = await res.json();

  typing.remove();

  appendMessage(data.response, "AI");

  document.getElementById("msg").value = "";

  loadDashboard();
}
</script>

</body>
</html>
`;
