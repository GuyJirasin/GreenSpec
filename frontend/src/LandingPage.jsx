import React from "react";
import "./landing.css";
import { LanguageSwitcher, useLanguage } from "./i18n";

const asset = (name, extension = "svg") => `/assets/landing/${name}.${extension}`;
function Icon({ name, className = "" }) {
  return <img className={`lp-icon ${className}`} src={asset(name)} alt="" aria-hidden="true" />;
}
const teams = [
  { title: "Developers", icon: "imgBoxiconsBusiness", description: "Work towards lower-carbon targets and keep projects on track with clear material choices.", points: ["Compare embodied carbon", "Keep a clear decision record", "Understand cost and design choices"] },
  { title: "Consultants", icon: "imgGroup2", description: "Review specifications, compare materials and explain each recommendation with source references.", points: ["Review analysis in one place", "Follow source references", "Prepare clear client proposals"] },
  { title: "Procurement teams", icon: "imgGroup1", description: "Compare material choices with clear cost and carbon estimates before making a decision.", points: ["Compare material options easily", "Assess cost and carbon trade-offs", "Share approved material choices"] },
];
const steps = [
  ["imgFileText", "Upload Documents", "Add specifications, drawings or bills of quantities."],
  ["imgBarChart2", "Identify Hotspots", "See high-impact materials and opportunities in the analysis."],
  ["imgLightbulb", "Review Recommendations", "Compare lower-carbon options and their carbon and cost estimates."],
  ["imgClipboard", "Generate Revised Specification", "Review every choice, edit the wording and create a revised specification."],
];
const evidence = [
  ["imgBookOpen", "Traceable source references", "Follow each recommendation back to the project file and its source references."],
  ["imgBarChart", "Carbon and cost visibility", "See the estimated carbon and cost impact of each material option."],
  ["imgShieldCheck", "A clear review record", "Keep approved choices, edited wording and revision history together for your team."],
];

