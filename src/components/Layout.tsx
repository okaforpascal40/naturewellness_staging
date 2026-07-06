import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MedicalDisclaimer from "./MedicalDisclaimer";
import BottomNav from "./BottomNav";

const Layout = () => (
  <div className="min-h-screen flex flex-col">
    <MedicalDisclaimer />
    <Navbar />
    {/* pb clears the fixed mobile bottom nav so content isn't hidden behind it. */}
    <main className="flex-1 pb-16 md:pb-0">
      <Outlet />
    </main>
    <MedicalDisclaimer />
    <Footer />
    <BottomNav />
  </div>
);

export default Layout;
