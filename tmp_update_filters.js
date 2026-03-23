const fs = require('fs');
const path = require('path');

const filePath = 'd:\\el7lm-backup\\src\\app\\dashboard\\admin\\ai-messenger\\_components\\CampaignManager.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1">
                     <Label className="text-xs font-bold text-slate-700">4. قالب الحملة الحصرية</Label>`;

const replacement = `                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1">
                     <Label className="text-xs font-bold text-slate-700">2. تصفية الدولة</Label>
                     <Select onValueChange={setTargetCountry} defaultValue="all">
                        <SelectTrigger className="h-9 text-xs border-slate-200">
                           <SelectValue placeholder="اختر الدولة..." />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                           <SelectItem value="all">كل الدول ({users.length})</SelectItem>
                           {uniqueCountries.map((c, i) => (
                              <SelectItem key={i} value={c}>
                                 {getCountryFlag('', c)} {c} ({users.filter(u => u.country === c).length})
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1">
                     <Label className="text-xs font-bold text-slate-700">3. نوع الحملة</Label>
                     <Select onValueChange={setCampaignType} defaultValue="promo">
                        <SelectTrigger className="h-9 text-xs border-slate-200">
                           <SelectValue placeholder="اختر النوع..." />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                           <SelectItem value="promo">📢 ترويجية وإعلانات</SelectItem>
                           <SelectItem value="awareness">💡 توعية وإرشاد</SelectItem>
                           <SelectItem value="notification">🔔 تنبيهات وإشعارات</SelectItem>
                           <SelectItem value="administrative">📁 إدارية وخاصة</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="space-y-1">
                     <Label className="text-xs font-bold text-slate-700">4. قالب الحملة الحصرية</Label>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Filters updated successfully!');
} else {
    console.log('❌ EXACT match not found! Printing lines around 210-220 carefully:');
    const lines = content.split('\n');
    for (let i = 210; i <= 220; i++) {
        console.log(`${i}: ${JSON.stringify(lines[i])}`);
    }
}
