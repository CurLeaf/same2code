import { env } from "../../env";
import fetch from "node-fetch";
import https from "https";

// 创建不使用代理的 agent
const httpsAgent = new https.Agent({
    rejectUnauthorized: true,
});

// 从环境变量读取配置
export const EMBEDDING_BASE_URL = env.EMBEDDING_BASE_URL;
export const EMBEDDING_API_KEY = env.EMBEDDING_API_KEY;
export const EMBEDDING_MODEL = env.EMBEDDING_MODEL_NAME;
export const EMBEDDING_DIMENSIONS = parseInt(env.EMBEDDING_DIMENSION, 10);

export interface EmbeddingResponse {
    data: Array<{
        embedding: number[];
        index: number;
    }>;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

/**
 * 调用 Embedding API (SiliconFlow / OpenAI 兼容)
 * @param input 单个文本或文本数组
 * @returns embedding 向量结果
 */
export const createEmbedding = async ({ input }: { input: string | string[] }): Promise<EmbeddingResponse> => {
    const response = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${EMBEDDING_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: input
        }),
        agent: httpsAgent,  // 绕过系统代理
        timeout: 60000      // 60秒超时
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<EmbeddingResponse>;
};

/**
 * 批量生成 embeddings（带并发控制）
 * @param texts 文本数组
 * @param batchSize 每批大小（默认 32，SiliconFlow 限制 64）
 * @returns 所有 embedding 向量
 */
export const createEmbeddingBatch = async (
    texts: string[],
    batchSize: number = 32
): Promise<number[][]> => {
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await createEmbedding({ input: batch });
        
        // 按 index 排序确保顺序正确
        const sortedData = response.data.sort((a, b) => a.index - b.index);
        embeddings.push(...sortedData.map(d => d.embedding));
        
        console.log(`[Embedding] 已处理 ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
    }
    
    return embeddings;
};