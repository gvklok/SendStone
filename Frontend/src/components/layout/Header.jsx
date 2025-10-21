import React from 'react';
import { Mountain, Menu, X } from 'lucide-react';

const Header = ({ mobileMenuOpen, setMobileMenuOpen }) => (
  <div className="md:hidden bg-white border-b-2 border-gray-900 p-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="p-1">
        <Mountain size={24} strokeWidth={3} />
      </div>
      <span className="text-lg font-black uppercase tracking-widest">SendStone</span>
    </div>
    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
      {mobileMenuOpen ? <X size={28} strokeWidth={2.5} /> : <Menu size={28} strokeWidth={2.5} />}
    </button>
  </div>
);

export default Header;
