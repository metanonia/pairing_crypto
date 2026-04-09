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
  ArrowRight,
  Zap,
  Play,
  ShieldCheck
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

  const [edSecretKey, setEdSecretKey] = useState<Uint8Array | null>(null);
  const [edPublicKey, setEdPublicKey] = useState<Uint8Array | null>(null);
  const [edSignature, setEdSignature] = useState<Uint8Array | null>(null);
  const [edMessage, setEdMessage] = useState("Ed25519 테스트 메시지");
  const [edVerifyResult, setEdVerifyResult] = useState<boolean | null>(null);
  const [convertedXsk, setConvertedXsk] = useState<Uint8Array | null>(null);
  const [convertedXpk, setConvertedXpk] = useState<Uint8Array | null>(null);

  // X25519 ECIES States
  const [eciesXsk, setEciesXsk] = useState<Uint8Array | null>(null);
  const [eciesXpk, setEciesXpk] = useState<Uint8Array | null>(null);
  const [eciesXCipher, setEciesXCipher] = useState<Uint8Array | null>(null);
  const [eciesXDecrypted, setEciesXDecrypted] = useState<string | null>(null);
  
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
    details?: {
      mnemonic: string;
      addresses: string[];
      recoveredAddr: string;
      decryptedStr: string;
      xDecryptedStr: string;
      success: boolean;
    };
  }>({
    isRunning: false,
    steps: [
      { name: "HD Wallet 계층 생성", status: "pending" },
      { name: "ETH 주소 유도 (3개)", status: "pending" },
      { name: "ECDSA 서명 생성", status: "pending" },
      { name: "서명 주소 복구 (Verify)", status: "pending" },
      { name: "ECIES-k256 암복호화", status: "pending" },
    ],
  });

  const [edFlowResults, setEdFlowResults] = useState<{
    isRunning: boolean;
    steps: { name: string; status: "pending" | "success" | "error" }[];
    details?: {
      edPk: string;
      edSig: string;
      xPk: string;
      decrypted: string;
      success: boolean;
    };
  }>({
    isRunning: false,
    steps: [
      { name: "Ed25519 키 쌍 생성", status: "pending" },
      { name: "Ed25519 서명 및 검증", status: "pending" },
      { name: "X25519 키 변환 (Birational)", status: "pending" },
      { name: "X25519 ECIES 암복호화", status: "pending" },
    ],
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

  const generateEd25519Keys = async () => {
    if (!fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const seed = new Uint8Array(32);
      window.crypto.getRandomValues(seed);
      const kp = await fullPkgRef.current.ed25519_keypair_from_seed(seed);
      setEdSecretKey(kp.secret_key);
      setEdPublicKey(kp.public_key);
      setEdSignature(null);
      setEdVerifyResult(null);
      setStatus({ type: "success", message: "Ed25519 키 쌍이 생성되었습니다." });
    } catch (err) {
      setStatus({ type: "error", message: "Ed25519 키 생성 실패" });
    } finally {
      setIsProcessing(false);
    }
  };

  const signEd25519 = async () => {
    if (!edSecretKey || !fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const msg = new TextEncoder().encode(edMessage);
      const sig = await fullPkgRef.current.ed25519_sign(edSecretKey, msg);
      setEdSignature(sig);
      setEdVerifyResult(null);
      setStatus({ type: "success", message: "Ed25519 서명 완료" });
    } catch (err) {
      setStatus({ type: "error", message: "서명 실패" });
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyEd25519 = async () => {
    if (!edPublicKey || !edSignature || !fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const msg = new TextEncoder().encode(edMessage);
      const valid = await fullPkgRef.current.ed25519_verify(edPublicKey, msg, edSignature);
      setEdVerifyResult(valid);
      setStatus({ type: valid ? "success" : "error", message: valid ? "서명 검증 성공" : "서명 검증 실패" });
    } catch (err) {
      setStatus({ type: "error", message: "검증 중 오류 발생" });
    } finally {
      setIsProcessing(false);
    }
  };

  const convertToX25519 = async () => {
    if (!edSecretKey || !edPublicKey || !fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const xsk = await fullPkgRef.current.ed25519_sk_to_x25519(edSecretKey);
      const xpk = await fullPkgRef.current.ed25519_pk_to_x25519(edPublicKey);
      setConvertedXsk(xsk);
      setConvertedXpk(xpk);
      setStatus({ type: "success", message: "Ed25519 키를 X25519 키로 변환했습니다." });
    } catch (err) {
      console.error("X25519 conversion failed:", err);
      setStatus({ type: "error", message: "X25519 변환 실패" });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateEciesX25519Keys = async () => {
    if (!fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const priv = new Uint8Array(32);
      window.crypto.getRandomValues(priv);
      const kp = await fullPkgRef.current.ecies_x25519_keypair_from_bytes(priv);
      setEciesXsk(kp.secret_key);
      setEciesXpk(kp.public_key);
      setEciesXCipher(null);
      setEciesXDecrypted(null);
      setStatus({ type: "success", message: "X25519 ECIES 키 쌍이 생성되었습니다." });
    } catch (err) {
      setStatus({ type: "error", message: "X25519 키 생성 실패" });
    } finally {
      setIsProcessing(false);
    }
  };

  const eciesX25519Encrypt = async () => {
    if (!eciesXpk || !fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const msg = new TextEncoder().encode("Hello X25519 ECIES!");
      const cipher = await fullPkgRef.current.ecies_x25519_encrypt(eciesXpk, msg);
      setEciesXCipher(cipher);
      setEciesXDecrypted(null);
      setStatus({ type: "success", message: "X25519 ECIES 암호화 완료" });
    } catch (err) {
      setStatus({ type: "error", message: "암호화 실패" });
    } finally {
      setIsProcessing(false);
    }
  };

  const eciesX25519Decrypt = async () => {
    if (!eciesXsk || !eciesXCipher || !fullPkgRef.current) return;
    setIsProcessing(true);
    try {
      const dec = await fullPkgRef.current.ecies_x25519_decrypt(eciesXsk, eciesXCipher);
      const decStr = new TextDecoder().decode(dec);
      setEciesXDecrypted(decStr);
      setStatus({ type: "success", message: "X25519 ECIES 복호화 완료" });
    } catch (err) {
      setStatus({ type: "error", message: "복호화 실패" });
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

    const updateStep = (index: number, status: "success" | "error") => {
      setIntegrationResults(prev => ({
        ...prev,
        steps: prev.steps.map((s, i) => i === index ? { ...s, status } : s)
      }));
    };

    try {
      const mnemonic = await pkg.hwallet_generate_mnemonic();
      const seed = await pkg.hwallet_mnemonic_to_seed(mnemonic, "");
      
      const privKeys: Uint8Array[] = [];
      const addresses: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const path = `m/44'/60'/0'/0/${i}`;
        const sk = await pkg.hwallet_derive_private_key(seed, path);
        privKeys.push(new Uint8Array(sk));
        const kp = await pkg.ecies_keypair_from_bytes(sk);
        const addr = await pkg.hwallet_eth_address_from_pubkey(kp.public_key);
        addresses.push(addr);
      }
      updateStep(0, "success");
      updateStep(1, "success");

      const message = new TextEncoder().encode("Integration test message");
      const sigData = await pkg.hwallet_sign_ecdsa_eth(privKeys[0], message);
      updateStep(2, "success");

      const recoveredAddr = await pkg.hwallet_recover_eth_address(message, sigData);
      if (recoveredAddr.toLowerCase() !== addresses[0].toLowerCase()) throw new Error("Address mismatch");
      updateStep(3, "success");

      const kp1 = await pkg.ecies_keypair_from_bytes(privKeys[1]);
      const secretMsg = new TextEncoder().encode("Secret ECIES message");
      const encrypted = await pkg.ecies_encrypt(kp1.public_key, secretMsg);
      const decrypted = await pkg.ecies_decrypt(privKeys[1], encrypted);
      const decryptedStr = new TextDecoder().decode(decrypted);
      updateStep(4, "success");

      setIntegrationResults(prev => ({
        ...prev,
        isRunning: false,
        details: { mnemonic, addresses, recoveredAddr, decryptedStr, success: true }
      }));
      setStatus({ type: "success", message: "5단계 통합 테스트 성공!" });
    } catch (err: any) {
      setIntegrationResults(prev => ({ ...prev, isRunning: false }));
      setStatus({ type: "error", message: `Error: ${err.message}` });
    }
  };

  const runEd25519Flow = async () => {
    if (!fullPkgRef.current) return;
    
    setEdFlowResults(prev => ({
      ...prev,
      isRunning: true,
      steps: prev.steps.map(s => ({ ...s, status: "pending" })),
      details: undefined
    }));

    const pkg = fullPkgRef.current;
    const updateEdStep = (index: number, status: "success" | "error") => {
      setEdFlowResults(prev => ({
        ...prev,
        steps: prev.steps.map((s, i) => i === index ? { ...s, status } : s)
      }));
    };

    try {
      const seed = new Uint8Array(32);
      window.crypto.getRandomValues(seed);
      const edkp = await pkg.ed25519_keypair_from_seed(seed);
      updateEdStep(0, "success");

      const msg = new TextEncoder().encode("Ed25519 flow integration test");
      const sig = await pkg.ed25519_sign(edkp.secret_key, msg);
      const valid = await pkg.ed25519_verify(edkp.public_key, msg, sig);
      if (!valid) throw new Error("Ed25519 verification failed");
      updateEdStep(1, "success");

      const xsk = await pkg.ed25519_sk_to_x25519(edkp.secret_key);
      const xpk = await pkg.ed25519_pk_to_x25519(edkp.public_key);
      updateEdStep(2, "success");

      const secretXMsg = new TextEncoder().encode("Secret message via converted X25519");
      const encrypted = await pkg.ecies_x25519_encrypt(xpk, secretXMsg);
      const decrypted = await pkg.ecies_x25519_decrypt(xsk, encrypted);
      const decStr = new TextDecoder().decode(decrypted);
      if (decStr !== "Secret message via converted X25519") throw new Error("X25519 ECIES decryption failed");
      updateEdStep(3, "success");

      setEdFlowResults(prev => ({
        ...prev,
        isRunning: false,
        details: {
          edPk: bytesToHex(edkp.public_key),
          edSig: bytesToHex(sig),
          xPk: bytesToHex(xpk),
          decrypted: decStr,
          success: true
        }
      }));
      setStatus({ type: "success", message: "Ed25519 통합 플로우 성공!" });
    } catch (err: any) {
      setEdFlowResults(prev => ({ ...prev, isRunning: false }));
      setStatus({ type: "error", message: `Error: ${err.message}` });
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
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          WASM Cryptography Demo
        </h1>
        <p className="text-muted-foreground">BBS+ signatures with ZKP and HD Wallet Integration</p>
      </div>

      <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm px-4 md:px-0">
        <AnimatePresence mode="wait">
          {status.message && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={cn(
                "p-4 rounded-2xl flex items-center justify-between border shadow-2xl backdrop-blur-xl",
                status.type === "success" ? "bg-green-500/20 border-green-500/30 text-green-400" : 
                status.type === "error" ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-blue-500/20 border-blue-500/30 text-blue-400"
              )}
            >
              <div className="flex items-center space-x-3">
                {status.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-semibold text-sm">{status.message}</span>
              </div>
              <button 
                onClick={() => setStatus({message: "", type: "idle"})} 
                className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close"
              >
                <RefreshCcw className="w-3.5 h-3.5 opacity-50 rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">4. Ed25519 서명</h2>
          </div>
          <button 
            onClick={generateEd25519Keys}
            disabled={isProcessing}
            className="w-full py-2.5 bg-background border border-border hover:bg-muted transition-all rounded-xl text-sm font-semibold"
          >
            Ed25519 키 생성
          </button>
          {edPublicKey && (
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest pl-1">Public Key (32 bytes)</label>
                <div className="p-2 bg-background/50 rounded-lg text-[9px] break-all font-mono opacity-80 border border-border truncate mt-1">
                  {bytesToHex(edPublicKey!)}
                </div>
              </div>
              <input 
                value={edMessage}
                onChange={(e) => setEdMessage(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                placeholder="메시지 입력..."
              />
              <button onClick={signEd25519} className="w-full py-2.5 bg-primary rounded-xl font-bold">서명하기</button>
              {edSignature && (
                <>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest pl-1">Signature (64 bytes)</label>
                    <div className="p-2 bg-background/50 rounded-lg text-[9px] break-all font-mono opacity-80 border border-border mt-1">
                      {bytesToHex(edSignature!)}
                    </div>
                  </div>
                  <button onClick={verifyEd25519} className="w-full py-2.5 bg-secondary border border-border rounded-xl font-bold">검증하기</button>
                  {edVerifyResult !== null && (
                    <div className={cn("text-center py-2 rounded-xl font-bold text-xs", edVerifyResult ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10")}>
                      {edVerifyResult ? "✅ 검증 성공!" : "❌ 검증 실패"}
                    </div>
                  )}
                  <div className="pt-4 border-t border-border space-y-3">
                    <button 
                      onClick={convertToX25519}
                      className="w-full py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 transition-all rounded-xl text-xs font-bold"
                    >
                      X25519 키로 변환 (Birational Equivalence)
                    </button>
                    {convertedXpk && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] text-purple-400 uppercase font-bold tracking-widest pl-1">Converted X25519 PK</label>
                        <div className="p-2 bg-purple-500/5 rounded-lg text-[9px] break-all font-mono opacity-80 border border-purple-500/20 truncate">
                          {bytesToHex(convertedXpk)}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold">5. X25519 ECIES 암호화</h2>
          </div>
          <button 
            onClick={generateEciesX25519Keys}
            className="w-full py-2.5 bg-background border border-border hover:bg-muted transition-all rounded-xl text-sm font-semibold"
          >
            X25519 키 생성
          </button>
          
          {eciesXpk && (
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest pl-1">X25519 PK (32 bytes)</label>
                <div className="p-2 bg-background/50 rounded-lg text-[9px] break-all font-mono opacity-80 border border-border mt-1">
                  {bytesToHex(eciesXpk)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={eciesX25519Encrypt} className="py-2 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold">암호화</button>
                <button onClick={eciesX25519Decrypt} disabled={!eciesXCipher} className="py-2 bg-green-600/20 text-green-400 border border-green-500/20 rounded-xl text-xs font-bold disabled:opacity-50">복호화</button>
              </div>
              {eciesXDecrypted && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center text-green-400 font-bold text-xs">
                  복호화된 내용: {eciesXDecrypted}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Ed25519 Integration Test Section */}
        <section className="glass-card p-6 rounded-2xl md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                6. Ed25519/X25519 통합 테스트 플로우
              </h2>
            </div>
            <button
              onClick={runEd25519Flow}
              disabled={edFlowResults.isRunning}
              className={cn(
                "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2",
                edFlowResults.isRunning 
                  ? "bg-muted cursor-not-allowed" 
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
              )}
            >
              <Play className={cn("w-4 h-4", edFlowResults.isRunning && "animate-spin")} />
              <span>{edFlowResults.isRunning ? "진행 중..." : "플로우 통합 테스트 시작"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {edFlowResults.steps.map((step, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-500",
                  step.status === "success" ? "bg-green-500/10 border-green-500/20" :
                  step.status === "error" ? "bg-red-500/10 border-red-500/20" :
                  "bg-muted/50 border-white/5"
                )}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                    step.status === "success" ? "bg-green-500 text-white" :
                    step.status === "error" ? "bg-red-500 text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {step.status === "success" ? "✓" : idx + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    step.status === "success" ? "text-green-400" : "text-muted-foreground"
                  )}>{step.name}</span>
                </div>
              </div>
            ))}
          </div>

          {edFlowResults.details && (
            <div className="mt-4 p-4 rounded-xl bg-background/40 border border-white/5 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ed25519 Public Key</p>
                  <p className="text-[10px] font-mono break-all bg-white/5 p-2 rounded border border-white/5">{edFlowResults.details.edPk}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Converted X25519 PK</p>
                  <p className="text-[10px] font-mono break-all bg-purple-500/10 p-2 rounded border border-purple-500/10 text-purple-400">{edFlowResults.details.xPk}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Final Result</p>
                <div className="flex items-center space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-xs font-bold text-green-400">Decrypted Message Match!</p>
                    <p className="text-[10px] text-green-400/80">Message: "{edFlowResults.details.decrypted}"</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Integration Test Section */}
        <section className="glass-card p-6 rounded-2xl md:col-span-2 space-y-6 border border-primary/20">
          <div className="flex items-center justify-between border-b border-border pb-4">
             <div className="flex items-center space-x-3">
               <Shield className="w-6 h-6 text-primary" />
               <h2 className="text-2xl font-black">7. 5단계 종합 통합 테스트 (Ethereum Flow)</h2>
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
                      <div className="opacity-60 text-[10px] break-all">Mnemonic: {integrationResults.details.mnemonic}</div>
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
                        <div className="text-[10px] opacity-70">Main Target: {integrationResults.details.addresses[0].substring(0, 10)}...</div>
                        <div>Recovered: <span className="text-green-400 font-bold">{integrationResults.details.recoveredAddr.substring(0, 10)}...</span></div>
                        <div className="text-[10px] text-green-500 font-black pt-1">MATCHED ✅</div>
                      </div>
                    </div>
                    <div className="p-3 bg-background/20 rounded-lg border border-white/5">
                      <h5 className="text-primary font-bold text-xs mb-2 uppercase tracking-widest">Step 5: ECIES Check</h5>
                      <div className="space-y-1">
                        <div className="text-[10px] opacity-70">Algorithm: secp256k1-AES-GCM</div>
                        <div className="text-blue-400 font-bold">"{integrationResults.details.decryptedStr}"</div>
                        <div className="text-[10px] text-green-500 font-black pt-1">INTEGRITY OK ✅</div>
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