export default function LandingPage({ onEnter, configured, entering = false, entryError = "" }) {
  const { t } = useLanguage();
  const jumpTo = (id) => (event) => {
    event.preventDefault();
    const destination = document.getElementById(id);
    destination?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    destination?.focus({ preventScroll: true });
  };
  const demo = (className, icon = null) => <button className={`lp-button ${className}`} onClick={onEnter} disabled={entering}>{t(entering ? "Opening your workspace…" : "Try demo")}{icon}</button>;

  return <div className="figma-landing">
    <a className="lp-skip" href="#landing-content" onClick={jumpTo("landing-content")}>{t("Skip to content")}</a>
    <header className="lp-header">
      <a className="lp-brand" href="#landing" aria-label="GREEN SPEC home"><span className="lp-brand-mark"><Icon name="imgSvg1" /></span>GREEN SPEC</a>
      <nav aria-label="Main navigation"><LanguageSwitcher /><button className="lp-login" onClick={onEnter} disabled={entering}>{t(entering ? "Opening…" : "Enter app")}</button>{demo("lp-header-demo", <Icon name="imgSvg" />)}</nav>
    </header>
    <main id="landing-content" tabIndex={-1}>
      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-forest" aria-hidden="true"><img src={asset("imgPineWatt2Hzmz15WGikUnsplash2", "png")} alt="" /></div>
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">{t("SPECIFICATIONS FOR A LOWER CARBON BUILT ENVIRONMENT")}</p>
          <h1 id="lp-title">From specification review<br />to approval-ready<br />low-carbon revisions.</h1>
          <p className="lp-intro">{t("GREEN SPEC helps developers and consultants analyse building specifications, identify lower-carbon opportunities, and produce revised specifications with clear, evidence-based recommendations.")}</p>
          <div className="lp-hero-actions">{demo("lp-hero-demo", <Icon name="imgSvg2" />)}<a className="lp-button lp-outline lp-how" href="#how-it-works" onClick={jumpTo("how-it-works")}><Icon name="imgAntDesignPlayCircleFilled" />{t("See how it works")}</a></div>
          <ul className="lp-benefits" aria-label={t("Key benefits")}>
            <li><Icon name="imgGroup" />{t("Reduce embodied carbon")}</li>
            <li><Icon name="imgBasilStackOutline" />{t("Optimise material cost")}</li>
            <li><Icon name="imgVector" />{t("Get to approval faster")}</li>
          </ul>
        </div>
        <figure className="lp-preview"><img src={asset("img2133WDefault1", "png")} alt="GREEN SPEC analysis overview preview" fetchPriority="high" /></figure>
      </section>
      <section className="lp-teams" aria-labelledby="lp-team-title">
        <div className="lp-team-heading"><p className="lp-eyebrow">{t("BUILT FOR EVERY STAGE OF THE PROJECT")}</p><h2 id="lp-team-title">Value for your entire team</h2><p>{t("GREEN SPEC brings clarity to specification decisions, helping teams compare lower-carbon material choices, cost estimates and revised wording.")}</p></div>
        <div className="lp-team-grid">{teams.map((team, index) => <article className="lp-team-card" key={team.title}>
          <div className="lp-team-top"><div className={`lp-team-symbol lp-team-symbol-${index}`}><Icon name={team.icon} /></div><div><h3>{team.title}</h3><p>{t(team.description)}</p></div></div>
          <div className="lp-team-rule" aria-hidden="true"><Icon name={index === 2 ? "imgLine3" : "imgLine1"} /></div>
          <ul>{team.points.map(point => <li key={point}><Icon name="imgAkarIconsCircleCheckFill" />{t(point)}</li>)}</ul>
        </article>)}</div>
      </section>
      <section className="lp-workflow" id="how-it-works" aria-labelledby="lp-workflow-title" tabIndex={-1}>
        <p className="lp-eyebrow">{t("A CLEAR PATH TO LOWER-CARBON SPECIFICATIONS")}</p><h2 id="lp-workflow-title">From documents to decision-ready revisions</h2>
        <ol className="lp-steps">{steps.map(([icon, title, text], index) => <li key={title}>
          <div className="lp-step-heading"><span className="lp-step-symbol"><Icon name={icon} /></span><div><span className="lp-step-number">0{index + 1}</span><h3>{title}</h3></div></div><p>{t(text)}</p>
          {index < steps.length - 1 && <span className="lp-step-arrow"><Icon name="imgArrowRight" /></span>}
        </li>)}</ol>
      </section>
      <section className="lp-evidence" aria-labelledby="lp-evidence-title"><p className="lp-eyebrow">{t("TRUSTED INSIGHTS. CONFIDENT DECISIONS.")}</p><h2 id="lp-evidence-title">Built on evidence. Ready for<br className="lp-wide-break" /> real-world delivery.</h2>
        <div className="lp-evidence-grid">{evidence.map(([icon, title, text]) => <article key={title}><div className="lp-evidence-heading"><span><Icon name={icon} /></span><h3>{title}</h3></div><p>{t(text)}</p></article>)}</div>
      </section>
      <section className="lp-final" aria-labelledby="lp-final-title"><div><h2 id="lp-final-title">Turn your specifications into lower-carbon reality.</h2><p>{t("See how GREEN SPEC can support your next project.")}</p></div><div className="lp-final-actions">{demo("lp-final-demo", <span aria-hidden="true">→</span>)}<button className="lp-button lp-outline" onClick={onEnter} disabled={entering}>{t(entering ? "Opening your workspace…" : "Start a pilot")} <span aria-hidden="true">→</span></button></div></section>
      {entryError && <p className="lp-entry-error" role="alert">{t(entryError)}</p>}
    </main>
    <footer className="lp-footer"><strong>GREEN SPEC</strong><p>{t("MVP: analysis uses supported sample files and illustrative carbon and cost estimates. Review source documents before using the results.")}</p><p>{t("Your workspace is saved in this browser. Use the same browser profile to return to it.")}</p>{!configured && <p>{t("Sign in will be available when the service is connected.")}</p>}</footer>
  </div>;
}
