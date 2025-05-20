export async function onRequest(context) {
    const { request, env } = context;

    // 获取请求的 URL
    const url = new URL(request.url);

    // 1. 尝试从环境变量获取 PROXY_BASE_URL
    let proxyBaseUrl = env.PROXY_BASE_URL;

    // 2. 如果环境变量中没有设置，尝试从 Referer 获取代理 URL
    if (!proxyBaseUrl && request.headers.has('Referer')) {
        const referer = request.headers.get('Referer');
        const refererUrl = new URL(referer);
        proxyBaseUrl = refererUrl.origin;  // 使用 Referer 的域名作为代理 URL
    }

    // 3. 如果仍然没有设置，使用默认值（例如：当前请求的域名）
    if (!proxyBaseUrl) {
        proxyBaseUrl = url.origin;  // 使用当前请求的域名
    }

    console.log('Using proxy base URL:', proxyBaseUrl);

    // 根据请求路径判断文件 URL
    let fileUrl = `${proxyBaseUrl}/file${url.pathname}`;  // 代理文件路径

    // 处理文件路径（可以根据需要修改）
    if (url.pathname.length > 39) { // 判断是否为 Telegram 文件
        const fileId = url.pathname.split('/')[2];  // 提取 file_id
        const filePath = await getFilePath(env, fileId);  // 获取文件路径
        
        if (filePath) {
            fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
        } else {
            return new Response('File path not found', { status: 404 });
        }
    }

    // 使用代理 URL 请求文件
    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    if (!response.ok) {
        return new Response('File not found', { status: 404 });
    }

    // 返回文件内容
    return response;
}

// 获取 Telegram 文件路径
async function getFilePath(env, fileId) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const res = await fetch(url);

        if (!res.ok) {
            console.error(`HTTP error! status: ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (data.ok && data.result) {
            return data.result.file_path;  // 返回文件路径
        } else {
            console.error('Error fetching file path:', data);
            return null;
        }
    } catch (error) {
        console.error('Error during file path retrieval:', error.message);
        return null;
    }
}
