use pairing_crypto::{hwallet::HWallet, ecies::EciesCipher};

fn main() {
    println!("=== HD Wallet and ECIES Integration Example ===\n");

    // 1. Generate Mnemonic
    let mnemonic = HWallet::generate_mnemonic();
    println!("1. Generated Mnemonic (24 words): {}", mnemonic);

    // 2. Derive Seed
    let seed = HWallet::mnemonic_to_seed(&mnemonic, "");
    println!("2. HD Wallet Seed derived.");

    // 3. Derive Ethereum Private Key from path
    let eth_derivation_path = "m/44'/60'/0'/0/0";
    let eth_privkey = HWallet::derive_private_key(&seed, eth_derivation_path);
    println!("3. Derived Private Key (hex) at {}: {}", eth_derivation_path, hex::encode(&eth_privkey));

    // 4. Generate Keypair from the derived private key
    let (sk_bytes, uncompressed_pk) = EciesCipher::keypair_from_bytes(&eth_privkey).unwrap();
    
    // Extract Ethereum Address
    let eth_address = HWallet::eth_address_from_pubkey(&uncompressed_pk);
    println!("4. ECIES Public Key derived. Ethereum Address: {}", eth_address);

    // 5. Encrypt data and Decrypt data
    let msg = b"Hello from Pairing Crypto with ECIES!";
    println!("\n5. Encrypting message: '{}'", String::from_utf8_lossy(msg));
    
    let encrypted_msg = EciesCipher::encrypt_with_pubkey(&uncompressed_pk, msg).unwrap();
    println!("   Encrypted (hex): {}", hex::encode(&encrypted_msg));

    let decrypted_msg = EciesCipher::decrypt_with_privkey(&sk_bytes, &encrypted_msg).unwrap();
    println!("   Decrypted message: '{}'", String::from_utf8_lossy(&decrypted_msg));
    
    assert_eq!(msg.to_vec(), decrypted_msg);
    println!("\n=== Example Execution Successful ===");
}
