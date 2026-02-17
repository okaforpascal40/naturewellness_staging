import { Leaf } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" />
          <span className="text-sm">© 2026 NatureWellness. Educational purposes only.</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>Disclaimer</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
