import { AlertTriangle } from "lucide-react";

const MedicalDisclaimer = () => (
  <div className="bg-accent/15 border border-accent/30 px-4 py-2.5 text-sm text-accent-foreground flex items-center gap-2">
    <AlertTriangle className="h-4 w-4 text-accent shrink-0" />
    <span>
      <strong>⚠️ For educational purposes only.</strong> Not medical advice. Always consult your healthcare provider.
    </span>
  </div>
);

export default MedicalDisclaimer;
