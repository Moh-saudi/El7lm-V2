import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Interactive & hardware-accelerated 6-axis Radar / Polygon Chart for Player Skills
class PlayerSkillsRadarChart extends StatelessWidget {
  const PlayerSkillsRadarChart({
    super.key,
    required this.pace,
    required this.shooting,
    required this.passing,
    required this.dribbling,
    required this.defending,
    required this.physical,
    this.size = 230,
    this.isDark = true,
  });

  final num pace;
  final num shooting;
  final num passing;
  final num dribbling;
  final num defending;
  final num physical;
  final double size;
  final bool isDark;

  int get overallRating {
    final total = pace + shooting + passing + dribbling + defending + physical;
    return (total / 6).round();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RadarChartPainter(
              stats: [
                _StatItem('PAC', pace.clamp(10, 99).toDouble()),
                _StatItem('SHO', shooting.clamp(10, 99).toDouble()),
                _StatItem('PAS', passing.clamp(10, 99).toDouble()),
                _StatItem('DRI', dribbling.clamp(10, 99).toDouble()),
                _StatItem('DEF', defending.clamp(10, 99).toDouble()),
                _StatItem('PHY', physical.clamp(10, 99).toDouble()),
              ],
              isDark: isDark,
            ),
          ),
          // Center OVR circular badge
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDark ? const Color(0xFF0F172A) : Colors.white,
              border: Border.all(
                color: const Color(0xFF10B981),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.25),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$overallRating',
                  style: TextStyle(
                    color: isDark ? const Color(0xFFFFD700) : const Color(0xFF059669),
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    height: 1,
                  ),
                ),
                Text(
                  'OVR',
                  style: TextStyle(
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    fontSize: 7,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem {
  const _StatItem(this.label, this.value);
  final String label;
  final double value; // 0..100
}

class _RadarChartPainter extends CustomPainter {
  _RadarChartPainter({required this.stats, required this.isDark});

  final List<_StatItem> stats;
  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 34; // Margin for stat labels
    const sides = 6;
    const angleStep = (2 * math.pi) / sides;
    const startAngle = -math.pi / 2; // Start from top vertex

    final gridPaint = Paint()
      ..color = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final spokePaint = Paint()
      ..color = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // 1. Draw 4 concentric polygon web rings (25%, 50%, 75%, 100%)
    for (int level = 1; level <= 4; level++) {
      final levelRadius = radius * (level / 4.0);
      final path = Path();
      for (int i = 0; i < sides; i++) {
        final angle = startAngle + (i * angleStep);
        final x = center.dx + levelRadius * math.cos(angle);
        final y = center.dy + levelRadius * math.sin(angle);
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      path.close();
      canvas.drawPath(path, gridPaint);
    }

    // 2. Draw spokes connecting center to vertices
    for (int i = 0; i < sides; i++) {
      final angle = startAngle + (i * angleStep);
      final x = center.dx + radius * math.cos(angle);
      final y = center.dy + radius * math.sin(angle);
      canvas.drawLine(center, Offset(x, y), spokePaint);
    }

    // 3. Compute data polygon points
    final dataPath = Path();
    final dataPoints = <Offset>[];

    for (int i = 0; i < sides; i++) {
      final fraction = (stats[i].value / 100.0).clamp(0.15, 1.0);
      final dataRadius = radius * fraction;
      final angle = startAngle + (i * angleStep);
      final point = Offset(
        center.dx + dataRadius * math.cos(angle),
        center.dy + dataRadius * math.sin(angle),
      );
      dataPoints.add(point);
      if (i == 0) {
        dataPath.moveTo(point.dx, point.dy);
      } else {
        dataPath.lineTo(point.dx, point.dy);
      }
    }
    dataPath.close();

    // 4. Fill data polygon with emerald gradient
    final fillPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF059669), Color(0xFF10B981)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.fill
      ..color = const Color(0xFF10B981).withValues(alpha: 0.38);

    canvas.drawPath(dataPath, fillPaint);

    // 5. Stroke data polygon border
    final borderPaint = Paint()
      ..color = const Color(0xFF34D399)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(dataPath, borderPaint);

    // 6. Draw point markers
    final dotFillPaint = Paint()..color = const Color(0xFF10B981);
    final dotBorderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    for (final point in dataPoints) {
      canvas.drawCircle(point, 3.5, dotFillPaint);
      canvas.drawCircle(point, 3.5, dotBorderPaint);
    }

    // 7. Draw labels around polygon
    for (int i = 0; i < sides; i++) {
      final angle = startAngle + (i * angleStep);
      final labelRadius = radius + 20;
      final labelPos = Offset(
        center.dx + labelRadius * math.cos(angle),
        center.dy + labelRadius * math.sin(angle),
      );

      final textSpan = TextSpan(
        children: [
          TextSpan(
            text: '${stats[i].label}\n',
            style: TextStyle(
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              fontSize: 9,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
              height: 1.1,
            ),
          ),
          TextSpan(
            text: '${stats[i].value.toInt()}',
            style: TextStyle(
              color: isDark ? const Color(0xFFFFD700) : const Color(0xFF059669),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              height: 1.1,
            ),
          ),
        ],
      );

      final textPainter = TextPainter(
        text: textSpan,
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();

      final textOffset = Offset(
        labelPos.dx - (textPainter.width / 2),
        labelPos.dy - (textPainter.height / 2),
      );
      textPainter.paint(canvas, textOffset);
    }
  }

  @override
  bool shouldRepaint(covariant _RadarChartPainter oldDelegate) {
    if (oldDelegate.isDark != isDark) return true;
    for (int i = 0; i < stats.length; i++) {
      if (oldDelegate.stats[i].value != stats[i].value) return true;
    }
    return false;
  }
}
