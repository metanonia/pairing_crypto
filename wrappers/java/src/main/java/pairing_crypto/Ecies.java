package pairing_crypto;

public class Ecies {
    public static class KeyPair {
        public final byte[] secretKey;
        public final byte[] publicKey;
        
        public KeyPair(byte[] secretKey, byte[] publicKey) {
            this.secretKey = secretKey;
            this.publicKey = publicKey;
        }
    }

    public static native int keypairFromBytes(byte[] privkey, byte[] skOut, byte[] pkOut);
    public static native int encrypt(byte[] uncompressedPubkey, byte[] msg, byte[] encOut);
    public static native int decrypt(byte[] privkey, byte[] cipher, byte[] decOut);
    
    public static native int keypairX25519FromBytes(byte[] privkey, byte[] skOut, byte[] pkOut);
    public static native int encryptX25519(byte[] xPubkey, byte[] msg, byte[] encOut);
    public static native int decryptX25519(byte[] privkey, byte[] cipher, byte[] decOut);

    public static KeyPair generateKeyPairFromBytes(byte[] privkey) throws Exception {
        byte[] skOut = new byte[32];
        byte[] pkOut = new byte[65]; // Uncompressed secp256k1 public key
        int res = keypairFromBytes(privkey, skOut, pkOut);
        if (res != 0) throw new Exception("Failed to generate keypair from bytes");
        return new KeyPair(skOut, pkOut);
    }

    public static byte[] encryptMessage(byte[] uncompressedPubkey, byte[] msg) throws Exception {
        // ECIES k256 packet size: 65 (PK) + 16 (IV) + 16 (TAG) + len(msg)
        byte[] encOut = new byte[65 + 16 + 16 + msg.length];
        int res = encrypt(uncompressedPubkey, msg, encOut);
        if (res != 0) throw new Exception("Failed to encrypt ECIES message (k256)");
        return encOut;
    }

    public static byte[] decryptMessage(byte[] privkey, byte[] cipher) throws Exception {
        if (cipher.length < 65 + 16 + 16) throw new Exception("Ciphertext too short (k256)");
        byte[] decOut = new byte[cipher.length - (65 + 16 + 16)];
        int res = decrypt(privkey, cipher, decOut);
        if (res != 0) throw new Exception("Failed to decrypt ECIES message (k256)");
        return decOut;
    }

    public static KeyPair generateKeyPairX25519FromBytes(byte[] privkey) throws Exception {
        byte[] skOut = new byte[32];
        byte[] pkOut = new byte[32];
        int res = keypairX25519FromBytes(privkey, skOut, pkOut);
        if (res != 0) throw new Exception("Failed to generate X25519 keypair");
        return new KeyPair(skOut, pkOut);
    }

    public static byte[] encryptMessageX25519(byte[] xPubkey, byte[] msg) throws Exception {
        // ECIES X25519 packet size: 32 (PK) + 16 (IV) + 16 (TAG) + len(msg)
        byte[] encOut = new byte[32 + 16 + 16 + msg.length];
        int res = encryptX25519(xPubkey, msg, encOut);
        if (res != 0) throw new Exception("Failed to encrypt ECIES message (X25519)");
        return encOut;
    }

    public static byte[] decryptMessageX25519(byte[] privkey, byte[] cipher) throws Exception {
        if (cipher.length < 32 + 16 + 16) throw new Exception("Ciphertext too short (X25519)");
        byte[] decOut = new byte[cipher.length - (32 + 16 + 16)];
        int res = decryptX25519(privkey, cipher, decOut);
        if (res != 0) throw new Exception("Failed to decrypt ECIES message (X25519)");
        return decOut;
    }
}
