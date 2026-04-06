package main

import (
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mattrglobal/pairing-crypto-go"
)

type SignRequest struct {
	SecretKey string   `json:"secretKey" binding:"required"`
	PublicKey string   `json:"publicKey" binding:"required"`
	Header    string   `json:"header"`
	Messages  []string `json:"messages" binding:"required"`
}

type VerifyRequest struct {
	PublicKey string   `json:"publicKey" binding:"required"`
	Signature string   `json:"signature" binding:"required"`
	Header    string   `json:"header"`
	Messages  []string `json:"messages" binding:"required"`
}

type ProofMessageDto struct {
	Value  string `json:"value" binding:"required"`
	Reveal bool   `json:"reveal"`
}

type DeriveProofRequest struct {
	PublicKey           string            `json:"publicKey" binding:"required"`
	Signature           string            `json:"signature" binding:"required"`
	Header              string            `json:"header"`
	PresentationHeader  string            `json:"presentationHeader"`
	Messages            []ProofMessageDto `json:"messages" binding:"required"`
}

type VerifyProofRequest struct {
	PublicKey           string         `json:"publicKey" binding:"required"`
	Proof               string         `json:"proof" binding:"required"`
	Header              string         `json:"header"`
	PresentationHeader  string         `json:"presentationHeader"`
	RevealedMessages    map[int]string `json:"revealedMessages" binding:"required"`
}

func main() {
	r := gin.Default()

	// Use SHA-256 as default (matching WASM/Flutter examples)
	bbs := pairing_crypto.BLS12381Sha256

	// Serve static files (UI)
	r.StaticFile("/", "./static/index.html")
	r.Static("/static", "./static")

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/keys", func(c *gin.Context) {
		// Mocked IKM and KeyInfo for demonstration (should be random in production)
		ikm := make([]byte, 32) // In real world, use rand.Read or user input
		keyInfo := make([]byte, 32)
		
		kp, err := bbs.GenerateKeyPair(ikm, keyInfo)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"secretKey": hex.EncodeToString(kp.SecretKey),
			"publicKey": hex.EncodeToString(kp.PublicKey),
		})
	})

	r.POST("/sign", func(c *gin.Context) {
		var req SignRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		sk, _ := hex.DecodeString(req.SecretKey)
		pk, _ := hex.DecodeString(req.PublicKey)
		header, _ := hex.DecodeString(req.Header)
		
		var msgs [][]byte
		for _, m := range req.Messages {
			msgs = append(msgs, []byte(m))
		}

		sig, err := bbs.Sign(sk, pk, header, msgs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"signature": hex.EncodeToString(sig)})
	})

	r.POST("/verify", func(c *gin.Context) {
		var req VerifyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		pk, _ := hex.DecodeString(req.PublicKey)
		sig, _ := hex.DecodeString(req.Signature)
		header, _ := hex.DecodeString(req.Header)
		
		var msgs [][]byte
		for _, m := range req.Messages {
			msgs = append(msgs, []byte(m))
		}

		valid, err := bbs.Verify(pk, sig, header, msgs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"valid": valid})
	})

	r.POST("/proof/derive", func(c *gin.Context) {
		var req DeriveProofRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		pk, _ := hex.DecodeString(req.PublicKey)
		sig, _ := hex.DecodeString(req.Signature)
		header, _ := hex.DecodeString(req.Header)
		ph, _ := hex.DecodeString(req.PresentationHeader)

		var msgs []pairing_crypto.ProofMessage
		for _, m := range req.Messages {
			msgs = append(msgs, pairing_crypto.ProofMessage{
				Value:  []byte(m.Value),
				Reveal: m.Reveal,
			})
		}

		proof, err := bbs.DeriveProof(pk, sig, header, ph, msgs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"proof": hex.EncodeToString(proof)})
	})

	r.POST("/proof/verify", func(c *gin.Context) {
		var req VerifyProofRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		pk, _ := hex.DecodeString(req.PublicKey)
		proof, _ := hex.DecodeString(req.Proof)
		header, _ := hex.DecodeString(req.Header)
		ph, _ := hex.DecodeString(req.PresentationHeader)

		revealed := make(map[int][]byte)
		for idx, m := range req.RevealedMessages {
			revealed[idx] = []byte(m)
		}

		valid, err := bbs.VerifyProof(pk, proof, header, ph, revealed)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"valid": valid})
	})

	// --- 5-Step Integration Test Endpoint ---
	r.GET("/integration/test", func(c *gin.Context) {
		// 1. 키 쌍 생성 (동일 시드에서 3개)
		mnemonic, _ := pairing_crypto.GenerateMnemonic()
		seed, _ := pairing_crypto.MnemonicToSeed(mnemonic, "")
		
		var privKeys [][]byte
		var addresses []string
		for i := 0; i < 3; i++ {
			path := fmt.Sprintf("m/44'/60'/0'/0/%d", i)
			sk, _ := pairing_crypto.DerivePrivateKey(seed, path)
			privKeys = append(privKeys, sk)
			
			// 2. 이더리움 주소 생성
			kp, _ := pairing_crypto.EciesKeypairFromBytes(sk)
			addr, _ := pairing_crypto.EthAddressFromPubkey(kp.PublicKey)
			addresses = append(addresses, addr)
		}

		// 3. 메시지 서명 (첫 번째 키 사용)
		message := []byte("Integration test message")
		sig, err := pairing_crypto.SignEcdsaEth(privKeys[0], message)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Step 3 failed: " + err.Error()})
			return
		}

		// 4. 서명 주소 확인 (ecrecover)
		recoveredAddr, err := pairing_crypto.RecoverEthAddress(message, sig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Step 4 failed: " + err.Error()})
			return
		}
		step4Success := recoveredAddr == addresses[0]

		// 5. ECIES 암/복호화 (첫 번째 키 공용키로 암호화, 첫 번째 키 개인키로 복호화)
		// 시나리오대로 키 0과 키 1 간의 통신 시뮬레이션
		kp1, _ := pairing_crypto.EciesKeypairFromBytes(privKeys[1])
		
		secretMsg := []byte("Secret ECIES message")
		encrypted, err := pairing_crypto.EciesEncrypt(kp1.PublicKey, secretMsg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Step 5 encryption failed: " + err.Error()})
			return
		}
		
		decrypted, err := pairing_crypto.EciesDecrypt(privKeys[1], encrypted)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Step 5 decryption failed: " + err.Error()})
			return
		}
		step5Success := string(decrypted) == string(secretMsg)

		c.JSON(http.StatusOK, gin.H{
			"mnemonic": mnemonic,
			"addresses": addresses,
			"step3_signature": hex.EncodeToString(sig),
			"step4_recovered_address": recoveredAddr,
			"step4_success": step4Success,
			"step5_decrypted_message": string(decrypted),
			"step5_success": step5Success,
			"overall_success": step4Success && step5Success,
		})
	})

	r.Run(":8080")
}
