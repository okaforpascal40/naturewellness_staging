
-- Allow inserts and deletes on food_condition_links (for admin usage)
CREATE POLICY "Allow insert on food_condition_links"
ON public.food_condition_links
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow delete on food_condition_links"
ON public.food_condition_links
FOR DELETE
USING (true);

CREATE POLICY "Allow update on food_condition_links"
ON public.food_condition_links
FOR UPDATE
USING (true);
