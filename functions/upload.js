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

    const imageKey = `${fileId}.${fileExtension}`;
    const timestamp = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT OR IGNORE INTO images (name, timestamp, list_type, rating_label, liked)
      VALUES (?, ?, 'None', 'None', 0)
    `).bind(imageKey, timestamp).run();

    return new Response(
      JSON.stringify([{ src: `/file/${imageKey}` }]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Upload error:', error.stack || error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

function getFileId(response) {
  if (!response.ok || !response.result) return null;

  const result = response.result;
  if (result.photo) {
    return result.photo.reduce((prev, current) =>
      (prev.file_size > current.file_size) ? prev : current
    ).file_id;
  }
  if (result.document) return result.document.file_id;
  if (result.video) return result.video.file_id;
  if (result.audio) return result.audio.file_id;

  return null;
}

async function sendToTelegram(formData, apiEndpoint, env, retryCount = 0) {
  const MAX_RETRIES = 2;
  const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;

  try {
    const response = await fetch(apiUrl, { method: "POST", body: formData });
    const responseData = await response.json();

    if (response.ok) {
      return { success: true, data: responseData };
    }

    if (retryCount < MAX_RETRIES && apiEndpoint === 'sendPhoto') {
      console.log('Retrying image as document...');
      const newFormData = new FormData();
      newFormData.append('chat_id', formData.get('chat_id'));
      newFormData.append('document', formData.get('photo'));
      return await sendToTelegram(newFormData, 'sendDocument', env, retryCount + 1);
    }

    return {
      success: false,
      error: responseData.description || 'Upload to Telegram failed'
    };
  } catch (error) {
    console.error('Telegram API error:', error);
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return await sendToTelegram(formData, apiEndpoint, env, retryCount + 1);
    }
    return { success: false, error: 'Network error occurred' };
  }
}
