export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ROUTES
    if (url.pathname === "/api/chat") return chatAI(request, env);
    if (url.pathname === "/api/image") return imageAI(request, env);
    if (url.pathname === "/api/analyze") return analyzeFile(request, env);

    return new Response("Wanz AI Backend OK", { status: 200 });
  }
};

/* ============================
   🔵 1. CHAT MULTI-AI
============================ */
async function chatAI(request, env) {
  const { model, message } = await request.json();

  // Map model frontend → model Cloudflare AI
  const modelMap = {
    gpt: "gpt-4o-mini",
    claude: "claude-3.7-sonnet",
    deepseek: "deepseek-r1"
  };

  const use = modelMap[model] || "gpt-4o-mini";

  const response = await env.AI.run(use, {
    messages: [
      { role: "system", content: "You are Wanz AI. Answer simply, clearly, fast." },
      { role: "user", content: message }
    ]
  });

  return json({ reply: response.output_text || "Error." });
}

/* ============================
   🟣 2. TEXT → IMAGE
============================ */
async function imageAI(request, env) {
  const { prompt } = await request.json();

  const result = await env.AI.run("stable-diffusion-xl-base-1.0", {
    prompt
  });

  const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(result)));

  return json({
    url: `data:image/png;base64,${imageBase64}`
  });
}

/* ============================
   🟡 3. FILE ANALYSIS
============================ */
async function analyzeFile(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) return json({ result: "No file uploaded." });

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const output = await env.AI.run("gpt-4o-mini", {
    messages: [
      { role: "system", content: "You are an expert file analyzer. Explain simply." },
      {
        role: "user",
        content: [
          { type: "input_text", text: `Analyze file: ${file.name}` },
          { type: "input_file", data: uint8 }
        ]
      }
    ]
  });

  return json({ result: output.output_text || "No result." });
}

/* ============================
   UTIL JSON RESPONSE
============================ */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
