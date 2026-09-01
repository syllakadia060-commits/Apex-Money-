import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class OtpVerificationScreen extends StatefulWidget {
  final String phoneNumber; // Passed down from the initial phone entry screen (e.g. +224621111111)

  const OtpVerificationScreen({super.key, required this.phoneNumber});

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final int _otpLength = 6;
  final List<TextEditingController> _controllers = [];
  final List<FocusNode> _focusNodes = [];
  bool _isLoading = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    // Initialize text and focus tracking arrays for each individual digit container box
    for (int i = 0; i < _otpLength; i++) {
      _controllers.add(TextEditingController());
      _focusNodes.add(FocusNode());
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  // Orchestrates text positioning logic: moves cursor forward or backward automatically
  void _onOtpDigitChanged(int index, String value) {
    if (value.isNotEmpty && index < _otpLength - 1) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    
    // Automatically submit code if the final slot is filled
    String currentOtp = _getCompiledOtp();
    if (currentOtp.length == _otpLength) {
      _verifySecurityToken(currentOtp);
    }
  }

  String _getCompiledOtp() {
    return _controllers.map((c) => c.text).join();
  }

  /**
   * CONNECTOR FOR API AUTH PROTOCOLS
   * Invokes the Node.js backend cluster to validate input variables against PostgreSQL memory
   */
  Future<void> _verifySecurityToken(String otpCode) async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    // Replace with your system backend access gateway IP
    const String apiUrl = 'http://10.0.2';

    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': widget.phoneNumber,
          'otp_code': otpCode,
        }),
      );

      final payload = jsonDecode(response.body);

      if (response.statusCode == 200) {
        // Success Path: Security validation loops verified. Navigate to main wallet interface
        final String sessionToken = payload['session_token'];
        _showSuccessAlert(sessionToken);
      } else {
        // Verification Failure: Throw validation text response down to UI alert tracking strings
        setState(() {
          _errorMessage = payload['error'] ?? 'Incorrect passcode submitted.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Connection timeout. Check your network visibility layer.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              const Text(
                'Security Checkpoint',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the 6-digit verification code sent via text transaction to ${widget.phoneNumber}',
                style: const TextStyle(fontSize: 14, color: Colors.grey, height: 1.4),
              ),
              const SizedBox(height: 40),

              // 🎛️ SIX DIGIT EXPANDABLE INPUT ROW SYSTEM
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(_otpLength, (index) {
                  return SizedBox(
                    width: 48,
                    height: 56,
                    child: TextField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 1,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                      decoration: InputDecoration(
                        counterText: '', // Hides default text length indicators
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF1E3A8A), width: 2),
                        ),
                      ),
                      onChanged: (val) => _onOtpDigitChanged(index, val),
                    ),
                  );
                }),
              ),

              const SizedBox(height: 20),

              // Error notification interface area
              if (_errorMessage.isNotEmpty)
                Text(
                  _errorMessage,
                  style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w500),
                ),

              const SizedBox(height: 40),

              // Loading Spinner or Manual Submission Call To Action
              _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)))
                  : SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E3A8A),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => _verifySecurityToken(_getCompiledOtp()),
                        child: const Text(
                          'Confirm & Authorize Account',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSuccessAlert(String token) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Access Authorized'),
        content: Text('Identity verified perfectly.\nSession signature: ${token.substring(0,8)}...'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Launch Platform Engine'),
          )
        ],
      ),
    );
  }
}
