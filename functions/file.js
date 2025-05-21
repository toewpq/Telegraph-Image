export async function onRequest(context) {
    const { request, env } = context;

    try {
        // 解析 URL 获取 file_id（假设 URL 格式是 /file/{file_id}）
        const url = new URL(request.url);
        const file_id = url.pathname.split('/')[1];

        // 如果没有提供 file_id，返回 400 错误
        if (!file_id) {
            return new Response(JSON.stringify({ success: false, message: 'No file_id provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 使用 Telegram API 获取文件路径
        const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
        const getFileRes = await fetch(getFileUrl);
        const getFileData = await getFileRes.json();

        // 检查是否成功获取文件路径
        if (!getFileRes.ok || !getFileData.ok || !getFileData.result || !getFileData.result.file_path) {
            return new Response(JSON.stringify({ success: false, message: 'Failed to retrieve file path' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取 file_path
        const file_path = getFileData.result.file_path;

        // 构建 Telegram 文件下载 URL
        const file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${file_path}`;

        // 获取文件内容
        const fileRes = await fetch(file_url);

        // 如果文件获取失败
        if (!fileRes.ok) {
            return new Response(JSON.stringify({ success: false, message: 'Failed to fetch file from Telegram' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回文件内容给用户
        return new Response(fileRes.body, {
            headers: {
                'Content-Type': fileRes.headers.get('Content-Type') || 'application/octet-stream',  // 设置正确的文件类型
                'Cache-Control': 'max-age=31536000' // 设置缓存（例如，缓存一年）
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
