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

  const response = await fetch(fileUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  if (!response.ok) return response;

  const isAdmin = request.headers.get('Referer')?.includes(`${url.origin}/admin`);
  if (isAdmin) return response;

  // 获取数据库中的元信息
  let metadata = await getImageMetadata(env.DB, fileId);

  // 如果数据库没有此图片记录，初始化记录
  if (!metadata) {
    metadata = {
      file_id: fileId,
      timestamp: Math.floor(Date.now() / 1000),
      list_type: "None",
      rating_label: "None",
      liked: false,
    };
    await saveMetadata(env.DB, metadata); // 新建元数据
  }

  // 屏蔽策略
  if (metadata.list_type === "White") {
    return response;
  } else if (metadata.list_type === "Block" || metadata.rating_label === "adult") {
    const referer = request.headers.get('Referer');
    const redirectUrl = referer
      ? "https://static-res.pages.dev/teleimage/img-block-compressed.png"
      : `${url.origin}/block-img.html`;
    return Response.redirect(redirectUrl, 302);
  }

  // 白名单模式：如果启用且未白名单，则拦截
  if (env.WhiteList_Mode === "true") {
    return Response.redirect(`${url.origin}/whitelist-on.html`, 302);
  }

  // 内容审查逻辑
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

  return response;
}

// 获取元数据
async function getImageMetadata(db, id) {
  const query = await db.prepare("SELECT * FROM images WHERE name = ?").bind(id).first();
  return query;
}

// 保存元数据（新建或更新）
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
