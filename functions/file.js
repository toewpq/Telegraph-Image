// /functions/file.js
export async function onRequest(context) {
  const { params, env } = context;
  const { id } = params;  // file_id 由 URL 参数获取

  try {
    // 使用 file_id 获取 Telegram 上的文件路径
    const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${id}`;
    const getFileRes = await fetch(getFileUrl);
    const getFileData = await getFileRes.json();

    if (getFileData.ok && getFileData.result && getFileData.result.file_path) {
      // 文件路径
      const file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${getFileData.result.file_path}`;
      
      // 获取文件内容并返回
      const fileRes = await fetch(file_url);
      const fileBuffer = await fileRes.buffer();

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${id}`
        }
      });
    } else {
      return new Response('文件获取失败', { status: 500 });
    }
  } catch (error) {
    return new Response('服务器错误: ' + error.message, { status: 500 });
  }
}
