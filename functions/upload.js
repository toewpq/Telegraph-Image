// upload.js
export async function onRequestPost(context) {
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

    // 构造 Telegram API 请求
    let apiEndpoint, fieldName;
    if (uploadFile.type.startsWith('image/')) {
      apiEndpoint = 'sendPhoto';
      fieldName = 'photo';
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
    const tgRes = await fetch(apiUrl, { method: 'POST', body: telegramForm });
    const tgData = await tgRes.json();

    if (!tgRes.ok || !tgData.ok) {
      console.error('Telegram upload error:', tgData);  // Log the error for debugging
      return new Response(
        JSON.stringify({ success: false, message: tgData.description || 'Upload to Telegram failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 提取 file_id
    const file_id = tgData.result.photo ? tgData.result.photo[0].file_id : tgData.result.document.file_id;

    return new Response(
      JSON.stringify({
        success: true,
        file_id,
        message: tgData.result
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload failed:', error);  // Log the error for debugging
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
