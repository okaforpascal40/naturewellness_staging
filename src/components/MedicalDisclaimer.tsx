import { AlertTriangle } from "lucide-react";

export const DISCLAIMER_TEXT =
  "For educational and wellness information only. Not medical advice or a substitute for professional healthcare.";

const MedicalDisclaimer = () => (
  <div className="bg-accent/15 border border-accent/30 px-4 py-2.5 text-xs sm:text-sm text-accent-foreground flex items-start gap-2">
    <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
    <span>{DISCLAIMER_TEXT}</span>
  </div>
);

export default MedicalDisclaimer;
