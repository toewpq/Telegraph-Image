// proxy.js
export async function onRequest(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const file_id = url.pathname.split('/')[1];  // 获取 file_id

    if (!file_id) {
      return new Response(JSON.stringify({ success: false, message: 'No file_id provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 使用 Telegram API 获取文件路径
    const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
    const getFileRes = await fetch(getFileUrl);
    const getFileData = await getFileRes.json();

    if (!getFileRes.ok || !getFileData.ok || !getFileData.result || !getFileData.result.file_path) {
      return new Response(JSON.stringify({ success: false, message: 'Failed to retrieve file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const file_path = getFileData.result.file_path;
    const file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${file_path}`;  // 构建文件 URL

    // 获取文件内容
    const fileRes = await fetch(file_url);

    if (!fileRes.ok) {
      return new Response(JSON.stringify({ success: false, message: 'Failed to fetch file from Telegram' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回文件内容
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');  // 允许所有域名的跨域请求
    headers.set('Content-Type', fileRes.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Cache-Control', 'max-age=31536000');  // 长时间缓存

    return new Response(fileRes.body, { headers });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
