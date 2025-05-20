export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const file_path = url.searchParams.get('file_path');
  if (!file_path) {
    return new Response('Missing file_path', { status: 400 });
  }

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
