# NatureWellness

Science-backed food recommendations based on bioactive compounds and nutrients.

## About

NatureWellness provides evidence-based recommendations of fruits and vegetables for specific health conditions, powered by USDA data, OpenAI, and expert validation.

## Tech Stack

- React + TypeScript + Vite
- Supabase (Database + Edge Functions)
- OpenAI API, USDA FoodData Central
- Tailwind CSS + shadcn/ui

## Getting Started
```bash
npm install
npm run dev
```

## Features

- Health condition selection
- Food recommendations with evidence grading
- AI-generated mechanism explanations
- USDA nutrient data integration
- Admin dashboard

## License

© 2026 SabiFlow Technologies Limited. All rights reserved.
```

5. Scroll down → Click **"Commit changes"**

---

### **Step 3: Deploy to Vercel**

**Now deploy the cleaned-up repo:**

1. Go to **vercel.com**
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Select: **`naturewellness_staging`**
5. **Framework:** Vite
6. **Build Command:** `npm run build`
7. **Output Directory:** `dist`
8. **Add Environment Variables:**
```
   VITE_SUPABASE_URL=https://vxtqizfrajbzcbktxrge.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
9. Click **"Deploy"**

---

### **Step 4: Get Your URL**

**After 2-3 minutes, you'll get:**
```
https://naturewellness-staging.vercel.app
