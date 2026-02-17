import { Leaf } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-bold text-secondary text-lg">NatureWellness</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Science · Nature · Health</p>
          <p className="text-xs text-muted-foreground italic">
            "And the leaves of the tree are for the healing of the nations." — Ezekiel 47:12
          </p>
        </div>
        <div className="text-center md:text-right space-y-1">
          <p className="text-xs text-muted-foreground">
            ⚠️ For educational purposes only. Not medical advice. Always consult your healthcare provider.
          </p>
          <p className="text-xs text-muted-foreground">
            © 2026 NatureWellness. For educational purposes only.
          </p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
