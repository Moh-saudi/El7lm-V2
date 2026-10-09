import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';
import '../models/account_type.dart';
import '../models/user_profile.dart';
import 'data_service.dart';

class VideoMediaItem {
  final String url;
  final String title;

  const VideoMediaItem({
    required this.url,
    this.title = '',
  });

  Map<String, dynamic> toJson() => {
    'url': url,
    'title': title,
  };
}

/// Centralized, high-reliability manager for picking and uploading media
/// (Photos, Videos, Camera Captures, Gallery, Links) across the entire application.
class MediaUploadManager {
  const MediaUploadManager._();

  static final RegExp _urlRegex = RegExp(r'''https?://[^\s,}'"]+''');

  /// Cleans and extracts pure HTTP URLs from strings, maps, or JSON payloads.
  static List<String> extractCleanUrls(dynamic rawList) {
    final results = <String>{};
    if (rawList == null) return const [];

    void processItem(dynamic item) {
      if (item == null) return;
      if (item is Map) {
        final u = (item['url'] ?? item['video_url'] ?? item['path'] ?? item['videoUrl'] ?? item['src'] ?? item['link'] ?? '').toString().trim();
        if (u.isNotEmpty && !u.contains('test.com')) {
          final match = _urlRegex.firstMatch(u);
          if (match != null) {
            results.add(match.group(0)!);
          } else if (u.startsWith('http')) {
            results.add(u);
          }
        }
      } else if (item is String) {
        final s = item.trim();
        if (s.isEmpty || s == 'null' || s.contains('test.com')) return;
        if (s.startsWith('{') && s.endsWith('}')) {
          try {
            final decoded = jsonDecode(s);
            if (decoded is Map) {
              processItem(decoded);
              return;
            }
          } catch (_) {}
        }
        final match = _urlRegex.firstMatch(s);
        if (match != null) {
          results.add(match.group(0)!);
        } else if (s.startsWith('http')) {
          results.add(s);
        }
      }
    }

    if (rawList is List) {
      for (final e in rawList) {
        processItem(e);
      }
    } else if (rawList is String) {
      try {
        final decoded = jsonDecode(rawList);
        if (decoded is List) {
          for (final e in decoded) {
            processItem(e);
          }
        } else {
          processItem(decoded);
        }
      } catch (_) {
        final matches = _urlRegex.allMatches(rawList);
        for (final m in matches) {
          final u = m.group(0)!;
          if (!u.contains('test.com')) results.add(u);
        }
      }
    }

    return results.toList();
  }

  /// Extracts structured video items with their custom user-specified titles.
  static List<VideoMediaItem> extractVideoItems(dynamic rawList) {
    final results = <VideoMediaItem>[];
    final seenUrls = <String>{};
    if (rawList == null) return const [];

    void processItem(dynamic item) {
      if (item == null) return;
      if (item is Map) {
        final u = (item['url'] ?? item['video_url'] ?? item['videoUrl'] ?? item['path'] ?? item['src'] ?? item['link'] ?? '').toString().trim();
        final t = (item['title'] ?? item['description'] ?? item['desc'] ?? item['name'] ?? '').toString().trim();
        if (u.isNotEmpty && !u.contains('test.com')) {
          final match = _urlRegex.firstMatch(u);
          final clean = match != null ? match.group(0)! : (u.startsWith('http') ? u : null);
          if (clean != null && !seenUrls.contains(clean)) {
            seenUrls.add(clean);
            results.add(VideoMediaItem(url: clean, title: t));
          }
        }
      } else if (item is String) {
        final s = item.trim();
        if (s.isEmpty || s == 'null' || s.contains('test.com')) return;
        if (s.startsWith('{') && s.endsWith('}')) {
          try {
            final decoded = jsonDecode(s);
            if (decoded is Map) {
              processItem(decoded);
              return;
            }
          } catch (_) {}
        }
        final match = _urlRegex.firstMatch(s);
        final clean = match != null ? match.group(0)! : (s.startsWith('http') ? s : null);
        if (clean != null && !seenUrls.contains(clean)) {
          seenUrls.add(clean);
          results.add(VideoMediaItem(url: clean, title: ''));
        }
      }
    }

    if (rawList is List) {
      for (final e in rawList) {
        processItem(e);
      }
    } else if (rawList is String) {
      try {
        final decoded = jsonDecode(rawList);
        if (decoded is List) {
          for (final e in decoded) {
            processItem(e);
          }
        } else {
          processItem(decoded);
        }
      } catch (_) {
        final matches = _urlRegex.allMatches(rawList);
        for (final m in matches) {
          final u = m.group(0)!;
          if (!u.contains('test.com') && !seenUrls.contains(u)) {
            seenUrls.add(u);
            results.add(VideoMediaItem(url: u, title: ''));
          }
        }
      }
    }

    return results;
  }

