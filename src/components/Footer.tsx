import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-[#f4f4f4] text-zinc-700 dark:border-white/10 dark:bg-[#151515] dark:text-zinc-300">
      <div className="app-container grid gap-10 py-12 md:grid-cols-[1.1fr_0.8fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">
            Fresh meals delivered fast. Crafted with passion, delivered with care.
          </p>
        </div>
        <div>
          <h3 className="font-black text-zinc-950 dark:text-white">Quick Links</h3>
          <div className="mt-4 grid gap-2 text-sm font-bold">
            <Link to="/">Home</Link>
            <Link to="/menu">Full Menu</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/track/SV-1028">My Orders</Link>
            <Link to="/account">My Account</Link>
          </div>
        </div>
        <div>
          <h3 className="font-black text-zinc-950 dark:text-white">Contact Us</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <span className="flex gap-2"><MapPin className="h-4 w-4 text-savoury-primary" /> 15 Adedeola Oke Street, Victoria Island, Lagos</span>
            <span className="flex gap-2"><Phone className="h-4 w-4 text-savoury-primary" /> +234 812 345 6789</span>
            <span className="flex gap-2"><Mail className="h-4 w-4 text-savoury-primary" /> hello@savoury.ng</span>
          </div>
        </div>
        <div>
          <h3 className="font-black text-zinc-950 dark:text-white">Opening Hours</h3>
          <div className="mt-4 grid gap-2 text-sm">
            {["Monday", "Tuesday", "Wednesday", "Thursday"].map((day) => <span key={day} className="flex justify-between"><span>{day}</span><strong>08:00 - 22:00</strong></span>)}
            {["Friday", "Saturday"].map((day) => <span key={day} className="flex justify-between"><span>{day}</span><strong>08:00 - 23:00</strong></span>)}
            <span className="flex justify-between"><span>Sunday</span><strong>10:00 - 21:00</strong></span>
          </div>
        </div>
      </div>
      <div className="app-container flex flex-col justify-between gap-3 border-t border-zinc-200 py-5 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:flex-row">
        <span>© 2026 Savoury. All rights reserved.</span>
        <span className="flex gap-5"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link></span>
      </div>
    </footer>
  );
}
