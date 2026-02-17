

# NatureWellness — Science-Backed Food & Nutrition Platform

**Tagline:** *"Let Food Be Your Nature's Medicine"*

A comprehensive platform that connects health conditions to evidence-based food recommendations, powered by bioactive compounds research.

---

## Branding & Design System

- **Primary:** Forest Green (#16a34a) — used for buttons, links, active states
- **Secondary:** Earth Brown (#92400e) — headings, accents
- **Accent:** Golden Yellow (#f59e0b) — highlights, badges, CTAs
- Clean, natural aesthetic with leaf/nature motifs and a scientific feel
- Persistent medical disclaimer banner on every page

---

## Pages & Features

### 1. Home Page (`/`)
- NatureWellness logo with leaf icon and hero section
- Hero text: "Discover Nature's Healing Foods" with science-focused subtitle
- Non-dismissible medical disclaimer banner (⚠️ educational purposes only)
- "Explore by Health Condition" CTA button
- Three feature highlight cards: Evidence-Based, Bioactive Focus, Two-Layer Safety

### 2. Conditions Browser (`/conditions`)
- Grid of health condition cards fetched from Supabase
- Each card shows condition name, category badge, and navigation arrow
- Search bar to filter conditions by name
- Category filter buttons for quick browsing

### 3. Recommendations Page (`/conditions/:id`)
- Condition name as title with "Science-backed food recommendations" subtitle
- Grid of food recommendation cards, each showing:
  - Food name with emoji placeholder
  - Color-coded evidence badge (Strong/Moderate/Emerging)
  - Key compound tags/chips
  - Brief mechanism summary
  - "View Details" button
- Toggle switch for Academic Data layer (off by default, shows warning when enabled)
- Back navigation and medical disclaimer footer

### 4. Food Details Page (`/foods/:id`)
- Food name, scientific name, and emoji placeholder
- Tabbed interface with four tabs:
  - **Overview:** Related conditions, key phytochemicals, mechanism of action, warnings
  - **Nutrients:** Nutritional data from database
  - **Compounds:** Bioactive compounds list
  - **Research:** PubMed references and evidence level explanation
- Medical disclaimer

### 5. Admin Panel (`/admin`)
- Simple password protection gate
- Data table of all food-condition links with columns for food, condition, evidence level, layer, approval status, and actions
- "Add New Recommendation" form
- Action buttons for "Generate Mechanism" and "Enrich from USDA" (wired to call Supabase Edge Functions)
- Edit, delete, and approve actions per row

---

## Navigation & Layout

- **Top navbar:** Logo | Conditions | About | Admin
- **Mobile:** Hamburger menu
- **Footer:** Disclaimer | About | Contact
- Medical disclaimer visible on every page

---

## Backend (Supabase)

The app will connect to Supabase and read from these tables:
- `health_conditions` — list of health conditions with categories
- `foods` — food items with scientific names, nutrients, compounds
- `food_condition_links` — relationships between foods and conditions with evidence levels, layers, and approval status

**Data filtering defaults:**
- Only show `approved_for_public = true` AND `layer = 'health-safe'` unless the academic toggle is explicitly enabled

**Edge Functions** will be set up for:
- Generate Mechanism (AI-assisted mechanism text generation)
- Enrich from USDA (nutritional data enrichment)

---

## Safety & Compliance
- Non-dismissible medical disclaimer on every page
- Default to health-safe layer only
- Academic layer requires explicit opt-in with warning dialog
- Admin access is password-protected