  /// Master action sheet for the global floating camera button.
  /// Redesigned with modern, compact action cards matching project standards (icons only, no lengthy outdated subtitles).
  static Future<UserProfile?> showUnifiedMediaActionSheet({
    required BuildContext context,
    required DataService dataService,
    UserProfile? profile,
  }) async {
    final effectiveProfile =
        profile ?? await dataService.fetchProfile(AccountType.player);
    if (!context.mounted) return null;

    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    sheetCtx.tr('uploadSkillsMedia'),
                    style: Theme.of(sheetCtx).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.muted),
                    onPressed: () => Navigator.pop(sheetCtx),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // ── Photos Section ──
              Text(
                sheetCtx.tr('photos'),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.muted,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _ModernMediaActionCard(
                    icon: Icons.camera_alt_rounded,
                    title: 'التقاط صورة',
                    color: const Color(0xFF2563EB),
                    bgColor: const Color(0xFFEFF6FF),
                    onTap: () => Navigator.pop(sheetCtx, 'camera_photo'),
                  ),
                  const SizedBox(width: 12),
                  _ModernMediaActionCard(
                    icon: Icons.photo_library_rounded,
                    title: 'صورة من المعرض',
                    color: AppColors.green,
                    bgColor: const Color(0xFFECFDF5),
                    onTap: () => Navigator.pop(sheetCtx, 'gallery_photo'),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              // ── Videos Section ──
              Text(
                sheetCtx.tr('videos'),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.muted,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _ModernMediaActionCard(
                    icon: Icons.videocam_rounded,
                    title: 'تصوير فيديو',
                    color: const Color(0xFFDC2626),
                    bgColor: const Color(0xFFFEF2F2),
                    onTap: () => Navigator.pop(sheetCtx, 'camera_video'),
                  ),
                  const SizedBox(width: 10),
                  _ModernMediaActionCard(
                    icon: Icons.video_library_rounded,
                    title: 'فيديو المعرض',
                    color: const Color(0xFF7C3AED),
                    bgColor: const Color(0xFFF5F3FF),
                    onTap: () => Navigator.pop(sheetCtx, 'gallery_video'),
                  ),
                  const SizedBox(width: 10),
                  _ModernMediaActionCard(
                    icon: Icons.link_rounded,
                    title: 'رابط خارجي',
                    color: const Color(0xFF9333EA),
                    bgColor: const Color(0xFFFAF5FF),
                    onTap: () => Navigator.pop(sheetCtx, 'link_video'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (choice == null || !context.mounted) return null;

    final isVideo = choice.contains('video');
    final directAction = switch (choice) {
      'camera_photo' || 'camera_video' => 'camera',
      'gallery_photo' || 'gallery_video' => 'gallery',
      'link_video' => 'link',
      _ => null,
    };

    return pickAndUploadMedia(
      context: context,
      dataService: dataService,
      profile: effectiveProfile,
      isVideo: isVideo,
      forcedAction: directAction,
    );
  }

  /// Prompts user to pick a photo or video (Camera, Gallery, or External Link)
  /// and automatically uploads it, saves it in Supabase, and updates the profile.
  static Future<UserProfile?> pickAndUploadMedia({
    required BuildContext context,
    required DataService dataService,
    required UserProfile profile,
    required bool isVideo,
    bool isProfilePhoto = false,
    String? forcedAction,
    void Function(bool uploading)? onLoadingChanged,
  }) async {
    final action = forcedAction ??
        await showModalBottomSheet<String>(
        context: context,
        showDragHandle: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isProfilePhoto
                          ? 'تحديث الصورة الشخصية'
                          : (isVideo ? 'إضافة مقطع فيديو' : 'إضافة صورة جديدة'),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.muted),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (!isVideo)
                  Row(
                    children: [
                      _ModernMediaActionCard(
                        icon: Icons.camera_alt_rounded,
                        title: 'التقاط صورة',
                        color: const Color(0xFF2563EB),
                        bgColor: const Color(0xFFEFF6FF),
                        onTap: () => Navigator.pop(ctx, 'camera'),
                      ),
                      const SizedBox(width: 12),
                      _ModernMediaActionCard(
                        icon: Icons.photo_library_rounded,
                        title: 'صورة من المعرض',
                        color: AppColors.green,
                        bgColor: const Color(0xFFECFDF5),
                        onTap: () => Navigator.pop(ctx, 'gallery'),
                      ),
                    ],
                  )
                else
                  Row(
                    children: [
                      _ModernMediaActionCard(
                        icon: Icons.videocam_rounded,
                        title: 'تصوير فيديو',
                        color: const Color(0xFFDC2626),
                        bgColor: const Color(0xFFFEF2F2),
                        onTap: () => Navigator.pop(ctx, 'camera'),
                      ),
                      const SizedBox(width: 10),
                      _ModernMediaActionCard(
                        icon: Icons.video_library_rounded,
                        title: 'فيديو المعرض',
                        color: const Color(0xFF7C3AED),
                        bgColor: const Color(0xFFF5F3FF),
                        onTap: () => Navigator.pop(ctx, 'gallery'),
                      ),
                      if (!isProfilePhoto) ...[
                        const SizedBox(width: 10),
                        _ModernMediaActionCard(
                          icon: Icons.link_rounded,
                          title: 'رابط خارجي',
                          color: const Color(0xFF9333EA),
                          bgColor: const Color(0xFFFAF5FF),
                          onTap: () => Navigator.pop(ctx, 'link'),
                        ),
                      ],
                    ],
                  ),
              ],
            ),
          ),
        ),
      );

