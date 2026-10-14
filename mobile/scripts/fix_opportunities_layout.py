path = r'd:\El7lm-V2\mobile\lib\screens\opportunities\opportunities_screen.dart'
lines = open(path, encoding='utf-8').readlines()

# Replace Tab 1 (lines 387 to 401)
t1_replacement = [
    '                                const SizedBox(width: 6),\n',
    '                                Flexible(\n',
    '                                  child: FittedBox(\n',
    '                                    fit: BoxFit.scaleDown,\n',
    '                                    child: Text(\n',
    "                                      context.tr('availableOpportunities'),\n",
    '                                      maxLines: 1,\n',
    '                                      style: TextStyle(\n',
    '                                        fontSize: 12.5,\n',
    '                                        fontWeight: selectedTab == 0\n',
    '                                            ? FontWeight.bold\n',
    '                                            : FontWeight.normal,\n',
    '                                        color: selectedTab == 0\n',
    '                                            ? AppColors.navy\n',
    '                                            : AppColors.muted,\n',
    '                                      ),\n',
    '                                    ),\n',
    '                                  ),\n',
    '                                ),\n'
]

# Replace Tab 2 (lines 435 to 448)
t2_replacement = [
    '                                const SizedBox(width: 6),\n',
    '                                Flexible(\n',
    '                                  child: FittedBox(\n',
    '                                    fit: BoxFit.scaleDown,\n',
    '                                    child: Text(\n',
    "                                      context.tr('myApplicationsHistory'),\n",
    '                                      maxLines: 1,\n',
    '                                      style: TextStyle(\n',
    '                                        fontSize: 12.5,\n',
    '                                        fontWeight: selectedTab == 1\n',
    '                                            ? FontWeight.bold\n',
    '                                            : FontWeight.normal,\n',
    '                                        color: selectedTab == 1\n',
    '                                            ? AppColors.navy\n',
    '                                            : AppColors.muted,\n',
    '                                      ),\n',
    '                                    ),\n',
    '                                  ),\n',
    '                                ),\n'
]

# Check targets
assert 'availableOpportunities' in lines[389], f'line 389 unexpected: {lines[389]}'
assert 'myApplicationsHistory' in lines[437], f'line 437 unexpected: {lines[437]}'
assert 'height: 100' in lines[528], f'line 528 unexpected: {lines[528]}'
assert 'width: 80' in lines[558], f'line 558 unexpected: {lines[558]}'
assert 'fontSize: 32' in lines[579], f'line 579 unexpected: {lines[579]}'

# Country card updates
lines[528] = '                      height: 108,\n'
lines[558] = '                                width: 86,\n'
lines[579] = '                                      style: const TextStyle(fontSize: 26),\n'

# Country text wrap in FittedBox
country_text_replacement = [
    '                                    const SizedBox(height: 4),\n',
    '                                    FittedBox(\n',
    '                                      fit: BoxFit.scaleDown,\n',
    '                                      child: Text(\n',
    '                                        context.tr(\'country.${c[\'id\']}\'),\n',
    '                                        maxLines: 2,\n',
    '                                        textAlign: TextAlign.center,\n',
    '                                        style: TextStyle(\n',
    '                                          fontSize: 11,\n',
    '                                          fontWeight: isSelected\n',
    '                                              ? FontWeight.w900\n',
    '                                              : FontWeight.bold,\n',
    '                                          color: isSelected\n',
    '                                              ? AppColors.green\n',
    '                                              : AppColors.ink,\n',
    '                                        ),\n',
    '                                      ),\n',
    '                                    ),\n'
]
lines[581:595] = country_text_replacement

# Replace Tab 2 first (higher index)
lines[435:448] = t2_replacement

# Replace Tab 1
lines[387:401] = t1_replacement

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Updated opportunities_screen.dart successfully!')
