import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'pairing_crypto_ffi.dart';

void main() {
  runApp(const MaterialApp(home: MyApp()));
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String _status = '준비됨';
  String _integrationStatus = '준비됨';
  late final PairingCryptoLib _sdk;
  Uint8List? _secretKey;
  Uint8List? _publicKey;
  // bbs_simple.rs에서 사용하는 것과 동일한 상수들
  static final Uint8List _exampleIkm = Uint8List.fromList(
      'only_for_example_not_A_random_seed_at_Allllllllll'.codeUnits);
  static final Uint8List _exampleKeyInfo =
      Uint8List.fromList('example-key-info'.codeUnits);
  static final Uint8List _exampleHeader =
      Uint8List.fromList('example-header'.codeUnits);
  static final Uint8List _examplePresentationHeader =
      Uint8List.fromList('example-presentation-header'.codeUnits);
  static final List<Uint8List> _exampleMessages = [
    Uint8List.fromList('example-message-1'.codeUnits),
    Uint8List.fromList('example-message-2'.codeUnits),
  ];

  @override
  void initState() {
    super.initState();
    try {
      _sdk = PairingCryptoLib();
      // 1. 키 쌍 생성 (Key Generation) - bbs_simple.rs와 동일한 시드 사용
      final keys = _sdk.generateKeyPair(_exampleIkm, _exampleKeyInfo);
      _secretKey = keys['secretKey'];
      _publicKey = keys['publicKey'];
    } catch (e) {
      _status = 'SDK 초기화 또는 키 생성 실패: $e';
    }
  }

  void _runFullTest() {
    setState(() {
      _status = 'BBS 테스트 실행 중...';
    });

    try {
      if (_secretKey == null || _publicKey == null) {
        throw Exception('키가 생성되지 않았습니다.');
      }

      final messages = _exampleMessages;

      // 2. 여러 메시지에 대한 서명 생성 (Multi-message Signing)
      final signature = _sdk.sign(
        _secretKey!,
        _publicKey!,
        messages,
        _exampleHeader,
      );
      final signStatus = '서명 성공 (${signature.length}바이트)';

      // 3. 서명 검증 (Verification)
      final isVerified = _sdk.verify(
        _publicKey!,
        signature,
        messages,
        _exampleHeader,
      );
      final verifyStatus = isVerified ? '검증 성공' : '검증 실패';

      // 4. 선택적 공개를 위한 설정 (Selective Disclosure Setup)
      // 첫 번째 인덱스의 메시지(0)만 공개하도록 설정
      final proofMessages = [
        {'value': messages[0], 'reveal': true},
        {'value': messages[1], 'reveal': false},
      ];

      // 5. 증명 생성 (Proof Generation / Zero-Knowledge Proof)
      final proof = _sdk.deriveProof(
        _publicKey!,
        signature,
        proofMessages,
        header: _exampleHeader,
        presentationHeader: _examplePresentationHeader,
      );
      final proofGenStatus = '증명 생성 성공 (${proof.length}바이트)';

      // 6. 증명 검증 (Proof Verification)
      // 검증자는 공개키와 '공개된 메시지들'만 가지고 증명값이 유효한지 확인
      final disclosedMessages = [
        {'index': 0, 'value': messages[0]},
      ];
      final isProofVerified = _sdk.verifyProof(
        _publicKey!,
        proof,
        disclosedMessages,
        header: _exampleHeader,
        presentationHeader: _examplePresentationHeader,
      );
      final proofVerifyStatus = isProofVerified ? '증명 검증 성공' : '증명 검증 실패';

      setState(() {
        _status = '--- BBS 종합 테스트 결과 (bbs_simple.rs 대응) ---\n\n'
            '1. $signStatus\n'
            '2. $verifyStatus\n'
            '3. $proofGenStatus\n'
            '4. $proofVerifyStatus';
      });
    } catch (e) {
      setState(() {
        _status = '실패: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pairing Crypto BBS Demo')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'BBS 암호화 테스트',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 20),
                      Text('BBS 상태: $_status'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'HD Wallet & ECIES 통합 테스트',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 20),
                      Text('통합 테스트 상태: $_integrationStatus'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),
              Wrap(
                spacing: 20,
                runSpacing: 20,
                alignment: WrapAlignment.center,
                children: [
                  ElevatedButton(
                    onPressed: _runFullTest,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                      backgroundColor: Colors.indigo,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('BBS 테스트', style: TextStyle(fontSize: 16)),
                  ),
                  ElevatedButton(
                    onPressed: _runIntegrationTest,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                      backgroundColor: Colors.deepPurple,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('5단계 통합 테스트', style: TextStyle(fontSize: 16)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _runIntegrationTest() {
    setState(() {
      _integrationStatus = '통합 테스트 시작 중...';
    });

    try {
      // 1. 키 쌍 생성 (동일 시드에서 3개)
      final mnemonic = _sdk.generateMnemonic();
      final seed = _sdk.mnemonicToSeed(mnemonic, "");
      
      List<Uint8List> privKeys = [];
      List<String> addresses = [];
      
      for (int i = 0; i < 3; i++) {
        final path = "m/44'/60'/0'/0/$i";
        final sk = _sdk.derivePrivateKey(seed, path);
        privKeys.add(sk);
        
        // 2. 이더리움 주소 생성
        final kp = _sdk.eciesKeypairFromBytes(sk);
        final addr = _sdk.ethAddressFromPubkey(kp['publicKey']!);
        addresses.add(addr);
      }

      // 3. 메시지 서명 (첫 번째 키 사용)
      final message = Uint8List.fromList("Integration test message".codeUnits);
      final signature = _sdk.hwalletSignEcdsaEth(privKeys[0], message);

      // 4. 서명 주소 확인 (ecrecover)
      final recoveredAddr = _sdk.hwalletRecoverEthAddress(message, signature);
      final step4Success = recoveredAddr == addresses[0];

      // 5. ECIES 암/복호화 (Key 0-1 간)
      final kp1 = _sdk.eciesKeypairFromBytes(privKeys[1]);
      final secretMsg = Uint8List.fromList("Secret ECIES message".codeUnits);
      final encrypted = _sdk.eciesEncrypt(kp1['publicKey']!, secretMsg);
      final decrypted = _sdk.eciesDecrypt(privKeys[1], encrypted);
      final step5Success = String.fromCharCodes(decrypted) == "Secret ECIES message";

      setState(() {
        _integrationStatus = '--- 5단계 통합 테스트 결과 ---\n\n'
            '1. HD Wallet 3개 키 생성 성공\n'
            '2. ETH 주소 생성 성공: ${addresses[0]} 외 2개\n'
            '3. ECDSA 서명 성공 (${signature.length}바이트)\n'
            '4. 주소 복구 성공 여부: $step4Success ($recoveredAddr)\n'
            '5. ECIES 암/복호화 성공 여부: $step5Success\n\n'
            '종합 결과: ${step4Success && step5Success ? "PASS" : "FAIL"}';
      });
    } catch (e) {
      setState(() {
        _integrationStatus = '통합 테스트 실패: $e';
      });
    }
  }
}