    if (action == null) return null;

    // Handle External Video Link
    if (action == 'link') {
      if (!context.mounted) return null;
      final existingItems = extractVideoItems(profile.values['videos'] ?? profile.values['video_urls'] ?? profile.values['uploaded_videos']);
      final defaultTitle = 'فيديو مهارات #${existingItems.length + 1}';
      final urlController = TextEditingController();
      final titleController = TextEditingController(text: defaultTitle);

      final confirm = await showDialog<bool>(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFFF3E8FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.link_rounded, color: Color(0xFF9333EA), size: 22),
              ),
              const SizedBox(width: 10),
              Text(
                context.tr('addVideoLinkShort'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'عنوان الفيديو:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.muted),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: titleController,
                decoration: InputDecoration(
                  hintText: 'مثال: مهارات وأهداف اللاعب',
                  prefixIcon: const Icon(Icons.title_rounded, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'رابط الفيديو:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.muted),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: urlController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'https://youtube.com/watch?v=... أو TikTok',
                  prefixIcon: const Icon(Icons.link_rounded, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, false),
              child: Text(context.tr('cancel')),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => Navigator.pop(dialogCtx, true),
              child: Text(context.tr('add')),
            ),
          ],
        ),
      );

      final linkUrl = urlController.text.trim();
      final finalTitle = titleController.text.trim().isNotEmpty
          ? titleController.text.trim()
          : defaultTitle;

