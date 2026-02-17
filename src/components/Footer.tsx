import Logo from "@/components/Logo";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 text-muted-foreground">
          <Logo className="w-[120px] md:w-[150px] h-auto" />
          <span className="text-sm">© 2026 Educational purposes only.</span>
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
