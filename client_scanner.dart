 import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ClientQrScannerScreen extends StatefulWidget {
  const ClientQrScannerScreen({super.key});

  @override
  State<ClientQrScannerScreen> createState() => _ClientQrScannerScreenState();
}

class _ClientQrScannerScreenState extends State<ClientQrScannerScreen> {
  bool _isScanCompleted = false;

  void _processScannedData(String rawPayload) {
    if (_isScanCompleted) return;
    setState(() { _isScanCompleted = true; });

    // Enforce internal schema isolation rule checks
    if (rawPayload.startsWith("apex-money:merchant:")) {
      final String merchantId = rawPayload.split(":").last;
      
      Navigator.pop(context); // Kill scanner lens
      _navigateToPaymentConfirmation(merchantId);
    } else {
      // Alert when a user tries to scan unauthorized non-network barcodes
      _showInvalidQrAlert();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Merchant Invoice'), backgroundColor: const Color(0xFF1E3A8A)),
      body: Stack(
        children: [
          // High performance native camera framework module
          MobileScanner(
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _processScannedData(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          // Clean visual guide overlay boundary on top of camera feed
          Center(
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.green, width: 3),
                borderRadius: BorderRadius.circular(16),
                color: Colors.transparent,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToPaymentConfirmation(String id) {
    // Pipeline link moving to amount parameter collection view forms
    debugPrint("Target Merchant Identified: $id");
  }

  void _showInvalidQrAlert() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Unrecognized Code'),
        content: const Text("This QR code signature is not registered with the Apex Money secure payment architecture."),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Dismiss'))],
      ),
    ).then((_) => setState(() { _isScanCompleted = false; }));
  }
}
