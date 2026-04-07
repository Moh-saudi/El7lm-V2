'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import ReactPlayer from 'react-player';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CirclePlay,
  Cpu,
  MoonStar,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import styles from './page.module.css';
import { content, logos, type LandingLang } from './content';

const sectionMotion = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: 'easeOut' },
} as const;

export default function LabsLandingPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [lang, setLang] = useState<LandingLang>('ar');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeHero, setActiveHero] = useState(0);
  const [chatInput, setChatInput] = useState(content.ar.slides[0].prompt);
  const [chatTitle, setChatTitle] = useState(content.ar.slides[0].responseTitle);
  const [chatAnswer, setChatAnswer] = useState(content.ar.slides[0].response);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  const t = content[lang];

  useEffect(() => {
    setActiveHero(0);
    setActiveTestimonial(0);
    setChatInput(content[lang].slides[0].prompt);
    setChatTitle(content[lang].slides[0].responseTitle);
    setChatAnswer(content[lang].slides[0].response);
    setChatError('');
  }, [lang]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % t.testimonials.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [t.testimonials.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHero((current) => (current + 1) % t.slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [t.slides.length]);

  async function requestAssistantReply(prompt: string, slideIndex = activeHero) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    setChatLoading(true);
    setChatError('');

    try {
      const response = await fetch('/api/labs-landing/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          lang,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Assistant request failed');
      }

      setChatTitle(payload.title || t.slides[slideIndex].responseTitle);
      setChatAnswer(payload.answer || t.slides[slideIndex].response);
    } catch {
      setChatTitle(t.slides[slideIndex].responseTitle);
      setChatAnswer(t.slides[slideIndex].response);
      setChatError(
        lang === 'ar'
          ? 'تعذر إتمام الطلب الآن، لذلك عرضنا لك المسار المقترح المبدئي.'
          : 'The live assistant is unavailable right now, so a guided fallback response is shown instead.'
      );
    } finally {
      setChatLoading(false);
    }
  }

  function handleExampleSelect(index: number) {
    const slide = t.slides[index];
    setActiveHero(index);
    setChatInput(slide.prompt);
    setChatTitle(slide.responseTitle);
    setChatAnswer(slide.response);
    void requestAssistantReply(slide.prompt, index);
  }

  function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestAssistantReply(chatInput, activeHero);
  }

  return (
    <main className={`${styles.page} ${darkMode ? styles.dark : styles.light}`} dir={t.dir}>
      <div className={styles.backgroundMesh} />

      <section className={styles.heroSection}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>EL7LM</div>
            <div className={styles.brandSub}>EL7LM + VLab Sports + Hagzz</div>
          </div>

          <nav className={styles.nav}>
            <a href="#services">{t.nav[0]}</a>
            <a href="#audiences">{t.nav[1]}</a>
            <a href="#metrics">{t.nav[2]}</a>
            <a href="#pricing">{t.nav[3]}</a>
          </nav>

          <div className={styles.topbarActions}>
            <div className={styles.langSwitch}>
              <button
                type="button"
                className={lang === 'ar' ? styles.langActive : styles.langButton}
                onClick={() => setLang('ar')}
              >
                AR
              </button>
              <button
                type="button"
                className={lang === 'en' ? styles.langActive : styles.langButton}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={() => setDarkMode((value) => !value)}
              aria-label="Toggle theme"
            >
              {darkMode ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </button>
            <Link href="/" className={styles.ghostButton}>
              {t.current}
            </Link>
            <Link href="/contact" className={styles.primaryButton}>
              {t.start}
            </Link>
          </div>
        </header>

        <div className={styles.heroGrid}>
          <motion.div
            className={styles.heroCopy}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className={styles.eyebrow}>
              <Sparkles size={16} />
              {t.eyebrow}
            </div>
            <h1 className={styles.heroTitle}>
              {t.titleA}
              <span>{t.titleB}</span>
            </h1>
            <p className={styles.heroText}>{t.hero}</p>

            <div className={styles.heroActions}>
              <a href="#services" className={styles.primaryButton}>
                {t.heroButtons[0]}
                <ArrowRight size={18} />
              </a>
              <a href="#founder" className={styles.secondaryButton}>
                <CirclePlay size={18} />
                {t.heroButtons[1]}
              </a>
            </div>

            <div className={styles.heroStats}>
              {t.stats.map((stat) => (
                <div key={stat.label} className={styles.statCard}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.heroVariants}>
              {t.slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`${styles.heroVariantButton} ${
                    index === activeHero ? styles.heroVariantActive : ''
                  }`}
                  onClick={() => setActiveHero(index)}
                >
                  {slide.title}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            className={styles.heroVisual}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className={styles.visualShell}>
              <div className={styles.visualTopbar}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.visualContent}>
                <div className={styles.visualBadge}>Sports Intelligence Platform</div>
                <h2>Discovery. Analysis. Booking.</h2>
                <p>{t.heroPanel}</p>
                <div className={styles.orbitArea}>
                  <div className={styles.heroVideoWrap}>
                    <ReactPlayer
                      url={t.slides[activeHero].video}
                      width="100%"
                      height="100%"
                      playing
                      muted
                      loop
                      playsinline
                      controls={false}
                      className={styles.heroVideoPlayer}
                    />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={t.slides[activeHero].image}
                      src={t.slides[activeHero].image}
                      alt={t.slides[activeHero].title}
                      className={styles.heroImage}
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 0.34, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.45 }}
                    />
                  </AnimatePresence>
                  <div className={styles.centerCore}>
                    <Bot size={30} />
                  </div>
                  <div className={styles.ring} />
                  <div className={`${styles.orbitNode} ${styles.nodeTop}`}>EL7LM</div>
                  <div className={`${styles.orbitNode} ${styles.nodeRight}`}>VLab Sports</div>
                  <div className={`${styles.orbitNode} ${styles.nodeBottom}`}>Hagzz</div>
                  <div className={`${styles.orbitNode} ${styles.nodeLeft}`}>Growth</div>
                </div>
                <div className={styles.heroNarrative}>
                  <strong>{t.slides[activeHero].title}</strong>
                  <p>{t.slides[activeHero].subtitle}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className={styles.logoTicker}>
          <motion.div
            className={styles.logoTrack}
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
          >
            {[...logos, ...logos].map((logo, index) => (
              <div key={`${logo}-${index}`} className={styles.logoChip}>
                {logo}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.section className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>{t.aiKicker}</span>
          <h2>{t.aiTitle}</h2>
          <p>{t.aiText}</p>
        </div>

        <div className={styles.aiSectionGrid}>
            <div className={styles.aiExamplesColumn}>
              <div className={styles.aiSidebarTitle}>{t.aiSidebarTitle}</div>
              {t.slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  className={`${styles.aiExampleButton} ${
                    index === activeHero ? styles.aiExampleActive : ''
                  }`}
                  onClick={() => handleExampleSelect(index)}
                >
                  {slide.title}
                </button>
              ))}
            </div>

          <div className={styles.aiShowcaseLarge}>
            <div className={styles.chatWindow}>
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderTitle}>{t.aiAssistant}</div>
                <div className={styles.chatHeaderMeta}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className={styles.chatBody}>
                <div className={styles.userBubbleRow}>
                  <div className={styles.userBubble}>
                    <SearchBarIcon />
                    <span>{t.slides[activeHero].prompt}</span>
                  </div>
                </div>

                <div className={styles.assistantBubbleRow}>
                  <div className={styles.aiReplyBot}>
                    <Bot size={16} />
                  </div>
                  <div className={styles.assistantBubble}>
                    <strong>{chatTitle}</strong>
                    <p>{chatAnswer}</p>
                    <div className={styles.aiReplyTags}>
                      <span>EL7LM</span>
                      <span>VLab Sports</span>
                      <span>Hagzz</span>
                    </div>
                  </div>
                </div>

                {chatLoading && (
                  <div className={styles.assistantBubbleRow}>
                    <div className={styles.aiReplyBot}>
                      <Bot size={16} />
                    </div>
                    <div className={styles.chatThinking}>
                      {lang === 'ar' ? 'جاري إعداد الرد المناسب...' : 'Preparing the most relevant reply...'}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.chatSectionLabel}>{t.aiSuggestionsTitle}</div>
              <div className={styles.chatSuggestions}>
                {t.slides.map((slide, index) => (
                  <button
                    key={`${slide.title}-pill`}
                    type="button"
                    className={`${styles.chatSuggestion} ${
                      index === activeHero ? styles.chatSuggestionActive : ''
                    }`}
                    onClick={() => handleExampleSelect(index)}
                  >
                    {slide.title}
                  </button>
                ))}
              </div>

              {chatError ? <div className={styles.chatError}>{chatError}</div> : null}

              <form className={styles.chatComposer} onSubmit={handleChatSubmit}>
                <label className={styles.chatComposerField}>
                  <SearchBarIcon />
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder={t.aiComposerPlaceholder}
                    className={styles.chatInput}
                  />
                </label>
                <button
                  type="submit"
                  className={styles.chatSendButton}
                  aria-label="Send prompt"
                  disabled={chatLoading}
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Core Positioning</span>
          <h2>{t.coreTitle}</h2>
          <p>{t.coreText}</p>
        </div>
        <div className={styles.pillarsGrid}>
          {t.pillars.map((pillar) => (
            <article key={pillar.id} className={styles.pillarCard}>
              <span className={styles.pillarId}>{pillar.id}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
              <a href="#services" className={styles.inlineCta}>
                {t.detailsCta}
                <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section id="founder" className={styles.section} {...sectionMotion}>
        <div className={styles.founderCard}>
          <div className={styles.sectionKicker}>{t.founderLabel}</div>
          <h2>{t.founderTitle}</h2>
          <p>{t.founderBody}</p>
          <p>{t.founderClosing}</p>
          <div className={styles.founderActions}>
            <a href="#services" className={styles.primaryButton}>
              {t.founderActions[0]}
            </a>
            <a href="#audiences" className={styles.ghostButton}>
              {t.founderActions[1]}
            </a>
          </div>
        </div>
      </motion.section>

      <motion.section id="services" className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Services</span>
          <h2>{t.servicesTitle}</h2>
          <p>{t.servicesText}</p>
        </div>
        <div className={styles.servicesGrid}>
          {t.services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.article
                key={service.title}
                className={styles.serviceCard}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.serviceImageWrap}>
                  <img src={service.image} alt={service.title} className={styles.serviceImage} />
                </div>
                <div className={styles.serviceVideoWrap}>
                  <ReactPlayer
                    url={service.video}
                    width="100%"
                    height="100%"
                    playing
                    muted
                    loop
                    playsinline
                    controls={false}
                    className={styles.serviceVideoPlayer}
                  />
                </div>
                <div className={styles.serviceHead}>
                  <div className={styles.serviceBadge}>
                    <Icon size={16} />
                    <span>{service.badge}</span>
                  </div>
                  <ChevronRight size={18} />
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul className={styles.checkList}>
                  {service.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check size={16} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <a href="/contact" className={styles.inlineCta}>
                  {service.cta}
                  <ArrowRight size={16} />
                </a>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      <motion.section id="audiences" className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Audience</span>
          <h2>{t.audienceTitle}</h2>
          <p>{t.audienceText}</p>
        </div>
        <div className={styles.audienceGrid}>
          {t.audiences.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                className={styles.audienceCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
              >
                <div className={styles.audienceIcon}>
                  <Icon size={20} />
                </div>
                <div className={styles.audienceIndex}>0{index + 1}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <a href="/contact" className={styles.inlineCta}>
                  {item.action}
                  <ArrowRight size={16} />
                </a>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      <motion.section id="metrics" className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Why It Works</span>
          <h2>{t.metricsTitle}</h2>
        </div>
        <div className={styles.metricsGrid}>
          {t.metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className={styles.metricFeature}>
                <div className={styles.metricIcon}>
                  <Icon size={20} />
                </div>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            );
          })}
        </div>
      </motion.section>

      <motion.section className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Testimonials</span>
          <h2>{t.testimonialsTitle}</h2>
        </div>
        <div className={styles.testimonialWrap}>
          <div className={styles.testimonialTabs}>
            {t.testimonials.map((item, index) => (
              <button
                key={item.author}
                type="button"
                className={`${styles.testimonialTab} ${
                  index === activeTestimonial ? styles.testimonialTabActive : ''
                }`}
                onClick={() => setActiveTestimonial(index)}
              >
                {item.author}
              </button>
            ))}
          </div>
          <div className={styles.testimonialStage}>
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={activeTestimonial}
                className={styles.testimonialCard}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.35 }}
              >
                <p>{t.testimonials[activeTestimonial].quote}</p>
                <footer>
                  <strong>{t.testimonials[activeTestimonial].author}</strong>
                  <span>{t.testimonials[activeTestimonial].role}</span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      <motion.section id="pricing" className={styles.section} {...sectionMotion}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Packaging</span>
          <h2>{t.pricingTitle}</h2>
          <p>{t.pricingText}</p>
        </div>
        <div className={styles.pricingGrid}>
          {t.plans.map((plan) => (
            <article
              key={plan.name}
              className={`${styles.planCard} ${plan.featured ? styles.planFeatured : ''}`}
            >
              <div className={styles.planHead}>
                <span>{plan.name}</span>
                {plan.featured && <strong>{t.recommended}</strong>}
              </div>
              <h3>{plan.note}</h3>
              <ul className={styles.checkList}>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a href="/contact" className={styles.inlineCta}>
                {plan.cta}
                <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section className={styles.section} {...sectionMotion}>
        <div className={styles.finalCta}>
          <div>
            <span className={styles.sectionKicker}>Next Step</span>
            <h2>{t.finalTitle}</h2>
            <p>{t.finalText}</p>
          </div>
          <div className={styles.ctaGroup}>
            <Link href="/" className={styles.ghostButton}>
              {t.finalActions[0]}
            </Link>
            <Link href="/contact" className={styles.primaryButton}>
              {t.finalActions[1]}
              <Cpu size={18} />
            </Link>
          </div>
        </div>
      </motion.section>
    </main>
  );
}

function SearchBarIcon() {
  return (
    <span className={styles.searchPromptIcon}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </span>
  );
}
