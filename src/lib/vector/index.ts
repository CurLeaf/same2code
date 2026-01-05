import { createEmbedding, createEmbeddingBatch } from "../openai";
import fs from 'fs';
import path from 'path';

// 索引存储目录
const INDEX_DIR = 'vectors';

// 类目数据结构
export interface Category {
    id: string;
    text: string;
}

// 搜索结果结构（最小输出）
export interface SearchResult {
    id: string;
    score: number;
}

// 内存中的向量索引
interface VectorIndex {
    ids: string[];
    vectors: number[][];
}

// 支持多索引管理: platform -> VectorIndex
const vectorIndexMap: Map<string, VectorIndex> = new Map();

// 支持的平台列表
export const SUPPORTED_PLATFORMS = ['shopify', 'ozon', 'yandex'] as const;
export type Platform = typeof SUPPORTED_PLATFORMS[number];

/**
 * 解析标准 TSV 文件
 * 格式: category_id\tcategory_text
 */
export const parseTSV = (content: string): Category[] => {
    const lines = content.trim().split('\n');
    const categories: Category[] = [];
    
    // 跳过标题行
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const tabIndex = line.indexOf('\t');
        if (tabIndex === -1) continue;
        
        const id = line.substring(0, tabIndex).trim();
        const text = line.substring(tabIndex + 1).trim();
        
        if (id && text) {
            categories.push({ id, text });
        }
    }
    
    return categories;
};

/**
 * 计算余弦相似度
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * 从 TSV 文件构建向量索引
 * @param tsvPath TSV 文件路径
 * @param platform 平台名称
 */
export const buildIndexFromTSV = async (tsvPath: string, platform: Platform): Promise<void> => {
    console.log(`[Index] 开始构建索引: ${platform}`);
    
    // 1. 读取并解析 TSV
    const content = fs.readFileSync(tsvPath, 'utf-8');
    const categories = parseTSV(content);
    console.log(`[Index] 解析到 ${categories.length} 个类目`);
    
    // 2. 生成 embeddings
    const texts = categories.map(c => c.text);
    console.log(`[Index] 开始生成 embeddings...`);
    const embeddings = await createEmbeddingBatch(texts, 32);
    
    // 3. 构建索引并存入 Map
    console.log(`[Index] 构建向量索引...`);
    const index: VectorIndex = {
        ids: categories.map(c => c.id),
        vectors: embeddings
    };
    vectorIndexMap.set(platform, index);
    
    // 4. 保存索引
    const indexPath = path.join(INDEX_DIR, `${platform}.json`);
    if (!fs.existsSync(INDEX_DIR)) {
        fs.mkdirSync(INDEX_DIR, { recursive: true });
    }
    
    fs.writeFileSync(indexPath, JSON.stringify(index));
    
    console.log(`[Index] 索引构建完成，共 ${categories.length} 条记录，保存至: ${indexPath}`);
};

/**
 * 加载向量索引
 * @param platform 平台名称
 */
export const loadIndex = async (platform: Platform): Promise<void> => {
    // 如果已加载，直接返回
    if (vectorIndexMap.has(platform)) {
        console.log(`[Index] 索引已在内存中: ${platform}`);
        return;
    }
    
    const indexPath = path.join(INDEX_DIR, `${platform}.json`);
    
    if (!fs.existsSync(indexPath)) {
        throw new Error(`索引不存在: ${indexPath}`);
    }
    
    const data = fs.readFileSync(indexPath, 'utf-8');
    const index: VectorIndex = JSON.parse(data);
    vectorIndexMap.set(platform, index);
    
    console.log(`[Index] 索引已加载: ${platform}，共 ${index.ids.length} 条记录`);
};

/**
 * 搜索最相似的 Top-K 类目（暴力搜索 + 余弦相似度）
 * @param text 商品文本
 * @param platform 平台名称
 * @param k 返回数量（默认 5）
 * @returns Top-K 结果
 */
export const searchTopK = async (text: string, platform: Platform, k: number = 5): Promise<SearchResult[]> => {
    const vectorIndex = vectorIndexMap.get(platform);
    
    if (!vectorIndex) {
        throw new Error(`索引未加载: ${platform}，请先调用 loadIndex()`);
    }
    
    // 生成查询向量
    const response = await createEmbedding({ input: text });
    const queryVector = response.data[0].embedding;
    
    // 计算所有相似度
    const scores: { id: string; score: number }[] = [];
    
    for (let i = 0; i < vectorIndex.vectors.length; i++) {
        const score = cosineSimilarity(queryVector, vectorIndex.vectors[i]);
        scores.push({
            id: vectorIndex.ids[i],
            score: score
        });
    }
    
    // 排序并返回 Top-K
    scores.sort((a, b) => b.score - a.score);
    
    return scores.slice(0, k).map(item => ({
        id: item.id,
        score: parseFloat(item.score.toFixed(4))
    }));
};

/**
 * 检查索引是否已加载
 * @param platform 平台名称（可选，不传则检查是否有任意索引）
 */
export const isIndexLoaded = (platform?: Platform): boolean => {
    if (platform) {
        return vectorIndexMap.has(platform);
    }
    return vectorIndexMap.size > 0;
};

/**
 * 获取所有已加载的索引列表
 */
export const getLoadedIndexes = (): string[] => {
    return Array.from(vectorIndexMap.keys());
};

/**
 * 删除索引
 * @param platform 平台名称
 */
export const deleteIndex = (platform: Platform): void => {
    const indexPath = path.join(INDEX_DIR, `${platform}.json`);
    
    if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
        console.log(`[Index] 索引文件已删除: ${platform}`);
    }
    
    if (vectorIndexMap.has(platform)) {
        vectorIndexMap.delete(platform);
        console.log(`[Index] 内存索引已删除: ${platform}`);
    }
};

/**
 * 获取平台对应的 TSV 文件路径
 * @param platform 平台名称
 */
export const getPlatformTsvPath = (platform: Platform): string => {
    return path.join(process.cwd(), 'data', `${platform}.tsv`);
};

