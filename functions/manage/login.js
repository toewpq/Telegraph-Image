export async function onRequest(context) {
  const { request, env } = context;

  try {
    const { username, password } = await request.json();

    if (
      username === env.ADMIN_USERNAME &&
      password === env.ADMIN_PASS
    ) {
      return new Response("ok", {
        status: 200,
        headers: {
          "Set-Cookie": `session=1; HttpOnly; Secure; Path=/; Max-Age=3600`,
          "Content-Type": "text/plain",
        },
      });
    }
  } catch (e) {
    return new Response("Bad Request", { status: 400 });
  }

  return new Response("Unauthorized", { status: 401 });
}
