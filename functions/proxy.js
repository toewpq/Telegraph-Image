export async function onRequest(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const file_id = url.pathname.split('/')[1];  // 获取 file_id

    if (!file_id) {
      return new Response(JSON.stringify({ success: false, message: '没有提供 file_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 使用 Telegram API 获取文件路径
    const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
    const getFileRes = await fetch(getFileUrl);
    const getFileData = await getFileRes.json();

    if (!getFileRes.ok || !getFileData.ok || !getFileData.result || !getFileData.result.file_path) {
      return new Response(JSON.stringify({ success: false, message: '获取文件失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const file_path = getFileData.result.file_path;
    const file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${file_path}`;  // 构建真实的文件 URL

    // 获取文件内容
    const fileRes = await fetch(file_url);

    if (!fileRes.ok) {
      return new Response(JSON.stringify({ success: false, message: '从 Telegram 获取文件失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 返回文件内容
    return new Response(fileRes.body, {
      headers: {
        'Content-Type': fileRes.headers.get('Content-Type') || 'application/octet-stream', // 使用正确的文件类型
        'Cache-Control': 'max-age=31536000'  // 长时间缓存
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
