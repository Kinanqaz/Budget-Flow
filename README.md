# 💰 BudgetFlow

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
</p>

> A modern, interactive personal finance visualization application that helps you understand where your money goes through beautiful, intuitive charts 📊

---

## ✨ What is BudgetFlow?

**BudgetFlow** is a sleek, web-based budget tracking tool designed to give you a crystal-clear picture of your financial flow. Transform your income and expense data into compelling visual representations that make spotting spending patterns a breeze! 🎯

![alt text](image.png)
---

## 🚀 Features

### 📈 Interactive Charts
| Feature | Description |
|---------|-------------|
| 🔀 **Sankey Flow** | Visualize money flow from income → categories → expenses |
| 🍩 **Donut Chart** | See proportional expense breakdown with category colors |
| ⚠️ **Smart Alerts** | Red warnings when expenses exceed income |

### 🎛️ Smart Controls
- 💱 **Multi-Currency** — € $ £ CHF ¥ ₹ ₽ ₩
- 🔄 **Live Updates** — Edit in sidebar, see changes instantly
- 📊 **Value/% Toggle** — Switch between numbers and percentages
- 🌓 **Dark/Light Mode** — Comfortable viewing day or night

### 💾 Data Management
| Storage | Status |
|---------|--------|
| 💻 Local Storage | ✅ Auto-saved |
| ☁️ Supabase Cloud | ✅ Optional sync |
| 📤 JSON Export | ✅ Backup & share |
| 📥 JSON Import | ✅ Restore data |

---

## 🎯 What It Does

BudgetFlow empowers you to:

1. 💵 **Track Income** — Add multiple income sources with custom names
2. 📁 **Organize Expenses** — Create color-coded categories with items
3. 🔍 **Visualize Flow** — See exactly where every euro/dollar goes
4. ⚖️ **Monitor Balance** — Instantly spot deficits or surpluses
5. 💾 **Export Data** — Backup as JSON anytime
6. 📂 **Import Data** — Restore or migrate your financial data

---

## 📦 Installation

### ⚙️ Prerequisites
- 🟢 Node.js 18+ 
- 📦 npm or 🥟 bun

### 🚀 Quick Start

1️⃣ **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/budgetflow.git
   cd budgetflow
   ```

2️⃣ **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3️⃣ **Environment Setup** ☁️ (Optional - for Supabase sync)
   
   Create a `.env` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

---

## 🏃 Running Locally

### 💻 Development Server

```bash
npm run dev
# or
bun dev
```

🌐 The app will be available at `http://localhost:xxxx`

### 🏗️ Build for Production

```bash
npm run build
# or
bun run build
```

### 👀 Preview Production Build

```bash
npm run preview
# or
bun run preview
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| ⚛️ **React** | UI framework |
| 🔷 **TypeScript** | Type safety |
| ⚡ **Vite** | Build tool & dev server |
| 🎨 **Tailwind CSS** | Styling |
| 🧩 **shadcn/ui** | UI components |
| 🔥 **Supabase** | Backend & auth (optional) |
| 🎯 **Lucide React** | Beautiful icons |

---

## 💡 Usage Tips

> 💵 **1. Start with Income** — Add your income sources first
> 
> 📁 **2. Create Categories** — Group expenses logically (Housing, Living, Savings, etc.)
> 
> 📝 **3. Add Items** — Break down each category into specific expenses
> 
> 🔄 **4. Switch Charts** — 🔀 Flow chart for distributions | 🍩 Donut chart for proportions
> 
> 💾 **5. Export Regularly** — Use "save as JSON" to backup your data
> 
> 🚨 **6. Watch for Red** — Red indicators = spending more than you earn! ⚠️

---

## 📜 License

<p align="center">
  <b>MIT License</b> 📄
</p>

<p align="center">
  ✨ Feel free to use, modify, and distribute ✨
</p>

---

<p align="center">
  🚀 Built with modern web technologies for a smooth budgeting experience 💚
</p>

<p align="center">
  Made with ❤️ by Kinan
</p>
