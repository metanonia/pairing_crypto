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
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { cn, bytesToHex } from "@/lib/utils";

// WASM 모듈 로드 (클라이언트 사이드 전용)
import { useRef } from "react";

export default function BbsDemo() {
  const bbsRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<string[]>(["이름: 홍길동", "생년월일: 1990-01-01", "성별: 남", "거주지: 서울시"]);
  const [newMessage, setNewMessage] = useState("");
  const [secretKey, setSecretKey] = useState<Uint8Array | null>(null);
  const [publicKey, setPublicKey] = useState<Uint8Array | null>(null);
  const [signature, setSignature] = useState<Uint8Array | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([0]);
  const [proof, setProof] = useState<Uint8Array | null>(null);
  
  // Verification Result UI State
  const [proofResult, setProofResult] = useState<{
    show: boolean;
    verified: boolean;
    timestamp: string;
  } | null>(null);

  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ 
    type: "idle",
    message: "" 
  });
  const [integrationResults, setIntegrationResults] = useState<{
    isRunning: boolean;
    steps: { name: string; status: "pending" | "success" | "error" }[];
    details?: any;
  }>({
    isRunning: false,
    steps: [
      { name: "HD Wallet: 3 Keys Derived", status: "pending" },
      { name: "ETH Addresses Created", status: "pending" },
      { name: "ECDSA Signing (Key 0)", status: "pending" },
      { name: "Address Recovery (Verify)", status: "pending" },
      { name: "ECIES Enc/Dec (Key 0-1)", status: "pending" },
    ]
  });

  const fullPkgRef = useRef<any>(null);
  const EXAMPLE_IKM = new TextEncoder().encode("only_for_example_not_A_random_seed_at_Allllllllll");
  const EXAMPLE_KEY_INFO = new TextEncoder().encode("example-key-info");
  const EXAMPLE_HEADER = new TextEncoder().encode("example-header");
  const EXAMPLE_PRESENTATION_HEADER = new TextEncoder().encode("example-presentation-header");

  useEffect(() => {
    const initWasm = async () => {
      try {
        console.log("Initializing WASM module...");
        const pkg = await import("@mattrglobal/pairing-crypto");
        fullPkgRef.current = pkg;
        bbsRef.current = pkg.bbs;
        setIsLoaded(true);
        console.log("WASM module keys:", Object.keys(pkg));
        console.log("WASM hwallet exports check:", {
          generate: typeof pkg.hwallet_generate_mnemonic,
          seed: typeof pkg.hwallet_mnemonic_to_seed,
          derive: typeof pkg.hwallet_derive_private_key
        });
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
      const keyPair = await bbsRef.current.bls12381_sha256.generateKeyPair({ 
        ikm: EXAMPLE_IKM,
        keyInfo: EXAMPLE_KEY_INFO 
      });
      setSecretKey(keyPair.secretKey);
      setPublicKey(keyPair.publicKey);
      setSignature(null);
      setProof(null);
      setProofResult(null);
      setStatus({ type: "success", message: "BBS 키 쌍이 생성되었습니다." });
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
      const encodedMessages = messages.map(m => new TextEncoder().encode(m));
      const sig = await bbsRef.current.bls12381_sha256.sign({
        secretKey,
        publicKey,
        header: EXAMPLE_HEADER,
        messages: encodedMessages,
      });
      setSignature(sig);
      setProof(null);
      setProofResult(null);
      setStatus({ type: "success", message: "메시지 서명이 완료되었습니다." });
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
      const encodedMessages = messages.map(m => new TextEncoder().encode(m));
      const result = await bbsRef.current.bls12381_sha256.verify({
        publicKey,
        signature,
        header: EXAMPLE_HEADER,
        messages: encodedMessages,
      });
      if (result.verified) {
        setStatus({ type: "success", message: "서명이 유효합니다." });
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
      setProofResult(null);
      setStatus({ type: "success", message: "영지식 증명(Proof)이 생성되었습니다." });
    } catch (err) {
      console.error("Proof derivation failed:", err);
      setStatus({ type: "error", message: "증명 생성 중 오류가 발생했습니다." });
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyProof = async () => {
    if (!publicKey || !proof || !bbsRef.current) return;
    setIsProcessing(true);
    try {
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
      
      setProofResult({
        show: true,
        verified: result.verified,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (result.verified) {
        setStatus({ type: "success", message: "영지식 증명 검증 성공!" });
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
    setProofResult(null);
  };

  const runIntegrationTest = async () => {
    if (!fullPkgRef.current) return;
    
    setIntegrationResults(prev => ({
      ...prev,
      isRunning: true,
      steps: prev.steps.map(s => ({ ...s, status: "pending" })),
      details: undefined
    }));

    const pkg = fullPkgRef.current;
    console.log("Running integration test with pkg:", pkg);

    const updateStep = (index: number, status: "success" | "error") => {
      setIntegrationResults(prev => ({
        ...prev,
        steps: prev.steps.map((s, i) => i === index ? { ...s, status } : s)
      }));
    };

    try {
      // 1. HD Wallet: 3 Keys Derived
      const mnemonic = await pkg.hwallet_generate_mnemonic();
      const seed = await pkg.hwallet_mnemonic_to_seed(mnemonic, "");
      
      const privKeys: Uint8Array[] = [];
      const addresses: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const path = `m/44'/60'/0'/0/${i}`;
        const sk = await pkg.hwallet_derive_private_key(seed, path);
        privKeys.push(new Uint8Array(sk));
        
        // 2. ETH Addresses Created
        const kp = await pkg.ecies_keypair_from_bytes(sk);
        const addr = await pkg.hwallet_eth_address_from_pubkey(kp.public_key);
        addresses.push(addr);
      }
      updateStep(0, "success");
      updateStep(1, "success");

      // 3. ECDSA Signing (Key 0)
      const message = new TextEncoder().encode("Integration test message");
      const sigData = await pkg.hwallet_sign_ecdsa_eth(privKeys[0], message);
      updateStep(2, "success");

      // 4. Address Recovery (Verify)
      const recoveredAddr = await pkg.hwallet_recover_eth_address(message, sigData);
      const step4Success = recoveredAddr.toLowerCase() === addresses[0].toLowerCase();
      if (!step4Success) throw new Error(`Recovered address mismatch: ${recoveredAddr} vs ${addresses[0]}`);
      updateStep(3, "success");

      // 5. ECIES Enc/Dec (Key 0-1)
      const kp1 = await pkg.ecies_keypair_from_bytes(privKeys[1]);
      const secretMsg = new TextEncoder().encode("Secret ECIES message");
      const encrypted = await pkg.ecies_encrypt(kp1.public_key, secretMsg);
      const decrypted = await pkg.ecies_decrypt(privKeys[1], encrypted);
      const decryptedStr = new TextDecoder().decode(decrypted);
      const step5Success = decryptedStr === "Secret ECIES message";
      if (!step5Success) throw new Error("ECIES decryption failed");
      updateStep(4, "success");

      setIntegrationResults(prev => ({
        ...prev,
        isRunning: false,
        details: {
          mnemonic,
          addresses,
          recoveredAddr,
          decryptedStr,
          success: true
        }
      }));
      setStatus({ type: "success", message: "5단계 통합 테스트 성공!" });

    } catch (err: any) {
      console.error("Integration test detailed error:", err);
      setIntegrationResults(prev => ({ ...prev, isRunning: false }));
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatus({ type: "error", message: `Error: ${errorMsg}` });
    }
  };

  const addMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, newMessage.trim()]);
      setNewMessage("");
      setSignature(null);
      setProof(null);
    }
  };

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
    setRevealedIndices(revealedIndices.filter(i => i !== index));
    setSignature(null);
    setProof(null);
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
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          WASM Cryptography Demo
        </h1>
        <p className="text-muted-foreground">BBS+ signatures with ZKP and HD Wallet Integration</p>
      </div>

      {/* Status Banner */}
      <AnimatePresence mode="wait">
        {status.message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
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
            <button onClick={() => setStatus({message: "", type: "idle"})} className="text-xs opacity-50 hover:opacity-100">닫기</button>
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
            disabled={isProcessing}
            className="w-full py-3 bg-primary hover:bg-accent transition-all rounded-xl font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-4 h-4", isProcessing && "animate-spin")} />
            <span>새 키 쌍 생성 (IKM 기반)</span>
          </button>
          
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pl-1">Public Key (96 bytes)</label>
              <div className="p-3 bg-background/50 rounded-lg text-[10px] break-all font-mono opacity-80 border border-border mt-1 min-h-[40px] leading-relaxed">
                {publicKey ? bytesToHex(publicKey) : "Key not generated"}
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Message & Sign */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <FileCheck className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">2. 서명 및 검증</h2>
          </div>
          
          <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-center space-x-2 group">
                <div className="flex-1 p-2.5 bg-background border border-border rounded-xl text-sm truncate">
                  {msg}
                </div>
                <button onClick={() => removeMessage(i)} className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지 추가..."
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={addMessage} className="p-2 bg-secondary rounded-xl hover:bg-muted"><Plus className="w-5 h-5"/></button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={signMessages}
              disabled={isProcessing || !secretKey}
              className="py-3 bg-secondary hover:bg-muted border border-border transition-all rounded-xl font-semibold disabled:opacity-50"
            >
              Sign All
            </button>
            <button 
              onClick={verifySignature}
              disabled={isProcessing || !signature}
              className="py-3 bg-secondary hover:bg-muted border border-border transition-all rounded-xl font-semibold disabled:opacity-50"
            >
              Verify Sig
            </button>
          </div>
        </section>

        {/* Step 3: Zero-Knowledge Proof (Large Section) */}
        <section className="glass-card p-6 rounded-2xl md:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-black">3. 영지식 증명 (Selective Disclosure)</h2>
            </div>
            <div className="flex space-x-4">
               <button onClick={deriveProof} disabled={isProcessing || !signature} className="text-sm font-bold text-primary hover:underline disabled:opacity-50">1. 증명 생성</button>
               <button onClick={verifyProof} disabled={isProcessing || !proof} className="text-sm font-bold text-purple-400 hover:underline disabled:opacity-50">2. 결과 확인</button>
            </div>
          </div>

          {/* Reveal Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {messages.map((msg, i) => (
              <button 
                key={i}
                onClick={() => toggleReveal(i)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col space-y-2 text-left relative overflow-hidden",
                  revealedIndices.includes(i) 
                    ? "bg-purple-500/10 border-purple-500/40" 
                    : "bg-background/40 border-border opacity-60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Message {i}</span>
                  {revealedIndices.includes(i) ? <Eye className="w-3 h-3 text-purple-400" /> : <EyeOff className="w-3 h-3" />}
                </div>
                <span className="text-sm font-medium truncate w-full">{msg}</span>
              </button>
            ))}
          </div>

          {/* Detailed Proof Verification Result Card */}
          <AnimatePresence>
            {proofResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6 rounded-3xl border-2 shadow-2xl space-y-4",
                  proofResult.verified ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn("p-3 rounded-full", proofResult.verified ? "bg-green-500/20" : "bg-red-500/20")}>
                      {proofResult.verified ? <Shield className="w-6 h-6 text-green-400" /> : <AlertCircle className="w-6 h-6 text-red-100" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{proofResult.verified ? "검증 성공: 신원 증명 유효" : "검증 실패: 조작된 증명"}</h3>
                      <p className="text-sm opacity-60">검증 시간: {proofResult.timestamp}</p>
                    </div>
                  </div>
                  <div className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest", proofResult.verified ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
                    {proofResult.verified ? "VERIFIED" : "INVALID"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-background/40 p-4 rounded-xl border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">공개된 정보 (Revealed)</h4>
                    <div className="space-y-2">
                      {messages.map((msg, i) => revealedIndices.includes(i) && (
                        <div key={i} className="text-xs flex items-center space-x-2">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-background/40 p-4 rounded-xl border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">비공개 정보 (Hidden)</h4>
                    <div className="space-y-2">
                      {messages.map((msg, i) => !revealedIndices.includes(i) && (
                        <div key={i} className="text-xs opacity-40 italic flex items-center space-x-2">
                          <EyeOff className="w-3 h-3" />
                          <span>[암호화됨 - 보호됨]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button 
              onClick={deriveProof}
              disabled={isProcessing || !signature}
              className="py-4 bg-purple-600 hover:bg-purple-500 transition-all rounded-2xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCcw className={cn("w-4 h-4", isProcessing && "animate-spin")} />
              <span>선택 공개 증명 생성</span>
            </button>
            <button 
              onClick={verifyProof}
              disabled={isProcessing || !proof}
              className="py-4 bg-secondary border border-border hover:bg-muted transition-all rounded-2xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>증명 검증 실행</span>
            </button>
          </div>
        </section>

        {/* Integration Test Section */}
        <section className="glass-card p-6 rounded-2xl md:col-span-2 space-y-6 border border-primary/20">
          <div className="flex items-center justify-between border-b border-border pb-4">
             <div className="flex items-center space-x-3">
               <Shield className="w-6 h-6 text-primary" />
               <h2 className="text-2xl font-black">4. 5단계 종합 통합 테스트 (End-to-End)</h2>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-3">
               {integrationResults.steps.map((step, i) => (
                 <div key={i} className="flex items-center space-x-3 p-3 bg-background/50 border border-border rounded-xl">
                   <div className={cn(
                     "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                     step.status === "success" ? "bg-green-500" : 
                     step.status === "error" ? "bg-red-500" : "bg-secondary border border-border"
                   )}>
                     {step.status === "success" ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                   </div>
                   <span className={cn("text-sm flex-1", step.status === "success" ? "text-green-100" : "text-muted-foreground")}>{step.name}</span>
                 </div>
               ))}
               
               <button 
                 onClick={runIntegrationTest}
                 disabled={integrationResults.isRunning}
                 className="w-full mt-4 py-4 bg-primary hover:bg-accent transition-all rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center space-x-2"
               >
                 {integrationResults.isRunning && <RefreshCcw className="w-4 h-4 animate-spin" />}
                 <span>통합 테스트 시작</span>
               </button>
            </div>

            <div className="lg:col-span-2 glass-card p-6 rounded-2xl bg-black/40 font-mono text-[11px] min-h-[300px]">
              {integrationResults.details ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                  <div>
                    <h5 className="text-primary font-bold text-xs mb-2 uppercase tracking-widest pl-1">Step 1-2: Seed & Addresses</h5>
                    <div className="bg-background/20 p-3 rounded-lg border border-white/5 space-y-1">
                      <div className="opacity-60">Mnemonic: {integrationResults.details.mnemonic}</div>
                      {integrationResults.details.addresses.map((a: string, i: number) => (
                        <div key={i} className={cn(i === 0 && "text-green-400 font-bold")}>
                          - Path .../0/{i}: {a} {i === 0 && " [Main Target]"}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-background/20 rounded-lg border border-white/5">
                      <h5 className="text-primary font-bold text-xs mb-2 uppercase tracking-widest">Step 3-4: ECDSA Check</h5>
                      <div className="space-y-1">
                        <div>Recovered: <span className="text-green-400">{integrationResults.details.recoveredAddr}</span></div>
                        <div className="text-[10px] text-green-500 font-black">MATCHED ✅</div>
                      </div>
                    </div>
                    <div className="p-3 bg-background/20 rounded-lg border border-white/5">
                      <h5 className="text-primary font-bold text-xs mb-2 uppercase tracking-widest">Step 5: ECIES Check</h5>
                      <div className="space-y-1">
                        <div>Decrypted: <span className="text-blue-400">"{integrationResults.details.decryptedStr}"</span></div>
                        <div className="text-[10px] text-green-500 font-black">INTEGRITY OK ✅</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                  <RefreshCcw className={cn("w-12 h-12 opacity-10", integrationResults.isRunning && "animate-spin opacity-40")} />
                  <p className="italic">통합 테스트 대기 중...</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
