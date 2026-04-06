package com.example.bbs.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pairing_crypto.HWallet;
import pairing_crypto.Ecies;

import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/integration")
@RequiredArgsConstructor
public class IntegrationController {

    private static final HexFormat hex = HexFormat.of();

    @GetMapping("/test")
    public ResponseEntity<?> runIntegrationTest() {
        try {
            // 1. 키 쌍 생성 (동일 시드에서 3개)
            String mnemonic = HWallet.generateMnemonic();
            byte[] seed = new byte[64];
            int seedRes = HWallet.mnemonicToSeed(mnemonic, "", seed);
            if (seedRes != 0) throw new Exception("Mnemonic to Seed failed");

            List<byte[]> privKeys = new ArrayList<>();
            List<String> addresses = new ArrayList<>();

            for (int i = 0; i < 3; i++) {
                String path = String.format("m/44'/60'/0'/0/%d", i);
                byte[] sk = new byte[32];
                int deriveRes = HWallet.derivePrivateKey(seed, path, sk);
                if (deriveRes != 0) throw new Exception("Derive Private Key failed at index " + i);
                privKeys.add(sk);

                // 2. 이더리움 주소 생성
                Ecies.KeyPair kp = Ecies.generateKeyPairFromBytes(sk);
                String addr = HWallet.ethAddressFromPubkey(kp.publicKey);
                addresses.add(addr);
            }

            // 3. 메시지 서명 (첫 번째 키 사용)
            byte[] message = "Integration test message".getBytes();
            byte[] signature = new byte[65]; // ECDSA eth signature is 65 bytes
            int signRes = HWallet.signEcdsaEth(privKeys.get(0), message, signature);
            if (signRes != 0) throw new Exception("ECDSA Sign failed");

            // 4. 서명 주소 확인 (ecrecover)
            String recoveredAddr = HWallet.recoverEthAddress(message, signature);
            boolean step4Success = recoveredAddr.equals(addresses.get(0));

            // 5. ECIES 암/복호화 (Key 0-1 간)
            Ecies.KeyPair kp1 = Ecies.generateKeyPairFromBytes(privKeys.get(1));
            byte[] secretMsg = "Secret ECIES message".getBytes();
            byte[] encrypted = Ecies.encrypt(kp1.publicKey, secretMsg);
            byte[] decrypted = Ecies.decrypt(privKeys.get(1), encrypted);
            String decryptedStr = new String(decrypted);
            boolean step5Success = decryptedStr.equals("Secret ECIES message");

            return ResponseEntity.ok(Map.of(
                "mnemonic", mnemonic,
                "addresses", addresses,
                "step3_signature", hex.formatHex(signature),
                "step4_recovered_address", recoveredAddr,
                "step4_success", step4Success,
                "step5_decrypted_message", decryptedStr,
                "step5_success", step5Success,
                "overall_success", step4Success && step5Success
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
