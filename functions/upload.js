export async function onRequestPost(context) {
    console.log("收到 POST 请求 /upload 路径");

    const { request, env } = context;

    try {
        // 解析上传的表单数据
        const formData = await request.formData();
        const uploadFile = formData.get('file');

        // 如果没有上传文件，返回错误信息
        if (!uploadFile) {
            console.log("没有上传文件");
            return new Response(JSON.stringify({ success: false, message: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 输出上传的文件信息
        console.log(`上传的文件: ${uploadFile.name}, 类型: ${uploadFile.type}`);

        // 根据文件类型选择 Telegram API 端点
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

        // 构造 Telegram 请求的表单数据
        const telegramForm = new FormData();
        telegramForm.append('chat_id', env.TG_Chat_ID);
        telegramForm.append(fieldName, uploadFile, uploadFile.name);

        // 构造 Telegram API URL
        const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
        console.log(`发送请求到 Telegram API: ${apiUrl}`);

        // 上传文件到 Telegram
        const tgRes = await fetch(apiUrl, { method: "POST", body: telegramForm });
        const tgData = await tgRes.json();

        // 检查 Telegram 响应
        if (!tgRes.ok || !tgData.ok) {
            console.log("Telegram 上传失败:", tgData.description);
            return new Response(JSON.stringify({ success: false, message: tgData.description || 'Upload to Telegram failed' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取 file_id 和 file_url
        const file_id = extractFileId(tgData.result);
        let file_url = null;

        // 通过 Telegram getFile API 获取文件的 URL
        if (file_id) {
            const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
            const getFileRes = await fetch(getFileUrl);
            const getFileData = await getFileRes.json();
            if (getFileData.ok && getFileData.result && getFileData.result.file_path) {
                file_url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${getFileData.result.file_path}`;
            }
        }

        // 返回文件 ID 和 URL
        return new Response(JSON.stringify({
            success: true,
            file_id,
            url: file_url,
            message: tgData.result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // 错误处理
        console.log("发生错误:", error.message);
        return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 提取 Telegram 响应中的 file_id
function extractFileId(result) {
    if (result.photo) {
        // 获取最大的图片文件的 file_id
        return result.photo.reduce((prev, curr) => (prev.file_size > curr.file_size ? prev : curr)).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;
    return null;
}
