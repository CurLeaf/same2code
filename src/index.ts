// 清除代理环境变量，避免被系统代理拦截
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

import express from 'express';
import { env } from './env';
import routes from './routes';

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://chat.openai.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

app.use(express.json());

routes.forEach(route => {
    app[route.method](route.path, ...route.middlewares, route.handler)
});

app.use(express.static('static'));


app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
})