export async function onRequest(context) {
  const { env, request } = context;

  // 简单身份校验（可替换成 Cookie 登录检测）
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await request.json();
  await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();

  return new Response("Deleted");
}
