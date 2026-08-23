import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../widgets/account_type_football_icon.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/company_footer.dart';
import '../../widgets/language_switcher.dart';

class AccountTypeScreen extends StatelessWidget {
  const AccountTypeScreen({super.key, required this.onSelected});

  final ValueChanged<AccountType> onSelected;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF7FAFF), Color(0xFFEEF8F3)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const BrandLogo(size: 74),
                      const PositionedDirectional(
                        end: 16,
                        top: 0,
                        child: LanguageSwitcher(compact: true),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 26, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr('accountTypeTitle'),
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr('accountTypeText'),
                        style: const TextStyle(
                          color: AppColors.muted,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 18),
                      const FreeAccountsBanner(),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                sliver: SliverList.separated(
                  itemCount: AccountType.values.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final type = AccountType.values[index];
                    return Card(
                      child: InkWell(
                        onTap: () => onSelected(type),
                        borderRadius: BorderRadius.circular(20),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              AccountTypeFootballIcon(type: type),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      type.localizedName(context),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16,
                                      ),
                                    ),
                                    Text(
                                      type.localizedDescription(context),
                                      style: const TextStyle(
                                        color: AppColors.muted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                size: 16,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SliverToBoxAdapter(child: CompanyFooter()),
            ],
          ),
        ),
      ),
    );
  }
}
