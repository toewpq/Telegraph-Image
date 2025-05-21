export async function onRequest(context) {
    const { request, env } = context;
    const { id } = context.params;  // 获取文件的 ID

    try {
        // 使用 Telegram API 获取文件路径
        const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${id}`;
        const fileRes = await fetch(getFileUrl);
        const fileData = await fileRes.json();

        if (!fileRes.ok || !fileData.ok || !fileData.result) {
            return new Response(JSON.stringify({ success: false, message: '无法获取文件信息' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取文件路径
        const filePath = fileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;

        // 转发请求，获取文件内容
        const fileContentRes = await fetch(fileUrl);
        if (!fileContentRes.ok) {
            return new Response(JSON.stringify({ success: false, message: '无法下载文件' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取文件的 MIME 类型
        const contentType = fileContentRes.headers.get('Content-Type');

        // 返回文件内容
        const fileContent = await fileContentRes.blob();

        return new Response(fileContent.stream(), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400'  // 设置缓存时间，具体根据需要调整
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
