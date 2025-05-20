export async function onRequest(context) {
  const { params, env } = context;
  const { id } = params;  // 获取 file_id

  try {
    // 使用 Telegram API 获取文件的真实 URL
    const fileUrl = await getFileUrl(env.TG_Bot_Token, id);

    if (!fileUrl) {
      return new Response("File not found", { status: 404 });
    }

    // 代理文件请求
    const response = await fetch(fileUrl);
    
    // 如果 Telegram 返回的响应不为 OK，返回 500 错误
    if (!response.ok) {
      return new Response("Failed to fetch file from Telegram", { status: 500 });
    }

    // 返回文件内容
    const headers = new Headers();
    // 根据文件类型设置适当的 Content-Type
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");

    return new Response(response.body, {
      status: 200,
      headers: headers
    });

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

// 使用 Telegram API 获取文件真实 URL
async function getFileUrl(botToken, fileId) {
  const url = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const res = await fetch(url);
  const data = await res.json();

  if (res.ok && data.ok && data.result && data.result.file_path) {
    // 返回完整的文件 URL
    return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
  }
  return null;
}
