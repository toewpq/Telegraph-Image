export async function onRequestPost(context) { 
    const { request, env } = context;

    try {
        const formData = await request.formData();
        const uploadFile = formData.get('file');
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

        // 构造 Telegram API 请求 URL
        const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
        
        // 发送文件到 Telegram
        const tgRes = await fetch(apiUrl, {
            method: "POST",
            body: telegramForm
        });
        const tgData = await tgRes.json();

        if (!tgRes.ok || !tgData.ok) {
            return new Response(JSON.stringify({ success: false, message: tgData.description || 'Upload to Telegram failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取 file_id
        const file_id = extractFileId(tgData.result);

        // 通过 getFile API 获取文件的 file_path
        let file_url = null;
        if (file_id) {
            const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
            const getFileRes = await fetch(getFileUrl);
            const getFileData = await getFileRes.json();
            if (getFileData.ok && getFileData.result && getFileData.result.file_path) {
                file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${getFileData.result.file_path}`;
            }
        }

        // 如果获得了文件 URL, 直接反代文件内容
        if (file_url) {
            // 获取文件内容
            const fileRes = await fetch(file_url);
            if (!fileRes.ok) {
                return new Response(JSON.stringify({ success: false, message: 'Failed to download file from Telegram' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 将文件内容直接传回客户端
            const contentType = fileRes.headers.get('Content-Type');
            const contentLength = fileRes.headers.get('Content-Length');

            // 返回文件内容，设置正确的头部
            return new Response(fileRes.body, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': contentLength,
                    'Cache-Control': 'public, max-age=86400'  // 可选，缓存文件一天
                }
            });
        } else {
            return new Response(JSON.stringify({ success: false, message: 'File not found in Telegram' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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
        // 取最大尺寸的 file_id
        return result.photo.reduce((prev, curr) => (prev.file_size > curr.file_size ? prev : curr)).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;
    return null;
}
