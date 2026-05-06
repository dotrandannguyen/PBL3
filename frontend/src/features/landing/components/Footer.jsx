import React from "react";
import { Github, Twitter, Linkedin, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-notion-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-notion-text rounded flex items-center justify-center text-white font-bold text-xl">
                N
              </div>
              <span className="font-bold text-xl tracking-tighter">Nexus</span>
            </div>
            <p className="text-notion-text/60 max-w-xs mb-8">
              The unified workspace for your notes, docs, and projects. 
              Built for teams that demand speed and simplicity.
            </p>
            <div className="flex items-center gap-4">
              <SocialIcon icon={<Twitter size={20} />} />
              <SocialIcon icon={<Github size={20} />} />
              <SocialIcon icon={<Linkedin size={20} />} />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-notion-text/60">
              <li><FooterLink>Wiki</FooterLink></li>
              <li><FooterLink>Projects</FooterLink></li>
              <li><FooterLink>Docs</FooterLink></li>
              <li><FooterLink>What's New</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-notion-text/60">
              <li><FooterLink>About</FooterLink></li>
              <li><FooterLink>Careers</FooterLink></li>
              <li><FooterLink>Blog</FooterLink></li>
              <li><FooterLink>Contact</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-notion-text/60">
              <li><FooterLink>Privacy</FooterLink></li>
              <li><FooterLink>Terms</FooterLink></li>
              <li><FooterLink>Security</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-notion-border text-xs text-notion-text/40">
          <p>© {new Date().getFullYear()} Nexus Labs Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <div className="flex items-center gap-1">
              <Globe size={14} />
              <span>English</span>
            </div>
            <FooterLink>Status</FooterLink>
            <FooterLink>Cookies</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ children }) {
  return (
    <a href="#" className="hover:text-notion-text transition-colors">
      {children}
    </a>
  );
}

function SocialIcon({ icon }) {
  return (
    <a href="#" className="w-10 h-10 rounded-full border border-notion-border flex items-center justify-center text-notion-text/60 hover:text-notion-text hover:bg-notion-secondary transition-all">
      {icon}
    </a>
  );
}
