import { Request, Response } from "express";
import { 
    buildIndexFromTSV, 
    loadIndex, 
    searchTopK, 
    isIndexLoaded, 
    deleteIndex,
    getLoadedIndexes,
    getPlatformTsvPath,
    SUPPORTED_PLATFORMS,
    Platform
} from '../lib/vector';

/**
 * 验证平台参数
 */
const validatePlatform = (platform: any): platform is Platform => {
    return SUPPORTED_PLATFORMS.includes(platform);
};

/**
 * 查询商品类目（返回 Top-K）
 * POST /category/predict
 * Body: { text: string, platform?: string, k?: number }
 */
export const queryCategory = async (req: Request, res: Response) => {
    try {
        const { text, platform = 'shopify', k = 5 } = req.body;
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'text 字段必填且必须为字符串'
            });
        }
        
        if (!validatePlatform(platform)) {
            return res.status(400).json({
                success: false,
                error: `不支持的平台: ${platform}，支持: ${SUPPORTED_PLATFORMS.join(', ')}`
            });
        }
        
        // 检查索引是否已加载
        if (!isIndexLoaded(platform)) {
            try {
                await loadIndex(platform);
            } catch (e) {
                return res.status(503).json({
                    success: false,
                    error: `索引未加载: ${platform}，请先构建索引`
                });
            }
        }
        
        const topK = await searchTopK(text, platform, Number(k));
        
        return res.json({
            success: true,
            platform,
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
 * Body: { platform?: string }
 */
export const buildIndex = async (req: Request, res: Response) => {
    try {
        const { platform = 'shopify' } = req.body;
        
        if (!validatePlatform(platform)) {
            return res.status(400).json({
                success: false,
                error: `不支持的平台: ${platform}，支持: ${SUPPORTED_PLATFORMS.join(', ')}`
            });
        }
        
        const filePath = getPlatformTsvPath(platform);
        
        await buildIndexFromTSV(filePath, platform);
        
        return res.json({
            success: true,
            platform,
            message: `索引构建完成: ${platform}`
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
 * Body: { platform?: string }
 */
export const loadCategoryIndex = async (req: Request, res: Response) => {
    try {
        const { platform = 'shopify' } = req.body;
        
        if (!validatePlatform(platform)) {
            return res.status(400).json({
                success: false,
                error: `不支持的平台: ${platform}，支持: ${SUPPORTED_PLATFORMS.join(', ')}`
            });
        }
        
        await loadIndex(platform);
        
        return res.json({
            success: true,
            platform,
            message: `索引加载完成: ${platform}`
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
 * Body: { platform?: string }
 */
export const deleteCategoryIndex = async (req: Request, res: Response) => {
    try {
        const { platform = 'shopify' } = req.body;
        
        if (!validatePlatform(platform)) {
            return res.status(400).json({
                success: false,
                error: `不支持的平台: ${platform}，支持: ${SUPPORTED_PLATFORMS.join(', ')}`
            });
        }
        
        deleteIndex(platform);
        
        return res.json({
            success: true,
            platform,
            message: `索引已删除: ${platform}`
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
        supportedPlatforms: SUPPORTED_PLATFORMS,
        loadedIndexes: getLoadedIndexes()
    });
};