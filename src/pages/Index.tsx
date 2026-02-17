import { Link } from "react-router-dom";
import { Leaf, FlaskConical, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
const features = [
  {
    icon: FlaskConical,
    title: "Evidence-Based",
    description: "Only validated research from peer-reviewed studies and clinical trials.",
  },
  {
    icon: Leaf,
    title: "Bioactive Focus",
    description: "Deep dive into phytochemicals, polyphenols, and bioactive nutrients.",
  },
  {
    icon: Shield,
    title: "Two-Layer Safety",
    description: "Health-safe defaults with optional academic data for researchers.",
  },
];

const Index = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="container mx-auto px-4 py-24 md:py-32 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6 text-sm text-primary font-medium">
            <Leaf className="h-4 w-4" />
            Science-Backed Nutrition
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-secondary mb-4 leading-tight">
            Discover Nature's
            <br />
            <span className="text-primary">Healing Foods</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Science-backed nutrition guidance powered by bioactive compounds research.
            <br />
            <em className="text-sm">"Let Food Be Your Nature's Medicine"</em>
          </p>
          <Link to="/conditions">
            <Button size="lg" className="text-base px-8 gap-2">
              Explore by Health Condition
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {/* Decorative leaves */}
        <div className="absolute top-10 left-10 text-primary/10 text-8xl select-none">🌿</div>
        <div className="absolute bottom-10 right-10 text-primary/10 text-7xl select-none">🍃</div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-secondary mb-10">
          Why NatureWellness?
        </h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((f) => (
            <Card key={f.title} className="border-primary/10 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-secondary mb-2" style={{ fontFamily: "'Merriweather', serif" }}>
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
