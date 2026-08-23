import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:country_picker/country_picker.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../models/user_profile.dart';
import '../../services/auth_service.dart';
import '../../services/data_service.dart';
import '../../services/contact_validator.dart';
import '../../services/profile_answer_validator.dart';
import '../../services/location_catalog_service.dart';
import '../../models/location_catalog.dart';
import '../../widgets/account_type_football_icon.dart';
import 'player_profile_data.dart';

class ManagerProfileScreen extends StatefulWidget {
  const ManagerProfileScreen({
    super.key,
    required this.accountType,
    required this.displayName,
    required this.authService,
    required this.dataService,
    required this.onSignOut,
  });

  final AccountType accountType;
  final String displayName;
  final AuthService authService;
  final DataService dataService;
  final Future<void> Function() onSignOut;

  @override
  State<ManagerProfileScreen> createState() => _ManagerProfileScreenState();
}

class _ManagerProfileScreenState extends State<ManagerProfileScreen> {
  late Future<UserProfile> _future;
  bool _isEditing = false;
  bool _isSaving = false;
  bool _isUploadingImage = false;

  // Controllers for editing
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _emailController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  final _addressController = TextEditingController();
  final _websiteController = TextEditingController();
  final _foundedController = TextEditingController();
  final _stadiumController = TextEditingController();
  final _capacityController = TextEditingController();
  final _leagueController = TextEditingController();
  final _licenseController = TextEditingController();
  final _specializationController = TextEditingController();
  final _experienceController = TextEditingController();

  final _facebookController = TextEditingController();
  final _instagramController = TextEditingController();
  final _twitterController = TextEditingController();
  final _linkedinController = TextEditingController();

  bool _isApprovedOrLicensed = false;
  String? _imageUrl;
  String? _countryIso2;
  final _locationCatalog = LocationCatalogService();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  void _loadProfile() {
    _future = widget.dataService.fetchProfile(widget.accountType).then((
      profile,
    ) {
      if (mounted && !_isEditing) {
        _populateForm(profile);
      }
      return profile;
    });
  }

  void _populateForm(UserProfile profile) {
    final v = profile.values;
    _nameController.text =
        '${v['name'] ?? v['full_name'] ?? v['club_name'] ?? v['academy_name'] ?? widget.displayName}'
            .trim();
    _descriptionController.text = '${v['description'] ?? v['bio'] ?? ''}'
        .trim();
    _phoneController.text = '${v['phone'] ?? v['phoneNumber'] ?? ''}'.trim();
    _whatsappController.text = '${v['whatsapp'] ?? ''}'.trim();
    _emailController.text = '${v['email'] ?? ''}'.trim();
    _cityController.text = '${v['city'] ?? v['current_location'] ?? ''}'.trim();
    _countryController.text = '${v['country'] ?? v['nationality'] ?? ''}'
        .trim();
    _countryIso2 = Country.tryParse(_countryController.text)?.countryCode;
    _addressController.text = '${v['address'] ?? v['office_address'] ?? ''}'
        .trim();
    _websiteController.text = '${v['website'] ?? ''}'.trim();
    _foundedController.text =
        '${v['founded'] ?? v['founding_year'] ?? v['date_of_birth'] ?? ''}'
            .trim();
    _stadiumController.text = '${v['stadium_name'] ?? ''}'.trim();
    _capacityController.text = '${v['stadium_capacity'] ?? ''}'.trim();
    _leagueController.text =
        '${v['current_league'] ?? v['coaching_level'] ?? ''}'.trim();
    _licenseController.text = '${v['license_number'] ?? ''}'.trim();
    _specializationController.text = '${v['specialization'] ?? ''}'.trim();
    _experienceController.text =
        '${v['years_of_experience'] ?? v['experience_years'] ?? ''}'.trim();

    final social = v['social_media'] is Map
        ? Map<String, dynamic>.from(v['social_media'])
        : v;
    _facebookController.text = '${social['facebook'] ?? v['facebook'] ?? ''}'
        .trim();
    _instagramController.text = '${social['instagram'] ?? v['instagram'] ?? ''}'
        .trim();
    _twitterController.text = '${social['twitter'] ?? v['twitter'] ?? ''}'
        .trim();
    _linkedinController.text = '${social['linkedin'] ?? ''}'.trim();

    _isApprovedOrLicensed =
        v['is_federation_approved'] == true ||
        v['is_fifa_licensed'] == true ||
        v['is_certified'] == true;
    _imageUrl =
        '${v['logo'] ?? v['profile_photo'] ?? v['photo'] ?? v['image'] ?? ''}'
            .trim();
  }

