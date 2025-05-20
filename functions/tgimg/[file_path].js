export async function onRequest(context) {
  const { params, env } = context;

  // 1. 获取 file_path 参数，并将下划线还原为斜杠
  // 例如 params.file_path = "photos_file_12345.jpg" => "photos/file_12345.jpg"
  const file_path = params.file_path.replace(/_/g, '/');

  if (!file_path) {
    return new Response('Missing file_path', { status: 400 });
  }

  // 2. 拼接 Telegram 文件直链
  const tgUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${file_path}`;

  // 3. 拉取 Telegram 图片内容
  const tgRes = await fetch(tgUrl);

  if (!tgRes.ok) {
    return new Response('Not Found', { status: 404 });
  }

  // 4. 透传图片内容和类型
  return new Response(tgRes.body, {
    status: 200,
    headers: {
      'Content-Type': tgRes.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}
