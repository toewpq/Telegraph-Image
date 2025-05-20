// functions/upload.js

export async function onRequestPost(context) {
  const { request } = context;

  // 允许跨域
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析 multipart/form-data
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return new Response(JSON.stringify({ success: false, message: "未检测到图片文件" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 构造 telegra.ph 的 form-data
    const tgForm = new FormData();
    tgForm.append("file", file, file.name);

    // 上传到 telegra.ph
    const tgRes = await fetch("https://telegra.ph/upload", {
      method: "POST",
      body: tgForm,
    });
    const tgData = await tgRes.json();

    if (tgData[0] && tgData[0].src) {
      return new Response(JSON.stringify({
        success: true,
        url: "https://telegra.ph" + tgData[0].src,
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      return new Response(JSON.stringify({ success: false, message: "Telegraph 上传失败" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
