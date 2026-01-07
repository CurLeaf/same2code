import { Request, Response } from 'express';
import express from 'express';
import * as resolvers from './resolvers';

type Route = {
    path: string,
    method: 'get' | 'post' | 'put' | 'delete',
    middlewares: Array<any>,
    handler: (req: Request, res: Response) => Promise<any> | any | void
}

const routes: Array<Route> = [
    // 健康检查
    {
        path: '/health',
        method: 'get',
        middlewares: [],
        handler: resolvers.healthCheck
    },
    // 查询类目（Top-K）- 单平台
    {
        path: '/category/predict',
        method: 'post',
        middlewares: [express.json()],
        handler: resolvers.queryCategory
    },
    // 查询所有平台类目
    {
        path: '/category/predict/all',
        method: 'post',
        middlewares: [express.json()],
        handler: resolvers.queryAllPlatforms
    },
    // 链式查询：商品 -> shopify -> (ozon + yandex)
    {
        path: '/category/predict/chain',
        method: 'post',
        middlewares: [express.json()],
        handler: resolvers.queryCategoryChain
    },
    // 构建索引
    {
        path: '/category/index',
        method: 'post',
        middlewares: [express.json()],
        handler: resolvers.buildIndex
    },
    // 加载索引
    {
        path: '/category/load',
        method: 'post',
        middlewares: [express.json()],
        handler: resolvers.loadCategoryIndex
    },
    // 删除索引
    {
        path: '/category/index',
        method: 'delete',
        middlewares: [express.json()],
        handler: resolvers.deleteCategoryIndex
    }
];

export default routes;