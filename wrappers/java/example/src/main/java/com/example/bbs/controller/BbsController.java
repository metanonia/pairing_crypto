package com.example.bbs.controller;

import com.example.bbs.dto.BbsDto;
import com.example.bbs.service.BbsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pairing_crypto.KeyPair;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.HexFormat;

@RestController
@RequestMapping("/api/bbs")
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
}
