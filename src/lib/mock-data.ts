import { HealthCondition, Food, FoodConditionLink } from "./types";

export const mockConditions: HealthCondition[] = [
  { id: "1", name: "Type 2 Diabetes", category: "Metabolic" },
  { id: "2", name: "Hypertension", category: "Cardiovascular" },
  { id: "3", name: "Chronic Inflammation", category: "Immune" },
  { id: "4", name: "Osteoporosis", category: "Musculoskeletal" },
  { id: "5", name: "Anxiety & Stress", category: "Neurological" },
  { id: "6", name: "Digestive Issues", category: "Gastrointestinal" },
  { id: "7", name: "High Cholesterol", category: "Cardiovascular" },
  { id: "8", name: "Iron Deficiency", category: "Nutritional" },
];

export const mockFoods: Food[] = [
  { id: "f1", name: "Turmeric", scientific_name: "Curcuma longa", emoji: "🟡", compounds: ["Curcumin", "Demethoxycurcumin"], warnings: ["May interact with blood thinners"], nutrients: { "Manganese": "26% DV", "Iron": "16% DV" } },
  { id: "f2", name: "Blueberries", scientific_name: "Vaccinium corymbosum", emoji: "🫐", compounds: ["Anthocyanins", "Pterostilbene"], nutrients: { "Vitamin C": "24% DV", "Vitamin K": "36% DV", "Fiber": "14% DV" } },
  { id: "f3", name: "Salmon", scientific_name: "Salmo salar", emoji: "🐟", compounds: ["EPA", "DHA", "Astaxanthin"], nutrients: { "Protein": "40g", "Omega-3": "2.3g", "Vitamin D": "66% DV" } },
  { id: "f4", name: "Spinach", scientific_name: "Spinacia oleracea", emoji: "🥬", compounds: ["Lutein", "Zeaxanthin", "Nitrates"], nutrients: { "Iron": "15% DV", "Calcium": "10% DV", "Vitamin K": "181% DV" } },
  { id: "f5", name: "Garlic", scientific_name: "Allium sativum", emoji: "🧄", compounds: ["Allicin", "S-allyl cysteine"], warnings: ["May interact with blood thinners"], nutrients: { "Manganese": "8% DV", "Vitamin B6": "6% DV" } },
  { id: "f6", name: "Green Tea", scientific_name: "Camellia sinensis", emoji: "🍵", compounds: ["EGCG", "L-Theanine", "Catechins"], nutrients: { "Fluoride": "22% DV", "Manganese": "18% DV" } },
];

export const mockLinks: FoodConditionLink[] = [
  { id: "l1", food_id: "f1", condition_id: "1", evidence_level: "strong", mechanism_summary: "Curcumin improves insulin sensitivity by activating AMPK pathways and reducing inflammatory cytokines in pancreatic beta cells.", key_compounds: ["Curcumin"], layer: "health-safe", approved_for_public: true, pubmed_refs: ["PMID:28244676"] },
  { id: "l2", food_id: "f2", condition_id: "1", evidence_level: "moderate", mechanism_summary: "Anthocyanins in blueberries enhance glucose uptake and improve insulin signaling in skeletal muscle tissue.", key_compounds: ["Anthocyanins", "Pterostilbene"], layer: "health-safe", approved_for_public: true, pubmed_refs: ["PMID:31239457"] },
  { id: "l3", food_id: "f5", condition_id: "2", evidence_level: "strong", mechanism_summary: "Allicin inhibits angiotensin II and stimulates nitric oxide production, leading to vasodilation and reduced blood pressure.", key_compounds: ["Allicin"], layer: "health-safe", approved_for_public: true, pubmed_refs: ["PMID:32074398"] },
  { id: "l4", food_id: "f3", condition_id: "2", evidence_level: "moderate", mechanism_summary: "Omega-3 fatty acids EPA and DHA reduce vascular inflammation and improve endothelial function.", key_compounds: ["EPA", "DHA"], layer: "health-safe", approved_for_public: true },
  { id: "l5", food_id: "f1", condition_id: "3", evidence_level: "strong", mechanism_summary: "Curcumin potently inhibits NF-κB signaling pathway, reducing production of inflammatory mediators.", key_compounds: ["Curcumin"], layer: "health-safe", approved_for_public: true, pubmed_refs: ["PMID:29065496"] },
  { id: "l6", food_id: "f6", condition_id: "5", evidence_level: "moderate", mechanism_summary: "L-Theanine increases alpha brain wave activity and GABA production, promoting calm without sedation.", key_compounds: ["L-Theanine", "EGCG"], layer: "health-safe", approved_for_public: true },
  { id: "l7", food_id: "f4", condition_id: "4", evidence_level: "emerging", mechanism_summary: "Vitamin K in spinach supports osteocalcin activation, essential for calcium binding in bone matrix.", key_compounds: ["Vitamin K", "Calcium"], layer: "health-safe", approved_for_public: true },
  { id: "l8", food_id: "f3", condition_id: "3", evidence_level: "strong", mechanism_summary: "EPA and DHA compete with arachidonic acid, reducing pro-inflammatory eicosanoid synthesis.", key_compounds: ["EPA", "DHA", "Astaxanthin"], layer: "academic", approved_for_public: true },
];
