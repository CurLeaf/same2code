/**
 * 构建所有平台的向量索引
 * 运行: npx ts-node scripts/build_all_indexes.ts
 */

import { buildIndexFromTSV, getPlatformTsvPath, SUPPORTED_PLATFORMS } from '../src/lib/vector';

async function main() {
    console.log('='.repeat(60));
    console.log('开始构建所有平台的向量索引');
    console.log('='.repeat(60));
    
    for (const platform of SUPPORTED_PLATFORMS) {
        console.log(`\n[${ platform.toUpperCase() }] 开始构建...`);
        const startTime = Date.now();
        
        try {
            const tsvPath = getPlatformTsvPath(platform);
            await buildIndexFromTSV(tsvPath, platform);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[${platform.toUpperCase()}] 构建完成，耗时: ${duration}s`);
        } catch (error: any) {
            console.error(`[${platform.toUpperCase()}] 构建失败:`, error.message);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('所有索引构建完成！');
    console.log('='.repeat(60));
}

main().catch(console.error);
