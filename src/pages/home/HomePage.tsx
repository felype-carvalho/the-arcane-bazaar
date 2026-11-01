import { useInterfaceTranslation } from '@/app/i18n'
import { ArrowDownToLine, ArrowRight, BookOpen, ChevronDown, Coins, FileText, Globe, Scale, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import heroBackground from './assets/hero-background.png'
import adventureLandscape from './assets/adventure-landscape.png'
import catalogPortuguese from './assets/catalog-pt-BR.png'
import catalogEnglish from './assets/catalog-en-US.png'

const features = [
    { id: 'catalog', icon: Search },
    { id: 'pricing', icon: Coins },
    { id: 'profiles', icon: Users },
    { id: 'sources', icon: FileText },
] as const

const benefits = [
    { id: 'language', icon: Globe },
    { id: 'campaigns', icon: Users },
    { id: 'content', icon: FileText },
    { id: 'backup', icon: ArrowDownToLine },
] as const

const catalogLinkClass = 'inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-gold-bright/70 bg-linear-to-b from-[#f3cc69] to-[#c99a3c] px-6 py-3 font-serif text-lg font-bold text-[#171108] shadow-[inset_0_1px_0_#fff4bd66,0_4px_24px_#c69b3214] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright'

export function HomePage() {
    const { t, language } = useInterfaceTranslation()

    return (
        <main aria-label={t('navigation.home')} className="arcane-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#080d16] text-cream motion-reduce:scroll-auto">
            <section aria-labelledby="home-title" className="relative isolate flex min-h-[480px] items-center justify-center bg-[#080d16] px-5 py-12 text-center sm:min-h-[410px] sm:px-8 lg:min-h-[390px]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 aspect-[3/1] min-h-full w-full">
                    <img src={heroBackground} alt="" width={2172} height={724} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-linear-to-b from-[#060913]/20 via-[#060913]/35 to-[#060913]/40" />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent via-[#080d16]/65 to-[#080d16]" />
                </div>
                <div className="mx-auto max-w-[920px] mt-20">
                    <h1 id="home-title" className="font-serif text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.08] font-semibold tracking-tight text-[#faf5e9] [text-shadow:0_2px_18px_#03050dcc]">{t('home.title').split('D&D')[0]}
                        <span className="text-gold-bright">D&D</span>
                        {t('home.title').split('D&D')[1]}</h1>
                    <p className="mx-auto mt-4 max-w-[760px] text-base leading-relaxed text-silver [text-shadow:0_2px_10px_#03050d] sm:text-lg">{t('home.description')}</p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                        <Link to="/catalog" className={`${catalogLinkClass} min-w-[230px] font-sans text-base`}><BookOpen size={21} aria-hidden="true" />{t('home.explore')}</Link>
                        <a href="#home-resources" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium text-violet-200 [text-shadow:0_2px_10px_#03050d] hover:text-violet-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright">{t('home.discover')}<ChevronDown size={18} aria-hidden="true" /></a>
                    </div>
                </div>
            </section>
            <div className="relative z-10 mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12 mt-20">

                <section id="home-resources" aria-label={t('home.resources')} className="relative z-10 grid scroll-mt-6 gap-x-12 md:grid-cols-2">
                    {features.map(({ id, icon: Icon }, index) => (
                        <article key={id} className={`flex gap-5 py-6 ${index < 2 ? 'border-b border-gold/60' : 'border-b border-gold/30 md:border-0'}`}>
                            <div className="grid size-16 shrink-0 place-items-center rounded-full border border-gold bg-violet-400/5 text-gold-bright"><Icon size={29} strokeWidth={1.6} aria-hidden="true" /></div>
                            <div><h2 className="font-serif text-2xl font-semibold text-[#faf5e9]">{t(`home.features.${id}.title`)}</h2><p className="mt-1 text-sm leading-relaxed text-silver sm:text-base">{t(`home.features.${id}.description`)}</p></div>
                        </article>
                    ))}
                </section>

                <figure className="mt-6 overflow-hidden rounded-xl border border-slate-600/50 bg-linear-to-b from-slate-800/40 to-transparent p-2 shadow-[0_0_40px_#0004] sm:p-3">
                    <img src={language === 'pt-BR' ? catalogPortuguese : catalogEnglish} alt={t('home.catalogImageAlt')} width={1440} height={900} loading="lazy" className="block h-auto w-full rounded-md border border-slate-600/30" />
                </figure>

                <section aria-label={t('home.benefits')} className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
                    {benefits.map(({ id, icon: Icon }, index) => (
                        <article key={id} className={`flex gap-4 ${index > 0 ? 'lg:border-l lg:border-gold/40 lg:pl-5' : ''} lg:pr-4`}>
                            <div className="grid size-14 shrink-0 place-items-center rounded-full border border-gold text-violet-300"><Icon size={27} strokeWidth={1.6} aria-hidden="true" /></div>
                            <div><h2 className="font-serif text-base font-semibold text-[#faf5e9]">{t(`home.benefits.${id}.title`)}</h2><p className="mt-1 text-sm leading-relaxed text-silver">{t(`home.benefits.${id}.description`)}</p></div>
                        </article>
                    ))}
                </section>

                <section aria-labelledby="home-merchant" className="flex flex-wrap items-center gap-5 rounded-lg border border-slate-600/50 bg-panel px-6 py-5 sm:gap-7">
                    <Scale size={48} className="shrink-0 text-slate-500" aria-hidden="true" />
                    <div className="min-w-0 flex-1 basis-56"><h2 id="home-merchant" className="font-serif text-2xl font-semibold">{t('home.merchantTitle')}</h2><p className="mt-1 text-sm leading-relaxed text-silver">{t('home.merchantDescription')}</p></div>
                </section>
            </div>
            <section aria-labelledby="home-next-adventure" className="relative isolate mt-6 flex min-h-[340px] flex-col items-center justify-center px-5 py-8 text-center sm:min-h-[300px]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-full w-full lg:h-[calc(100%+5rem)]">
                    <img src={adventureLandscape} alt="" width={2172} height={724} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-linear-to-b from-[#060913]/20 via-[#060913]/45 to-[#060913]/55" />
                    <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-[#080d16] via-[#080d16]/60 to-transparent" />
                </div>
                <h2 id="home-next-adventure" className="font-serif text-3xl font-semibold tracking-tight text-[#faf5e9] [text-shadow:0_2px_14px_#03050d] sm:text-5xl">{t('home.nextAdventure')}</h2>
                <div aria-hidden="true" className="my-5 flex w-full max-w-[340px] items-center gap-3 text-gold-bright"><span className="h-px flex-1 bg-linear-to-r from-transparent to-gold" />◇<span className="h-px flex-1 bg-linear-to-l from-transparent to-gold" /></div>
                <Link to="/catalog" className={catalogLinkClass}>{t('home.openCatalog')}<ArrowRight size={18} aria-hidden="true" /></Link>
                <p className="mt-5 text-sm text-silver [text-shadow:0_2px_8px_#03050d]">{t('home.disclaimer')}</p>
            </section>
        </main>
    )
}
