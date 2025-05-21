export async function onRequest(context) {
    const { request, env } = context;
    
    try {
        // 从 URL 中获取 file_id
        const { id } = context.params; // 获取 [id] 参数，通常是通过 URL 动态传入的
        if (!id) {
            return new Response(JSON.stringify({ success: false, message: 'No file_id provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 查询 D1 数据库获取文件信息（file_id、file_type 和 url）
        const db = env.D1_DATABASE;
        const result = await db.prepare('SELECT file_type, url FROM files WHERE file_id = ?').bind(id).first();

        if (!result) {
            return new Response(JSON.stringify({ success: false, message: 'File not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回文件类型和 URL
        return new Response(JSON.stringify({
            success: true,
            file_id: id,
            file_type: result.file_type, // 返回文件类型
            url: result.url // 返回文件 URL
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
