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
  late final PairingCryptoLib _sdk;
  Uint8List? _secretKey;
  Uint8List? _publicKey;

  @override
  void initState() {
    super.initState();
    try {
      _sdk = PairingCryptoLib();
      // 테스트용 키 쌍 생성
      final keys = _sdk.generateKeyPair(
        Uint8List(32)..fillRange(0, 32, 1), // IKM
        Uint8List(0), // Key Info
      );
      _secretKey = keys['secretKey'];
      _publicKey = keys['publicKey'];
    } catch (e) {
      _status = 'SDK 초기화 또는 키 생성 실패: $e';
    }
  }

  void _runFullTest() {
    setState(() {
      _status = '테스트 실행 중...';
    });

    try {
      if (_secretKey == null || _publicKey == null) {
        throw Exception('키가 생성되지 않았습니다.');
      }

      final messages = [
        Uint8List.fromList('Hello Pairing Crypto'.codeUnits),
        Uint8List.fromList('Selective Disclosure Test'.codeUnits),
      ];

      // 1. 서명 생성 (Sign)
      final signature = _sdk.sign(_secretKey!, _publicKey!, messages);
      final signStatus = '서명 성공 (${signature.length}바이트)';

      // 2. 서명 검증 (Verify)
      final isVerified = _sdk.verify(_publicKey!, signature, messages);
      final verifyStatus = isVerified ? '검증 성공' : '검증 실패';

      // 3. 증명 생성 (Derive Proof - 첫 번째 메시지만 공개)
      final proofMessages = [
        {'value': messages[0], 'reveal': true},
        {'value': messages[1], 'reveal': false},
      ];
      final proof = _sdk.deriveProof(_publicKey!, signature, proofMessages);
      final proofGenStatus = '증명 생성 성공 (${proof.length}바이트)';

      // 4. 증명 검증 (Verify Proof)
      final disclosedMessages = [
        {'index': 0, 'value': messages[0]},
      ];
      final isProofVerified = _sdk.verifyProof(_publicKey!, proof, disclosedMessages);
      final proofVerifyStatus = isProofVerified ? '증명 검증 성공' : '증명 검증 실패';

      setState(() {
        _status = '--- BBS 종합 테스트 결과 ---\n\n'
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
                      Text('상태: $_status'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),
              ElevatedButton(
                onPressed: _runFullTest,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                ),
                child: const Text('BBS 전체 프로세스 테스트', style: TextStyle(fontSize: 18)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
