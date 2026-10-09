import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';
import '../models/account_type.dart';
import '../models/user_profile.dart';
import 'data_service.dart';

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
        final u = (item['url'] ?? item['path'] ?? item['videoUrl'] ?? item['src'] ?? '').toString().trim();
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

  /// Master action sheet for the global floating camera button.
  /// Unifies all options: Instant Camera Photo, Gallery Photo, Instant Camera Video,
  /// Gallery Video, and External Video Link.
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
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                sheetCtx.tr('uploadSkillsMedia'),
                style: Theme.of(sheetCtx).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                sheetCtx.tr('mediaSelectChoice'),
                style: const TextStyle(color: AppColors.muted, fontSize: 13),
              ),
              const SizedBox(height: 20),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                tileColor: const Color(0xFFEFF6FF),
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFDBEAFE),
                  child: Icon(
                    Icons.camera_alt_rounded,
                    color: Color(0xFF2563EB),
                  ),
                ),
                title: const Text(
                  'التقاط صورة فورية بالكاميرا',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text('تصوير مباشر بكاميرا الهاتف'),
                onTap: () => Navigator.pop(sheetCtx, 'camera_photo'),
              ),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                tileColor: const Color(0xFFECFDF5),
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFD1FAE5),
                  child: Icon(
                    Icons.photo_library_rounded,
                    color: AppColors.green,
                  ),
                ),
                title: Text(
                  sheetCtx.tr('uploadPhoto'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(sheetCtx.tr('jpgPngDesc')),
                onTap: () => Navigator.pop(sheetCtx, 'gallery_photo'),
              ),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                tileColor: const Color(0xFFFEF2F2),
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFFEE2E2),
                  child: Icon(
                    Icons.videocam_rounded,
                    color: Colors.red,
                  ),
                ),
                title: const Text(
                  'تصوير فيديو فوري بالكاميرا',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text('تسجيل فيديو مباشر لمهارات اللاعب'),
                onTap: () => Navigator.pop(sheetCtx, 'camera_video'),
              ),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                tileColor: const Color(0xFFF5F3FF),
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFEDE9FE),
                  child: Icon(
                    Icons.video_library_rounded,
                    color: Color(0xFF7C3AED),
                  ),
                ),
                title: Text(
                  sheetCtx.tr('uploadVideoClip'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(sheetCtx.tr('mp4FormatsDesc')),
                onTap: () => Navigator.pop(sheetCtx, 'gallery_video'),
              ),
              const SizedBox(height: 8),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                tileColor: const Color(0xFFFAF5FF),
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFF3E8FF),
                  child: Icon(Icons.link_rounded, color: Color(0xFF9333EA)),
                ),
                title: const Text(
                  'إضافة رابط فيديو خارجي',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text('YouTube / Shorts / TikTok'),
                onTap: () => Navigator.pop(sheetCtx, 'link_video'),
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
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isProfilePhoto
                      ? 'تحديث الصورة الشخصية'
                      : (isVideo ? 'رفع فيديو مهارات اللاعب' : 'رفع صورة للاعب'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                ),
                const SizedBox(height: 18),
                ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  tileColor: isVideo ? const Color(0xFFFEF2F2) : const Color(0xFFEFF6FF),
                  leading: CircleAvatar(
                    backgroundColor: isVideo ? Colors.red[100] : const Color(0xFFDBEAFE),
                    child: Icon(
                      isVideo ? Icons.videocam_rounded : Icons.camera_alt_rounded,
                      color: isVideo ? Colors.red[700] : const Color(0xFF2563EB),
                    ),
                  ),
                  title: Text(
                    isVideo ? 'تصوير فيديو فوري بالكاميرا' : 'التقاط صورة فورية بالكاميرا',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    isVideo ? 'سجل مقطع مهارات مباشرة الآن' : 'التقط صورة جديدة بالهاتف',
                    style: const TextStyle(fontSize: 12, color: AppColors.muted),
                  ),
                  onTap: () => Navigator.pop(ctx, 'camera'),
                ),
                const SizedBox(height: 8),
                ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  tileColor: const Color(0xFFECFDF5),
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFFD1FAE5),
                    child: Icon(
                      isVideo ? Icons.video_library_rounded : Icons.photo_library_rounded,
                      color: AppColors.green,
                    ),
                  ),
                  title: Text(
                    isVideo ? 'اختيار فيديو من المعرض' : 'اختيار صورة من المعرض',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: const Text(
                    'تصفح الملفات والوسائط المحفوظة',
                    style: TextStyle(fontSize: 12, color: AppColors.muted),
                  ),
                  onTap: () => Navigator.pop(ctx, 'gallery'),
                ),
                if (isVideo && !isProfilePhoto) ...[
                  const SizedBox(height: 8),
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    tileColor: const Color(0xFFF5F3FF),
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFEDE9FE),
                      child: Icon(Icons.link_rounded, color: Color(0xFF7C3AED)),
                    ),
                    title: const Text('إضافة رابط فيديو خارجي', style: TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: const Text('YouTube / Shorts / TikTok', style: TextStyle(fontSize: 12, color: AppColors.muted)),
                    onTap: () => Navigator.pop(ctx, 'link'),
                  ),
                ],
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      );

    if (action == null) return null;

    // Handle External Video Link
    if (action == 'link') {
      if (!context.mounted) return null;
      final urlController = TextEditingController();
      final confirm = await showDialog<bool>(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(context.tr('addVideoLinkShort')),
          content: TextField(
            controller: urlController,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'https://youtube.com/watch?v=... أو Shorts',
              prefixIcon: Icon(Icons.link_rounded),
            ),
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
              ),
              onPressed: () => Navigator.pop(dialogCtx, true),
              child: Text(context.tr('add')),
            ),
          ],
        ),
      );

      final linkUrl = urlController.text.trim();
      if (confirm == true && linkUrl.isNotEmpty) {
        onLoadingChanged?.call(true);
        try {
          final existingVideos = extractCleanUrls(profile.values['video_urls'] ?? profile.values['videos']);
          if (!existingVideos.contains(linkUrl)) {
            existingVideos.add(linkUrl);
          }
          final updates = <String, dynamic>{
            'video_urls': existingVideos,
            'videos': existingVideos,
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
        duration: const Duration(seconds: 15),
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
        final existingVideos = extractCleanUrls(profile.values['video_urls'] ?? profile.values['videos']);
        if (!existingVideos.contains(cleanUrl)) {
          existingVideos.add(cleanUrl);
        }
        updates['video_urls'] = existingVideos;
        updates['videos'] = existingVideos;
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
