"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Key, 
  FileCheck, 
  Eye, 
  EyeOff, 
  RefreshCcw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { cn, bytesToHex } from "@/lib/utils";

// WASM 모듈 로드 (클라이언트 사이드 전용)
import { useRef } from "react";

export default function BbsDemo() {
  const bbsRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<string[]>(["example-message-1", "example-message-2"]);
  const [newMessage, setNewMessage] = useState("");
  const [secretKey, setSecretKey] = useState<Uint8Array | null>(null);
  const [publicKey, setPublicKey] = useState<Uint8Array | null>(null);
  const [signature, setSignature] = useState<Uint8Array | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([0]);
  const [proof, setProof] = useState<Uint8Array | null>(null);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ 
    type: "idle", 
    message: "" 
  });

  // Flutter (main.dart) 및 bbs_simple.rs와 동일한 상수값 설정
  const EXAMPLE_IKM = new TextEncoder().encode("only_for_example_not_A_random_seed_at_Allllllllll");
  const EXAMPLE_KEY_INFO = new TextEncoder().encode("example-key-info");
  const EXAMPLE_HEADER = new TextEncoder().encode("example-header");
  const EXAMPLE_PRESENTATION_HEADER = new TextEncoder().encode("example-presentation-header");

  useEffect(() => {
    const initWasm = async () => {
      try {
        console.log("Initializing WASM module...");
        const pkg = await import("@mattrglobal/pairing-crypto");
        bbsRef.current = pkg.bbs;
        setIsLoaded(true);
        console.log("WASM module initialized successfully.");
      } catch (err) {
        console.error("WASM loading failed:", err);
        setStatus({ type: "error", message: "WASM 라이브러리를 로드하지 못했습니다. 콘솔을 확인해 주세요." });
      }
    };
    initWasm();
  }, []);

  const generateKeys = async () => {
    if (!isLoaded || !bbsRef.current) return;
    setIsProcessing(true);
    try {
      console.log("Generating key pair with IKM...");
      const keyPair = await bbsRef.current.bls12381_sha256.generateKeyPair({ 
        ikm: EXAMPLE_IKM,
        keyInfo: EXAMPLE_KEY_INFO 
      });
      setSecretKey(keyPair.secretKey);
      setPublicKey(keyPair.publicKey);
      setSignature(null);
      setProof(null);
      console.log("Key pair generated:", keyPair);
      setStatus({ type: "success", message: "Flutter와 동일한 상수 기반으로 키가 생성되었습니다." });
    } catch (err) {
      console.error("Key generation failed:", err);
      setStatus({ type: "error", message: "키 생성 중 오류가 발생했습니다." });
    } finally {
      setIsProcessing(false);
    }
  };

  const signMessages = async () => {
    if (!secretKey || !publicKey || messages.length === 0 || !bbsRef.current) return;
    setIsProcessing(true);
    try {
      console.log("Signing messages:", messages);
      const encodedMessages = messages.map(m => new TextEncoder().encode(m));
      const sig = await bbsRef.current.bls12381_sha256.sign({
        secretKey,
        publicKey,
        header: EXAMPLE_HEADER,
        messages: encodedMessages,
      });
      setSignature(sig);
      setProof(null);
      console.log("Signature generated:", sig);
      setStatus({ type: "success", message: "메시지 서명이 완료되었습니다. (Header 포함)" });
    } catch (err) {
      console.error("Signing failed:", err);
      setStatus({ type: "error", message: "서명 중 오류가 발생했습니다." });
    } finally {
      setIsProcessing(false);
    }
  };

  const verifySignature = async () => {
    if (!publicKey || !signature || !bbsRef.current) return;
    setIsProcessing(true);
    try {
      console.log("Verifying signature...");
      const encodedMessages = messages.map(m => new TextEncoder().encode(m));
      const result = await bbsRef.current.bls12381_sha256.verify({
        publicKey,
        signature,
        header: EXAMPLE_HEADER,
        messages: encodedMessages,
      });
      console.log("Verification result:", result);
      if (result.verified) {
        setStatus({ type: "success", message: "서명이 유효합니다. (Flutter와 동일 사양)" });
      } else {
        setStatus({ type: "error", message: "서명 검증에 실패했습니다." });
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setStatus({ type: "error", message: "검증 중 오류가 발생했습니다." });
    } finally {
      setIsProcessing(false);
    }
  };

  const deriveProof = async () => {
    if (!publicKey || !signature || !bbsRef.current) return;
    setIsProcessing(true);
    try {
      console.log("Deriving proof for indices:", revealedIndices);
      const encodedMessages = messages.map(m => new TextEncoder().encode(m));
      const proofMessages = messages.map((m, i) => ({
        value: encodedMessages[i],
        reveal: revealedIndices.includes(i),
      }));

      const derivedProof = await bbsRef.current.bls12381_sha256.deriveProof({
        publicKey,
        signature,
        header: EXAMPLE_HEADER,
        presentationHeader: EXAMPLE_PRESENTATION_HEADER,
        messages: proofMessages,
      });
      setProof(derivedProof);
      console.log("Proof derived successfully.");
      setStatus({ type: "success", message: "영지식 증명(Proof)이 생성되었습니다. (Headers 포함)" });
    } catch (err) {
      console.error("Proof derivation failed:", err);
      setStatus({ type: "error", message: "증명 생성 중 오류가 발생했습니다." });
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyProof = async () => {
    if (!publicKey || !proof || !bbsRef.current) {
        console.warn("VerifyProof aborted: missing publicKey, proof, or bbs reference", { publicKey, proof, bbs: !!bbsRef.current });
        return;
    }
    setIsProcessing(true);
    try {
      console.log("Verifying proof...");
      const revealedMessages: { [key: number]: Uint8Array } = {};
      revealedIndices.forEach(idx => {
        revealedMessages[idx] = new TextEncoder().encode(messages[idx]);
      });

      const result = await bbsRef.current.bls12381_sha256.verifyProof({
        publicKey,
        proof,
        header: EXAMPLE_HEADER,
        presentationHeader: EXAMPLE_PRESENTATION_HEADER,
        messages: revealedMessages,
      });
      console.log("Proof verification result:", result);
      if (result.verified) {
        setStatus({ type: "success", message: "영지식 증명이 유효함이 증명되었습니다. (선택적 공개 성공)" });
      } else {
        setStatus({ type: "error", message: "증명 검증에 실패했습니다." });
      }
    } catch (err) {
      console.error("Proof verification failed:", err);
      setStatus({ type: "error", message: "증명 검증 중 오류가 발생했습니다." });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleReveal = (index: number) => {
    setRevealedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">WASM 엔진 로드 중...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Status Banner */}
      <AnimatePresence mode="wait">
        {status.message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "p-4 rounded-xl flex items-center justify-between border",
              status.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : 
              status.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}
          >
            <div className="flex items-center space-x-3">
              {status.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{status.message}</span>
            </div>
            <div className="text-[10px] opacity-50 uppercase tracking-tighter hidden sm:block">
              Check Console for Debug Logs
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Step 1: Key Management */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">1. 키 관리 (BBS Keys)</h2>
          </div>
          <button 
            onClick={generateKeys}
            disabled={isProcessing || !isLoaded}
            className="w-full py-3 bg-primary hover:bg-accent transition-colors rounded-xl font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            <span>새 키 쌍 생성 (Flutter 호환)</span>
          </button>
          
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">공개키 (Public Key)</label>
              <div className="p-3 bg-background rounded-lg text-xs break-all font-mono opacity-80 border border-border mt-1 min-h-[40px]">
                {publicKey ? bytesToHex(publicKey) : "키를 생성해 주세요."}
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Message & Sign */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <FileCheck className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">2. 서명 생성 및 검증</h2>
          </div>
          
          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-center space-x-2 group">
                <div className="flex-1 p-2 bg-background border border-border rounded-lg text-sm">
                  {msg}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={signMessages}
              disabled={isProcessing || !secretKey}
              className="py-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 transition-colors rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isProcessing && <RefreshCcw className="w-4 h-4 animate-spin" />}
              <span>전체 서명</span>
            </button>
            <button 
              onClick={verifySignature}
              disabled={isProcessing || !signature}
              className="py-3 bg-secondary hover:bg-muted border border-border transition-colors rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isProcessing && <RefreshCcw className="w-4 h-4 animate-spin" />}
              <span>서명 검증</span>
            </button>
          </div>
        </section>

        {/* Step 3: Selective Disclosure (Zero-Knowledge Proof) */}
        <section className="glass-card p-6 rounded-2xl md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold">3. 영지식 증명 (Zero-Knowledge Proof)</h2>
            </div>
            <div className="text-xs text-muted-foreground bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Selective Disclosure
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3">
            {messages.map((msg, i) => (
              <button 
                key={i}
                onClick={() => toggleReveal(i)}
                className={cn(
                  "p-4 rounded-xl border transition-all flex items-center justify-between text-left",
                  revealedIndices.includes(i) 
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-100" 
                    : "bg-background/40 border-border text-muted-foreground"
                )}
              >
                <span className="text-sm font-medium truncate pr-2">{msg}</span>
                {revealedIndices.includes(i) ? <Eye className="w-4 h-4 flex-shrink-0" /> : <EyeOff className="w-4 h-4 flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-border">
            <button 
              onClick={deriveProof}
              disabled={isProcessing || !signature}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2"
            >
              {isProcessing && <RefreshCcw className="w-4 h-4 animate-spin" />}
              <span>증명(Proof) 생성</span>
            </button>
            <button 
              onClick={verifyProof}
              disabled={isProcessing || !proof}
              className="flex-1 py-4 bg-secondary hover:bg-muted border border-border transition-all rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isProcessing && <RefreshCcw className="w-4 h-4 animate-spin" />}
              <span>증명 검증</span>
            </button>
          </div>

          {proof && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">생성된 증명 데이터 (Serialized Proof)</label>
              <div className="p-4 bg-background/80 rounded-xl text-[10px] break-all font-mono opacity-80 border border-border mt-2 leading-relaxed custom-scrollbar max-h-[100px] overflow-y-auto">
                {bytesToHex(proof)}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
