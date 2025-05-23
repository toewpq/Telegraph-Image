export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const clonedRequest = request.clone();
    const formData = await clonedRequest.formData();
    const uploadFile = formData.get('file');

    if (!uploadFile) {
      throw new Error('No file uploaded');
    }

    const fileName = uploadFile.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    const telegramFormData = new FormData();
    telegramFormData.append("chat_id", env.TG_Chat_ID);

    // 判断上传类型
    let apiEndpoint;
    if (uploadFile.type.startsWith('image/')) {
      telegramFormData.append("photo", uploadFile);
      apiEndpoint = 'sendPhoto';
    } else if (uploadFile.type.startsWith('audio/')) {
      telegramFormData.append("audio", uploadFile);
      apiEndpoint = 'sendAudio';
    } else if (uploadFile.type.startsWith('video/')) {
      telegramFormData.append("video", uploadFile);
      apiEndpoint = 'sendVideo';
    } else {
      telegramFormData.append("document", uploadFile);
      apiEndpoint = 'sendDocument';
    }

    const result = await sendToTelegram(telegramFormData, apiEndpoint, env);

    if (!result.success) {
      throw new Error(result.error);
    }

    const fileId = getFileId(result.data);
    if (!fileId) {
      throw new Error('Failed to get file ID');
    }

    // 保存到 D1 数据库
    await env.DB.prepare(`
      INSERT INTO images (name, timestamp, list_type, rating_label, liked)
      VALUES (?, ?, 'None', 'None', 0)
    `).bind(`${fileId}.${fileExtension}`, Math.floor(Date.now() / 1000)).run();

    // 返回 URL
    return new Response(
      JSON.stringify([{ src: `/file/${fileId}.${fileExtension}` }]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
