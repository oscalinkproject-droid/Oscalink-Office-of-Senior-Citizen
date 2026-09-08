export function Footer() {
  return (
    <footer className="bg-surface-lowest w-full py-12 mt-auto border-t border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-slate-400 font-label text-xs tracking-widest uppercase mb-4 font-bold">
          OSCALink Management System
        </p>
        <p className="text-slate-400/70 text-[10px] max-w-2xl mx-auto leading-relaxed mb-6">
          A dedicated portal for the Office for Senior Citizen Affairs, Cotabato City.<br/>
          Ensuring dignity, care, and efficient service delivery for our elderly.
        </p>
        <div className="flex justify-center gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
          <a href="/help" className="hover:text-primary transition-colors">Help Center</a>
        </div>
        <p className="text-slate-400/70 text-[9px] mt-8 uppercase tracking-widest">
          © {new Date().getFullYear()} Kinetic Precision Engineering. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
