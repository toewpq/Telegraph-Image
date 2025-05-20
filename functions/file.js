export async function onRequest(context) {
    const { params, env } = context;
    const { id } = params;  // 获取 URL 中的文件 ID

    try {
        // 获取 Telegram 文件 URL
        const fileUrl = await getTelegramFileUrl(id, env);

        if (!fileUrl) {
            return new Response(JSON.stringify({ success: false, message: 'File not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取文件内容并返回
        const response = await fetch(fileUrl);
        if (!response.ok) {
            return new Response(JSON.stringify({ success: false, message: 'Failed to fetch file' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回文件内容，代理给前端
        return new Response(response.body, {
            headers: response.headers,
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 获取 Telegram 文件 URL
async function getTelegramFileUrl(file_id, env) {
    const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && data.result && data.result.file_path) {
        return `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${data.result.file_path}`;
    }
    return null;
}
