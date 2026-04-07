use pairing_crypto::ecies::EciesCipher;
use k256::{SecretKey};
use k256::elliptic_curve::sec1::ToEncodedPoint;

fn main() {
    let sk = SecretKey::random(&mut rand::thread_rng());
    let pk = sk.public_key();
    let msg = b"hello world";
    
    let pk_uncompressed = pk.to_encoded_point(false).as_bytes().to_vec();
    println!("Pubkey length: {}", pk_uncompressed.len());
    
    let encrypted = EciesCipher::encrypt_with_pubkey(&pk_uncompressed, msg).unwrap();
    println!("Encrypted length: {}", encrypted.len());
    println!("Extra bytes (Enc - Pub - Msg): {}", encrypted.len() as isize - pk_uncompressed.len() as isize - msg.len() as isize);
    
    let decrypted = EciesCipher::decrypt_with_privkey(&sk.to_bytes(), &encrypted).unwrap();
    assert_eq!(msg.to_vec(), decrypted);
    println!("Success! Pure-Rust ECIES is working.");
}
