import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicContactCopy } from '@/components/public-contact-copy';
import { getPublicProfile } from '@/services/card-service';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type ProfileAnalysis = {
  recentUpdates?: string[];
  careerHighlights?: string[];
  domainSignals?: Array<{
    name: string;
    evidence?: string;
  }>;
  persona?: {
    title?: string;
    description?: string;
  };
  needs?: string[];
};

function parseJsonList(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseProfileAnalysis(value?: string): ProfileAnalysis {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as ProfileAnalysis) : {};
  } catch {
    return {};
  }
}

function parseContactHandle(rawText?: string | null) {
  const text = rawText?.trim();
  if (!text) return '';
  return text.replace(/^联系方式[:：]\s*/, '').trim();
}

function firstLetter(value: string) {
  return (value.trim()[0] || 'A').toUpperCase();
}

export default async function PublicProfilePage({ params }: RouteContext) {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);

  if (!profile) notFound();

  const name = profile.user.displayName || profile.headline.split('·')[0]?.trim() || 'Livelink Agent';
  const tags = parseJsonList(profile.tagsJson).slice(0, 6);
  const offers = parseJsonList(profile.offersJson).slice(0, 4);
  const wants = parseJsonList(profile.wantsJson).slice(0, 4);
  const skills = parseJsonList(profile.skillsJson);
  const interests = parseJsonList(profile.interestsJson);
  const analysis = parseProfileAnalysis(profile.analysisJson);
  const recentUpdates = (analysis.recentUpdates ?? []).slice(0, 2);
  const highlights = ((analysis.careerHighlights ?? []).length > 0 ? analysis.careerHighlights ?? [] : [...skills, ...offers]).slice(0, 4);
  const domains =
    (analysis.domainSignals ?? []).length > 0
      ? (analysis.domainSignals ?? []).slice(0, 4)
      : [...tags, ...interests].slice(0, 4).map((domain) => ({ name: domain, evidence: '公开资料信号' }));
  const needs = ((analysis.needs ?? []).length > 0 ? analysis.needs ?? [] : wants).slice(0, 4);
  const contactHandle = parseContactHandle(profile.agent.sources[0]?.rawText);

  return (
    <main className="public-profile-page">
      <section className="public-profile-hero">
        <nav className="public-profile-nav" aria-label="公开主页导航">
          <Link href="/" className="public-brand">
            Livelink
          </Link>
          <Link href="/" className="public-nav-action">
            也生成我的分身
          </Link>
        </nav>

        <div className="public-profile-identity">
          <span className="public-avatar">{firstLetter(name)}</span>
          <div>
            <p className="public-kicker">PUBLIC DIGITAL CLONE</p>
            <h1>{name}</h1>
            <p>{profile.headline}</p>
          </div>
        </div>

        <p className="public-profile-bio">{profile.bio}</p>

        <div className="public-profile-tags">
          {(tags.length > 0 ? tags : ['Livelink Agent']).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="public-hero-actions">
          <a href="#contact" className="public-primary-action">
            联系我
          </a>
          <Link href="/" className="public-secondary-action">
            也生成我的分身
          </Link>
        </div>
      </section>

      <section className="public-profile-grid">
        <article className="public-profile-panel">
          <span>RECENT</span>
          <h2>近况流</h2>
          {(recentUpdates.length > 0 ? recentUpdates : [profile.bio]).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </article>

        <article className="public-profile-panel">
          <span>LINK STYLE</span>
          <h2>{analysis.persona?.title ?? tags[0] ?? '连接风格'}</h2>
          <p>{analysis.persona?.description ?? '可以从公开资料里的能力、项目和合作需求开始聊起。'}</p>
        </article>

        <article className="public-profile-panel wide">
          <span>HIGHLIGHTS</span>
          <h2>履历亮点</h2>
          <div className="public-highlight-list">
            {(highlights.length > 0 ? highlights : ['资料还在持续补充中']).map((item, index) => (
              <p key={`${item}-${index}`}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                {item}
              </p>
            ))}
          </div>
        </article>

        <article className="public-profile-panel">
          <span>DOMAINS</span>
          <h2>领域画像</h2>
          <div className="public-domain-list">
            {(domains.length > 0 ? domains : [{ name: '待补充', evidence: '公开资料不足' }]).map((domain) => (
              <p key={domain.name}>
                <b>{domain.name}</b>
                <small>{domain.evidence}</small>
              </p>
            ))}
          </div>
        </article>

        <article className="public-profile-panel" id="contact">
          <span>CONNECT</span>
          <h2>联系我</h2>
          <PublicContactCopy contactHandle={contactHandle} />
          <div className="public-goals">
            <b>我能提供</b>
            <p>{offers.join('、') || '资料还在补充中'}</p>
            <b>我正在寻找</b>
            <p>{needs.join('、') || '新的交流和合作机会'}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
