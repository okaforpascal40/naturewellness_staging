import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Lock, Plus, Trash2, Apple, Heart, FileText, Clock, Loader2, Sparkles, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "naturewellness2024";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [enrichFoodId, setEnrichFoodId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [form, setForm] = useState({
    food_id: "",
    condition_id: "",
    evidence_level: "emerging",
    mechanism: "",
    key_compounds: "",
    layer: "health-safe",
    approved_for_public: false,
  });

  // Loading states
  const [generatingMechanism, setGeneratingMechanism] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const { data: foods } = useQuery({
    queryKey: ["admin_foods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("foods").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: authenticated,
  });

  const { data: conditions } = useQuery({
    queryKey: ["admin_conditions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("health_conditions").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: authenticated,
  });

  const { data: links } = useQuery({
    queryKey: ["admin_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_condition_links")
        .select("*, foods(name), health_conditions(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: authenticated,
  });

  const pendingCount = links?.filter((l) => !l.approved_for_public).length ?? 0;

  const insertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("food_condition_links").insert({
        food_id: form.food_id,
        condition_id: form.condition_id,
        evidence_level: form.evidence_level,
        mechanism: form.mechanism || null,
        key_compounds: form.key_compounds ? form.key_compounds.split(",").map((s) => s.trim()) : [],
        layer: form.layer,
        approved_for_public: form.approved_for_public,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_links"] });
      setModalOpen(false);
      setForm({ food_id: "", condition_id: "", evidence_level: "emerging", mechanism: "", key_compounds: "", layer: "health-safe", approved_for_public: false });
      toast({ title: "Recommendation added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_condition_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_links"] });
      toast({ title: "Deleted" });
    },
  });

  const handleGenerateMechanism = async () => {
    const foodName = foods?.find((f) => f.id === form.food_id)?.name;
    const conditionName = conditions?.find((c) => c.id === form.condition_id)?.name;

    if (!foodName || !conditionName) {
      toast({ title: "Select food and condition first", variant: "destructive" });
      return;
    }

    const firstCompound = form.key_compounds.split(",").map((s) => s.trim()).filter(Boolean)[0] || "";

    setGeneratingMechanism(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mechanism", {
        body: { food: foodName, compound: firstCompound, condition: conditionName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForm((prev) => ({ ...prev, mechanism: data.mechanism }));
      toast({ title: "Mechanism generated" });
    } catch (err: any) {
      console.error("Generate mechanism error:", err);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingMechanism(false);
    }
  };

  const handleEnrichFood = async () => {
    const food = foods?.find((f) => f.id === enrichFoodId);
    if (!food) {
      toast({ title: "Select a food first", variant: "destructive" });
      return;
    }

    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-food", {
        body: { foodId: food.id, foodName: food.name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: `Enriched ${food.name} with ${data.nutrientCount} nutrients` });
      queryClient.invalidateQueries({ queryKey: ["admin_foods"] });
    } catch (err: any) {
      console.error("Enrich food error:", err);
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter admin password"
              />
              {error && <p className="text-destructive text-sm mt-1">{error}</p>}
            </div>
            <Button className="w-full" onClick={handleLogin}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary">Admin Panel</h1>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add New Recommendation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Recommendation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Food</Label>
                <Select value={form.food_id} onValueChange={(v) => setForm({ ...form, food_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select food" /></SelectTrigger>
                  <SelectContent>
                    {foods?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={form.condition_id} onValueChange={(v) => setForm({ ...form, condition_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    {conditions?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Evidence Level</Label>
                <Select value={form.evidence_level} onValueChange={(v) => setForm({ ...form, evidence_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong">Strong</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="emerging">Emerging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Key Compounds (comma separated)</Label>
                <Input value={form.key_compounds} onChange={(e) => setForm({ ...form, key_compounds: e.target.value })} placeholder="Curcumin, EGCG" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Mechanism Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={generatingMechanism || !form.food_id || !form.condition_id}
                    onClick={handleGenerateMechanism}
                  >
                    {generatingMechanism ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {generatingMechanism ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
                <Textarea
                  value={form.mechanism}
                  onChange={(e) => setForm({ ...form, mechanism: e.target.value })}
                  placeholder="Describe mechanism..."
                  disabled={generatingMechanism}
                />
              </div>
              <div>
                <Label>Layer</Label>
                <Select value={form.layer} onValueChange={(v) => setForm({ ...form, layer: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health-safe">Health-Safe</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.approved_for_public} onCheckedChange={(v) => setForm({ ...form, approved_for_public: v })} />
                <Label>Approved for Public</Label>
              </div>
              <Button
                className="w-full"
                onClick={() => insertMutation.mutate()}
                disabled={!form.food_id || !form.condition_id || insertMutation.isPending || generatingMechanism}
              >
                {insertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Recommendation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Apple className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{foods?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Foods</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{conditions?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Conditions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{links?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Recommendations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrich Food Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-primary" />
            Enrich Food Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>Select Food</Label>
              <Select value={enrichFoodId} onValueChange={setEnrichFoodId}>
                <SelectTrigger><SelectValue placeholder="Choose a food to enrich" /></SelectTrigger>
                <SelectContent>
                  {foods?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEnrichFood}
              disabled={!enrichFoodId || enriching}
              className="gap-1"
            >
              {enriching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              {enriching ? "Fetching..." : "🔬 Fetch USDA Nutrients"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Links table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Food</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Layer</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links?.map((link) => {
                const food = link.foods as any;
                const cond = link.health_conditions as any;
                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{food?.name}</TableCell>
                    <TableCell>{cond?.name}</TableCell>
                    <TableCell>
                      <Badge className={
                        link.evidence_level === "strong" ? "bg-green-100 text-green-800" :
                        link.evidence_level === "moderate" ? "bg-amber-100 text-amber-800" :
                        "bg-blue-100 text-blue-800"
                      }>
                        {link.evidence_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.layer === "health-safe" ? "secondary" : "outline"}>
                        {link.layer}
                      </Badge>
                    </TableCell>
                    <TableCell>{link.approved_for_public ? "✅" : "❌"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(link.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
