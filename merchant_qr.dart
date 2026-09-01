 import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class MerchantQrGeneratorScreen extends StatelessWidget {
  final String merchantId = "OWNER_MAIN"; 
  final String businessName = "Apex Boutique Kaloum";

  const MerchantQrGeneratorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Encapsulate custom protocol syntax for deep-linking inside the camera target
    final String qrPayload = "apex-money:merchant:$merchantId";

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('My Merchant QR Code', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1E3A8A),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                businessName,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 8),
              const Text('Present this code to the customer to receive an instant GNF payment',
                  textAlign: Center, style: TextStyle(color: Colors.grey, fontSize: 14)),
              const SizedBox(height: 40),
              
              // Graphical QR Code Component Rendering Engine
              QrImageView(
                data: qrPayload,
                version: QrVersions.auto,
                size: 260.0,
                gapless: false,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF1E3A8A)),
                dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.circle, color: Colors.black),
              ),
              
              const SizedBox(height: 40),
              const Text('Secured Payment Network - Republic of Guinea', style: TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
