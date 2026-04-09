package com.example.bbs.controller;

import com.example.bbs.dto.BbsDto;
import com.example.bbs.service.BbsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pairing_crypto.KeyPair;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.HexFormat;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
public class BbsController {

    private final BbsService bbsService;
    private static final HexFormat hex = HexFormat.of();

    @GetMapping("/keys")
    public ResponseEntity<?> generateKeys() {
        try {
            // Mocked IKM and KeyInfo for example (should be random in production)
            byte[] ikm = new byte[32];
            byte[] keyInfo = new byte[32];
            KeyPair kp = bbsService.generateKeyPair(ikm, keyInfo);
            
            return ResponseEntity.ok(Map.of(
                "publicKey", hex.formatHex(kp.publicKey),
                "secretKey", hex.formatHex(kp.secretKey)
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/sign")
    public ResponseEntity<?> sign(@RequestBody BbsDto.SignRequest req) {
        try {
            byte[] sk = hex.parseHex(req.getSecretKey());
            byte[] pk = hex.parseHex(req.getPublicKey());
            byte[] header = req.getHeader() != null ? hex.parseHex(req.getHeader()) : new byte[0];
            
            byte[][] messages = req.getMessages().stream()
                    .map(String::getBytes)
                    .toArray(byte[][]::new);

            byte[] signature = bbsService.sign(sk, pk, header, messages);
            return ResponseEntity.ok(Map.of("signature", hex.formatHex(signature)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody BbsDto.VerifyRequest req) {
        try {
            byte[] pk = hex.parseHex(req.getPublicKey());
            byte[] signature = hex.parseHex(req.getSignature());
            byte[] header = req.getHeader() != null ? hex.parseHex(req.getHeader()) : new byte[0];
            
            byte[][] messages = req.getMessages().stream()
                    .map(String::getBytes)
                    .toArray(byte[][]::new);

            boolean valid = bbsService.verify(pk, header, signature, messages);
            return ResponseEntity.ok(Map.of("valid", valid));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/proof/derive")
    public ResponseEntity<?> deriveProof(@RequestBody BbsDto.DeriveProofRequest req) {
        try {
            byte[] pk = hex.parseHex(req.getPublicKey());
            byte[] signature = hex.parseHex(req.getSignature());
            byte[] header = req.getHeader() != null ? hex.parseHex(req.getHeader()) : new byte[0];
            byte[] ph = req.getPresentationHeader() != null ? hex.parseHex(req.getPresentationHeader()) : new byte[0];

            HashSet<Integer> disclosedIndices = new HashSet<>();
            byte[][] messages = new byte[req.getMessages().size()][];
            for (int i = 0; i < req.getMessages().size(); i++) {
                BbsDto.ProofMessageDto msgDto = req.getMessages().get(i);
                messages[i] = msgDto.getValue().getBytes();
                if (msgDto.isReveal()) {
                    disclosedIndices.add(i);
                }
            }

            byte[] proof = bbsService.createProof(pk, header, ph, signature, true, disclosedIndices, messages);
            return ResponseEntity.ok(Map.of("proof", hex.formatHex(proof)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/proof/verify")
    public ResponseEntity<?> verifyProof(@RequestBody BbsDto.VerifyProofRequest req) {
        try {
            byte[] pk = hex.parseHex(req.getPublicKey());
            byte[] proof = hex.parseHex(req.getProof());
            byte[] header = req.getHeader() != null ? hex.parseHex(req.getHeader()) : new byte[0];
            byte[] ph = req.getPresentationHeader() != null ? hex.parseHex(req.getPresentationHeader()) : new byte[0];

            Map<Integer, byte[]> revealedMessages = new HashMap<>();
            for (Map.Entry<Integer, String> entry : req.getRevealedMessages().entrySet()) {
                revealedMessages.put(entry.getKey(), entry.getValue().getBytes());
            }

            boolean valid = bbsService.verifyProof(pk, header, ph, proof, revealedMessages);
            return ResponseEntity.ok(Map.of("valid", valid));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // --- Ed25519 Endpoints ---

    @GetMapping("/ed25519/keys")
    public ResponseEntity<?> generateEd25519Keys() {
        try {
            byte[] seed = new byte[32];
            new SecureRandom().nextBytes(seed);
            pairing_crypto.Ed25519.KeyPair kp = pairing_crypto.Ed25519.generateKeyPairFromSeed(seed);
            return ResponseEntity.ok(Map.of(
                "publicKey", hex.formatHex(kp.publicKey),
                "secretKey", hex.formatHex(kp.secretKey)
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ed25519/sign")
    public ResponseEntity<?> ed25519Sign(@RequestBody Map<String, String> req) {
        try {
            byte[] sk = hex.parseHex(req.get("secretKey"));
            byte[] msg = req.get("message").getBytes();
            byte[] sig = pairing_crypto.Ed25519.signMessage(sk, msg);
            return ResponseEntity.ok(Map.of("signature", hex.formatHex(sig)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ed25519/verify")
    public ResponseEntity<?> ed25519Verify(@RequestBody Map<String, String> req) {
        try {
            byte[] pk = hex.parseHex(req.get("publicKey"));
            byte[] msg = req.get("message").getBytes();
            byte[] sig = hex.parseHex(req.get("signature"));
            boolean valid = pairing_crypto.Ed25519.verifySignature(pk, msg, sig);
            return ResponseEntity.ok(Map.of("valid", valid));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ed25519/to-x25519")
    public ResponseEntity<?> ed25519ToX25519(@RequestBody Map<String, String> req) {
        try {
            Map<String, String> resp = new HashMap<>();
            if (req.containsKey("secretKey")) {
                byte[] sk = hex.parseHex(req.get("secretKey"));
                byte[] xsk = pairing_crypto.Ed25519.convertSkToX25519(sk);
                resp.put("x25519SecretKey", hex.formatHex(xsk));
            }
            if (req.containsKey("publicKey")) {
                byte[] pk = hex.parseHex(req.get("publicKey"));
                byte[] xpk = pairing_crypto.Ed25519.convertPkToX25519(pk);
                resp.put("x25519PublicKey", hex.formatHex(xpk));
            }
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // --- X25519 ECIES Endpoints ---

    @GetMapping("/ecies-x25519/keys")
    public ResponseEntity<?> generateEciesX25519Keys() {
        try {
            byte[] priv = new byte[32];
            new SecureRandom().nextBytes(priv);
            pairing_crypto.Ecies.KeyPair kp = pairing_crypto.Ecies.generateKeyPairX25519FromBytes(priv);
            return ResponseEntity.ok(Map.of(
                "publicKey", hex.formatHex(kp.publicKey),
                "secretKey", hex.formatHex(kp.secretKey)
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ecies-x25519/encrypt")
    public ResponseEntity<?> eciesX25519Encrypt(@RequestBody Map<String, String> req) {
        try {
            byte[] pk = hex.parseHex(req.get("publicKey"));
            byte[] msg = req.get("message").getBytes();
            byte[] enc = pairing_crypto.Ecies.encryptMessageX25519(pk, msg);
            return ResponseEntity.ok(Map.of("ciphertext", hex.formatHex(enc)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ecies-x25519/decrypt")
    public ResponseEntity<?> eciesX25519Decrypt(@RequestBody Map<String, String> req) {
        try {
            byte[] sk = hex.parseHex(req.get("secretKey"));
            byte[] ct = hex.parseHex(req.get("ciphertext"));
            byte[] dec = pairing_crypto.Ecies.decryptMessageX25519(sk, ct);
            return ResponseEntity.ok(Map.of("message", new String(dec)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
