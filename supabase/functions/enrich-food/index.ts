import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodId, foodName, searchTerm } = await req.json();

    if (!foodId || !foodName) {
      return new Response(JSON.stringify({ error: 'Missing foodId or foodName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const queryTerm = searchTerm || foodName;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are a nutrition database expert. For the food "${queryTerm}", provide nutritional data in this exact JSON format (values per 100g serving):
{
  "calories": number,
  "protein_g": number,
  "fat_g": number,
  "carbs_g": number,
  "fiber_g": number,
  "vitamin_c_mg": number,
  "vitamin_a_iu": number,
  "iron_mg": number,
  "calcium_mg": number,
  "potassium_mg": number
}
Return ONLY the JSON object, no other text.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || '';

    // Parse the JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse nutrient data from AI response');
    }
    const nutrients = JSON.parse(jsonMatch[0]);

    // Update the food record in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('foods')
      .update({ nutrients })
      .eq('id', foodId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    const nutrientCount = Object.keys(nutrients).length;

    return new Response(JSON.stringify({ success: true, nutrientCount, nutrients }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('enrich-food error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
