export async function onRequest(context) {
  return new Response("Logged out.", {
    status: 200,
    headers: {
      "Set-Cookie": `session=; HttpOnly; Secure; Path=/; Max-Age=0`,
    },
  });
}
