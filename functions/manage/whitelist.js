export async function onRequest(context) {
  const { request, env } = context;
  let name = null;
  let action = "add"; // 默认为添加白名单

  // 支持 POST(JSON) 和 GET(query)
  if (request.method === "POST") {
    try {
      const data = await request.json();
      name = data.name;
      if (data.action === "remove") action = "remove";
    } catch (e) {
      return new Response(JSON.stringify({ error: "无效的参数" }), { status: 400 });
    }
  } else if (request.method === "GET") {
    const url = new URL(request.url);
    name = url.searchParams.get("name");
    if (url.searchParams.get("action") === "remove") action = "remove";
  }

  if (!name) {
    return new Response(JSON.stringify({ error: "缺少图片ID/名称" }), { status: 400 });
  }

  // D1 数据库
  if (env.DB) {
    try {
      const newType = action === "remove" ? "None" : "White";
      await env.DB.prepare(
        "UPDATE images SET list_type = ? WHERE name = ?"
      ).bind(newType, name).run();
      return new Response(JSON.stringify({ name, action, result: "OK" }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "数据库更新失败" }), { status: 500 });
    }
  }

  // KV 兼容
  if (env.img_url) {
    const value = await env.img_url.getWithMetadata(name);
    if (!value || !value.metadata) {
      return new Response(JSON.stringify({ error: "找不到文件" }), { status: 404 });
    }
    value.metadata.ListType = action === "remove" ? "None" : "White";
    await env.img_url.put(name, "", { metadata: value.metadata });
    return new Response(JSON.stringify(value.metadata), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: "没有数据库或KV环境" }), { status: 500 });
}
