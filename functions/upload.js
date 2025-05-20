export async function onRequest(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const uploadFile = formData.get('file');
    if (!uploadFile) {
      return new Response(JSON.stringify({ success: false, message: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 选择 Telegram API 端点
    let apiEndpoint, fieldName;
    if (uploadFile.type.startsWith('image/')) {
      apiEndpoint = 'sendPhoto';
      fieldName = 'photo';
    } else if (uploadFile.type.startsWith('audio/')) {
      apiEndpoint = 'sendAudio';
      fieldName = 'audio';
    } else if (uploadFile.type.startsWith('video/')) {
      apiEndpoint = 'sendVideo';
      fieldName = 'video';
    } else {
      apiEndpoint = 'sendDocument';
      fieldName = 'document';
    }

    // 构造 Telegram form-data
    const telegramForm = new FormData();
    telegramForm.append('chat_id', env.TG_Chat_ID);
    telegramForm.append(fieldName, uploadFile, uploadFile.name);

    // 上传到 Telegram
    const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
    const tgRes = await fetch(apiUrl, { method: "POST", body: telegramForm });
    const tgData = await tgRes.json();

    if (!tgRes.ok || !tgData.ok) {
      return new Response(JSON.stringify({ success: false, message: tgData.description || 'Upload to Telegram failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取 file_id
    const file_id = extractFileId(tgData.result);

    // 动态获取请求的域名和协议
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`; // 获取域名和协议

    // 返回代理 URL，拼接完整的文件 URL
    const fileUrl = `${baseUrl}/file/${file_id}`;

    return new Response(JSON.stringify({
      success: true,
      file_id,
      url: fileUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 提取 file_id
function extractFileId(result) {
  if (result.photo) {
    // 取最大尺寸的 file_id
    return result.photo.reduce((prev, curr) => (prev.file_size > curr.file_size ? prev : curr)).file_id;
  }
  if (result.document) return result.document.file_id;
  if (result.video) return result.video.file_id;
  if (result.audio) return result.audio.file_id;
  return null;
}
