export async function onRequest(context) {
  const cookie = context.request.headers.get("Cookie") || "";
  const loggedIn = cookie.includes("session=1");

  return new Response(JSON.stringify({ loggedIn }), {
    headers: { "Content-Type": "application/json" },
  });
}
