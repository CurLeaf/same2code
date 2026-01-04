import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { FakeEmbeddings } from "langchain/embeddings/fake";
import { Document } from "langchain/document";
import { createEmbedding, createEmbeddingBatch, EMBEDDING_DIMENSIONS } from "../openai";
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

// 内存中的向量索引实例
let vectorStore: HNSWLib | null = null;
let categoryIdMap: Map<number, string> = new Map(); // docIndex -> categoryId

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
 * 从 TSV 文件构建向量索引
 * @param tsvPath TSV 文件路径
 * @param indexName 索引名称
 */
export const buildIndexFromTSV = async (tsvPath: string, indexName: string = 'default'): Promise<void> => {
    console.log(`[Index] 开始构建索引: ${indexName}`);
    
    // 1. 读取并解析 TSV
    const content = fs.readFileSync(tsvPath, 'utf-8');
    const categories = parseTSV(content);
    console.log(`[Index] 解析到 ${categories.length} 个类目`);
    
    // 2. 生成 embeddings
    const texts = categories.map(c => c.text);
    console.log(`[Index] 开始生成 embeddings...`);
    const embeddings = await createEmbeddingBatch(texts, 100);
    
    // 3. 构建 HNSW 索引
    console.log(`[Index] 构建 HNSW 索引...`);
    
    // 创建文档和元数据
    const documents = categories.map((c, i) => new Document({
        pageContent: c.text,
        metadata: { id: c.id, index: i }
    }));
    
    // 使用 FakeEmbeddings 因为我们已经有了向量
    const fakeEmbeddings = new FakeEmbeddings();
    
    // 直接从向量创建
    vectorStore = await HNSWLib.fromDocuments(documents, fakeEmbeddings);
    
    // 重新赋值实际向量
    for (let i = 0; i < embeddings.length; i++) {
        vectorStore.addVectors([embeddings[i]], [documents[i]]);
    }
    
    // 4. 构建 ID 映射
    categoryIdMap = new Map();
    categories.forEach((c, i) => {
        categoryIdMap.set(i, c.id);
    });
    
    // 5. 保存索引
    const indexPath = path.join(INDEX_DIR, indexName);
    if (!fs.existsSync(INDEX_DIR)) {
        fs.mkdirSync(INDEX_DIR, { recursive: true });
    }
    await vectorStore.save(indexPath);
    
    // 保存 ID 映射
    const mapPath = path.join(indexPath, 'id_map.json');
    fs.writeFileSync(mapPath, JSON.stringify(Object.fromEntries(categoryIdMap)));
    
    console.log(`[Index] 索引构建完成，保存至: ${indexPath}`);
};

/**
 * 加载向量索引
 * @param indexName 索引名称
 */
export const loadIndex = async (indexName: string = 'default'): Promise<void> => {
    const indexPath = path.join(INDEX_DIR, indexName);
    
    if (!fs.existsSync(indexPath)) {
        throw new Error(`索引不存在: ${indexPath}`);
    }
    
    // 使用 FakeEmbeddings 加载（因为索引已包含向量）
    const fakeEmbeddings = new FakeEmbeddings();
    vectorStore = await HNSWLib.load(indexPath, fakeEmbeddings);
    
    // 加载 ID 映射
    const mapPath = path.join(indexPath, 'id_map.json');
    if (fs.existsSync(mapPath)) {
        const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
        categoryIdMap = new Map(Object.entries(mapData).map(([k, v]) => [parseInt(k), v as string]));
    }
    
    console.log(`[Index] 索引已加载: ${indexName}`);
};

/**
 * 搜索最相似的 Top-K 类目
 * @param text 商品文本
 * @param k 返回数量（默认 5）
 * @returns Top-K 结果
 */
export const searchTopK = async (text: string, k: number = 5): Promise<SearchResult[]> => {
    if (!vectorStore) {
        throw new Error('索引未加载，请先调用 loadIndex()');
    }
    
    // 生成查询向量
    const response = await createEmbedding({ input: text });
    const queryVector = response.data[0].embedding;
    
    // 搜索相似向量（返回分数）
    const results = await vectorStore.similaritySearchVectorWithScore(queryVector, k);
    
    // 转换为简洁输出格式
    return results.map(([doc, score]) => ({
        id: doc.metadata.id as string,
        score: 1 - score  // HNSW 返回的是距离，转换为相似度
    }));
};

/**
 * 检查索引是否已加载
 */
export const isIndexLoaded = (): boolean => {
    return vectorStore !== null;
};

/**
 * 删除索引
 * @param indexName 索引名称
 */
export const deleteIndex = (indexName: string = 'default'): void => {
    const indexPath = path.join(INDEX_DIR, indexName);
    if (fs.existsSync(indexPath)) {
        fs.rmSync(indexPath, { recursive: true });
        console.log(`[Index] 索引已删除: ${indexName}`);
    }
    
    if (vectorStore) {
        vectorStore = null;
        categoryIdMap.clear();
    }
};