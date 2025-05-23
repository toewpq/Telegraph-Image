export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password } = await request.json();

  if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASS) {
    return new Response("ok", {
      status: 200,
      headers: {
        "Set-Cookie": `session=1; HttpOnly; Secure; Path=/; Max-Age=3600`,
      },
    });
  }

  return new Response("Unauthorized", { status: 401 });
}
