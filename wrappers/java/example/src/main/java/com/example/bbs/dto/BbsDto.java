package com.example.bbs.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class BbsDto {
    
    @Data
    public static class SignRequest {
        private String secretKey;
        private String publicKey;
        private String header;
        private List<String> messages;
    }

    @Data
    public static class VerifyRequest {
        private String publicKey;
        private String signature;
        private String header;
        private List<String> messages;
    }

    @Data
    public static class ProofMessageDto {
        private String value;
        private boolean reveal;
    }

    @Data
    public static class DeriveProofRequest {
        private String publicKey;
        private String signature;
        private String header;
        private String presentationHeader;
        private List<ProofMessageDto> messages;
    }

    @Data
    public static class VerifyProofRequest {
        private String publicKey;
        private String proof;
        private String header;
        private String presentationHeader;
        private Map<Integer, String> revealedMessages;
    }
}
