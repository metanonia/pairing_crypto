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
    
    public static KeyPair generateKeyPairFromBytes(byte[] privkey) throws Exception {
        byte[] skOut = new byte[32];
        byte[] pkOut = new byte[65]; // Uncompressed or what size? 65 usually.
        int res = keypairFromBytes(privkey, skOut, pkOut);
        if (res != 0) throw new Exception("Failed to generate keypair from bytes");
        return new KeyPair(skOut, pkOut);
    }

    public static native byte[] encrypt(byte[] uncompressedPubkey, byte[] msg);
    public static native byte[] decrypt(byte[] privkey, byte[] cipher);
}
