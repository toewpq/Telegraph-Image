export async function onRequest(context) {
  const { request, env } = context;
  const cookie = request.headers.get("Cookie") || "";
  if (!cookie.includes("session=1")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") || "";

  const stmt = keyword
    ? env.DB.prepare("SELECT * FROM images WHERE name LIKE ? ORDER BY timestamp DESC")
        .bind(`%${keyword}%`)
    : env.DB.prepare("SELECT * FROM images ORDER BY timestamp DESC");

  const { results } = await stmt.all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}
