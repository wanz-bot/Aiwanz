export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(getUI(), { headers: { "Content-Type": "text/html" } });
    }

    // =====================
    // CHAT API
    // =====================
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const { message, model } = await request.json();

      // Map model frontend → model Cloudflare AI
      const modelMap = {
        llama: "@cf/meta/llama-3.1-8b-instruct",
        Gemini: "@cf/google/gemma-3-12b-it",
        deepseek: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        "mistral": "@cf/mistral/mistral-7b-instruct-v0.1"
      };

      const use = modelMap[model] || "gpt-4o-mini";

      const ai = await env.AI.run(use, {
        messages: [
          { role: "system", content: "You are Wanz AI. Answer clearly, fast, and friendly." },
          { role: "user", content: message }
        ]
      });

      let reply = "";
      if (typeof ai.response === "string") reply = ai.response;
      else if (ai.messages && ai.messages[0]?.content) reply = ai.messages[0].content;
      else reply = "Maaf, saya tidak mengerti.";

      return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Wanz AI OK", { status: 200 });
  }
};

function getUI() {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wanz AI Chat Multi Model</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif}
body{background:#f7f7f8;display:flex;justify-content:center;align-items:center;min-height:100vh}
.container{width:100%;max-width:800px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);display:flex;flex-direction:column;overflow:hidden;height:90vh}
.header{padding:20px;background:#fff;border-bottom:1px solid #eee;text-align:center;font-weight:600;font-size:22px;color:#111;display:flex;justify-content:space-between;align-items:center;gap:10px}
#chatBox{flex:1;padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;background:#f7f7f8}
.bubble{padding:12px 16px;border-radius:12px;max-width:75%;word-wrap:break-word;opacity:0;transform:translateY(20px);animation:fadeInUp 0.3s forwards}
.me{background:#dcf3ff;color:#111;align-self:flex-end;border-bottom-right-radius:2px}
.ai{background:#ececec;color:#111;align-self:flex-start;border-bottom-left-radius:2px;position:relative}
.typing-dots{display:flex;gap:4px}
.typing-dots div{width:8px;height:8px;background:#999;border-radius:50%;animation:blink 1s infinite}
.typing-dots div:nth-child(2){animation-delay:0.2s}
.typing-dots div:nth-child(3){animation-delay:0.4s}
.input-area{display:flex;padding:15px;border-top:1px solid #eee;background:#fff;gap:10px}
input{flex:1;padding:12px;border-radius:12px;border:1px solid #ddd;outline:none;font-size:16px}
select.model-select{border-radius:12px;border:1px solid #ddd;padding:10px;font-size:14px}
button.send-btn{padding:12px 20px;border:none;border-radius:12px;background:#10a37f;color:#fff;font-weight:600;cursor:pointer;transition:all 0.2s}
button.send-btn:hover{background:#0e8a6f;transform:scale(1.05)}
@keyframes fadeInUp{to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
@media(max-width:600px){.container{height:95vh;padding:0}.header{font-size:18px}.input-area input,button.send-btn{font-size:14px;padding:10px}}
</style>
</head>
<body>
<div class="container">
<div class="header">
  Wanz AI Chat
  <select id="model" class="model-select">
    <option value="llama">LLaMA 8B</option>
    <option value="Gemini">Gemini 3.2</option>
    <option value="deepseek">DeepSeek R1</option>
    <option value="mistral">Mistral 7B</option>
  </select>
</div>
<div id="chatBox"></div>
<div class="input-area">
<input type="text" id="prompt" placeholder="Tulis pesan..." onkeydown="if(event.key==='Enter'){sendMessage();}">
<button class="send-btn" onclick="sendMessage()">Kirim</button>
</div>
</div>

<script>
async function sendMessage(){
  const prompt=document.getElementById('prompt').value.trim();
  const model=document.getElementById('model').value;
  if(!prompt) return;
  const chatBox=document.getElementById('chatBox');

  // User bubble
  const meBubble=document.createElement('div');
  meBubble.className='bubble me';
  meBubble.innerText=prompt;
  chatBox.appendChild(meBubble);
  chatBox.scrollTop=chatBox.scrollHeight;
  document.getElementById('prompt').value='';

  // Typing animation AI
  const typingDiv=document.createElement('div');
  typingDiv.className='bubble ai';
  typingDiv.innerHTML='<div class="typing-dots"><div></div><div></div><div></div></div>';
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop=chatBox.scrollHeight;

  try{
    const res=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:prompt, model:model})
    });
    const data=await res.json();
    typingDiv.remove();

    const aiBubble=document.createElement('div');
    aiBubble.className='bubble ai';
    aiBubble.innerText=data.reply;
    chatBox.appendChild(aiBubble);
    chatBox.scrollTop=chatBox.scrollHeight;
  }catch(e){
    typingDiv.innerText='Error: Tidak bisa koneksi server';
  }
}
</script>
</body>
</html>
`;
}