  String _countryLabel(BuildContext context, String value) {
    if (value.trim().isEmpty) return context.tr('selectCountry');
    final country = Country.tryParse(_countryIso2 ?? value);
    return country?.getTranslatedName(context) ?? value;
  }

  Future<void> _selectCountry() async {
    try {
      final remoteCountries = await _locationCatalog.countries();
      if (remoteCountries.isEmpty) throw StateError('empty location catalog');
    } catch (_) {
      if (!mounted) return;
      showCountryPicker(
        context: context,
        showPhoneCode: false,
        favorite: const ['EG', 'QA', 'SA', 'AE'],
        countryListTheme: CountryListThemeData(
          bottomSheetHeight: MediaQuery.sizeOf(context).height * .78,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          inputDecoration: InputDecoration(
            labelText: context.tr('searchCountry'),
            hintText: context.tr('searchCountryHint'),
            prefixIcon: const Icon(Icons.search_rounded),
          ),
        ),
        onSelect: (country) {
          setState(() {
            _countryIso2 = country.countryCode;
            _countryController.text = canonicalCountryStorageValue(
              country.countryCode,
            );
            _cityController.clear();
          });
        },
      );
      return;
    }
    if (!mounted) return;
    final selected = await showModalBottomSheet<LocationCountry>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) => SizedBox(
        height: MediaQuery.sizeOf(sheetContext).height * .72,
        child: FutureBuilder<List<LocationCountry>>(
          future: _locationCatalog.countries(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text(context.tr('locationListUnavailable')));
            }
            final countries = snapshot.data ?? const [];
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                  child: Text(
                    context.tr('selectCountry'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: countries.length,
                    itemBuilder: (context, index) {
                      final item = countries[index];
                      final parsed = Country.tryParse(item.iso2);
                      return ListTile(
                        leading: Text(
                          item.flagEmoji ?? parsed?.flagEmoji ?? '🌍',
                        ),
                        title: Text(
                          parsed?.getTranslatedName(context) ?? item.name,
                        ),
                        onTap: () => Navigator.pop(sheetContext, item),
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
    if (selected == null || !mounted) return;
    setState(() {
      _countryIso2 = selected.iso2;
      _countryController.text = canonicalCountryStorageValue(selected.iso2);
      _cityController.clear();
    });
  }

  Future<void> _selectCity() async {
    final iso2 =
        _countryIso2 ?? Country.tryParse(_countryController.text)?.countryCode;
    if (iso2 == null || iso2.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.tr('selectCountryFirst'))));
      return;
    }
    try {
      final remoteCities = await _locationCatalog.cities(
        countryIso2: iso2,
        limit: 100,
      );
      if (remoteCities.isEmpty) throw StateError('empty city catalog');
    } catch (_) {
      if (!mounted) return;
      final fallbackCities = citiesForCountry(
        canonicalCountryStorageValue(iso2),
      );
      final selectedFallback = await showModalBottomSheet<String>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  context.tr('selectCity'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              ...fallbackCities.map(
                (city) => ListTile(
                  leading: const Icon(Icons.location_city_rounded),
                  title: Text(localizedCityLabel(context, city)),
                  onTap: () => Navigator.pop(sheetContext, city),
                ),
              ),
            ],
          ),
        ),
      );
      if (selectedFallback != null && mounted) {
        setState(() => _cityController.text = selectedFallback);
      }
      return;
    }
    if (!mounted) return;
    final selected = await showModalBottomSheet<LocationCity>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) => SizedBox(
        height: MediaQuery.sizeOf(sheetContext).height * .72,
        child: FutureBuilder<List<LocationCity>>(
          future: _locationCatalog.cities(countryIso2: iso2, limit: 100),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text(context.tr('locationListUnavailable')));
            }
            final cities = snapshot.data ?? const [];
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                  child: Text(
                    context.tr('selectCity'),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: cities.length,
                    itemBuilder: (context, index) {
                      final city = cities[index];
                      final label =
                          Localizations.localeOf(context).languageCode == 'ar'
                          ? (city.nameAr?.trim().isNotEmpty == true
                                ? city.nameAr!
                                : city.name)
                          : city.name;
                      return ListTile(
                        leading: const Icon(Icons.location_city_rounded),
                        title: Text(label),
                        onTap: () => Navigator.pop(sheetContext, city),
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
    if (selected == null || !mounted) return;
    setState(() => _cityController.text = selected.name);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _whatsappController.dispose();
    _emailController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _addressController.dispose();
    _websiteController.dispose();
    _foundedController.dispose();
    _stadiumController.dispose();
    _capacityController.dispose();
    _leagueController.dispose();
    _licenseController.dispose();
    _specializationController.dispose();
    _experienceController.dispose();
    _facebookController.dispose();
    _instagramController.dispose();
    _twitterController.dispose();
    _linkedinController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage(UserProfile profile) async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: Text(context.tr('chooseFromGallery')),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: Text(context.tr('takePhoto')),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.camera),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;
    final file = await picker.pickImage(source: source, imageQuality: 80);
    if (file == null) return;

    setState(() => _isUploadingImage = true);
    try {
      final bytes = await file.readAsBytes();
      final url = await widget.dataService.uploadProfileImage(
        bytes: bytes,
        extension: file.name.split('.').last,
        contentType: 'image/jpeg',
      );
      final imageKey = switch (widget.accountType) {
        AccountType.club || AccountType.academy => 'logo',
        AccountType.trainer || AccountType.agent => 'profile_photo',
        AccountType.marketer => 'photo',
        _ => 'image',
      };
      await widget.dataService.saveOrganizationProfile(profile, {
        imageKey: url,
      });
      if (!mounted) return;
      setState(() {
        _imageUrl = url;
        _loadProfile();
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.tr('profileUpdated'))));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.trOr('uploadFailed', 'Failed to upload image'),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingImage = false);
    }
  }

  Future<void> _saveChanges(UserProfile profile) async {
    final localizedTextFields = <String, TextEditingController>{
      'name': _nameController,
      'brief': _descriptionController,
      'country': _countryController,
      'city': _cityController,
      'address': _addressController,
      'stadium_name': _stadiumController,
      'current_league': _leagueController,
      'specialization': _specializationController,
    };
    for (final entry in localizedTextFields.entries) {
      final validation = ProfileAnswerValidator.validate(
        key: entry.key,
        rawValue: entry.value.text,
        fieldType: 'text',
        languageCode: Localizations.localeOf(context).languageCode,
      );
      if (!validation.isValid) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr(validation.errorKey!))),
        );
        return;
      }
    }
    final emailValidation = ContactValidator.email(_emailController.text);
    if (!emailValidation.isValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr(emailValidation.errorKey!))),
      );
      return;
    }
    final registeredPhone =
        '${profile.values['phone'] ?? profile.values['phoneNumber'] ?? ''}'
            .trim();
    if (registeredPhone.isNotEmpty &&
        _phoneController.text.trim().isNotEmpty &&
        !ContactValidator.samePhone(_phoneController.text, registeredPhone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('profilePhoneMustMatchLogin'))),
      );
      return;
    }
    setState(() => _isSaving = true);
    try {
      final updates = <String, dynamic>{
        'name': _nameController.text.trim(),
        'full_name': _nameController.text.trim(),
        if (widget.accountType == AccountType.club)
          'club_name': _nameController.text.trim(),
        if (widget.accountType == AccountType.academy)
          'academy_name': _nameController.text.trim(),
        'description': _descriptionController.text.trim(),
        'bio': _descriptionController.text.trim(),
        'phone': _phoneController.text.trim(),
        'whatsapp': _whatsappController.text.trim(),
        'email': _emailController.text.trim(),
        'city': _cityController.text.trim(),
        'current_location': _cityController.text.trim(),
        'country': _countryController.text.trim(),
        'nationality': _countryController.text.trim(),
        'address': _addressController.text.trim(),
        'office_address': _addressController.text.trim(),
        'website': _websiteController.text.trim(),
        'founded': _foundedController.text.trim(),
        'founding_year': _foundedController.text.trim(),
        'stadium_name': _stadiumController.text.trim(),
        'stadium_capacity': _capacityController.text.trim(),
        'current_league': _leagueController.text.trim(),
        'coaching_level': _leagueController.text.trim(),
        'license_number': _licenseController.text.trim(),
        'specialization': _specializationController.text.trim(),
        'years_of_experience': _experienceController.text.trim(),
        'experience_years': _experienceController.text.trim(),
        'is_federation_approved': _isApprovedOrLicensed,
        'is_fifa_licensed': _isApprovedOrLicensed,
        'is_certified': _isApprovedOrLicensed,
        'facebook': _facebookController.text.trim(),
        'instagram': _instagramController.text.trim(),
        'twitter': _twitterController.text.trim(),
        'social_media': {
          'facebook': _facebookController.text.trim(),
          'instagram': _instagramController.text.trim(),
          'twitter': _twitterController.text.trim(),
          'linkedin': _linkedinController.text.trim(),
        },
      };

      await widget.dataService.saveOrganizationProfile(profile, updates);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(context.tr('saveSuccess'))));
        setState(() {
          _isEditing = false;
          _loadProfile();
        });
      }
    } catch (exception) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(context.errorText(exception))));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final profile =
            snapshot.data ??
            UserProfile(
              userId: '',
              accountType: widget.accountType.value,
              values: const {},
            );

        final title = _nameController.text.isNotEmpty
            ? _nameController.text
            : (widget.displayName.isNotEmpty
                  ? widget.displayName
                  : widget.accountType.localizedName(context));

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // Header Profile Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        CircleAvatar(
                          radius: 44,
                          backgroundColor: AppColors.gold.withValues(
                            alpha: .15,
                          ),
                          backgroundImage:
                              _imageUrl != null && _imageUrl!.startsWith('http')
                              ? NetworkImage(_imageUrl!)
                              : null,
                          child:
                              _imageUrl == null ||
                                  !_imageUrl!.startsWith('http')
                              ? AccountTypeFootballIcon(
                                  type: widget.accountType,
                                  size: 48,
                                )
                              : null,
                        ),
                        InkWell(
                          onTap: _isUploadingImage
                              ? null
                              : () => _pickAndUploadImage(profile),
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: AppColors.green,
                            child: _isUploadingImage
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.camera_alt_rounded,
                                    color: Colors.white,
                                    size: 16,
                                  ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.green.withValues(alpha: .1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            widget.accountType.localizedName(context),
                            style: const TextStyle(
                              color: AppColors.green,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        if (_isApprovedOrLicensed) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.verified_rounded,
                            color: AppColors.green,
                            size: 20,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              if (_isEditing) {
                                _populateForm(profile);
                              }
                              _isEditing = !_isEditing;
                            });
                          },
                          icon: Icon(
                            _isEditing
                                ? Icons.close_rounded
                                : Icons.edit_rounded,
                            size: 18,
                          ),
                          label: Text(
                            _isEditing
                                ? context.tr('cancel')
                                : context.tr('editProfile'),
                          ),
                        ),
                        if (_isEditing) ...[
                          const SizedBox(width: 12),
                          FilledButton.icon(
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.green,
                            ),
                            onPressed: _isSaving
                                ? null
                                : () => _saveChanges(profile),
                            icon: _isSaving
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.check_rounded, size: 18),
                            label: Text(context.tr('saveProfile')),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Profile Sections: Edit Mode or View Mode
            if (_isEditing) ...[
              _buildEditSection(context),
            ] else ...[
              _buildViewSections(context, profile),
            ],
          ],
        );
      },
    );
  }

  Widget _buildViewSections(BuildContext context, UserProfile profile) {
    final isClub = widget.accountType == AccountType.club;

    return Column(
      children: [
        // Basic & Org Info
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionHeader(
                  title: context.tr('basicInfo'),
                  icon: Icons.info_outline_rounded,
                ),
                const SizedBox(height: 12),
                if (_descriptionController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: context.tr('bioDescription'),
                    value: _descriptionController.text,
                  ),
                  const Divider(height: 16),
                ],
                if (_foundedController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: context.tr('foundationYear'),
                    value: _foundedController.text,
                  ),
                  const Divider(height: 16),
                ],
                if (isClub && _stadiumController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: context.tr('stadiumName'),
                    value: _stadiumController.text,
                  ),
                  if (_capacityController.text.isNotEmpty)
                    _InfoRow(
                      label: context.tr('stadiumCapacity'),
                      value: _capacityController.text,
                    ),
                  const Divider(height: 16),
                ],
                if (_leagueController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: isClub
                        ? context.tr('currentLeague')
                        : context.tr('coachingLevel'),
                    value: _leagueController.text,
                  ),
                  const Divider(height: 16),
                ],
                if (_licenseController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: context.tr('licenseNumber'),
                    value: _licenseController.text,
                  ),
                  const Divider(height: 16),
                ],
                if (_specializationController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: context.tr('specialization'),
                    value: _specializationController.text,
                  ),
                  const Divider(height: 16),
                ],
                if (_experienceController.text.isNotEmpty) ...[
                  _InfoRow(
                    label: context.tr('yearsOfExperience'),
                    value: _experienceController.text,
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Contact Details Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionHeader(
                  title: context.tr('contactInfo'),
                  icon: Icons.phone_android_rounded,
                ),
                const SizedBox(height: 12),
                if (_phoneController.text.isNotEmpty)
                  _InfoRow(
                    label: context.tr('phone'),
                    value: _phoneController.text,
                  ),
                if (_whatsappController.text.isNotEmpty)
                  _InfoRow(label: 'WhatsApp', value: _whatsappController.text),
                if (_emailController.text.isNotEmpty)
                  _InfoRow(label: 'Email', value: _emailController.text),
                if (_cityController.text.isNotEmpty ||
                    _countryController.text.isNotEmpty)
                  _InfoRow(
                    label: context.tr('country'),
                    value:
                        '${_cityController.text} ${_countryLabel(context, _countryController.text)}'
                            .trim(),
                  ),
                if (_addressController.text.isNotEmpty)
                  _InfoRow(
                    label: context.tr('officeAddress'),
                    value: _addressController.text,
                  ),
                if (_websiteController.text.isNotEmpty)
                  _InfoRow(
                    label: context.tr('website'),
                    value: _websiteController.text,
                  ),
              ],
            ),
          ),
        ),

        // Social Media Card
        if (_facebookController.text.isNotEmpty ||
            _instagramController.text.isNotEmpty ||
            _twitterController.text.isNotEmpty ||
            _linkedinController.text.isNotEmpty) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionHeader(
                    title: context.tr('socialLinks'),
                    icon: Icons.share_rounded,
                  ),
                  const SizedBox(height: 12),
                  if (_facebookController.text.isNotEmpty)
                    _InfoRow(
                      label: 'Facebook',
                      value: _facebookController.text,
                    ),
                  if (_instagramController.text.isNotEmpty)
                    _InfoRow(
                      label: 'Instagram',
                      value: _instagramController.text,
                    ),
                  if (_twitterController.text.isNotEmpty)
                    _InfoRow(
                      label: 'Twitter / X',
                      value: _twitterController.text,
                    ),
                  if (_linkedinController.text.isNotEmpty)
                    _InfoRow(
                      label: 'LinkedIn',
                      value: _linkedinController.text,
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildEditSection(BuildContext context) {
    final isClub = widget.accountType == AccountType.club;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeader(
              title: context.tr('editProfile'),
              icon: Icons.edit_note_rounded,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText:
                    widget.accountType == AccountType.club ||
                        widget.accountType == AccountType.academy
                    ? context.tr('organizationName')
                    : context.tr('fullName'),
                prefixIcon: const Icon(Icons.domain_rounded),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: context.tr('bioDescription'),
                prefixIcon: const Icon(Icons.description_rounded),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _selectCountry,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('country'),
                        prefixIcon: const Icon(Icons.flag_rounded),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _countryLabel(context, _countryController.text),
                            ),
                          ),
                          const Icon(Icons.arrow_drop_down_rounded),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _selectCity,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('region'),
                        prefixIcon: const Icon(Icons.location_city_rounded),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _cityController.text.isEmpty
                                  ? context.tr('selectCity')
                                  : _cityController.text,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const Icon(Icons.arrow_drop_down_rounded),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: context.tr('officeAddress'),
                prefixIcon: const Icon(Icons.map_rounded),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: context.tr('phone'),
                      prefixIcon: const Icon(Icons.phone_rounded),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _whatsappController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'WhatsApp',
                      prefixIcon: Icon(Icons.message_rounded),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_rounded),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _websiteController,
              keyboardType: TextInputType.url,
              decoration: InputDecoration(
                labelText: context.tr('website'),
                prefixIcon: const Icon(Icons.language_rounded),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _foundedController,
                    decoration: InputDecoration(
                      labelText: context.tr('foundationYear'),
                      prefixIcon: const Icon(Icons.calendar_today_rounded),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _licenseController,
                    decoration: InputDecoration(
                      labelText: context.tr('licenseNumber'),
                      prefixIcon: const Icon(Icons.badge_rounded),
                    ),
                  ),
                ),
              ],
            ),
            if (isClub) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _stadiumController,
                      decoration: InputDecoration(
                        labelText: context.tr('stadiumName'),
                        prefixIcon: const Icon(Icons.stadium_rounded),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _capacityController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: context.tr('stadiumCapacity'),
                        prefixIcon: const Icon(Icons.groups_rounded),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _leagueController,
                decoration: InputDecoration(
                  labelText: context.tr('currentLeague'),
                  prefixIcon: const Icon(Icons.emoji_events_rounded),
                ),
              ),
            ],
            if (!isClub) ...[
              const SizedBox(height: 14),
              TextField(
                controller: _leagueController,
                decoration: InputDecoration(
                  labelText: context.tr('coachingLevel'),
                  prefixIcon: const Icon(Icons.workspace_premium_rounded),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _specializationController,
                decoration: InputDecoration(
                  labelText: context.tr('specialization'),
                  prefixIcon: const Icon(Icons.category_rounded),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _experienceController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: context.tr('yearsOfExperience'),
                  prefixIcon: const Icon(Icons.timeline_rounded),
                ),
              ),
            ],
            const SizedBox(height: 14),
            SwitchListTile(
              activeTrackColor: AppColors.green,
              contentPadding: EdgeInsets.zero,
              title: Text(context.tr('federationApproved')),
              subtitle: Text(context.tr('isApproved')),
              value: _isApprovedOrLicensed,
              onChanged: (val) => setState(() => _isApprovedOrLicensed = val),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 12),
            Text(
              context.tr('socialLinks'),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _facebookController,
              decoration: const InputDecoration(
                labelText: 'Facebook URL',
                prefixIcon: Icon(Icons.facebook_rounded),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _instagramController,
              decoration: const InputDecoration(
                labelText: 'Instagram URL',
                prefixIcon: Icon(Icons.camera_alt_rounded),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _twitterController,
              decoration: const InputDecoration(
                labelText: 'Twitter / X URL',
                prefixIcon: Icon(Icons.alternate_email_rounded),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.green, size: 22),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: TextStyle(
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
