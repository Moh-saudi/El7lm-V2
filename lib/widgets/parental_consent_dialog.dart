import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';

/// Signature point representation
class _Point {
  _Point(this.offset, this.type);
  final Offset offset;
  final _PointType type;
}

enum _PointType { tap, move }

/// Interactive Canvas for Electronic Digital Signature Drawing
class SignaturePadWidget extends StatefulWidget {
  const SignaturePadWidget({
    super.key,
    required this.onSignatureChanged,
    this.strokeColor = const Color(0xFF0F172A),
    this.strokeWidth = 3.0,
  });

  final ValueChanged<bool> onSignatureChanged;
  final Color strokeColor;
  final double strokeWidth;

  @override
  SignaturePadWidgetState createState() => SignaturePadWidgetState();
}

class SignaturePadWidgetState extends State<SignaturePadWidget> {
  final List<_Point?> _points = <_Point?>[];
  bool _hasSignature = false;

  bool get hasSignature => _hasSignature;

  void clear() {
    setState(() {
      _points.clear();
      _hasSignature = false;
    });
    widget.onSignatureChanged(false);
  }

  Future<Uint8List?> exportPngBytes() async {
    if (_points.isEmpty) return null;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);

    // Draw solid white background
    final bgPaint = Paint()..color = Colors.white;
    canvas.drawRect(const Rect.fromLTWH(0, 0, 600, 300), bgPaint);

    // Draw signature strokes
    final paint = Paint()
      ..color = widget.strokeColor
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = widget.strokeWidth * 1.5;

    for (int i = 0; i < _points.length - 1; i++) {
      if (_points[i] != null && _points[i + 1] != null) {
        canvas.drawLine(_points[i]!.offset * 2, _points[i + 1]!.offset * 2, paint);
      }
    }

    final picture = recorder.endRecording();
    final img = await picture.toImage(600, 300);
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    return byteData?.buffer.asUint8List();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _hasSignature ? AppColors.green : Colors.grey.shade300,
          width: _hasSignature ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Dashed Baseline Hint
          Positioned(
            left: 20,
            right: 20,
            bottom: 40,
            child: Row(
              children: List.generate(
                30,
                (i) => Expanded(
                  child: Container(
                    height: 1,
                    color: i % 2 == 0 ? Colors.grey.shade300 : Colors.transparent,
                  ),
                ),
              ),
            ),
          ),

          // Label watermark
          Positioned(
            bottom: 12,
            right: 20,
            child: Text(
              context.tr('signatureHint'),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade400,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),

          // Interactive Gesture Area
          GestureDetector(
            onPanStart: (details) {
              final RenderBox renderBox = context.findRenderObject() as RenderBox;
              final localOffset = renderBox.globalToLocal(details.globalPosition);
              setState(() {
                _points.add(_Point(localOffset, _PointType.tap));
                _hasSignature = true;
              });
              widget.onSignatureChanged(true);
            },
            onPanUpdate: (details) {
              final RenderBox renderBox = context.findRenderObject() as RenderBox;
              final localOffset = renderBox.globalToLocal(details.globalPosition);
              setState(() {
                _points.add(_Point(localOffset, _PointType.move));
              });
            },
            onPanEnd: (details) {
              setState(() {
                _points.add(null);
              });
            },
            child: CustomPaint(
              painter: _SignaturePainter(_points, widget.strokeColor, widget.strokeWidth),
              size: Size.infinite,
            ),
          ),

          // Clear Button
          if (_hasSignature)
            Positioned(
              top: 8,
              left: 8,
              child: InkWell(
                onTap: clear,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.refresh_rounded, size: 14, color: AppColors.muted),
                      const SizedBox(width: 4),
                      Text(
                        context.tr('clearSignature'),
                        style: const TextStyle(fontSize: 11, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  _SignaturePainter(this.points, this.color, this.width);
  final List<_Point?> points;
  final Color color;
  final double width;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = width;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!.offset, points[i + 1]!.offset, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) => true;
}

/// Parental Consent Modal Popup Dialog
class ParentalConsentDialog extends StatefulWidget {
  const ParentalConsentDialog({
    super.key,
    this.initialGuardianName,
    this.initialRelationship,
    this.initialPhone,
    this.initialSignatureUrl,
    required this.onConfirmed,
  });

  final String? initialGuardianName;
  final String? initialRelationship;
  final String? initialPhone;
  final String? initialSignatureUrl;
  final Function({
    required String guardianName,
    required String relationship,
    required String guardianPhone,
    Uint8List? signatureBytes,
  }) onConfirmed;

  @override
  State<ParentalConsentDialog> createState() => _ParentalConsentDialogState();
}

class _ParentalConsentDialogState extends State<ParentalConsentDialog> {
  final GlobalKey<SignaturePadWidgetState> _signatureKey = GlobalKey<SignaturePadWidgetState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  String? _relationship;
  bool _isReSigning = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialGuardianName ?? '');
    _phoneController = TextEditingController(text: widget.initialPhone ?? '');
    _relationship = widget.initialRelationship;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  bool get _hasExistingSignature =>
      widget.initialSignatureUrl != null && widget.initialSignatureUrl!.trim().isNotEmpty && !_isReSigning;

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _errorMessage = context.tr('enterGuardianNameError'));
      return;
    }
    final defaultFatherRel = context.tr('relationshipFather');
    final errSignMsg = context.tr('signDeclarationError');

