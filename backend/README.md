# MyAssets Backend

資訊資產管理系統 - 後端 API

## 技術棧

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT

## 開始使用

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並修改設定：

```bash
cp .env.example .env
```

主要設定項目：
- `DATABASE_URL`: PostgreSQL 連線字串
- `JWT_SECRET`: JWT 加密金鑰（請使用強密碼）

### 3. 初始化資料庫

```bash
# 產生 Prisma Client
npm run db:generate

# 執行 Migration
npm run db:migrate

# 初始化預設資料
npm run db:seed
```

### 4. 啟動伺服器

```bash
# 開發模式
npm run dev

# 正式環境
npm start
```

伺服器預設在 `http://localhost:3000` 啟動

## API 文件

### 認證

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | /api/v1/auth/login | 登入 |
| POST | /api/v1/auth/logout | 登出 |
| POST | /api/v1/auth/refresh | 更新 Token |
| GET | /api/v1/auth/me | 取得當前使用者 |
| POST | /api/v1/auth/change-password | 變更密碼 |

### 預設帳號

- 帳號：`admin@myassets.local`
- 密碼：`Admin@123`

## 專案結構

```
backend/
├── prisma/
│   ├── schema.prisma    # 資料庫結構定義
│   └── seed.js          # 初始資料
├── src/
│   ├── config/          # 設定檔
│   ├── controllers/     # 控制器
│   ├── middleware/      # 中間件
│   ├── models/          # 資料模型
│   ├── routes/          # 路由
│   ├── services/        # 商業邏輯
│   ├── utils/           # 工具函式
│   └── index.js         # 入口點
├── .env.example         # 環境變數範本
└── package.json
```

## License

MIT
