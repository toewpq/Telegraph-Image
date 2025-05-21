export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    let fileUrl = `https://telegra.ph${url.pathname}${url.search}`;

    if (url.pathname.length > 39) { // Path length > 39 indicates file uploaded via Telegram Bot API
        const fileId = url.pathname.split('/')[2];
        const filePath = await getFilePath(env, fileId);
        fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }

    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    if (!response.ok) return response;

    // Check content type and set appropriate headers
    const contentType = response.headers.get('Content-Type');
    if (contentType.startsWith('image/')) {
        response.headers.set('Content-Type', contentType);
    } else if (contentType.startsWith('audio/')) {
        response.headers.set('Content-Type', contentType);
    } else if (contentType.startsWith('video/')) {
        response.headers.set('Content-Type', contentType);
    } else {
        response.headers.set('Content-Type', 'application/octet-stream');
    }

    return response;
}

async function getFilePath(env, fileId) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const responseData = await res.json();
        const { result } = responseData;
        return result ? result.file_path : null;
    } catch (error) {
        console.error('Error fetching file path:', error.message);
        return null;
    }
}
