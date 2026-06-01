# 📊 Learning Dashboard

一个个人学习与资产追踪的全栈 Web 应用，帮助记录和可视化四个维度的成长数据。

## ✨ 功能

- **🔐 用户系统**：邮箱注册/登录，数据按用户隔离
- **📊 学习时间**：开始/结束计时，统计今日/本月/总计学习时长
- **💰 资金账户**：收入/支出记录，自动计算余额与月度汇总
- **🧠 技能账户**：技能名称、学习时长、熟练度管理
- **🚀 产品账户**：产品/项目成果追踪
- **📥 数据导入/导出**：JSON 格式备份与恢复
- **🌙 暗色主题**：现代化深色 UI，移动端响应式

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.10+, Flask, SQLAlchemy ORM |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| 前端 | 原生 HTML + CSS + JavaScript, Jinja2 模板 |
| 认证 | Flask-Login + Werkzeug 密码哈希 |
| 部署 | Render / Railway |

## 🚀 本地运行

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd self-improvement
```

### 2. 创建虚拟环境并安装依赖

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. 设置环境变量

```bash
# Windows (PowerShell)
$env:SECRET_KEY="your-random-secret-key"

# macOS / Linux
export SECRET_KEY="your-random-secret-key"
```

### 4. 运行

```bash
python app.py
```

访问 http://localhost:5000

## ☁️ 部署到 Render

### 1. 推送代码到 GitHub

在 GitHub 创建一个新仓库，推送所有代码。

### 2. 在 Render 创建 Web Service

1. 登录 [Render](https://render.com)
2. 点击 **New +** → **Web Service**
3. 连接你的 GitHub 仓库
4. 填写配置：
   - **Name**: `learning-dashboard`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. 点击 **Advanced** 添加环境变量：
   - `SECRET_KEY` = 一个随机字符串
   - `DATABASE_URL` = 留空则默认使用 SQLite（免费）

> ⚠️ Render 免费套餐的 SQLite 在每次部署时会重置。如需持久化数据，请配置 PostgreSQL 数据库。

### 3. 部署

点击 **Create Web Service**，等待几分钟即可获得公网 URL。

## 📁 项目结构

```
self-improvement/
├── app.py                 # Flask 主应用（模型、路由、API）
├── requirements.txt       # Python 依赖
├── README.md
├── templates/
│   └── index.html         # 单页应用模板
└── static/
    ├── style.css           # 暗色主题样式
    └── app.js              # 前端交互逻辑（AJAX）
```

## 📡 API 概览

所有数据 API 需登录认证（Session Cookie），前缀 `/api`。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/study/start` | 开始学习 |
| POST | `/api/study/end` | 结束学习 |
| GET | `/api/study/stats` | 学习统计 |
| GET | `/api/study/sessions` | 最近学习记录 |
| GET/POST | `/api/finance` | 资金记录列表/添加 |
| PUT/DELETE | `/api/finance/<id>` | 更新/删除资金记录 |
| GET | `/api/finance/summary` | 资金汇总 |
| GET/POST | `/api/skills` | 技能列表/添加 |
| PUT/DELETE | `/api/skills/<id>` | 更新/删除技能 |
| GET/POST | `/api/products` | 产品列表/添加 |
| PUT/DELETE | `/api/products/<id>` | 更新/删除产品 |
| GET | `/api/export` | 导出所有数据 |
| POST | `/api/import` | 导入数据 |
| POST | `/api/clear` | 清空所有数据 |

## 📝 License

MIT
