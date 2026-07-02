import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MedicalDisclaimer from "./MedicalDisclaimer";

const Layout = () => (
  <div className="min-h-screen flex flex-col">
    <MedicalDisclaimer />
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <MedicalDisclaimer />
    <Footer />
  </div>
);

export default Layout;
