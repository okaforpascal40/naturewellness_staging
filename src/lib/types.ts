export interface HealthCondition {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface Food {
  id: string;
  name: string;
  scientific_name?: string;
  emoji: string;
  nutrients?: Record<string, string>;
  compounds?: string[];
  warnings?: string[];
}

export interface FoodConditionLink {
  id: string;
  food_id: string;
  condition_id: string;
  evidence_level: 'strong' | 'moderate' | 'emerging';
  mechanism_summary: string;
  key_compounds: string[];
  layer: 'health-safe' | 'academic';
  approved_for_public: boolean;
  pubmed_refs?: string[];
  food?: Food;
  condition?: HealthCondition;
}
