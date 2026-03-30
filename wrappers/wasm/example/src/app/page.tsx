import BbsDemo from "@/components/bbs-demo";
import { ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] selection:bg-primary/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header Section */}
        <header className="text-center space-y-4 mb-20 animate-fade-in">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold uppercase tracking-widest mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Next-Gen Cryptography</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            BBS <span className="gradient-text">Signatures</span> Demo
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            Rust 기반의 고성능 암호화 라이브러리를 WASM으로 변환하여 웹에서 직접 실행합니다. 
            <strong>익명성</strong>과 <strong>선택적 공개</strong>를 지원하는 현대적인 인증 기술을 경험해 보세요.
          </p>
        </header>

        {/* Core Demo Component */}
        <BbsDemo />

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2026 Pairing Crypto WASM Project. All rights reserved.</p>
          <div className="mt-2 flex justify-center space-x-4">
            <a href="https://github.com/mattrglobal/pairing_crypto" target="_blank" className="hover:text-primary transition-colors">GitHub</a>
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
