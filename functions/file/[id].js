export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const fileId = params.id;
  let fileUrl = 'https://telegra.ph' + url.pathname + url.search;

  // Telegram Bot API 上传的文件（路径长度大于 39）
  if (url.pathname.length > 39) {
    const telegramFileId = url.pathname.split(".")[0].split("/")[2];
    const filePath = await getFilePath(env, telegramFileId);
    if (filePath) {
      fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }
  }

  // ** 1. 检查数据库记录是否存在，若无则404，确保删除后图片无法访问 **
  let metadata = await getImageMetadata(env.DB, fileId);
  if (!metadata) {
    // 可返回自定义 404 页或提示图片已删除
    return new Response("图片已被删除", { status: 404 });
    // 或者：return Response.redirect(`${url.origin}/notfound.html`, 302);
  }

  // ** 2. 管理后台可直接访问所有图片（带Referer /admin） **
  const isAdmin = request.headers.get('Referer')?.includes(`${url.origin}/admin`);
  if (isAdmin) return await fetch(fileUrl, { method: request.method, headers: request.headers, body: request.body });

  // ** 3. 白名单模式优先判断：启用后只有白名单可访问 **
  if (env.WhiteList_Mode === "true" && metadata.list_type !== "White") {
    return Response.redirect(`${url.origin}/whitelist-on.html`, 302);
  }

  // ** 4. 普通模式下处理黑名单/成人内容拦截 **
  if (metadata.list_type === "Block" || metadata.rating_label === "adult") {
    const referer = request.headers.get('Referer');
    const redirectUrl = referer
      ? "https://static-res.pages.dev/teleimage/img-block-compressed.png"
      : `${url.origin}/block-img.html`;
    return Response.redirect(redirectUrl, 302);
  }

  // ** 5. 内容安全审查，首次访问且未有评级时自动评级 **
  if (env.ModerateContentApiKey && metadata.rating_label === "None") {
    try {
      const moderateUrl = `https://api.moderatecontent.com/moderate/?key=${env.ModerateContentApiKey}&url=${fileUrl}`;
      const moderateResponse = await fetch(moderateUrl);
      if (moderateResponse.ok) {
        const result = await moderateResponse.json();
        if (result.rating_label) {
          metadata.rating_label = result.rating_label;
          await saveMetadata(env.DB, metadata);
          if (result.rating_label === "adult") {
            return Response.redirect(`${url.origin}/block-img.html`, 302);
          }
        }
      }
    } catch (err) {
      console.error("Moderation error:", err.message);
    }
  }

  // ** 6. 普通或白名单图片正常访问 **
  const response = await fetch(fileUrl, {
  method: request.method,
  headers: request.headers,
  body: request.body,
});

// 创建新的响应头，加入 no-store/no-cache
const newHeaders = new Headers(response.headers);
newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
newHeaders.set('Pragma', 'no-cache');
newHeaders.set('Expires', '0');

return new Response(response.body, {
  status: response.status,
  headers: newHeaders,
});


// -- 工具函数 --

// 获取元数据（D1数据库）
async function getImageMetadata(db, id) {
  const query = await db.prepare("SELECT * FROM images WHERE name = ?").bind(id).first();
  return query;
}

// 保存/更新元数据（D1数据库）
async function saveMetadata(db, metadata) {
  const exists = await db.prepare("SELECT id FROM images WHERE name = ?").bind(metadata.file_id).first();
  if (exists) {
    await db.prepare(`
      UPDATE images SET list_type = ?, rating_label = ?, liked = ?, timestamp = ?
      WHERE name = ?
    `).bind(
      metadata.list_type,
      metadata.rating_label,
      metadata.liked ? 1 : 0,
      metadata.timestamp,
      metadata.file_id
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO images (name, list_type, rating_label, liked, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      metadata.file_id,
      metadata.list_type,
      metadata.rating_label,
      metadata.liked ? 1 : 0,
      metadata.timestamp
    ).run();
  }
}

// 获取 Telegram 文件路径
async function getFilePath(env, file_id) {
  try {
    const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.ok ? data.result.file_path : null;
  } catch (e) {
    console.error("Telegram file path error:", e.message);
    return null;
  }
}
