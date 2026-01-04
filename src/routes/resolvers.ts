import { Request, Response } from "express";
import { buildIndexFromTSV, loadIndex, searchTopK, isIndexLoaded, deleteIndex } from '../lib/vector';
import path from 'path';

/**
 * 查询商品类目（返回 Top-K）
 * POST /category/predict
 * Body: { text: string, k?: number }
 */
export const queryCategory = async (req: Request, res: Response) => {
    try {
        const { text, k = 5 } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'text 字段必填且必须为字符串'
            });
        }
        
        // 检查索引是否已加载
        if (!isIndexLoaded()) {
            try {
                await loadIndex('default');
            } catch (e) {
                return res.status(503).json({
                    success: false,
                    error: '索引未加载，请先构建索引'
                });
            }
        }
        
        const topK = await searchTopK(text, Number(k));
        
        return res.json({
            success: true,
            topK
        });
    } catch (error: any) {
        console.error('[Error] queryCategory:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '内部错误'
        });
    }
};

/**
 * 构建向量索引
 * POST /category/index
 * Body: { tsvPath?: string }
 */
export const buildIndex = async (req: Request, res: Response) => {
    try {
        const { tsvPath } = req.body;
        
        // 默认使用 data/categories_standard.tsv
        const filePath = tsvPath || path.join(process.cwd(), 'data', 'categories_standard.tsv');
        
        await buildIndexFromTSV(filePath, 'default');
        
        return res.json({
            success: true,
            message: '索引构建完成'
        });
    } catch (error: any) {
        console.error('[Error] buildIndex:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '索引构建失败'
        });
    }
};

/**
 * 加载索引
 * POST /category/load
 */
export const loadCategoryIndex = async (req: Request, res: Response) => {
    try {
        await loadIndex('default');
        
        return res.json({
            success: true,
            message: '索引加载完成'
        });
    } catch (error: any) {
        console.error('[Error] loadIndex:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '索引加载失败'
        });
    }
};

/**
 * 删除索引
 * DELETE /category/index
 */
export const deleteCategoryIndex = async (req: Request, res: Response) => {
    try {
        deleteIndex('default');
        
        return res.json({
            success: true,
            message: '索引已删除'
        });
    } catch (error: any) {
        console.error('[Error] deleteIndex:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '索引删除失败'
        });
    }
};

/**
 * 健康检查
 * GET /health
 */
export const healthCheck = async (req: Request, res: Response) => {
    return res.json({
        status: 'ok',
        indexLoaded: isIndexLoaded()
    });
};