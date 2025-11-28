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

// ===================== HTML UI =======================
const htmlUI = `
<!DOCTYPE html>
<html>
<head>
<title>Wanz AI Chat</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #0d0f14;
  margin: 0;
  padding: 0;
  color: white;
}
.container {
  max-width: 600px;
  margin: 40px auto;
  background: #1a1d24;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 0 25px rgba(0,0,0,0.5);
}
input, select {
  width: 100%; padding: 12px;
  margin-top: 8px;
  background: #11141a;
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
}
button {
  margin-top: 12px;
  width: 100%;
  padding: 12px;
  border: none;
  background: #4c84ff;
  color: white;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
}
.chat-box {
  background: #11141a;
  padding: 15px;
  border-radius: 10px;
  height: 220px;
  overflow-y: auto;
  margin-top: 10px;
  border: 1px solid #333;
}
.typing {
  border-right: 2px solid white;
  animation: cursor .6s infinite;
}
@keyframes cursor {
  0% { border-color: white; }
  50% { border-color: transparent; }
  100% { border-color: white; }
}
</style>
</head>
<body>
<div class="container">

<h2>🤖 Wanz AI Chat</h2>

<div id="authBox">
  <h3>Login</h3>
  <input id="email" placeholder="Email">
  <input id="password" placeholder="Password">
  <button onclick="login()">Login</button>
  <button onclick="register()">Register</button>
</div>

<div id="chatUI" style="display:none;">
  <h3>Model AI</h3>
  <select id="model">
    <option value="@cf/meta/llama-3.1-8b-instruct">Llama 3.1 - 8B</option>
    <option value="@cf/meta/llama-3.1-70b-instruct">Llama 3.1 - 70B</option>
  </select>

  <div class="chat-box" id="chatBox"></div>

  <input id="msg" placeholder="Tulis pesan...">
  <button onclick="sendChat()">Kirim</button>
</div>

</div>

<script>
let apiKey = null;

function appendMessage(text, sender) {
  const div = document.getElementById("chatBox");
  div.innerHTML += "<p><b>"+sender+":</b> "+text+"</p>";
  div.scrollTop = div.scrollHeight;
}

async function register() {
  let email = document.getElementById("email").value;
  let pass = document.getElementById("password").value;

  let res = await fetch("/api/register", {
    method:"POST",
    body: JSON.stringify({email,password:pass})
  });
  let data = await res.json();

  if(data.error) return alert(data.error);
  alert("Register sukses. API Key: "+data.apiKey);
}

async function login() {
  let email = document.getElementById("email").value;
  let pass = document.getElementById("password").value;

  let res = await fetch("/api/login", {
    method:"POST",
    body: JSON.stringify({email,password:pass})
  });
  let data = await res.json();

  if(data.error) return alert(data.error);

  apiKey = data.apiKey;
  document.getElementById("authBox").style.display="none";
  document.getElementById("chatUI").style.display="block";
}

async function sendChat() {
  let msg = document.getElementById("msg").value;
  let model = document.getElementById("model").value;

  appendMessage(msg, "Kamu");

  const typing = document.createElement("p");
  typing.innerHTML = "<i>AI sedang mengetik<span class='typing'>...</span></i>";
  document.getElementById("chatBox").appendChild(typing);

  let res = await fetch("/api/chat", {
    method:"POST",
    headers: { "x-api-key": apiKey },
    body: JSON.stringify({message: msg, model})
  });
  let data = await res.json();

  typing.remove();
  appendMessage(data.response, "AI");
}
</script>

</body>
</html>
`;
