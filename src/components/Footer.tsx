import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center gap-4">
        <div style={{ transform: 'scale(0.85)' }}>
          <Logo />
        </div>
        <div className="text-center space-y-1">
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
