package pairing_crypto;

public class Ed25519 {
    public static class KeyPair {
        public final byte[] secretKey;
        public final byte[] publicKey;
        
        public KeyPair(byte[] secretKey, byte[] publicKey) {
            this.secretKey = secretKey;
            this.publicKey = publicKey;
        }
    }

    private static native int keypairFromSeed(byte[] seed, byte[] skOut, byte[] pkOut);
    private static native int sign(byte[] privkey, byte[] msg, byte[] sigOut);
    private static native int verify(byte[] pubkey, byte[] msg, byte[] sig);
    private static native int skToX25519(byte[] privkey, byte[] skOut);
    private static native int pkToX25519(byte[] pubkey, byte[] pkOut);

    public static KeyPair generateKeyPairFromSeed(byte[] seed) throws Exception {
        if (seed.length != 32) throw new Exception("Seed must be 32 bytes");
        byte[] skOut = new byte[32];
        byte[] pkOut = new byte[32];
        int res = keypairFromSeed(seed, skOut, pkOut);
        if (res != 0) throw new Exception("Failed to generate Ed25519 keypair from seed");
        return new KeyPair(skOut, pkOut);
    }

    public static byte[] signMessage(byte[] privkey, byte[] msg) throws Exception {
        if (privkey.length != 32) throw new Exception("Private key must be 32 bytes");
        byte[] sigOut = new byte[64];
        int res = sign(privkey, msg, sigOut);
        if (res != 0) throw new Exception("Failed to sign message with Ed25519");
        return sigOut;
    }

    public static boolean verifySignature(byte[] pubkey, byte[] msg, byte[] sig) throws Exception {
        if (pubkey.length != 32) throw new Exception("Public key must be 32 bytes");
        if (sig.length != 64) throw new Exception("Signature must be 64 bytes");
        int res = verify(pubkey, msg, sig);
        // JNI verify returns 0 for success (valid), 1 for failure (invalid)
        return res == 0;
    }

    public static byte[] convertSkToX25519(byte[] privkey) throws Exception {
        if (privkey.length != 32) throw new Exception("Private key must be 32 bytes");
        byte[] out = new byte[32];
        int res = skToX25519(privkey, out);
        if (res != 0) throw new Exception("Failed to convert Ed25519 SK to X25519");
        return out;
    }

    public static byte[] convertPkToX25519(byte[] pubkey) throws Exception {
        if (pubkey.length != 32) throw new Exception("Public key must be 32 bytes");
        byte[] out = new byte[32];
        int res = pkToX25519(pubkey, out);
        if (res != 0) throw new Exception("Failed to convert Ed25519 PK to X25519");
        return out;
    }
}
