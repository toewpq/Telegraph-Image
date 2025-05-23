export async function onRequest(context) {
  const { request, env } = context;
  let name = null;

  // 支持 POST(JSON) 和 GET(query)
  if (request.method === "POST") {
    try {
      const data = await request.json();
      name = data.name;
    } catch (e) {
      return new Response(JSON.stringify({ error: "无效的参数" }), { status: 400 });
    }
  } else if (request.method === "GET") {
    const url = new URL(request.url);
    name = url.searchParams.get("name");
  }

  if (!name) {
    return new Response(JSON.stringify({ error: "缺少图片ID/名称" }), { status: 400 });
  }

  // 优先支持 D1 数据库
  if (env.DB) {
    try {
      await env.DB.prepare(
        "UPDATE images SET list_type = 'White' WHERE name = ?"
      ).bind(name).run();
      return new Response(JSON.stringify({ name, result: "OK" }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "数据库更新失败" }), { status: 500 });
    }
  }

  // 兼容 KV 方案
  if (env.img_url) {
    const value = await env.img_url.getWithMetadata(name);
    if (!value || !value.metadata) {
      return new Response(JSON.stringify({ error: "找不到文件" }), { status: 404 });
    }
    value.metadata.ListType = "White";
    await env.img_url.put(name, "", { metadata: value.metadata });
    return new Response(JSON.stringify(value.metadata), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "没有数据库或KV环境" }), { status: 500 });
}
