 import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart'; // Run 'flutter pub add uuid' to auto-generate unique transaction keys

class ApiService {
  // Replace this with your production server URL or your local development machine IP
  // For local testing on an Android Emulator, use 'http://10.0.2.2:4000'
  static const String baseUrl = 'http://10.0.2';
  
  // Use a package-level UUID generator instance to guarantee safe client tracking identifiers
  final _uuid = const Uuid();

  /**
   * CONNECTOR FOR PEER-TO-PEER (P2P) TRANSFERS
   * Sends user funds securely down to the PostgreSQL transactional database layer.
   */
  async Future<Map<String, dynamic>> executeWalletTransfer({
    required String senderId,
    required String destinationPhone,
    required double amountGNF,
  }) async {
    final String requestUrl = '$baseUrl/portal/user/transfer';
    
    // Generate an un-duplicatable tracking code for the button click event
    final String uniqueIdempotencyKey = 'FLUTTER-TX-${_uuid.v4().toUpperCase()}';

    try {
      final response = await http.post(
        Uri.parse(requestUrl),
        headers: {
          'Content-Type': 'application/json',
          'X-Caller-ID': senderId,                     // Identifies who is sending
          'X-Idempotency-Key': uniqueIdempotencyKey,  // Safety shield against double-charging
        },
        body: jsonEncode({
          'receiver_phone': destinationPhone,
          'amount': amountGNF,
        }),
      );

      final decodedPayload = jsonDecode(response.body);

      if (response.statusCode == 200) {
        // Success: Ledger committed changes to disk perfectly
        return {
          'success': true,
          'message': decodedPayload['message'] ?? 'Transaction successful',
          'tx_id': decodedPayload['tx_details']['tx_id'],
        };
      } else {
        // Validation Error: Insufficient funds or account not found
        return {
          'success': false,
          'message': decodedPayload['error'] ?? 'Server validation loop rejected payment.'
        };
      }
    } catch (networkError) {
      // Handles offline scenarios or bad connection drops in transit
      return {
        'success': false,
        'message': 'Network timeout or unstable connection route. Please check your data or try again.'
      };
    }
  }
}
