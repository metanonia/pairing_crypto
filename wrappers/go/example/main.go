package main

import (
	"encoding/hex"
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

	r.Run(":8080")
}
