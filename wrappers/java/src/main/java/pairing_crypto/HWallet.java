package pairing_crypto;

public class HWallet {
    public static native String generateMnemonic();
    public static native int mnemonicToSeed(String mnemonic, String passphrase, byte[] seedOut);
    public static native int derivePrivateKey(byte[] seed, String path, byte[] privOut);
    public static native String ethAddressFromPubkey(byte[] pubkey);
    public static native int signEcdsaEth(byte[] privkey, byte[] message, byte[] signatureOut);
    public static native String recoverEthAddress(byte[] message, byte[] signature);
}
