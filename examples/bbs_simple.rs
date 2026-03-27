use pairing_crypto::{
    bbs::{
        ciphersuites::{
            bls12_381::KeyPair,
            bls12_381_g1_sha_256::{proof_gen, proof_verify, sign, verify},
        },
        BbsProofGenRequest,
        BbsProofGenRevealMessageRequest,
        BbsProofVerifyRequest,
        BbsSignRequest,
        BbsVerifyRequest,
    },
    Error,
};
use std::collections::BTreeSet;

// 예제에서 사용할 고정된 시드(IKM)와 정보들입니다.
const EXAMPLE_KEY_GEN_IKM: &[u8; 49] =
    b"only_for_example_not_A_random_seed_at_Allllllllll";
const EXAMPLE_KEY_INFO: &[u8; 16] = b"example-key-info";
const EXAMPLE_HEADER: &[u8; 14] = b"example-header";
const EXAMPLE_PRESENTATION_HEADER: &[u8; 27] = b"example-presentation-header";
const EXAMPLE_MESSAGES: [&[u8]; 2] =
    [b"example-message-1", b"example-message-2"];

fn main() -> Result<(), Error> {
    let messages = EXAMPLE_MESSAGES;

    // 1. 키 쌍 생성 (Key Generation)
    // 시드(IKM)와 추가 정보를 입력받아 비밀키와 공개키 쌍을 생성합니다.
    let (secret_key, public_key) =
        KeyPair::new(EXAMPLE_KEY_GEN_IKM, EXAMPLE_KEY_INFO)
            .map(|key_pair| {
                (
                    key_pair.secret_key.to_bytes(),
                    key_pair.public_key.to_octets(),
                )
            })
            .expect("key generation failed");

    // 2. 여러 메시지에 대한 서명 생성 (Multi-message Signing)
    // BBS 서명은 여러 메시지를 한 번에 서명할 수 있습니다.
    let signature = sign(&BbsSignRequest {
        secret_key: &secret_key,
        public_key: &public_key,
        header: Some(EXAMPLE_HEADER.as_ref()),
        messages: Some(&messages),
    })?;

    // 3. 서명 검증 (Verification)
    // 모든 메시지와 서명 정보를 사용하여 서명이 올바른지 확인합니다.
    let result = verify(&BbsVerifyRequest {
        public_key: &public_key,
        header: Some(EXAMPLE_HEADER.as_ref()),
        messages: Some(&messages),
        signature: &signature,
    })?;
    assert!(result);

    // 4. 선택적 공개를 위한 설정 (Selective Disclosure Setup)
    // 0번째 인덱스의 메시지만 공개하도록 설정합니다.
    let indices_first_disclosed = BTreeSet::<usize>::from([0]);

    // 각 메시지에 대해 공개 여부(reveal)를 설정하는 요청 객체 리스트를 만듭니다.
    let proof_messages: Vec<BbsProofGenRevealMessageRequest<_>> = messages
        .iter()
        .enumerate()
        .map(|(index, message)| {
            let mut reveal = false;
            // 지정된 인덱스인 경우에만 reveal을 true로 설정합니다.
            if indices_first_disclosed.contains(&index) {
                reveal = true;
            }
            BbsProofGenRevealMessageRequest {
                reveal,
                value: *message,
            }
        })
        .collect();

    // 실제로 검증자에게 전달될 "공개된 메시지들"만 따로 추출합니다.
    let disclosed_messages = proof_messages
        .iter()
        .enumerate()
        .filter(|(_, m)| m.reveal)
        .map(|(k, m)| (k, m.value))
        .collect::<Vec<(usize, &[u8])>>();

    // 5. 증명 생성 (Proof Generation / Zero-Knowledge Proof)
    // "전체 서명을 공개하지 않으면서" 특정 메시지만 알고 있음을 증명하는 값을 생성합니다.
    let proof = proof_gen(&BbsProofGenRequest {
        public_key: &public_key,
        header: Some(EXAMPLE_HEADER.as_ref()),
        messages: Some(&proof_messages),
        signature: &signature,
        presentation_header: Some(EXAMPLE_PRESENTATION_HEADER.as_ref()),
        verify_signature: None,
    })?;

    // 6. 증명 검증 (Proof Verification)
    // 검증자는 공개키와 '공개된 메시지들'만 가지고 증명값이 유효한지 확인합니다.
    // 비공개된 메시지나 원본 서명이 없어도 이 증명이 유효함(지갑 주인임을 입증 등)을 알 수 있습니다.
    let result = proof_verify(&BbsProofVerifyRequest {
        public_key: &public_key,
        header: Some(EXAMPLE_HEADER.as_ref()),
        presentation_header: Some(EXAMPLE_PRESENTATION_HEADER.as_ref()),
        proof: &proof,
        messages: Some(&disclosed_messages),
    })?;
    assert!(result);
    
    println!("BBS Signature and Selective Disclosure Proof verified successfully!");
    Ok(())
}
