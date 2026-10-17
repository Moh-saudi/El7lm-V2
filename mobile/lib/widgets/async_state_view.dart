import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';

class AsyncStateView<T> extends StatelessWidget {
  const AsyncStateView({
    super.key,
    required this.future,
    required this.builder,
    this.emptyMessage,
    this.onRetry,
  });

  final Future<T> future;
  final Widget Function(BuildContext context, T data) builder;
  final String? emptyMessage;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.cloud_off_outlined,
                    size: 48,
                    color: AppColors.muted,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    context.errorText(snapshot.error),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.muted,
                        ),
                  ),
                  if (onRetry != null) ...[
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: onRetry,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.green,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 10,
                        ),
                      ),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: Text(
                        context.tr('retry'),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        }
        return builder(context, snapshot.data as T);
      },
    );
  }
}

