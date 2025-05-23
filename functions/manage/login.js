export async function onRequest(context) {
  const { request } = context;
  const { username, password } = await request.json();

  if (username === "admin" && password === context.env.ADMIN_PASS) {
    return new Response("ok", {
      status: 200,
      headers: {
        "Set-Cookie": `session=1; HttpOnly; Secure; Path=/; Max-Age=3600`,
      },
    });
  }

  return new Response("Unauthorized", { status: 401 });
}
