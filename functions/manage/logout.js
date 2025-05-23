export async function onRequest(context) {
  return new Response("Logged out", {
    status: 200,
    headers: {
      "Set-Cookie": `session=; Path=/; Max-Age=0`, // 清除 cookie
    },
  });
}
