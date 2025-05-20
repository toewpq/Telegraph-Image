export async function onRequest(context) {
  const { params, env } = context;
  const file_path = params.file_path.join('/'); // 支持多级路径
  const tgUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${file_path}`;

  const tgRes = await fetch(tgUrl);
  if (!tgRes.ok) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(tgRes.body, {
    status: 200,
    headers: {
      'Content-Type': tgRes.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}
