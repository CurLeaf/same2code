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
 * 查询所有平台的类目
 * POST /category/predict/all
 * Body: { text: string, k?: number }
 */
export const queryAllPlatforms = async (req: Request, res: Response) => {
    try {
        const { text, k = 5 } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'text 字段必填且必须为字符串'
            });
        }

        const results: Record<string, any> = {};

        // 并行查询所有平台
        const promises = SUPPORTED_PLATFORMS.map(async (platform) => {
            try {
                // 检查索引是否已加载
                if (!isIndexLoaded(platform)) {
                    await loadIndex(platform);
                }

                const topK = await searchTopK(text, platform, Number(k));
                results[platform] = {
                    success: true,
                    topK
                };
            } catch (error: any) {
                results[platform] = {
                    success: false,
                    error: error.message
                };
            }
        });

        await Promise.all(promises);

        return res.json({
            success: true,
            text,
            platforms: results
        });
    } catch (error: any) {
        console.error('[Error] queryAllPlatforms:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '内部错误'
        });
    }
};

/**
 * 链式查询：商品 -> shopify -> (ozon + yandex)
 * POST /category/predict/chain
 * Body: { text: string, k?: number }
 *
 * 逻辑：
 * 1. 先用商品文本在 shopify 中查询，得到 Top-K 类目
 * 2. 对每个 shopify 类目的文本描述，在 ozon 和 yandex 中搜索最相似的类目
 * 3. 返回完整的映射链
 */
export const queryCategoryChain = async (req: Request, res: Response) => {
    try {
        const { text, k = 3 } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'text 字段必填且必须为字符串'
            });
        }

        // 1. 确保 shopify 索引已加载
        if (!isIndexLoaded('shopify')) {
            await loadIndex('shopify');
        }

        // 2. 在 shopify 中查询
        const shopifyResults = await searchTopK(text, 'shopify', Number(k));

        // 3. 加载 shopify 索引以获取类目文本
        const { getCategoryById } = await import('../lib/vector');
        const shopifyCategoriesWithText = await Promise.all(
            shopifyResults.map(async (result) => {
                const category = await getCategoryById(result.id, 'shopify');
                return {
                    id: result.id,
                    score: result.score,
                    text: category?.text || ''
                };
            })
        );

        // 4. 对每个 shopify 类目，在 ozon 和 yandex 中搜索
        const chainResults = await Promise.all(
            shopifyCategoriesWithText.map(async (shopifyCat) => {
                const mappings: Record<string, any> = {};

                // 搜索 ozon
                try {
                    if (!isIndexLoaded('ozon')) {
                        await loadIndex('ozon');
                    }
                    const ozonResults = await searchTopK(shopifyCat.text, 'ozon', 1);
                    mappings.ozon = ozonResults[0];
                } catch (error: any) {
                    mappings.ozon = { error: error.message };
                }

                // 搜索 yandex
                try {
                    if (!isIndexLoaded('yandex')) {
                        await loadIndex('yandex');
                    }
                    const yandexResults = await searchTopK(shopifyCat.text, 'yandex', 1);
                    mappings.yandex = yandexResults[0];
                } catch (error: any) {
                    mappings.yandex = { error: error.message };
                }

                return {
                    shopify: {
                        id: shopifyCat.id,
                        score: shopifyCat.score,
                        text: shopifyCat.text
                    },
                    mappings
                };
            })
        );

        return res.json({
            success: true,
            text,
            chain: chainResults
        });
    } catch (error: any) {
        console.error('[Error] queryCategoryChain:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '内部错误'
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