    Uint8List? bytes;
    if (!_hasExistingSignature) {
      if (!(_signatureKey.currentState?.hasSignature ?? false)) {
        setState(() => _errorMessage = errSignMsg);
        return;
      }
      bytes = await _signatureKey.currentState?.exportPngBytes();
      if (bytes == null || bytes.isEmpty) {
        setState(() => _errorMessage = errSignMsg);
        return;
      }
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final currentRel = _relationship ?? defaultFatherRel;
      await widget.onConfirmed(
        guardianName: name,
        relationship: currentRel,
        guardianPhone: _phoneController.text.trim(),
        signatureBytes: bytes,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = '$e';
        });
      }
    }
  }

  Widget _renderSignatureImage(String rawUrl, {double? width, double? height, BoxFit fit = BoxFit.contain}) {
    if (rawUrl.isEmpty) {
      return const Center(child: Icon(Icons.draw_rounded, size: 40, color: AppColors.muted));
    }

    var url = rawUrl.trim();
    if (url.startsWith('data:image')) {
      try {
        final base64Data = url.split(',').last;
        final bytes = base64Decode(base64Data);
        return Image.memory(bytes, width: width, height: height, fit: fit);
      } catch (_) {}
    }

    if (url.contains('images.weserv.nl/?url=')) {
      final uri = Uri.parse(url);
      final target = uri.queryParameters['url'];
      if (target != null && target.isNotEmpty) {
        url = target.startsWith('http') ? target : 'https://$target';
      }
    }

    return CachedNetworkImage(
      imageUrl: url,
      width: width,
      height: height,
      fit: fit,
      placeholder: (context, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      errorWidget: (context, url, error) {
        return Image.network(
          url,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => const Center(
            child: Icon(Icons.draw_rounded, size: 40, color: AppColors.muted),
          ),
        );
      },
    );
  }

  void _showEnlargedSignature(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    context.tr('currentSignatureLabel'),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.navy),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  constraints: const BoxConstraints(maxHeight: 250),
                  child: _renderSignatureImage(url, fit: BoxFit.contain),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final relationships = [
      context.tr('relationshipFather'),
      context.tr('relationshipMother'),
      context.tr('relationshipGuardian'),
    ];
    if (_relationship == null || !relationships.contains(_relationship)) {
      _relationship = relationships.first;
    }

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 550,
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.green.withValues(alpha: .12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.verified_user_rounded, color: AppColors.green, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr('parentalConsentTitle'),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: AppColors.navy,
                        ),
                      ),
                      Text(
                        context.tr('parentalConsentSub'),
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.close_rounded, color: AppColors.muted, size: 22),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(height: 16),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Legal Statement Text Container (Compact Scrollable Box)
                    Container(
                      constraints: const BoxConstraints(maxHeight: 120),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.blueGrey.shade100),
                      ),
                      child: Scrollbar(
                        thumbVisibility: true,
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                context.tr('parentalConsentHeading'),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: AppColors.navy,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                context.tr('parentalConsentBody'),
                                style: const TextStyle(
                                  fontSize: 12,
                                  height: 1.5,
                                  color: Color(0xFF334155),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Input Form Fields
                    Text(
                      context.tr('guardianInfoTitle'),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: context.tr('guardianNameLabel'),
                        prefixIcon: const Icon(Icons.person_outline_rounded, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 10),

                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _relationship,
                            decoration: InputDecoration(
                              labelText: context.tr('relationshipLabel'),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              isDense: true,
                            ),
                            items: relationships
                                .map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13))))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _relationship = val);
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              labelText: context.tr('guardianPhoneLabel'),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Signature Pad Label
                    Text(
                      context.tr('electronicSignatureLabel'),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Display Existing Signature vs Signature Canvas
                    if (_hasExistingSignature) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.green.shade200, width: 1.5),
                        ),
                        child: Column(
                          children: [
                            // Responsive Header Wrap (prevents overflow on long translated titles)
                            Wrap(
                              alignment: WrapAlignment.spaceBetween,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.check_circle_rounded, color: AppColors.green, size: 18),
                                    const SizedBox(width: 6),
                                    Text(
                                      context.tr('currentSignatureLabel'),
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF14532D),
                                      ),
                                    ),
                                  ],
                                ),
                                InkWell(
                                  onTap: () =>
                                      _showEnlargedSignature(context, widget.initialSignatureUrl!),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.zoom_in_rounded, size: 16, color: AppColors.navy),
                                        const SizedBox(width: 4),
                                        Text(
                                          context.tr('viewFullSignature'),
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.navy,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () =>
                                  _showEnlargedSignature(context, widget.initialSignatureUrl!),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                height: 100,
                                width: double.infinity,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade300),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: _renderSignatureImage(
                                    widget.initialSignatureUrl!,
                                    fit: BoxFit.contain,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            OutlinedButton.icon(
                              onPressed: () {
                                setState(() {
                                  _isReSigning = true;
                                });
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.navy,
                                side: BorderSide(color: Colors.grey.shade400),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              icon: const Icon(Icons.edit_outlined, size: 15),
                              label: Text(
                                context.tr('reSignButton'),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      // Signature Pad Widget
                      SignaturePadWidget(
                        key: _signatureKey,
                        onSignatureChanged: (_) {},
                      ),
                    ],

                    if (_errorMessage != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: Colors.red, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: Colors.red, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Submit Button
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.draw_rounded, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            context.tr('confirmSignatureButton'),
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
