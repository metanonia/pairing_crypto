package com.example.bbs.service;

import org.springframework.stereotype.Service;
import pairing_crypto.Bls12381Sha256;
import pairing_crypto.KeyPair;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

@Service
public class BbsService {

    private final Bls12381Sha256 bbs = new Bls12381Sha256();

    public KeyPair generateKeyPair(byte[] ikm, byte[] keyInfo) throws Exception {
        return bbs.generateKeyPair(ikm, keyInfo);
    }

    public byte[] sign(byte[] secretKey, byte[] publicKey, byte[] header, byte[][] messages) throws Exception {
        return bbs.sign(secretKey, publicKey, header, messages);
    }

    public boolean verify(byte[] publicKey, byte[] header, byte[] signature, byte[][] messages) throws Exception {
        return bbs.verify(publicKey, header, signature, messages);
    }

    public byte[] createProof(byte[] publicKey, byte[] header, byte[] presentationHeader, byte[] signature, 
                              boolean verifySignature, HashSet<Integer> disclosedIndices, byte[][] messages) throws Exception {
        return bbs.createProof(publicKey, header, presentationHeader, signature, verifySignature, disclosedIndices, messages);
    }

    public boolean verifyProof(byte[] publicKey, byte[] header, byte[] presentationHeader, byte[] proof, 
                                Map<Integer, byte[]> revealedMessages) throws Exception {
        return bbs.verifyProof(publicKey, header, presentationHeader, proof, (HashMap<Integer, byte[]>) revealedMessages);
    }
}
