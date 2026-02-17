import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { mockFoods, mockConditions, mockLinks } from "@/lib/mock-data";

const ADMIN_PASSWORD = "nature2026";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Generate Mechanism</Button>
          <Button variant="outline" size="sm">Enrich from USDA</Button>
          <Button size="sm">Add New Recommendation</Button>
        </div>
      </div>

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
              {mockLinks.map((link) => {
                const food = mockFoods.find((f) => f.id === link.food_id);
                const cond = mockConditions.find((c) => c.id === link.condition_id);
                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{food?.emoji} {food?.name}</TableCell>
                    <TableCell>{cond?.name}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          link.evidence_level === "strong"
                            ? "bg-primary text-primary-foreground"
                            : link.evidence_level === "moderate"
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary/60 text-primary-foreground"
                        }
                      >
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm">Delete</Button>
                        {!link.approved_for_public && (
                          <Button variant="ghost" size="sm" className="text-primary">Approve</Button>
                        )}
                      </div>
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
