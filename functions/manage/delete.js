export async function onRequestPost(context) {
  const { request, env } = context;
  const cookie = request.headers.get("Cookie") || "";
  if (!cookie.includes("session=1")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await request.json();
  await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
  return new Response("ok");
}

