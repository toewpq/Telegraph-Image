export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();
        const uploadFile = formData.get('file'); // 获取文件

        if (!uploadFile) {
            return new Response(JSON.stringify({ success: false, message: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 选择 Telegram API 端点
        let apiEndpoint, fieldName;
        if (uploadFile.type.startsWith('image/')) {
            apiEndpoint = 'sendPhoto';
            fieldName = 'photo';
        } else if (uploadFile.type.startsWith('audio/')) {
            apiEndpoint = 'sendAudio';
            fieldName = 'audio';
        } else if (uploadFile.type.startsWith('video/')) {
            apiEndpoint = 'sendVideo';
            fieldName = 'video';
        } else {
            apiEndpoint = 'sendDocument';
            fieldName = 'document';
        }

        // 构造 Telegram form-data
        const telegramForm = new FormData();
        telegramForm.append('chat_id', env.TG_Chat_ID);
        telegramForm.append(fieldName, uploadFile, uploadFile.name);

        // 上传到 Telegram
        const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
        const tgRes = await fetch(apiUrl, { method: "POST", body: telegramForm });
        const tgData = await tgRes.json();

        if (!tgRes.ok || !tgData.ok) {
            return new Response(JSON.stringify({ success: false, message: tgData.description || 'Upload to Telegram failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取 file_id
        const file_id = extractFileId(tgData.result);

        // 通过 getFile API 获取 file_path
        let file_url = null;
        if (file_id) {
            const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
            const getFileRes = await fetch(getFileUrl);
            const getFileData = await getFileRes.json();
            if (getFileData.ok && getFileData.result && getFileData.result.file_path) {
                file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${getFileData.result.file_path}`;
            }
        }

        // 存储 file_id 和 URL 到 D1 数据库
        const db = env.D1_DATABASE; // D1 数据库实例
        await db.prepare(`
            INSERT INTO files (file_id, url) 
            VALUES (?, ?)
        `).bind(file_id, file_url).run();

        // 返回 file_id 和 URL
        return new Response(JSON.stringify({
            success: true,
            file_id,
            url: `/file/${file_id}`, // 使用反向代理路径
            message: tgData.result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 提取 file_id
function extractFileId(result) {
    if (result.photo) {
        return result.photo.reduce((prev, curr) => (prev.file_size > curr.file_size ? prev : curr)).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;
    return null;
}
