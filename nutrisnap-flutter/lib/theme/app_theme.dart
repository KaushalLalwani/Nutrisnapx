import 'package:flutter/material.dart';

class NutriSnapColors {
  static const Color background = Color(0xFF020617);
  static const Color backgroundSecondary = Color(0xFF0F172A);
  static const Color surface = Color(0xCC111827);
  static const Color surfaceStrong = Color(0xFF1E293B);
  static const Color border = Color(0x668B9DB7);
  static const Color accent = Color(0xFF22D3EE);
  static const Color accentStrong = Color(0xFF14B8A6);
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color success = Color(0xFF34D399);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFFB7185);
}

class NutriSnapTheme {
  static ThemeData darkTheme() {
    const colorScheme = ColorScheme.dark(
      primary: NutriSnapColors.accent,
      secondary: NutriSnapColors.accentStrong,
      surface: NutriSnapColors.surfaceStrong,
      error: NutriSnapColors.danger,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: NutriSnapColors.background,
      fontFamily: 'sans-serif',
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: NutriSnapColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: CardThemeData(
        color: NutriSnapColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: NutriSnapColors.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x661E293B),
        labelStyle: const TextStyle(color: NutriSnapColors.textSecondary),
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
        prefixIconColor: NutriSnapColors.accent,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: NutriSnapColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: NutriSnapColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: NutriSnapColors.accent),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.black,
          backgroundColor: NutriSnapColors.accent,
          disabledBackgroundColor: const Color(0x33475569),
          disabledForegroundColor: const Color(0xFF94A3B8),
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF020617),
        selectedItemColor: NutriSnapColors.accent,
        unselectedItemColor: Color(0xFF94A3B8),
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: NutriSnapColors.surfaceStrong,
        contentTextStyle: const TextStyle(color: NutriSnapColors.textPrimary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: NutriSnapColors.border),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: NutriSnapColors.accent,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: NutriSnapColors.textPrimary,
        displayColor: NutriSnapColors.textPrimary,
      ).copyWith(
        headlineMedium: const TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w800,
          color: NutriSnapColors.textPrimary,
          height: 1.15,
        ),
        titleLarge: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w800,
          color: NutriSnapColors.textPrimary,
        ),
        titleMedium: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: NutriSnapColors.textPrimary,
        ),
        bodyMedium: const TextStyle(
          fontSize: 14,
          color: NutriSnapColors.textSecondary,
          height: 1.5,
        ),
      ),
    );
  }
}

class NutriSnapBackground extends StatelessWidget {
  const NutriSnapBackground({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            NutriSnapColors.background,
            NutriSnapColors.backgroundSecondary,
            NutriSnapColors.background,
          ],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -120,
            left: -80,
            child: _GlowOrb(
              color: NutriSnapColors.accent.withOpacity(0.16),
              size: 260,
            ),
          ),
          Positioned(
            top: 120,
            right: -90,
            child: _GlowOrb(
              color: NutriSnapColors.accentStrong.withOpacity(0.16),
              size: 240,
            ),
          ),
          Positioned(
            bottom: -100,
            left: 70,
            child: _GlowOrb(
              color: const Color(0xFFA855F7).withOpacity(0.08),
              size: 220,
            ),
          ),
          SafeArea(
            child: Padding(
              padding: padding,
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.margin,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: NutriSnapColors.border),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xCC0F172A),
            Color(0xB3122437),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3314B8A6),
            blurRadius: 32,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [NutriSnapColors.accent, Color(0xFF5EEAD4)],
          ).createShader(bounds),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({
    required this.color,
    required this.size,
  });

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: color,
              blurRadius: 80,
              spreadRadius: 30,
            ),
          ],
        ),
      ),
    );
  }
}