      if (confirm == true && linkUrl.isNotEmpty) {
        onLoadingChanged?.call(true);
        try {
          final newVideoMap = {
            'url': linkUrl,
            'title': finalTitle,
            'type': 'external',
            'created_at': DateTime.now().toIso8601String(),
          };

          final updatedList = existingItems.map((e) => e.toJson()).toList();
          final existingIdx = updatedList.indexWhere((m) => m['url'] == linkUrl);
          if (existingIdx >= 0) {
            updatedList[existingIdx] = newVideoMap;
          } else {
            updatedList.add(newVideoMap);
          }

          final updates = <String, dynamic>{
            'videos': updatedList,
            'video_urls': updatedList,
            'uploaded_videos': updatedList,
          };
          await dataService.savePlayerProfile(profile, updates);
          final updatedVals = profile.mergeUpdates(updates);
          final updated = UserProfile(
            userId: profile.userId,
            accountType: profile.accountType,
            values: updatedVals,
          );
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(context.tr('mediaUploadedSuccess')),
                backgroundColor: AppColors.green,
              ),
            );
          }
          return updated;
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(context.errorText(e)), backgroundColor: Colors.red),
            );
          }
        } finally {
          onLoadingChanged?.call(false);
        }
      }
      return null;
    }

    // Handle Camera or Gallery Selection
    final pickerSource = action == 'camera' ? ImageSource.camera : ImageSource.gallery;
    final picker = ImagePicker();

    XFile? pickedFile;
    try {
      if (isVideo) {
        pickedFile = await picker.pickVideo(
          source: pickerSource,
          maxDuration: const Duration(minutes: 5),
        );
      } else {
        pickedFile = await picker.pickImage(
          source: pickerSource,
          imageQuality: 85,
        );
      }
    } catch (pickerErr) {
      debugPrint('⚠️ ImagePicker error: $pickerErr');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تعذر الوصول إلى الكاميرا أو المعرض. يرجى التحقق من أذونات التطبيق.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return null;
    }

    if (pickedFile == null) {
      // User cancelled camera capture or gallery selection
      return null;
    }

    String? videoTitle;
    if (isVideo) {
      if (!context.mounted) return null;
      final existingItems = extractVideoItems(profile.values['videos'] ?? profile.values['video_urls'] ?? profile.values['uploaded_videos']);
      final defaultTitle = 'فيديو المهارات #${existingItems.length + 1}';
      final titleController = TextEditingController(text: defaultTitle);

      final confirmedTitle = await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (dialogCtx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.movie_creation_rounded, color: AppColors.green, size: 22),
              ),
              const SizedBox(width: 10),
              const Text(
                'عنوان مقطع الفيديو',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'اكتب عنواناً يصف هذا المقطع (مثل: مهارات التسديد، أهداف الموسم...):',
                style: TextStyle(fontSize: 13, color: AppColors.muted),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'عنوان الفيديو...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx, defaultTitle),
              child: const Text('استخدام الافتراضي'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                final txt = titleController.text.trim();
                Navigator.pop(dialogCtx, txt.isNotEmpty ? txt : defaultTitle);
              },
              child: const Text('متابعة والرفع'),
            ),
          ],
        ),
      );

      if (confirmedTitle == null) {
        return null;
      }
      videoTitle = confirmedTitle;
    }

    if (!context.mounted) return null;
    onLoadingChanged?.call(true);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            const SizedBox(width: 12),
            Text(context.tr('uploadingMediaWait')),
          ],
        ),
        duration: const Duration(seconds: 20),
      ),
    );

    try {
      final bytes = await pickedFile.readAsBytes();
      if (bytes.isEmpty) {
        throw Exception('الملف الملتقط فارغ (0 بايت). يرجى إعادة المحاولة.');
      }

      final ext = pickedFile.name.contains('.')
          ? pickedFile.name.split('.').last.toLowerCase()
          : (isVideo ? 'mp4' : 'jpg');

      final mime = switch (ext) {
        'jpg' || 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'mov' => 'video/quicktime',
        'webm' => 'video/webm',
        '3gp' => 'video/3gpp',
        _ => isVideo ? 'video/mp4' : 'image/jpeg',
      };

      final publicUrl = await dataService.uploadPlayerMedia(
        bytes: bytes,
        extension: ext,
        contentType: mime,
        isVideo: isVideo,
      );

      final cleanUrl = _urlRegex.firstMatch(publicUrl)?.group(0) ?? publicUrl;
      final updates = <String, dynamic>{};

      if (isProfilePhoto) {
        updates['image'] = cleanUrl;
        updates['profile_image'] = cleanUrl;
        updates['profile_image_url'] = cleanUrl;
      } else if (isVideo) {
        final existingItems = extractVideoItems(profile.values['videos'] ?? profile.values['video_urls'] ?? profile.values['uploaded_videos']);
        final finalTitle = videoTitle?.trim().isNotEmpty == true
            ? videoTitle!.trim()
            : 'فيديو المهارات #${existingItems.length + 1}';

        final newVideoMap = {
          'url': cleanUrl,
          'title': finalTitle,
          'type': 'uploaded',
          'created_at': DateTime.now().toIso8601String(),
        };

        final updatedList = existingItems.map((e) => e.toJson()).toList();
        final existingIdx = updatedList.indexWhere((m) => m['url'] == cleanUrl);
        if (existingIdx >= 0) {
          updatedList[existingIdx] = newVideoMap;
        } else {
          updatedList.add(newVideoMap);
        }

        updates['videos'] = updatedList;
        updates['video_urls'] = updatedList;
        updates['uploaded_videos'] = updatedList;
      } else {
        final existingImages = extractCleanUrls(profile.values['additional_images'] ?? profile.values['images']);
        if (!existingImages.contains(cleanUrl)) {
          existingImages.add(cleanUrl);
        }
        updates['additional_images'] = existingImages;
        updates['images'] = existingImages;
      }

      await dataService.savePlayerProfile(profile, updates);
      final updatedVals = profile.mergeUpdates(updates);
      final updated = UserProfile(
        userId: profile.userId,
        accountType: profile.accountType,
        values: updatedVals,
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('mediaUploadedSuccess')),
            backgroundColor: AppColors.green,
          ),
        );
      }

      return updated;
    } catch (uploadErr) {
      debugPrint('❌ [MediaUploadManager] Error: $uploadErr');
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.errorText(uploadErr)),
            backgroundColor: Colors.red,
          ),
        );
      }
      return null;
    } finally {
      onLoadingChanged?.call(false);
    }
  }
}

/// Modern, sleek action card for media selection without redundant subtitles.
class _ModernMediaActionCard extends StatelessWidget {
  const _ModernMediaActionCard({
    required this.icon,
    required this.title,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final Color color;
  final Color bgColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: color.withValues(alpha: 0.22),
                width: 1.2,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.16),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 12.5,
                    color: Colors.grey.shade900,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
