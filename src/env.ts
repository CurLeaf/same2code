import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

export const env = createEnv({
    server: {
        // Embedding API 配置
        EMBEDDING_BASE_URL: z.string().nonempty(),
        EMBEDDING_API_KEY: z.string().nonempty(),
        EMBEDDING_MODEL_NAME: z.string().nonempty(),
        EMBEDDING_DIMENSION: z.string().nonempty().default("1024"),
        // 服务端口
        PORT: z.string().nonempty().default("6006"),
    },
    client: {},
    runtimeEnv: {
        EMBEDDING_BASE_URL: process.env.EMBEDDING_BASE_URL,
        EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
        EMBEDDING_MODEL_NAME: process.env.EMBEDDING_MODEL_NAME,
        EMBEDDING_DIMENSION: process.env.EMBEDDING_DIMENSION,
        PORT: process.env.PORT,
    }
});

