export async function onRequest(context) {
    const { id } = context.params; // 获取 file_id，从 URL 参数中提取

    try {
        const db = context.env.D1_DATABASE;
        
        // 查询数据库，使用 file_id 查找文件 URL
        const result = await db.prepare('SELECT url FROM files WHERE file_id = ?').bind(id).first();

        if (!result) {
            // 如果没有找到对应的 file_id，返回 404 错误
            return new Response('文件未找到', { status: 404 });
        }

        // 使用代理请求来获取文件内容
        const fileUrl = result.url; // Telegram 文件的 URL
        const fileRes = await fetch(fileUrl); // 获取文件内容
        
        // 检查文件是否成功获取
        if (!fileRes.ok) {
            return new Response('无法获取文件', { status: 500 });
        }

        // 返回文件内容并代理至客户端
        const contentType = fileRes.headers.get('Content-Type');
        return new Response(fileRes.body, {
            status: 200,
            headers: {
                'Content-Type': contentType, // 保持原始文件类型
            }
        });

    } catch (e) {
        return new Response('服务器错误', { status: 500 });
    }
}
