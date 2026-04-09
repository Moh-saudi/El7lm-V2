import os

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'import { GlobalReach }' in line:
        continue
        
    if line.strip() == '{/* HOW TO USE THE PLATFORM */}':
        skip = True
        new_lines.append('        {/* HOW TO USE THE PLATFORM - Premium Grid */}\n')
        new_lines.append('''        <section id="how-to-use" className="reveal" style={{
          background: dark ? '#0a0f1d' : '#fcfdfd',
          padding: '8rem 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decorative glows */}
          <div style={{position:'absolute',top:'-10%',right:'-5%',width:'50%',height:'50%',background:`${theme.primary}10`,filter:'blur(120px)',borderRadius:'50%',pointerEvents:'none'}}></div>
          <div style={{position:'absolute',bottom:'-10%',left:'-5%',width:'50%',height:'50%',background: dark ? '#bdc4ef10' : '#4f46e510',filter:'blur(120px)',borderRadius:'50%',pointerEvents:'none'}}></div>

          <div className="ct" style={{position:'relative', zIndex:10}}>
            {/* Header */}
            <div style={{textAlign:'center',marginBottom:'5rem'}}>
               <span style={{display:'inline-flex',alignItems:'center',gap:'.75rem',background:`${theme.primary}15`,color:theme.primary,padding:'.6rem 1.8rem',borderRadius:'9999px',fontSize:'.9rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.15em',marginBottom:'2rem', border: `1px solid ${theme.primary}30`}}>
                <span className="material-symbols-outlined" style={{fontSize: '1.25rem'}}>rocket_launch</span>
                {isRTL ? 'دليل الانطلاق الذكي' : 'Smart Start Guide'}
              </span>
              <h2 className="st" style={{fontSize:'4.5rem',marginBottom:'1.5rem',color:theme.text, fontWeight: 900, letterSpacing: '-0.03em'}}>{t.howTitle}</h2>
              <p style={{color:theme.subText,fontSize:'1.35rem',maxWidth:'45rem',margin:'0 auto',lineHeight:1.8}}>{t.howSub}</p>
            </div>

            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              marginBottom: '6rem'
            }}>
              {(t.howSteps || []).map((step: any, idx: number) => (
                <div 
                  key={idx}
                  className="group"
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '24px',
                    padding: '3rem 2.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: dark ? '0 20px 40px rgba(0,0,0,0.2)' : '0 15px 35px rgba(0,0,0,0.03)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-10px)';
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.boxShadow = `0 30px 60px ${theme.glow}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.boxShadow = dark ? '0 20px 40px rgba(0,0,0,0.2)' : '0 15px 35px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{
                    position: 'absolute', inset: 0, 
                    background: `linear-gradient(135deg, ${theme.primary}05, transparent)`,
                    opacity: 0, transition: 'opacity 0.4s', pointerEvents: 'none'
                  }} className="hover-bg-fade" />
                  
                  <div style={{
                    position: 'absolute', top: '1.5rem', right: isRTL ? 'auto' : '1.5rem', left: isRTL ? '1.5rem' : 'auto',
                    fontSize: '4.5rem', fontWeight: 900, color: `${theme.primary}10`, lineHeight: 1, fontFamily: 'Space Grotesk, sans-serif'
                  }}>
                    {(idx + 1).toString().padStart(2, '0')}
                  </div>

                  <div style={{
                    width: '64px', height: '64px', borderRadius: '16px',
                    background: `${step.color}15`, border: `1px solid ${step.color}30`,
                    color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '2rem', position: 'relative', zIndex: 2
                  }}>
                    <span className="material-symbols-rounded" style={{fontSize: '32px'}}>{step.icon}</span>
                  </div>

                  <h3 className="hl" style={{ color: theme.text, marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 900, position: 'relative', zIndex: 2 }}>{step.title}</h3>
                  <p style={{ fontSize: '1.05rem', color: theme.subText, lineHeight: 1.7, position: 'relative', zIndex: 2 }}>{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Bottom Call to Action Card */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
              <div 
                style={{
                  background: `linear-gradient(135deg, ${theme.cardBg}, ${dark ? '#111827' : '#ffffff'})`,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '24px',
                  padding: '3.5rem',
                  maxWidth: '750px',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: dark ? '0 15px 40px rgba(0,0,0,0.5)' : '0 15px 40px rgba(0,0,0,0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{position:'absolute', top:0, left:0, bottom:0, width:'6px', background: 'linear-gradient(to bottom, #fdba45, #10b981)'}}></div>
                <h3 className="hl" style={{fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: theme.text}}>
                  {isRTL ? 'اكتشف الفرص المتاحة' : 'Discover Available Opportunities'}
                </h3>
                <p style={{color: theme.subText, fontSize: '1.25rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto 2.5rem'}}>
                  {isRTL ? 'تصفح آلاف الفرص من الأندية والأكاديميات والبطولات المتاحة وتقدم بنقرة واحدة.' : 'Browse thousands of opportunities from clubs, academies, and tournaments and apply with one click.'}
                </p>
                <a 
                  href="/auth/register" 
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                    padding: '1.25rem 3.5rem', borderRadius: '16px', background: theme.btnGradient,
                    color: 'white', fontWeight: 800, fontSize: '1.25rem', textDecoration: 'none',
                    boxShadow: `0 10px 30px ${theme.glow}`, transition: 'transform 0.2s', border: 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isRTL ? 'ابدأ كرياضي الآن' : 'Start As Athlete Now'}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform: isRTL ? 'rotate(180deg)' : 'none'}}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            </div>
            
          </div>
        </section>
\n''')
        continue
    
    if skip and line.strip() == '{/* FOR WHOM SECTION */}':
        skip = False
        
    if line.strip() == '{/* Global Reach Section */}':
        skip = True
        continue
        
    if skip and line.strip() == '{/* CONTACT */}':
        skip = False
        new_lines.append(line)
        continue
        
    if "icon: <Globe className=" in line and "'العالمية'" in line:
        continue
        
    if not skip:
        new_lines.append(line)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Replacement completed!')
